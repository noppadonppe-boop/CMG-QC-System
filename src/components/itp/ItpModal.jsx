import { useState, useRef } from 'react';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';
import { useApp } from '../../context/AppContext';
import { storage } from '../../config/firebase';
import { Upload, X, Loader2, FileText, Image, FileSpreadsheet } from 'lucide-react';

const ITP_BY_OPTIONS   = ['Client ITP', 'CMG ITP'];
const TYPE_ITC_OPTIONS = ['Civil', 'Building', 'Steel Structure', 'Mechanical', 'Electrical', 'HVAC', 'Sanitary'];

const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
];
const ALLOWED_EXT = '.pdf,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp';
const MAX_SIZE_MB  = null; // ไม่จำกัดขนาดไฟล์

function fileIcon(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image size={12} className="text-green-500 shrink-0" />;
  if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet size={12} className="text-emerald-600 shrink-0" />;
  return <FileText size={12} className="text-orange-500 shrink-0" />;
}

// ── File Uploader ──────────────────────────────────────────────────────────────
function FileUploader({ label, sessionId, files, setFiles, projectId }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [errorMsg,  setErrorMsg]  = useState('');

  async function handleFiles(fileList) {
    if (!projectId) {
      setErrorMsg('ไม่พบโปรเจกต์ — กรุณาเลือกโปรเจกต์ก่อน');
      return;
    }
    setErrorMsg('');
    setUploading(true);

    const results = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      if (!ALLOWED_MIME.includes(file.type)) {
        setErrorMsg(`"${file.name}" ไม่รองรับ — อัปโหลดได้เฉพาะ PDF, Excel, รูปภาพ`);
        continue;
      }
      // ไม่จำกัดขนาดไฟล์

      const seqNo  = files.length + results.length + 1;
      const seqStr = String(seqNo).padStart(2, '0');
      const ext    = file.name.split('.').pop();
      const dispName = `ITP_${sessionId}_${seqStr}`;
      const path     = `itp-attachments/${projectId}/${sessionId}/file${seqStr}.${ext}`;

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
      results.push({ name: dispName, url });
    }

    setFiles(prev => [...prev, ...results]);
    setUploading(false);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600">{label}</label>

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
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
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-red-400 hover:text-red-600"
              >
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
        className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-slate-600 border border-dashed border-slate-300 rounded-lg hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed w-fit"
      >
        {uploading ? (
          <>
            <Loader2 size={13} className="animate-spin text-orange-500" />
            อัปโหลด... {progress}%
          </>
        ) : (
          <>
            <Upload size={13} />
            เลือกไฟล์ (PDF, Excel, รูปภาพ)
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_EXT}
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {errorMsg && (
        <p className="text-[11px] text-red-500 flex items-center gap-1">
          <X size={11} /> {errorMsg}
        </p>
      )}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────
export default function ItpModal({ itpItem, onSave, onClose }) {
  const { selectedProjectId } = useApp();

  // Session ID for file path (stable per modal open)
  const [sessionId] = useState(() => `${Date.now()}`);

  const initAttachments = Array.isArray(itpItem?.attachments) ? itpItem.attachments : [];
  const [attachments, setAttachments] = useState(initAttachments);

  const [form, setForm] = useState(
    itpItem
      ? { ...itpItem, docNo: itpItem.docNo ?? '', rev: itpItem.rev ?? '' }
      : { item: '', itpBy: 'CMG ITP', typeItc: 'Civil', docNo: '', rev: '', note: '' },
  );

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.item.trim()) return;
    onSave({ ...form, attachments });
  }

  return (
    <Modal
      title={itpItem ? `Edit ITP — ${itpItem.item}` : 'Add ITP Item'}
      onClose={onClose}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Doc. No. and Rev. — first fields */}
        <FormGrid cols={3}>
          <FormField label="Doc. No." className="col-span-2">
            <Input
              value={form.docNo}
              onChange={set('docNo')}
              placeholder="ITP-001"
            />
          </FormField>
          <FormField label="Rev.">
            <Input
              value={form.rev}
              onChange={set('rev')}
              placeholder="A"
              maxLength={4}
            />
          </FormField>
        </FormGrid>

        <FormField label="ITP Item / Description" required>
          <Input
            value={form.item}
            onChange={set('item')}
            placeholder="e.g. Pile Installation Inspection"
            required
          />
        </FormField>

        <FormGrid cols={2}>
          <FormField label="ITP By">
            <Select value={form.itpBy} onChange={set('itpBy')}>
              {ITP_BY_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </Select>
          </FormField>
          <FormField label="Type ITC">
            <Select value={form.typeItc} onChange={set('typeItc')}>
              {TYPE_ITC_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </Select>
          </FormField>
        </FormGrid>

        <FileUploader
          label="Attachment / ITP Files"
          sessionId={sessionId}
          files={attachments}
          setFiles={setAttachments}
          projectId={selectedProjectId}
        />

        <FormField label="Note">
          <Textarea value={form.note} onChange={set('note')} placeholder="Any additional notes..." rows={2} />
        </FormField>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors">
            {itpItem ? 'Save Changes' : 'Add ITP Item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
