import { useState, useRef } from 'react';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';
import { useApp }  from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import { storage } from '../../config/firebase';
import { Upload, X, Loader2, FileText, Image, FileSpreadsheet, Camera, Plus, Trash2 } from 'lucide-react';

const CEMENT_BILL_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const CEMENT_BILL_EXT = '.pdf,.jpg,.jpeg,.png,.gif,.webp';
const CEMENT_BILL_MAX_MB = 10;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isImageFile(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
}

function CementBillThumb({ file, onPreview }) {
  const isImage = isImageFile(file.name);
  return (
    <button
      type="button"
      onClick={() => isImage ? onPreview(file.url) : window.open(file.url, '_blank')}
      className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-orange-300 transition-colors w-16 shrink-0 text-left"
    >
      {isImage ? (
        <img src={file.url} alt="" className="w-12 h-12 object-cover rounded border border-slate-200" />
      ) : (
        <div className="w-12 h-12 rounded border border-slate-200 bg-white flex items-center justify-center">
          <FileText size={18} className="text-orange-500" />
        </div>
      )}
      <span className="text-[9px] text-slate-600 truncate w-full text-center" title={file.name}>{file.name}</span>
    </button>
  );
}

const REFER_DRAWING_MIME = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
];
const REFER_DRAWING_EXT = '.pdf,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp';
const REFER_DRAWING_MAX_MB = 20;

function referDrawingFileIcon(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  return 'pdf';
}

function ReferDrawingThumb({ file }) {
  const type = referDrawingFileIcon(file.name);
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-orange-300 transition-colors w-24 shrink-0"
    >
      {type === 'image' ? (
        <img src={file.url} alt="" className="w-14 h-14 object-cover rounded border border-slate-200" />
      ) : (
        <div className="w-14 h-14 rounded border border-slate-200 bg-white flex items-center justify-center">
          {type === 'excel' ? (
            <FileSpreadsheet size={24} className="text-emerald-600" />
          ) : (
            <FileText size={24} className="text-orange-500" />
          )}
        </div>
      )}
      <span className="text-[10px] text-slate-600 truncate w-full text-center" title={file.name}>{file.name}</span>
    </a>
  );
}

const INSPECTION_TYPES = [
  'Concrete Pour', 'Rebar Inspection', 'Steel Erection', 'Pile Driving',
  'Foundation Check', 'Waterproofing', 'MEP Rough-in', 'Masonry',
  'Roofing', 'Facade / Curtain Wall', 'Final Inspection', 'Other',
];

const STATUS_OPTIONS = ['Open', 'Pending', 'Pass', 'Reject', 'Comment', 'Pass with comment'];

const WORKING_STEP_DEFAULTS = [
  'Ecavation/Lean',
  'Formwork/Install rebar',
  'Befor pouring',
  'After pouring',
  'Back filling',
  'Test compressive strength',
  'Fabrication',
  'Fit up',
  'Welding VT',
  'Welding PT',
  'Welding MT',
  'Welding RT',
  'Painting',
  'Sand blast',
  'Primer',
  'Top coat',
  'Install',
  'Alinement',
  'Bolt torque',
  'Welding',
];

const STRUCTURE_TYPE_DEFAULTS = [
  'Civil',
  'Structural',
  'Architectural',
  'Mechanical',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Landscape',
  'Other',
];

/**
 * Generate next Request No. in format RQI-{ProjectNoNoHyphen}-0001
 * e.g. Project No. J-74 → RQI-J74-0001; CMG-2024-001 → RQI-CMG2024001-0001
 */
export function generateRequestNo(projectNo, projectRfiItems) {
  if (!projectNo?.trim()) return '';
  const projectKey = projectNo.replace(/-/g, '');
  const prefix = `RQI-${projectKey}-`;
  const nums = (projectRfiItems || [])
    .map(r => {
      const no = r.requestNo || '';
      if (!no.startsWith(prefix)) return NaN;
      return parseInt(no.slice(prefix.length), 10);
    })
    .filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

/**
 * Generate next RFI No. in format RFI-YYYY-0001 (ต่อโปรเจกต์)
 */
export function generateRfiNo(projectRfiItems) {
  const year = new Date().getFullYear();
  const prefix = `RFI-${year}-`;
  const nums = (projectRfiItems || [])
    .map(r => {
      const no = (r.rfiNo || '').trim();
      if (!no.startsWith(prefix)) return NaN;
      return parseInt(no.slice(prefix.length), 10);
    })
    .filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

const EMPTY = {
  requestNo: '', rfiNo: '',
  requestDateInternal: '', requestTimeInternal: '',
  requestDateOwner: '', requestTimeOwner: '',
  typeOfInspection: 'Concrete Pour',
  location: '', area: '',
  detailInspection: '', workingStep: '', structureType: '', referDrawing: '',
  referDrawingFiles: [],
  requestedBy: '', inspectedBy: '',
  attachmentDoc: '',
  statusInsp: 'Open', statusDoc: 'Open',
  dueDate: '',
  concretePourDate: '', brand: '', cementBillLink: '', cementBillFiles: [],
  status7Day: '', status28Day: '',
  steelTestResult: '', soilTestResult: '',
};

export default function RfiStage1Modal({ rfi, onSave, onClose }) {
  const { selectedProject, selectedProjectId, rfiItems } = useApp();
  const { userProfile } = useAuth();
  const { canAction } = useMenuPermissions();
  const canEditRfiNo = canAction('rfi', 'editRfiNo');

  const displayName = [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || userProfile?.email || '';
  const projectRfiItems = (rfiItems || []).filter(r => r.projectId === selectedProjectId);
  const autoRequestNo = generateRequestNo(selectedProject?.projectNo ?? '', projectRfiItems);
  const requestNo = rfi ? rfi.requestNo : autoRequestNo;

  const [form, setForm] = useState(() => {
    if (rfi) {
      return {
        ...rfi,
        referDrawingFiles: Array.isArray(rfi.referDrawingFiles) ? rfi.referDrawingFiles : [],
        cementBillFiles: Array.isArray(rfi.cementBillFiles) ? rfi.cementBillFiles : [],
        // backward compat: ถ้ายังไม่มี structureType ให้ปล่อยว่าง
        structureType: typeof rfi.structureType === 'string' ? rfi.structureType : '',
      };
    }
    return {
      ...EMPTY,
      requestNo: autoRequestNo,
      rfiNo: canEditRfiNo ? '' : '-',
      dueDate: todayIso(),
      requestedBy: displayName,
      inspectedBy: displayName,
    };
  });
  const [referDrawingFiles, setReferDrawingFiles] = useState(
    Array.isArray(form.referDrawingFiles) ? form.referDrawingFiles : [],
  );
  const [workingStepOptions, setWorkingStepOptions] = useState(() => {
    const base = [...WORKING_STEP_DEFAULTS];
    const current = (rfi?.workingStep || '').trim();
    if (current && !base.includes(current)) base.unshift(current);
    return base;
  });
  const [structureTypeOptions, setStructureTypeOptions] = useState(() => {
    const base = [...STRUCTURE_TYPE_DEFAULTS];
    const current = (rfi?.structureType || '').trim();
    if (current && !base.includes(current)) base.unshift(current);
    return base;
  });
  const referDrawingInputRef = useRef(null);
  const [referDrawingUploading, setReferDrawingUploading] = useState(false);
  const [referDrawingProgress, setReferDrawingProgress] = useState(0);
  const [referDrawingError, setReferDrawingError] = useState('');

  const [cementBillFiles, setCementBillFiles] = useState(
    Array.isArray(form.cementBillFiles) ? form.cementBillFiles : [],
  );
  const cementBillCameraRef = useRef(null);
  const cementBillGalleryRef = useRef(null);
  const [cementBillUploading, setCementBillUploading] = useState(false);
  const [cementBillProgress, setCementBillProgress] = useState(0);
  const [cementBillError, setCementBillError] = useState('');
  const [cementBillPreviewUrl, setCementBillPreviewUrl] = useState(null);

  function addWorkingStepOption() {
    const val = window.prompt('เพิ่มรายการ Working Step');
    const next = (val || '').trim();
    if (!next) return;
    setWorkingStepOptions(prev => (prev.includes(next) ? prev : [...prev, next]));
    setForm(f => ({ ...f, workingStep: next }));
  }

  function removeWorkingStepOption() {
    const current = (form.workingStep || '').trim();
    if (!current) return;
    const ok = window.confirm(`ลบรายการนี้ออกจาก dropdown?\n\n"${current}"`);
    if (!ok) return;
    setWorkingStepOptions(prev => prev.filter(x => x !== current));
    setForm(f => ({ ...f, workingStep: '' }));
  }

  function addStructureTypeOption() {
    const val = window.prompt('เพิ่มรายการ Structure Type');
    const next = (val || '').trim();
    if (!next) return;
    setStructureTypeOptions(prev => (prev.includes(next) ? prev : [...prev, next]));
    setForm(f => ({ ...f, structureType: next }));
  }

  function removeStructureTypeOption() {
    const current = (form.structureType || '').trim();
    if (!current) return;
    const ok = window.confirm(`ลบรายการนี้ออกจาก dropdown?\n\n"${current}"`);
    if (!ok) return;
    setStructureTypeOptions(prev => prev.filter(x => x !== current));
    setForm(f => ({ ...f, structureType: '' }));
  }

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleReferDrawingFiles(fileList) {
    if (!selectedProjectId || !requestNo?.trim()) {
      setReferDrawingError('กรุณาบันทึก Request No. ก่อน หรือเลือกโปรเจกต์');
      return;
    }
    setReferDrawingError('');
    setReferDrawingUploading(true);
    const safeReq = requestNo.replace(/[/\\#?]/g, '-');
    const results = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!REFER_DRAWING_MIME.includes(file.type)) {
        setReferDrawingError(`"${file.name}" ไม่รองรับ — อัปโหลดได้เฉพาะ PDF, Excel, รูปภาพ`);
        continue;
      }
      if (file.size > REFER_DRAWING_MAX_MB * 1024 * 1024) {
        setReferDrawingError(`"${file.name}" มีขนาดเกิน ${REFER_DRAWING_MAX_MB} MB`);
        continue;
      }
      const seq = referDrawingFiles.length + results.length + 1;
      const ext = file.name.split('.').pop();
      const path = `rfi-refer-drawings/${selectedProjectId}/${safeReq}/${String(seq).padStart(2, '0')}.${ext}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);
      await new Promise((resolve, reject) => {
        task.on('state_changed', (snap) => setReferDrawingProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)), reject, () => resolve());
      });
      const url = await getDownloadURL(task.snapshot.ref);
      results.push({ name: file.name, url });
    }
    setReferDrawingFiles(prev => [...prev, ...results]);
    setReferDrawingUploading(false);
    setReferDrawingProgress(0);
    if (referDrawingInputRef.current) referDrawingInputRef.current.value = '';
  }

  function removeReferDrawingFile(idx) {
    setReferDrawingFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleCementBillFiles(fileList) {
    if (!selectedProjectId || !requestNo?.trim()) {
      setCementBillError('กรุณาบันทึก Request No. ก่อน หรือเลือกโปรเจกต์');
      return;
    }
    setCementBillError('');
    setCementBillUploading(true);
    const safeReq = requestNo.replace(/[/\\#?]/g, '-');
    const results = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!CEMENT_BILL_MIME.includes(file.type)) {
        setCementBillError(`"${file.name}" ไม่รองรับ — ใช้ได้เฉพาะรูปภาพหรือ PDF`);
        continue;
      }
      if (file.size > CEMENT_BILL_MAX_MB * 1024 * 1024) {
        setCementBillError(`"${file.name}" มีขนาดเกิน ${CEMENT_BILL_MAX_MB} MB`);
        continue;
      }
      const seq = cementBillFiles.length + results.length + 1;
      const ext = file.name.split('.').pop();
      const path = `rfi-cement-bills/${selectedProjectId}/${safeReq}/bill_${String(seq).padStart(2, '0')}.${ext}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);
      await new Promise((resolve, reject) => {
        task.on('state_changed', (snap) => setCementBillProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)), reject, () => resolve());
      });
      const url = await getDownloadURL(task.snapshot.ref);
      results.push({ name: file.name, url });
    }
    setCementBillFiles(prev => [...prev, ...results]);
    setCementBillUploading(false);
    setCementBillProgress(0);
    if (cementBillCameraRef.current) cementBillCameraRef.current.value = '';
    if (cementBillGalleryRef.current) cementBillGalleryRef.current.value = '';
  }

  function removeCementBillFile(idx) {
    setCementBillFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const rfiNoToSave = canEditRfiNo ? form.rfiNo?.trim() : (form.rfiNo?.trim() || '-');
    if (!form.requestNo.trim() || !rfiNoToSave) return;
    onSave({
      ...form,
      rfiNo: rfiNoToSave,
      referDrawingFiles,
      cementBillFiles,
      cementBillLink: cementBillFiles[0]?.url ?? form.cementBillLink ?? '',
    });
  }

  const isEdit = !!rfi;

  return (
    <Modal
      title={
        isEdit ? (
          `Edit RFI Request — ${rfi.rfiNo}`
        ) : (
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-bold text-slate-800">Create RFI Request (Stage 1)</h2>
            <span className="text-xl font-bold text-blue-600 tracking-tight">{requestNo}</span>
            <span className="text-[10px] text-orange-500 font-semibold">AUTO</span>
          </div>
        )
      }
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Section: Identification ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Identification</h3>
          </div>
          <FormGrid cols={3}>
            <FormField label="RFI No." required>
              {canEditRfiNo ? (
                <Input value={form.rfiNo} onChange={set('rfiNo')} placeholder="RFI-2024-001" required />
              ) : (
                <div className="space-y-0.5">
                  <Input
                    value={rfi ? form.rfiNo : (form.rfiNo || '-')}
                    readOnly
                    className="bg-slate-50 text-slate-600 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-500">เฉพาะ Role ที่มีสิทธิ์ &quot;กรอก / แก้ไข RFI No.&quot; ใน Set Role เท่านั้นที่แก้ไขฟิลด์นี้ได้</p>
                </div>
              )}
            </FormField>
            <FormField label="Type of Inspection">
              <Select value={form.typeOfInspection} onChange={set('typeOfInspection')}>
                {INSPECTION_TYPES.map(t => <option key={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Due Date">
              <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
            </FormField>
          </FormGrid>
        </div>

        {/* ── Section: Request Dates ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Request Dates & Times</h3>
          </div>
          <FormGrid cols={4}>
            <FormField label="Request Date (Internal)">
              <Input type="date" value={form.requestDateInternal} onChange={set('requestDateInternal')} />
            </FormField>
            <FormField label="Request Time (Internal)">
              <Input type="time" value={form.requestTimeInternal} onChange={set('requestTimeInternal')} />
            </FormField>
            <FormField label="Request Date (with Owner)">
              <Input type="date" value={form.requestDateOwner} onChange={set('requestDateOwner')} />
            </FormField>
            <FormField label="Request Time (with Owner)">
              <Input type="time" value={form.requestTimeOwner} onChange={set('requestTimeOwner')} />
            </FormField>
          </FormGrid>
        </div>

        {/* ── Section: Location & Detail ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Location & Inspection Detail</h3>
          </div>
          <FormGrid cols={3}>
            <FormField label="Location">
              <Input value={form.location} onChange={set('location')} placeholder="Grid A / Level 1" />
            </FormField>
            <FormField label="Area">
              <Input value={form.area} onChange={set('area')} placeholder="Foundation / Superstructure" />
            </FormField>
            <FormField label="Working Step">
              <div className="flex items-center gap-2">
                <Select value={form.workingStep || ''} onChange={set('workingStep')}>
                  <option value="">Select…</option>
                  {workingStepOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
                <button
                  type="button"
                  onClick={addWorkingStepOption}
                  className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:border-orange-400 hover:bg-orange-50 flex items-center justify-center transition-colors"
                  title="เพิ่มรายการ"
                >
                  <Plus size={16} className="text-slate-600" />
                </button>
                <button
                  type="button"
                  onClick={removeWorkingStepOption}
                  disabled={!form.workingStep}
                  className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:border-red-400 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="ลบรายการที่เลือก"
                >
                  <Trash2 size={16} className="text-slate-600" />
                </button>
              </div>
            </FormField>
          </FormGrid>

          <div className="mt-4">
            <FormField label="Structure Type">
              <div className="flex items-center gap-2">
                <Select value={form.structureType || ''} onChange={set('structureType')}>
                  <option value="">Select…</option>
                  {structureTypeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
                <button
                  type="button"
                  onClick={addStructureTypeOption}
                  className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:border-orange-400 hover:bg-orange-50 flex items-center justify-center transition-colors"
                  title="เพิ่มรายการ"
                >
                  <Plus size={16} className="text-slate-600" />
                </button>
                <button
                  type="button"
                  onClick={removeStructureTypeOption}
                  disabled={!form.structureType}
                  className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:border-red-400 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="ลบรายการที่เลือก"
                >
                  <Trash2 size={16} className="text-slate-600" />
                </button>
              </div>
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Detail of Inspection">
              <Textarea value={form.detailInspection} onChange={set('detailInspection')} placeholder="Describe the scope of this inspection..." rows={3} />
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Refer Drawing , Markup Drawing">
              <div className="space-y-2">
                {/* Thumbnails + ลบ */}
                {referDrawingFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {referDrawingFiles.map((file, i) => (
                      <div key={i} className="relative group">
                        <ReferDrawingThumb file={file} />
                        <button
                          type="button"
                          onClick={() => removeReferDrawingFile(i)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => referDrawingInputRef.current?.click()}
                    disabled={referDrawingUploading}
                    className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-slate-600 border border-dashed border-slate-300 rounded-lg hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {referDrawingUploading ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-orange-500" />
                        อัปโหลด... {referDrawingProgress}%
                      </>
                    ) : (
                      <>
                        <Upload size={13} />
                        เลือกไฟล์ (PDF, Excel, รูปภาพ) — อัปได้หลายไฟล์
                      </>
                    )}
                  </button>
                  <input
                    ref={referDrawingInputRef}
                    type="file"
                    multiple
                    accept={REFER_DRAWING_EXT}
                    className="hidden"
                    onChange={e => handleReferDrawingFiles(e.target.files)}
                  />
                </div>
                {referDrawingError && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <X size={11} /> {referDrawingError}
                  </p>
                )}
              </div>
            </FormField>
          </div>
        </div>

        {/* ── Section: Personnel ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">4</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Personnel</h3>
          </div>
          <FormGrid cols={2}>
            <FormField label="QC Doc Requested By">
              <Input value={form.requestedBy} onChange={set('requestedBy')} placeholder="Name" />
            </FormField>
            <FormField label="QC Inspector Inspected By">
              <Input value={form.inspectedBy} onChange={set('inspectedBy')} placeholder="Name" />
            </FormField>
          </FormGrid>
        </div>

        {/* ── Section: Status ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">5</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status</h3>
          </div>
          <FormGrid cols={2}>
            <FormField label="Status Inspection">
              <Select value={form.statusInsp} onChange={set('statusInsp')}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="Status Document">
              <Select value={form.statusDoc} onChange={set('statusDoc')}>
                {['Open', 'Pending', 'Complete', 'Waiting Approve', 'Close'].map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>
          </FormGrid>
        </div>

        {/* ── Section: Concrete / Test (conditional section, always shown) ── */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-slate-400 text-white flex items-center justify-center text-[10px] font-bold shrink-0">6</div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Concrete / Material Test (if applicable)</h3>
          </div>
          <FormGrid cols={3}>
            <FormField label="วันที่เทคอนกรีต">
              <Input type="date" value={form.concretePourDate} onChange={set('concretePourDate')} />
            </FormField>
            <FormField label="BRAND (ปูนซีเมนต์)">
              <Input value={form.brand} onChange={set('brand')} placeholder="TPI / SCG..." />
            </FormField>
            <FormField label="แนบลิงค์บิลปูน">
              <div className="space-y-2">
                {cementBillFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {cementBillFiles.map((file, i) => (
                      <div key={i} className="relative group">
                        <CementBillThumb file={file} onPreview={setCementBillPreviewUrl} />
                        <button
                          type="button"
                          onClick={() => removeCementBillFile(i)}
                          className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={cementBillCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => handleCementBillFiles(e.target.files)}
                  />
                  <input
                    ref={cementBillGalleryRef}
                    type="file"
                    accept={CEMENT_BILL_EXT}
                    multiple
                    className="hidden"
                    onChange={e => handleCementBillFiles(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => cementBillCameraRef.current?.click()}
                    disabled={cementBillUploading}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 border border-slate-300 rounded-lg hover:border-orange-400 hover:text-orange-600 disabled:opacity-60"
                  >
                    <Camera size={12} /> ถ่ายรูป
                  </button>
                  <button
                    type="button"
                    onClick={() => cementBillGalleryRef.current?.click()}
                    disabled={cementBillUploading}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 border border-dashed border-slate-300 rounded-lg hover:border-orange-400 hover:text-orange-600 disabled:opacity-60"
                  >
                    {cementBillUploading ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> {cementBillProgress}%
                      </>
                    ) : (
                      <>
                        <Upload size={12} /> แกลลอรี่ / ไฟล์ (รูปหรือ PDF)
                      </>
                    )}
                  </button>
                </div>
                {cementBillError && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <X size={11} /> {cementBillError}
                  </p>
                )}
              </div>
            </FormField>
          </FormGrid>
          <FormGrid cols={4} className="mt-4">
            <FormField label="Status 7 Day">
              <Select value={form.status7Day} onChange={set('status7Day')}>
                <option value="">—</option>
                <option>Pass</option><option>Fail</option><option>Pending</option>
              </Select>
            </FormField>
            <FormField label="Status 28 Day">
              <Select value={form.status28Day} onChange={set('status28Day')}>
                <option value="">—</option>
                <option>Pass</option><option>Fail</option><option>Pending</option>
              </Select>
            </FormField>
            <FormField label="ผลเทสเหล็ก">
              <Select value={form.steelTestResult} onChange={set('steelTestResult')}>
                <option value="">—</option>
                <option>Pass</option><option>Fail</option><option>N/A</option><option>Pending</option>
              </Select>
            </FormField>
            <FormField label="ผลเทสดิน">
              <Select value={form.soilTestResult} onChange={set('soilTestResult')}>
                <option value="">—</option>
                <option>Pass</option><option>Fail</option><option>N/A</option><option>Pending</option>
              </Select>
            </FormField>
          </FormGrid>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="px-6 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors">
            {isEdit ? 'Save Changes' : 'Create RFI Request'}
          </button>
        </div>
      </form>

      {/* Lightbox ดูรูปใหญ่ (บิลปูน) */}
      {cementBillPreviewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setCementBillPreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setCementBillPreviewUrl(null)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 text-slate-800 flex items-center justify-center"
          >
            <X size={18} />
          </button>
          <img
            src={cementBillPreviewUrl}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </Modal>
  );
}
