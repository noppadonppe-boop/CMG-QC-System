import { useRef, useState } from 'react';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import Modal from '../common/Modal';
import { FormField, Input, Textarea, FormGrid } from '../common/FormField';
import { storage } from '../../config/firebase';
import { Upload, X, Loader2, FileText, FileSpreadsheet } from 'lucide-react';

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

export default function RfiStage2Modal({ rfi, onSave, onClose }) {
  const [form, setForm] = useState({
    issueDate:               rfi.issueDate               || '',
    descriptionOfInspection: rfi.descriptionOfInspection || '',
    inspectionPackage:       rfi.inspectionPackage       || '',
    inspectionScheduleDate:  rfi.inspectionScheduleDate  || '',
    inspectionScheduleTime:  rfi.inspectionScheduleTime  || '',
    stage2Note:              rfi.stage2Note              || '',
    stage2Files:             Array.isArray(rfi.stage2Files) ? rfi.stage2Files : [],
  });
  const [stage2Files, setStage2Files] = useState(form.stage2Files);
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

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
        task.on(
          'state_changed',
          (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          () => resolve(),
        );
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
    if (!form.issueDate) return;
    onSave({ ...form, stage2Files });
  }

  return (
    <Modal
      title={`Issue RFI to Client — Stage 2 (${rfi.rfiNo})`}
      onClose={onClose}
      size="lg"
    >
      {/* Stage 1 read-only summary */}
      <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <div className="text-xs font-bold text-slate-700 mb-2">Stage 1 (read-only)</div>
        <div className="grid grid-cols-3 gap-x-6 gap-y-1.5 text-[10px] text-slate-600">
          <div>Request No.: <span className="font-semibold text-slate-800">{rfi.requestNo}</span></div>
          <div>RFI No.: <span className="font-semibold text-slate-800">{rfi.rfiNo}</span></div>
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
                {rfi.referDrawingFiles.slice(0, 6).map((f, i) => (
                  <a
                    key={i}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-600 hover:border-blue-300 hover:text-blue-700 truncate max-w-[140px]"
                    title={f.name}
                  >
                    {f.name}
                  </a>
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
        <FormGrid cols={2}>
          <FormField label="Issue Date" required>
            <Input type="date" value={form.issueDate} onChange={set('issueDate')} required />
          </FormField>
          <FormField label="Inspection Package Ref.">
            <Input value={form.inspectionPackage} onChange={set('inspectionPackage')} placeholder="PKG-FOUND-001" />
          </FormField>
        </FormGrid>

        <FormField label="Description of Inspection">
          <Textarea
            value={form.descriptionOfInspection}
            onChange={set('descriptionOfInspection')}
            placeholder="Describe the inspection scope as communicated to the client..."
            rows={3}
          />
        </FormField>

        <FormGrid cols={2}>
          <FormField label="Inspection Schedule Date">
            <Input type="date" value={form.inspectionScheduleDate} onChange={set('inspectionScheduleDate')} />
          </FormField>
          <FormField label="Inspection Schedule Time">
            <Input type="time" value={form.inspectionScheduleTime} onChange={set('inspectionScheduleTime')} />
          </FormField>
        </FormGrid>

        <FormField label="Note">
          <Textarea
            value={form.stage2Note}
            onChange={set('stage2Note')}
            placeholder="Any additional instructions or notes for the inspector..."
            rows={2}
          />
        </FormField>

        <FormField label="Upload (PDF / Excel)">
          <div className="space-y-2">
            {stage2Files.length > 0 && (
              <div className="space-y-1">
                {stage2Files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-100 rounded-lg text-[11px]">
                    {fileIcon(f.name)}
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate flex-1 font-medium"
                    >
                      {f.name}
                    </a>
                    <button type="button" onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-slate-600 border border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed w-fit"
            >
              {uploading ? (
                <>
                  <Loader2 size={13} className="animate-spin text-blue-600" />
                  อัปโหลด... {progress}%
                </>
              ) : (
                <>
                  <Upload size={13} />
                  เลือกไฟล์ (PDF, Excel) — อัปได้หลายไฟล์
                </>
              )}
            </button>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept={STAGE2_EXT}
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />

            {errorMsg && (
              <p className="text-[11px] text-red-500 flex items-center gap-1">
                <X size={11} /> {errorMsg}
              </p>
            )}
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
