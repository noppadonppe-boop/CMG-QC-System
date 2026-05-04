import { useMemo, useRef, useState } from 'react';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';
import { storage } from '../../config/firebase';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import { Upload, X, Loader2, FileText, FileSpreadsheet, Image } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const RESULT_OPTIONS = ['Pass', 'Reject', 'Comment', 'Pass with comment'];

const S4_WORKFLOW = {
  QC_SIGNED: 'QC Signed',
  CONTRACTOR_SIGNED: 'Contractor Signed',
  RFI_CLOSED: 'RFI Closed',
};

const S4_MIME = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const S4_EXT = '.pdf,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp';
const S4_MAX_MB = null; // ไม่จำกัดขนาดไฟล์

function fileIcon(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet size={12} className="text-emerald-600 shrink-0" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image size={12} className="text-green-500 shrink-0" />;
  return <FileText size={12} className="text-orange-500 shrink-0" />;
}

function Stage4Uploader({
  label,
  files,
  setFiles,
  projectId,
  requestNo,
  folder,
  disabled,
  locked = false,
  onUploaded,
  onUploadingChange,
  accentColor = 'green',
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const isDisabled = disabled || locked;

  const colors = {
    green: {
      bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700',
      hover: 'hover:border-green-400 hover:text-green-700 hover:bg-green-50',
      spin: 'text-green-500',
    },
    teal: {
      bg: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-700',
      hover: 'hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50',
      spin: 'text-teal-500',
    },
  };
  const c = colors[accentColor] || colors.green;

  async function handleFiles(fileList) {
    if (isDisabled) return;
    if (!projectId || !requestNo) {
      setErrorMsg('ไม่พบ Project/Request No — กรุณารีโหลดหน้าแล้วลองใหม่');
      return;
    }
    setErrorMsg('');
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const safeReq = String(requestNo).replace(/[/\\#?]/g, '-');
      const results = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (!S4_MIME.includes(file.type)) {
          setErrorMsg(`"${file.name}" ไม่รองรับ — อัปโหลดได้เฉพาะ PDF, Excel, รูปภาพ`);
          continue;
        }
        // ไม่จำกัดขนาดไฟล์
        const seq = files.length + results.length + 1;
        const ext = file.name.split('.').pop();
        const path = `rfi-stage4/${projectId}/${safeReq}/${folder}_${String(seq).padStart(2, '0')}.${ext}`;
        const sRef = storageRef(storage, path);
        const task = uploadBytesResumable(sRef, file);
        await new Promise((resolve, reject) => {
          task.on(
            'state_changed',
            snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            reject,
            () => resolve(),
          );
        });
        const url = await getDownloadURL(task.snapshot.ref);
        results.push({ name: file.name, url });
      }
      setFiles(prev => {
        const merged = [...prev, ...results];
        onUploaded?.(merged, results);
        return merged;
      });
    } catch (err) {
      setErrorMsg(err?.message ?? 'อัปโหลดไฟล์ไม่สำเร็จ');
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function removeFile(idx) {
    if (isDisabled) return;
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-1">
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className={`flex items-center gap-2 px-2 py-1 ${c.bg} border ${c.border} rounded-lg text-[11px]`}>
              {fileIcon(f.name)}
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 truncate ${c.text} hover:underline font-medium`}
              >
                {f.name}
              </a>
              {!disabled && (
                <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => !isDisabled && inputRef.current?.click()}
        disabled={isDisabled || uploading}
        className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium rounded-lg border border-dashed border-slate-300 text-slate-600 ${c.hover} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {uploading ? (
          <><Loader2 size={12} className={`animate-spin ${c.spin}`} />อัปโหลด... {progress}%</>
        ) : (
          <><Upload size={12} />{label}</>
        )}
      </button>
      <input ref={inputRef} type="file" multiple accept={S4_EXT} className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)} />
      {errorMsg && (
        <p className="text-[10px] text-red-500 flex items-center gap-1"><X size={10} /> {errorMsg}</p>
      )}
    </div>
  );
}

export default function RfiStage4Modal({ rfi, onSave, onClose }) {
  const { canAction } = useMenuPermissions();
  const { updateRfi } = useApp();
  const canEditStage3Ref = canAction('rfi', 'editRfiStage4') || canAction('rfi', 'editRfiStage3');
  const canUploadClientSign = canAction('rfi', 'uploadRfiS4ClientSign');
  const canUploadComplete   = canAction('rfi', 'uploadRfiS4Complete');

  const [form, setForm] = useState({
    stage4Result:     rfi.stage4Result     || rfi.result || '',
    stage4Note:       rfi.stage4Note       || '',
    stage4Status:     rfi.stage4Status     || 'Waiting approve',
    stage4Attachment: rfi.stage4Attachment || rfi.stage3Attachment || '',
    inspectionDate:   rfi.inspectionDate   || '',
  });

  const [workflowStatus, setWorkflowStatus] = useState(rfi.stage4Status || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploadingSections, setUploadingSections] = useState({});

  const [clientSignFiles, setClientSignFiles] = useState(
    Array.isArray(rfi.stage4ClientSignFiles) ? rfi.stage4ClientSignFiles : [],
  );
  const [completeFiles, setCompleteFiles] = useState(
    Array.isArray(rfi.stage4CompleteFiles) ? rfi.stage4CompleteFiles : [],
  );
  const [ownerSignFiles, setOwnerSignFiles] = useState(
    Array.isArray(rfi.stage4OwnerSignFiles) ? rfi.stage4OwnerSignFiles : [],
  );
  const [editingStage3Ref, setEditingStage3Ref] = useState(false);
  const [stage3RefForm, setStage3RefForm] = useState({
    inspectionDate: rfi.inspectionDate || '',
    result: rfi.result || '',
    stage3Note: rfi.stage3Note || '',
    concretePourDate: rfi.concretePourDate || '',
    brand: rfi.brand || '',
    cementQty: rfi.cementQty || '',
    cementUnit: rfi.cementUnit || '',
    status7Day: rfi.status7Day || '',
    status28Day: rfi.status28Day || '',
    steelTestResult: rfi.steelTestResult || '',
    soilTestResult: rfi.soilTestResult || '',
  });
  const isUploadingDocuments = Object.values(uploadingSections).some(Boolean);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setStage3Ref = (field) => (e) => setStage3RefForm(prev => ({ ...prev, [field]: e.target.value }));
  const handleUploadingChange = (section, isUploading) => {
    setUploadingSections(prev => {
      if (prev[section] === isUploading) return prev;
      return { ...prev, [section]: isUploading };
    });
  };

  const step = useMemo(() => {
    if (workflowStatus === S4_WORKFLOW.RFI_CLOSED) return 4; // done
    if (workflowStatus === S4_WORKFLOW.CONTRACTOR_SIGNED) return 3;
    if (workflowStatus === S4_WORKFLOW.QC_SIGNED) return 2;
    return 1;
  }, [workflowStatus]);

  const canUploadStep1 = canUploadClientSign && step === 1;
  const canUploadStep2 = canUploadComplete && step === 2;
  const canUploadStep3 = canUploadComplete && step === 3;

  const canStartWorkflow = true; // Always allow workflow to start in Stage 4

  async function persist(changes, nextStatus) {
    setSaving(true);
    setSaveError('');
    try {
      await updateRfi(rfi.id, changes);
      if (nextStatus != null) setWorkflowStatus(nextStatus);
    } catch (err) {
      setSaveError(err?.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  const resultStyle = {
    'Pass':              'bg-green-50  border-green-200  text-green-700',
    'Reject':            'bg-red-50    border-red-200    text-red-700',
    'Comment':           'bg-amber-50  border-amber-200  text-amber-700',
    'Pass with comment': 'bg-teal-50   border-teal-200   text-teal-700',
  };

  return (
    <Modal title={`Complete Document — Stage 4 (${rfi.rfiNo})`} onClose={onClose} size="lg">
      <div className="mb-5 bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">S4</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-green-800">Complete Document — QC Doc Center</div>
          <div className="text-[11px] text-green-600 mt-0.5">
            Ref: <span className="font-semibold">{rfi.requestNo}</span> · {rfi.typeOfInspection}
          </div>
          <div className="text-[11px] text-green-500 mt-0.5 truncate">{rfi.location} · {rfi.area}</div>
        </div>
      </div>

      <div className="mb-5 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
        <div className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-2">Stage 3 Inspection Result (Reference)</div>
        {canEditStage3Ref && (
          <div className="mb-2 flex items-center gap-2">
            {editingStage3Ref && (
              <button
                type="button"
                onClick={() => {
                  setEditingStage3Ref(false);
                  setStage3RefForm({
                    inspectionDate: rfi.inspectionDate || '',
                    result: rfi.result || '',
                    stage3Note: rfi.stage3Note || '',
                    concretePourDate: rfi.concretePourDate || '',
                    brand: rfi.brand || '',
                    cementQty: rfi.cementQty || '',
                    cementUnit: rfi.cementUnit || '',
                    status7Day: rfi.status7Day || '',
                    status28Day: rfi.status28Day || '',
                    steelTestResult: rfi.steelTestResult || '',
                    soilTestResult: rfi.soilTestResult || '',
                  });
                }}
                className="px-2.5 py-1 text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                if (!editingStage3Ref) {
                  setEditingStage3Ref(true);
                  return;
                }
                await persist({
                  inspectionDate: stage3RefForm.inspectionDate || '',
                  result: stage3RefForm.result || '',
                  stage3Note: stage3RefForm.stage3Note || '',
                  concretePourDate: stage3RefForm.concretePourDate || '',
                  brand: stage3RefForm.brand || '',
                  cementQty: stage3RefForm.cementQty || '',
                  cementUnit: stage3RefForm.cementUnit || '',
                  status7Day: stage3RefForm.status7Day || '',
                  status28Day: stage3RefForm.status28Day || '',
                  steelTestResult: stage3RefForm.steelTestResult || '',
                  soilTestResult: stage3RefForm.soilTestResult || '',
                  statusInsp: stage3RefForm.result || rfi.statusInsp || '',
                });
                setEditingStage3Ref(false);
              }}
              className="px-2.5 py-1 text-[10px] font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-md transition-colors"
            >
              {editingStage3Ref ? 'Save Stage 3' : 'Edit Stage 3'}
            </button>
          </div>
        )}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] text-purple-400 font-semibold">Inspection Date</div>
            <div className="text-xs text-purple-800 font-medium mt-0.5">{rfi.inspectionDate || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] text-purple-400 font-semibold">Onsite Result</div>
            <div className="mt-0.5">
              {rfi.result ? (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${resultStyle[rfi.result] || 'bg-slate-100 text-slate-600'}`}>
                  {rfi.result}
                </span>
              ) : <span className="text-xs text-purple-400">Not yet filled</span>}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-purple-400 font-semibold">Inspector Note</div>
            <div className="text-[11px] text-purple-700 mt-0.5 line-clamp-2">{rfi.stage3Note || '—'}</div>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-purple-200 bg-white/80 p-3">
          <div className="mb-2 text-[10px] font-semibold text-purple-500 uppercase tracking-wider">6) Concrete / Material Test (if applicable)</div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <div className="text-[10px] text-purple-400 font-semibold">Concrete Date</div>
              <div className="text-xs text-purple-800 mt-0.5">{stage3RefForm.concretePourDate || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-purple-400 font-semibold">Brand</div>
              <div className="text-xs text-purple-800 mt-0.5">{stage3RefForm.brand || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-purple-400 font-semibold">Actual Qty</div>
              <div className="text-xs text-purple-800 mt-0.5">{stage3RefForm.cementQty || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-purple-400 font-semibold">Unit</div>
              <div className="text-xs text-purple-800 mt-0.5">{stage3RefForm.cementUnit || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-purple-400 font-semibold">Status 7 Day</div>
              <div className="text-xs text-purple-800 mt-0.5">{stage3RefForm.status7Day || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-purple-400 font-semibold">Status 28 Day</div>
              <div className="text-xs text-purple-800 mt-0.5">{stage3RefForm.status28Day || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-purple-400 font-semibold">Steel Test</div>
              <div className="text-xs text-purple-800 mt-0.5">{stage3RefForm.steelTestResult || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-purple-400 font-semibold">Soil Test</div>
              <div className="text-xs text-purple-800 mt-0.5">{stage3RefForm.soilTestResult || '—'}</div>
            </div>
          </div>
        </div>
        {editingStage3Ref && (
          <div className="mt-3 rounded-lg border border-purple-200 bg-white/80 p-3">
            <FormGrid cols={3}>
              <FormField label="Inspection Date">
                <Input type="date" value={stage3RefForm.inspectionDate} onChange={setStage3Ref('inspectionDate')} />
              </FormField>
              <FormField label="Onsite Result">
                <Select value={stage3RefForm.result} onChange={setStage3Ref('result')}>
                  <option value="">— Select Result —</option>
                  {RESULT_OPTIONS.map(r => <option key={r}>{r}</option>)}
                </Select>
              </FormField>
              <FormField label="Inspector Note">
                <Textarea value={stage3RefForm.stage3Note} onChange={setStage3Ref('stage3Note')} rows={2} />
              </FormField>
            </FormGrid>
            <div className="mt-3 border-t border-purple-100 pt-3">
              <div className="mb-2 text-[10px] font-semibold text-purple-500 uppercase tracking-wider">Concrete / Material Test (if applicable)</div>
              <FormGrid cols={4}>
                <FormField label="Concrete Date">
                  <Input type="date" value={stage3RefForm.concretePourDate} onChange={setStage3Ref('concretePourDate')} />
                </FormField>
                <FormField label="Brand">
                  <Input value={stage3RefForm.brand} onChange={setStage3Ref('brand')} />
                </FormField>
                <FormField label="Actual Qty">
                  <Input type="number" min="0" step="any" value={stage3RefForm.cementQty} onChange={setStage3Ref('cementQty')} />
                </FormField>
                <FormField label="Unit">
                  <Input value={stage3RefForm.cementUnit} onChange={setStage3Ref('cementUnit')} />
                </FormField>
                <FormField label="Status 7 Day">
                  <Select value={stage3RefForm.status7Day} onChange={setStage3Ref('status7Day')}>
                    <option value="">—</option>
                    <option>Pass</option><option>Fail</option><option>Pending</option>
                  </Select>
                </FormField>
                <FormField label="Status 28 Day">
                  <Select value={stage3RefForm.status28Day} onChange={setStage3Ref('status28Day')}>
                    <option value="">—</option>
                    <option>Pass</option><option>Fail</option><option>Pending</option>
                  </Select>
                </FormField>
                <FormField label="Steel Test">
                  <Select value={stage3RefForm.steelTestResult} onChange={setStage3Ref('steelTestResult')}>
                    <option value="">—</option>
                    <option>Pass</option><option>Fail</option><option>N/A</option><option>Pending</option>
                  </Select>
                </FormField>
                <FormField label="Soil Test">
                  <Select value={stage3RefForm.soilTestResult} onChange={setStage3Ref('soilTestResult')}>
                    <option value="">—</option>
                    <option>Pass</option><option>Fail</option><option>N/A</option><option>Pending</option>
                  </Select>
                </FormField>
              </FormGrid>
            </div>
          </div>
        )}
        {Array.isArray(rfi.stage3InspectorFiles) && rfi.stage3InspectorFiles.length > 0 && (
          <div className="mt-2 pt-2 border-t border-purple-100">
            <div className="text-[10px] text-purple-400 font-semibold mb-1">Inspector Files (Stage 3)</div>
            <div className="flex flex-wrap gap-1.5">
              {rfi.stage3InspectorFiles.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-purple-200 text-purple-700 hover:border-purple-400 truncate max-w-[160px]"
                  title={f.name}>{f.name}</a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-5">

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Document Workflow (Stage 4)</div>
              <div className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                Status: <span className="text-slate-900">{workflowStatus || '—'}</span>
              </div>
            </div>
            {saving && (
              <div className="text-[11px] text-slate-500 flex items-center gap-2 shrink-0">
                <Loader2 size={12} className="animate-spin" /> Saving...
              </div>
            )}
          </div>
          {saveError && (
            <div className="text-[11px] text-red-600 mt-2 flex items-center gap-2">
              <X size={12} /> {saveError}
            </div>
          )}
        </div>

        <FormField label="Note / Document Comments">
          <Textarea value={form.stage4Note} onChange={set('stage4Note')}
            placeholder="Final remarks, conditions, document filing instructions..." rows={3} />
        </FormField>

        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Document Uploads</div>
          <FormField label="Step 1 — QC Sign (Upload)">
            <Stage4Uploader
              label={
                canUploadClientSign ? 'เลือกไฟล์ QC Sign' : 'ไม่มีสิทธิ์อัปโหลด (ดูไฟล์เท่านั้น)'
              }
              files={clientSignFiles} setFiles={setClientSignFiles}
              projectId={rfi.projectId} requestNo={rfi.requestNo}
              folder="qc-sign"
              disabled={!canUploadStep1}
              locked={step > 1}
              onUploadingChange={(isUploading) => handleUploadingChange('qc-sign', isUploading)}
              onUploaded={(merged) => {
                const next = S4_WORKFLOW.QC_SIGNED;
                persist({
                  ...form,
                  stage: 4,
                  stage4Status: next,
                  statusDoc: next,
                  statusInsp: stage3RefForm.result || rfi.result || rfi.statusInsp,
                  stage4ClientSignFiles: merged,
                }, next);
              }}
              accentColor="teal"
            />
          </FormField>
          <FormField label="Step 2 — Contractor Signed (Upload)">
            <Stage4Uploader
              label={
                step < 2 ? 'รอ Step 1: QC Signed' :
                canUploadComplete ? 'เลือกไฟล์ Contractor Sign' : 'ไม่มีสิทธิ์อัปโหลด (ดูไฟล์เท่านั้น)'
              }
              files={completeFiles} setFiles={setCompleteFiles}
              projectId={rfi.projectId} requestNo={rfi.requestNo}
              folder="contractor-sign"
              disabled={step !== 2 || !canUploadStep2}
              locked={step > 2}
              onUploadingChange={(isUploading) => handleUploadingChange('contractor-sign', isUploading)}
              onUploaded={(merged) => {
                const next = S4_WORKFLOW.CONTRACTOR_SIGNED;
                persist({
                  stage4Status: next,
                  statusDoc: next,
                  stage4CompleteFiles: merged,
                }, next);
              }}
              accentColor="green"
            />
          </FormField>
          <FormField label="Step 3 — Owner Sign (Upload)">
            <Stage4Uploader
              label={
                step < 3 ? 'รอ Step 2: Contractor Signed' :
                canUploadComplete ? 'เลือกไฟล์ Owner Sign' : 'ไม่มีสิทธิ์อัปโหลด (ดูไฟล์เท่านั้น)'
              }
              files={ownerSignFiles} setFiles={setOwnerSignFiles}
              projectId={rfi.projectId} requestNo={rfi.requestNo}
              folder="owner-sign"
              disabled={step !== 3 || !canUploadStep3}
              locked={step > 3}
              onUploadingChange={(isUploading) => handleUploadingChange('owner-sign', isUploading)}
              onUploaded={(merged) => {
                const next = S4_WORKFLOW.RFI_CLOSED;
                persist({
                  stage4Status: next,
                  statusDoc: next,
                  stage4OwnerSignFiles: merged,
                }, next);
              }}
              accentColor="green"
            />
          </FormField>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || isUploadingDocuments}
            onClick={async () => {
              await persist({
                ...form,
                stage4Status: workflowStatus || rfi.stage4Status || '',
                statusDoc: workflowStatus || rfi.stage4Status || '',
                statusInsp: stage3RefForm.result || rfi.result || rfi.statusInsp,
              });
              onClose(); // Close modal after saving
            }}
            className="px-6 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            title={isUploadingDocuments ? 'Please wait for document uploads to finish' : 'Save form fields and close modal'}
          >
            {isUploadingDocuments ? 'Uploading...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
