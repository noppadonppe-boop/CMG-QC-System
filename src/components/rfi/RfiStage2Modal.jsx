import { useRef, useState } from 'react';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import Modal from '../common/Modal';
import { FormField, Input, Textarea, FormGrid, Select } from '../common/FormField';
import { storage } from '../../config/firebase';
import { Upload, X, Loader2, FileText, FileSpreadsheet, Image } from 'lucide-react';

const STAGE2_MIME = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const STAGE2_EXT = '.pdf,.xls,.xlsx';
const STAGE2_MAX_MB = 20;

function fileIcon(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet size={12} className="text-emerald-600 shrink-0" />;
  return <FileText size={12} className="text-orange-500 shrink-0" />;
}

function referDrawingFileType(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  return 'pdf';
}

function ReferDrawingThumb({ file }) {
  const type = referDrawingFileType(file.name);
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1 p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-orange-300 transition-colors w-20 shrink-0"
    >
      {type === 'image' ? (
        <img src={file.url} alt="" className="w-12 h-12 object-cover rounded border border-slate-200" />
      ) : (
        <div className="w-12 h-12 rounded border border-slate-200 bg-white flex items-center justify-center">
          {type === 'excel'
            ? <FileSpreadsheet size={18} className="text-emerald-600" />
            : <FileText size={18} className="text-orange-500" />}
        </div>
      )}
      <span className="text-[9px] text-slate-600 truncate w-full text-center" title={file.name}>{file.name}</span>
    </a>
  );
}

const STAGE2_WORKSTEP_DEFAULTS = [
  'Civil-Excuation / Lean',
  'Civil-From work / Install rebar / Before Pouring /',
  'Civil-After pouring',
  'Civil-Backfilling',
  'Civil-Compassive Strenge Test',
  'Structure-Fit- up',
  'Structure-Welding VT',
  'Structure-Welding PT',
  'Structure-Welding MT',
  'Structure-Welding RT',
  'Painting-Sand blast',
  'Painting-Primer',
  'Painting-Top coat',
  'Installation-Alignment',
  'Installation-Torque Bolt',
  'Installation-Welding',
  'Installation-Grouting',
];

export default function RfiStage2Modal({ rfi, onSave, onClose }) {
  const [form, setForm] = useState({
    rfiNo:                   rfi.rfiNo                   || '',
    descriptionOfInspection: rfi.descriptionOfInspection || '',
    inspectionPackage:       rfi.inspectionPackage       || '',
    stage2Note:              rfi.stage2Note              || '',
    stage2Files:             Array.isArray(rfi.stage2Files) ? rfi.stage2Files : [],
  });
  const [stage2Files, setStage2Files] = useState(form.stage2Files);
  const [workstepOptions, setWorkstepOptions] = useState(() => {
    const base = [...STAGE2_WORKSTEP_DEFAULTS];
    const current = (rfi?.inspectionPackage || '').trim();
    if (current && !base.includes(current)) base.unshift(current);
    return base;
  });
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  function addWorkstepOption() {
    const val = window.prompt('เพิ่มรายการ Work step');
    const next = (val || '').trim();
    if (!next) return;
    setWorkstepOptions(prev => (prev.includes(next) ? prev : [...prev, next]));
    setForm(f => ({ ...f, inspectionPackage: next }));
  }

  function removeWorkstepOption() {
    const current = (form.inspectionPackage || '').trim();
    if (!current) return;
    const ok = window.confirm(`ลบรายการนี้ออกจาก dropdown?\n\n"${current}"`);
    if (!ok) return;
    setWorkstepOptions(prev => prev.filter(x => x !== current));
    setForm(f => ({ ...f, inspectionPackage: '' }));
  }

  async function handleFiles(fileList) {
    const projectId = rfi.projectId;
    const requestNo = rfi.requestNo;
    if (!projectId || !requestNo) {
      setErrorMsg('ไม่พบ Project/Request No — กรุณารีโหลดหน้าแล้วลองใหม่');
      return;
    }
    setErrorMsg('');
    setUploading(true);
    const safeReq = String(requestNo).replace(/[/\\#?]/g, '-');
    const results = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!STAGE2_MIME.includes(file.type)) {
        setErrorMsg(`"${file.name}" ไม่รองรับ — อัปโหลดได้เฉพาะ PDF, Excel`);
        continue;
      }
      if (file.size > STAGE2_MAX_MB * 1024 * 1024) {
        setErrorMsg(`"${file.name}" มีขนาดเกิน ${STAGE2_MAX_MB} MB`);
        continue;
      }
      const seq = stage2Files.length + results.length + 1;
      const ext = file.name.split('.').pop();
      const path = `rfi-stage2/${projectId}/${safeReq}/stage2_${String(seq).padStart(2, '0')}.${ext}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);
      await new Promise((resolve, reject) => {
        task.on('state_changed',
          (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject, () => resolve());
      });
      const url = await getDownloadURL(task.snapshot.ref);
      results.push({ name: file.name, url });
    }
    setStage2Files(prev => [...prev, ...results]);
    setUploading(false);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeFile(idx) {
    setStage2Files(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ ...form, stage2Files });
  }

  return (
    <Modal title={`Issue RFI to Client — Stage 2 (${rfi.rfiNo})`} onClose={onClose} size="lg">
      {/* Stage 1 read-only summary */}
      <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <div className="text-xs font-bold text-slate-700 mb-2">Stage 1 (read-only)</div>
        <div className="grid grid-cols-3 gap-x-6 gap-y-1.5 text-[10px] text-slate-600">
          <div>Request No.: <span className="font-semibold text-slate-800">{rfi.requestNo}</span></div>
          <div>
            <span className="block mb-0.5">RFI No.:</span>
            <Input value={form.rfiNo} onChange={set('rfiNo')} className="h-6 text-[10px] px-2 py-0" />
          </div>
          <div>Type of Inspection: <span className="font-semibold text-slate-800">{rfi.typeOfInspection}</span></div>

          <div>Request Date (Internal): <span className="font-semibold text-slate-800">{rfi.requestDateInternal || '—'}</span></div>
          <div>Request Time (Internal): <span className="font-semibold text-slate-800">{rfi.requestTimeInternal || '—'}</span></div>
          <div>Due Date: <span className="font-semibold text-slate-800">{rfi.dueDate || '—'}</span></div>

          <div>Request Date (Owner): <span className="font-semibold text-slate-800">{rfi.requestDateOwner || '—'}</span></div>
          <div>Request Time (Owner): <span className="font-semibold text-slate-800">{rfi.requestTimeOwner || '—'}</span></div>
          <div>Requested By: <span className="font-semibold text-slate-800">{rfi.requestedBy || '—'}</span></div>

          <div>Status Insp.: <span className="font-semibold text-slate-800">{rfi.statusInsp || '—'}</span></div>
          <div>Status Doc: <span className="font-semibold text-slate-800">{rfi.statusDoc || '—'}</span></div>
          <div>Working Step: <span className="font-semibold text-slate-800">{rfi.workingStep || '—'}</span></div>

          <div>Location: <span className="font-semibold text-slate-800">{rfi.location || '—'}</span></div>
          <div>Area: <span className="font-semibold text-slate-800">{rfi.area || '—'}</span></div>
          <div className="col-span-3">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mt-1">Refer Drawing , Markup Drawing</span>
            {Array.isArray(rfi.referDrawingFiles) && rfi.referDrawingFiles.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {rfi.referDrawingFiles.slice(0, 6).map((file, i) => (
                  <ReferDrawingThumb key={i} file={file} />
                ))}
                {rfi.referDrawingFiles.length > 6 && (
                  <span className="text-[10px] text-slate-400">+{rfi.referDrawingFiles.length - 6} files</span>
                )}
              </div>
            ) : (
              <span className="text-[10px] text-slate-500">{rfi.referDrawing || '—'}</span>
            )}
          </div>

          <div className="col-span-3">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mt-1">Detail of Inspection</span>
            <div className="text-[10px] text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 mt-1 whitespace-pre-wrap">
              {rfi.detailInspection || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Stage context banner */}
      <div className="mb-5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">S2</span>
        </div>
        <div>
          <div className="text-xs font-bold text-blue-800">Issue RFI to Client / Owner</div>
          <div className="text-[11px] text-blue-600 mt-0.5">
            Ref: <span className="font-semibold">{rfi.requestNo}</span> · {rfi.typeOfInspection} · {rfi.location}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Work step">
          <div className="flex gap-2 items-center">
            <Select value={form.inspectionPackage || ''} onChange={set('inspectionPackage')}>
              <option value="">— Select Work step —</option>
              {workstepOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <button type="button" onClick={addWorkstepOption}
              className="px-2.5 py-1 text-[10px] font-semibold rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50">
              + Add
            </button>
            <button type="button" onClick={removeWorkstepOption} disabled={!form.inspectionPackage}
              className="px-2.5 py-1 text-[10px] font-semibold rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
              Remove
            </button>
          </div>
        </FormField>

        <FormField label="Inspection Scope">
          <Textarea value={form.descriptionOfInspection} onChange={set('descriptionOfInspection')}
            placeholder="Describe the inspection scope as communicated to the client..." rows={3} />
        </FormField>

        <FormField label="Note">
          <Textarea value={form.stage2Note} onChange={set('stage2Note')}
            placeholder="Any additional instructions or notes for the inspector..." rows={2} />
        </FormField>

        <FormField label="Upload (PDF / Excel)">
          <div className="space-y-2">
            {stage2Files.length > 0 && (
              <div className="space-y-1">
                {stage2Files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-100 rounded-lg text-[11px]">
                    {fileIcon(f.name)}
                    <a href={f.url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate flex-1 font-medium">{f.name}</a>
                    <button type="button" onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-slate-600 border border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed w-fit">
              {uploading ? (
                <><Loader2 size={13} className="animate-spin text-blue-600" />อัปโหลด... {progress}%</>
              ) : (
                <><Upload size={13} />เลือกไฟล์ (PDF, Excel) — อัปได้หลายไฟล์</>
              )}
            </button>
            <input ref={inputRef} type="file" multiple accept={STAGE2_EXT} className="hidden"
              onChange={e => handleFiles(e.target.files)} />
            {errorMsg && <p className="text-[10px] text-red-500">{errorMsg}</p>}
          </div>
        </FormField>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="px-6 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
            Issue to Client →
          </button>
        </div>
      </form>
    </Modal>
  );
}
