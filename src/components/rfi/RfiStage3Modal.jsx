import { useRef, useState } from 'react';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';
import { storage } from '../../config/firebase';
import { Upload, X, Loader2, FileText, FileSpreadsheet, Image } from 'lucide-react';
import { useMenuPermissions } from '../../auth/useMenuPermissions';

const RESULT_OPTIONS = ['Pass', 'Reject', 'Comment', 'Pass with comment'];

const S3_MIME = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
];
const S3_EXT = '.pdf,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp';
const S3_MAX_MB = 20;

function s3FileIcon(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet size={12} className="text-emerald-600 shrink-0" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image size={12} className="text-green-500 shrink-0" />;
  return <FileText size={12} className="text-orange-500 shrink-0" />;
}

function Stage3Uploader({ label, files, setFiles, projectId, requestNo, folder, disabled }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleFiles(fileList) {
    if (disabled) return;
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
      if (!S3_MIME.includes(file.type)) {
        setErrorMsg(`"${file.name}" ไม่รองรับ — อัปโหลดได้เฉพาะ PDF, Excel, รูปภาพ`);
        continue;
      }
      if (file.size > S3_MAX_MB * 1024 * 1024) {
        setErrorMsg(`"${file.name}" มีขนาดเกิน ${S3_MAX_MB} MB`);
        continue;
      }
      const seq = files.length + results.length + 1;
      const ext = file.name.split('.').pop();
      const path = `rfi-stage3/${projectId}/${safeReq}/${folder}_${String(seq).padStart(2, '0')}.${ext}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);
      await new Promise((resolve, reject) => {
        task.on('state_changed',
          snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject, () => resolve());
      });
      const url = await getDownloadURL(task.snapshot.ref);
      results.push({ name: file.name, url });
    }
    setFiles(prev => [...prev, ...results]);
    setUploading(false);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeFile(idx) {
    if (disabled) return;
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-1">
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1 bg-purple-50 border border-purple-100 rounded-lg text-[11px]">
              {s3FileIcon(f.name)}
              <a href={f.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 truncate text-purple-700 hover:text-purple-900">{f.name}</a>
              {!disabled && (
                <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={() => !disabled && inputRef.current?.click()}
        disabled={disabled || uploading}
        className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium rounded-lg border border-dashed border-slate-300 text-slate-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed">
        {uploading ? (
          <><Loader2 size={12} className="animate-spin text-purple-500" />อัปโหลด... {progress}%</>
        ) : (
          <><Upload size={12} />{label}</>
        )}
      </button>
      <input ref={inputRef} type="file" multiple accept={S3_EXT} className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)} />
      {errorMsg && (
        <p className="text-[10px] text-red-500 flex items-center gap-1"><X size={10} /> {errorMsg}</p>
      )}
    </div>
  );
}

export default function RfiStage3Modal({ rfi, onSave, onClose }) {
  const { canAction } = useMenuPermissions();
  const canUploadInspector = canAction('rfi', 'uploadRfiS3Inspector');

  const [form, setForm] = useState({
    inspectionDate:   rfi.inspectionDate   || '',
    result:           rfi.result           || '',
    stage3Note:       rfi.stage3Note       || '',
    stage3Attachment: rfi.stage3Attachment || '',
  });

  const [inspectorFiles, setInspectorFiles] = useState(
    Array.isArray(rfi.stage3InspectorFiles) ? rfi.stage3InspectorFiles : [],
  );

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.inspectionDate || !form.result) return;
    onSave({ ...form, stage3InspectorFiles: inspectorFiles });
  }

  return (
    <Modal title={`Onsite Inspection — Stage 3 (${rfi.rfiNo})`} onClose={onClose} size="md">
      <div className="mb-5 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">S3</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-purple-800">Inspection Onsite — Site QC Inspector</div>
          <div className="text-[11px] text-purple-600 mt-0.5">
            Ref: <span className="font-semibold">{rfi.requestNo}</span> · {rfi.typeOfInspection}
          </div>
          <div className="text-[11px] text-purple-500 mt-0.5 truncate">{rfi.location} · {rfi.area}</div>
          {rfi.inspectionScheduleDate && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                Scheduled: {rfi.inspectionScheduleDate} {rfi.inspectionScheduleTime}
              </span>
            </div>
          )}
        </div>
      </div>

      {rfi.descriptionOfInspection && (
        <div className="mb-5 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Inspection Scope (from Stage 2)</div>
          <div className="text-xs text-slate-600">{rfi.descriptionOfInspection}</div>
          {rfi.stage2Note && (
            <div className="text-[11px] text-slate-500 mt-1.5 italic">Note: {rfi.stage2Note}</div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormGrid cols={2}>
          <FormField label="Inspection Date" required>
            <Input type="date" value={form.inspectionDate} onChange={set('inspectionDate')} required />
          </FormField>
          <FormField label="Inspection Result" required>
            <Select value={form.result} onChange={set('result')} required>
              <option value="">— Select Result —</option>
              {RESULT_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </Select>
          </FormField>
        </FormGrid>

        {form.result && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border ${
            form.result === 'Pass' ? 'bg-green-50 border-green-200 text-green-700' :
            form.result === 'Reject' ? 'bg-red-50 border-red-200 text-red-700' :
            form.result === 'Comment' ? 'bg-amber-50 border-amber-200 text-amber-700' :
            form.result === 'Pass with comment' ? 'bg-teal-50 border-teal-200 text-teal-700' :
            'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className="text-base">
              {form.result === 'Pass' ? '✅' : form.result === 'Reject' ? '❌' :
               form.result === 'Comment' ? '💬' : form.result === 'Pass with comment' ? '✔️' : ''}
            </span>
            Result: <span className="font-bold">{form.result}</span>
          </div>
        )}

        <FormField label="Note / Inspection Findings">
          <Textarea value={form.stage3Note} onChange={set('stage3Note')}
            placeholder="Describe findings, observations, non-conformances if any..." rows={4} />
        </FormField>

        <FormField label="Inspector field information (Upload)">
          <Stage3Uploader
            label={canUploadInspector ? 'เลือกไฟล์ Inspector info' : 'ไม่มีสิทธิ์อัปโหลด (ดูไฟล์เท่านั้น)'}
            files={inspectorFiles} setFiles={setInspectorFiles}
            projectId={rfi.projectId} requestNo={rfi.requestNo}
            folder="inspector" disabled={!canUploadInspector}
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={!form.result}
            className="px-6 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors">
            Submit Inspection →
          </button>
        </div>
      </form>
    </Modal>
  );
}
