import { useRef, useState } from 'react';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { Upload, Loader2, ExternalLink } from 'lucide-react';
import Modal from '../common/Modal';
import { FormField, Input, Textarea, FormGrid } from '../common/FormField';
import { storage } from '../../config/firebase';
import { useApp } from '../../context/AppContext';

const STATUS_OPTIONS = ['Verified', 'Wait verified', 'Cancel'];
const DOCUMENT_MIME = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const DOCUMENT_EXT = '.pdf,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp';
const DOCUMENT_MAX_MB = null; // ไม่จำกัดขนาดไฟล์

function getNowTimestamp() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

const EMPTY = {
  timestamp: getNowTimestamp(),
  documentIssuance: '',
  noticeNo: '',
  description: '',
  areaSection: '',
  attachmentOpen: '',
  attachmentClose: '',
  attachmentOpenName: '',
  attachmentCloseName: '',
  subtopic: '',
  status: 'Verified',
  note: '',
};

function UploadField({ label, fileName, fileUrl, uploading, progress, error, onPick, inputRef, inputId }) {
  return (
    <FormField label={label}>
      <div className="space-y-2">
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={DOCUMENT_EXT}
          onChange={onPick}
          className="hidden"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? `Uploading ${progress}%` : 'Upload File'}
          </button>
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              <ExternalLink size={13} />
              {fileName || 'Open file'}
            </a>
          )}
        </div>
        {error && <div className="text-[11px] text-red-600">{error}</div>}
        {!error && fileName && <div className="text-[11px] text-slate-500">{fileName}</div>}
      </div>
    </FormField>
  );
}

export default function HandoverModal({ item, onSave, onClose }) {
  const { selectedProjectId } = useApp();
  const [form, setForm] = useState(item ? { ...EMPTY, ...item } : { ...EMPTY });
  const [openUploading, setOpenUploading] = useState(false);
  const [closeUploading, setCloseUploading] = useState(false);
  const [openProgress, setOpenProgress] = useState(0);
  const [closeProgress, setCloseProgress] = useState(0);
  const [openError, setOpenError] = useState('');
  const [closeError, setCloseError] = useState('');
  const openInputRef = useRef(null);
  const closeInputRef = useRef(null);
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const isEdit = !!item;

  async function uploadAttachment(file, kind) {
    if (!selectedProjectId) {
      if (kind === 'open') setOpenError('Please select a project first.');
      else setCloseError('Please select a project first.');
      return;
    }
    if (!DOCUMENT_MIME.includes(file.type)) {
      if (kind === 'open') setOpenError('Unsupported file type.');
      else setCloseError('Unsupported file type.');
      return;
    }
    // ไม่จำกัดขนาดไฟล์

    const safeNoticeNo = (form.noticeNo || 'handover').replace(/[/\\#?]/g, '-');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const path = `handover/${selectedProjectId}/${safeNoticeNo}/${kind}-${Date.now()}.${ext}`;
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, file);

    if (kind === 'open') {
      setOpenUploading(true);
      setOpenError('');
    } else {
      setCloseUploading(true);
      setCloseError('');
    }

    try {
      await new Promise((resolve, reject) => {
        task.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (kind === 'open') setOpenProgress(progress);
            else setCloseProgress(progress);
          },
          reject,
          () => resolve(),
        );
      });

      const url = await getDownloadURL(task.snapshot.ref);
      setForm(prev => ({
        ...prev,
        [kind === 'open' ? 'attachmentOpen' : 'attachmentClose']: url,
        [kind === 'open' ? 'attachmentOpenName' : 'attachmentCloseName']: file.name,
      }));
    } catch (error) {
      console.error('Attachment upload failed:', error);
      if (kind === 'open') setOpenError('Upload failed.');
      else setCloseError('Upload failed.');
    } finally {
      if (kind === 'open') {
        setOpenUploading(false);
        setOpenProgress(0);
        if (openInputRef.current) openInputRef.current.value = '';
      } else {
        setCloseUploading(false);
        setCloseProgress(0);
        if (closeInputRef.current) closeInputRef.current.value = '';
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!(form.noticeNo || '').trim() || !(form.description || '').trim()) return;
    onSave({
      ...form,
      areaName: form.areaSection,
      handoverDate: form.documentIssuance,
      verifiedCount: form.status === 'Verified' ? 1 : 0,
      waitVerifiedCount: form.status === 'Wait verified' ? 1 : 0,
      cancelCount: form.status === 'Cancel' ? 1 : 0,
    });
  }

  const statusStyle = {
    'Verified': 'bg-green-50 border-green-300 text-green-700',
    'Wait verified': 'bg-blue-50 border-blue-300 text-blue-700',
    'Cancel': 'bg-red-50 border-red-300 text-red-700',
  };
  const statusEmoji = { 'Verified': '✅', 'Wait verified': '⏳', 'Cancel': '❌' };

  return (
    <Modal
      title={isEdit ? `Edit Area Handover — ${item.noticeNo || item.areaSection}` : 'Create Area Handover Record'}
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormGrid cols={3}>
          <FormField label="ประทับเวลา">
            <Input value={form.timestamp || ''} readOnly />
          </FormField>
          <FormField label="Document issuance">
            <Input type="date" value={form.documentIssuance || ''} onChange={set('documentIssuance')} />
          </FormField>
          <FormField label="Notice No." required>
            <Input value={form.noticeNo || ''} onChange={set('noticeNo')} placeholder="CMG-GCME-001" required />
          </FormField>
        </FormGrid>

        <FormGrid cols={2}>
          <FormField label="Description" required>
            <Input value={form.description || ''} onChange={set('description')} placeholder="Handover Pipe Rack A" required />
          </FormField>
          <FormField label="Area / Section">
            <Input value={form.areaSection || ''} onChange={set('areaSection')} placeholder="J-61 Area Pipe Rack A" />
          </FormField>
        </FormGrid>

        <FormGrid cols={2}>
          <UploadField
            label="Attachment Document(open)"
            fileName={form.attachmentOpenName}
            fileUrl={form.attachmentOpen}
            uploading={openUploading}
            progress={openProgress}
            error={openError}
            inputRef={openInputRef}
            inputId="handover-attachment-open"
            onPick={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadAttachment(file, 'open');
            }}
          />
          <UploadField
            label="Attachment Document(close)"
            fileName={form.attachmentCloseName}
            fileUrl={form.attachmentClose}
            uploading={closeUploading}
            progress={closeProgress}
            error={closeError}
            inputRef={closeInputRef}
            inputId="handover-attachment-close"
            onPick={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadAttachment(file, 'close');
            }}
          />
        </FormGrid>

        <FormGrid cols={2}>
          <FormField label="Subtopic">
            <Input value={form.subtopic || ''} onChange={set('subtopic')} placeholder="CMG to Other Company" />
          </FormField>
          <FormField label="Status">
            <div className="grid grid-cols-3 gap-3 mt-1">
              {STATUS_OPTIONS.map(s => (
                <label key={s} className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold ${form.status === s ? statusStyle[s] : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  <input type="radio" name="hoStatus" value={s} checked={form.status === s} onChange={set('status')} className="hidden" />
                  <span>{statusEmoji[s]}</span> {s}
                </label>
              ))}
            </div>
          </FormField>
        </FormGrid>

        <FormField label="Note / Conditions">
          <Textarea value={form.note} onChange={set('note')} placeholder="Conditions of handover, outstanding items, client feedback..." rows={3} />
        </FormField>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button
            type="submit"
            disabled={openUploading || closeUploading}
            className="px-6 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {isEdit ? 'Save Changes' : 'Create Handover'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
