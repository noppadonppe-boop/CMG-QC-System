import { useRef, useState } from 'react';
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

const RESULT_OPTIONS = ['Pass', 'Reject', 'Comment', 'Pass with comment'];
const STATUS_OPTIONS = ['Complete document', 'Waiting approve', 'Close'];

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
const S4_MAX_MB = 20;

function fileIcon(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet size={12} className="text-emerald-600 shrink-0" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image size={12} className="text-green-500 shrink-0" />;
  return <FileText size={12} className="text-orange-500 shrink-0" />;
}

function Stage4Uploader({ label, files, setFiles, projectId, requestNo, folder, disabled, accentColor = 'green' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

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
      if (!S4_MIME.includes(file.type)) {
        setErrorMsg(`"${file.name}" ไม่รองรับ — อัปโหลดได้เฉพาะ PDF, Excel, รูปภาพ`);
        continue;
      }
      if (file.size > S4_MAX_MB * 1024 * 1024) {
        setErrorMsg(`"${file.name}" มีขนาดเกิน ${S4_MAX_MB} MB`);
        continue;
      }
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
        onClick={() => !disabled && inputRef.current?.click()}
        disabled={disabled || uploading}
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
  const canUploadClientSign = canAction('rfi', 'uploadRfiS4ClientSign');
  const canUploadComplete   = canAction('rfi', 'uploadRfiS4Complete');

  const [form, setForm] = useState({
    stage4Result:     rfi.stage4Result     || rfi.result || '',
    stage4Note:       rfi.stage4Note       || '',
    stage4Status:     rfi.stage4Status     || 'Waiting approve',
    stage4Attachment: rfi.stage4Attachment || rfi.stage3Attachment || '',
    inspectionDate:   rfi.inspectionDate   || '',
  });

  const [clientSignFiles, setClientSignFiles] = useState(
    Array.isArray(rfi.stage4ClientSignFiles) ? rfi.stage4ClientSignFiles : [],
  );
  const [completeFiles, setCompleteFiles] = useState(
    Array.isArray(rfi.stage4CompleteFiles) ? rfi.stage4CompleteFiles : [],
  );

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.stage4Result || !form.stage4Status) return;
    onSave({ ...form, stage4ClientSignFiles: clientSignFiles, stage4CompleteFiles: completeFiles });
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

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormGrid cols={2}>
          <FormField label="Inspection Date (Confirm)" required>
            <Input type="date" value={form.inspectionDate} onChange={set('inspectionDate')} />
          </FormField>
          <FormField label="Final Result" required>
            <Select value={form.stage4Result} onChange={set('stage4Result')} required>
              <option value="">— Select Final Result —</option>
              {RESULT_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </Select>
          </FormField>
        </FormGrid>

        {form.stage4Result && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border ${resultStyle[form.stage4Result] || 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            <span className="text-base">
              {form.stage4Result === 'Pass' ? '✅' : form.stage4Result === 'Reject' ? '❌' :
               form.stage4Result === 'Comment' ? '💬' : form.stage4Result === 'Pass with comment' ? '✔️' : ''}
            </span>
            Final Result: <span className="font-bold">{form.stage4Result}</span>
          </div>
        )}

        <FormField label="Document Completion Status" required>
          <div className="grid grid-cols-3 gap-3 mt-1">
            {STATUS_OPTIONS.map(s => (
              <label key={s} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all text-xs font-semibold ${
                form.stage4Status === s
                  ? s === 'Close' ? 'bg-green-500 border-green-500 text-white shadow-md'
                    : s === 'Complete document' ? 'bg-blue-500 border-blue-500 text-white shadow-md'
                    : 'bg-amber-400 border-amber-400 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
              }`}>
                <input type="radio" name="stage4Status" value={s} checked={form.stage4Status === s}
                  onChange={set('stage4Status')} className="hidden" />
                <span className="text-sm">{s === 'Close' ? '🔒' : s === 'Complete document' ? '📄' : '⏳'}</span>
                {s}
              </label>
            ))}
          </div>
        </FormField>

        <FormField label="Note / Document Comments">
          <Textarea value={form.stage4Note} onChange={set('stage4Note')}
            placeholder="Final remarks, conditions, document filing instructions..." rows={3} />
        </FormField>

        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Document Uploads</div>
          <FormField label="Document field information — Client Sign (Upload)">
            <Stage4Uploader
              label={canUploadClientSign ? 'เลือกไฟล์ Client Sign' : 'ไม่มีสิทธิ์อัปโหลด (ดูไฟล์เท่านั้น)'}
              files={clientSignFiles} setFiles={setClientSignFiles}
              projectId={rfi.projectId} requestNo={rfi.requestNo}
              folder="client-sign" disabled={!canUploadClientSign} accentColor="teal"
            />
          </FormField>
          <FormField label="Document field information — Complete (Upload)">
            <Stage4Uploader
              label={canUploadComplete ? 'เลือกไฟล์ Complete document' : 'ไม่มีสิทธิ์อัปโหลด (ดูไฟล์เท่านั้น)'}
              files={completeFiles} setFiles={setCompleteFiles}
              projectId={rfi.projectId} requestNo={rfi.requestNo}
              folder="complete" disabled={!canUploadComplete} accentColor="green"
            />
          </FormField>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={!form.stage4Result || !form.stage4Status}
            className="px-6 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors">
            Complete Document ✓
          </button>
        </div>
      </form>
    </Modal>
  );
}
