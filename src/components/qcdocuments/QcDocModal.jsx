import { useState, useRef } from 'react';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import Modal from '../common/Modal';
import { FormField, Input, Select, FormGrid } from '../common/FormField';
import { useApp } from '../../context/AppContext';
import { storage } from '../../config/firebase';
import { Upload, X, Loader2, Paperclip, FileText, Image, FileSpreadsheet } from 'lucide-react';

const CATEGORIES = ['Structural', 'Architectural', 'Mechanical', 'Electrical', 'Civil', 'HVAC', 'Plumbing', 'Landscape', 'Other'];
const STATUSES   = ['Approved', 'For Construction', 'For Review', 'As-Built', 'Superseded', 'Void'];

const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
];
const ALLOWED_EXT = '.pdf,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp';
const MAX_SIZE_MB  = 20;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Generate next CMG-YYYY-TR-XXX number for the project */
export function generateTransmittalNo(projectDocs) {
  const year   = new Date().getFullYear();
  const prefix = `CMG-${year}-TR-`;
  const nums   = projectDocs
    .map(d => parseInt((d.transmittalNo ?? '').replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

function fileIcon(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image size={12} className="text-green-500 shrink-0" />;
  if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet size={12} className="text-emerald-600 shrink-0" />;
  return <FileText size={12} className="text-orange-500 shrink-0" />;
}

// ── File Uploader ──────────────────────────────────────────────────────────────
function FileUploader({ label, required, transmittalNo, namePrefix, files, setFiles, projectId }) {
  const inputRef = useRef(null);
  const [uploading,   setUploading]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [errorMsg,    setErrorMsg]    = useState('');

  async function handleFiles(fileList) {
    if (!transmittalNo || !projectId) {
      setErrorMsg('ยังไม่มี Transmittal No — กรุณารีโหลดหน้าแล้วลองใหม่');
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
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setErrorMsg(`"${file.name}" มีขนาดเกิน ${MAX_SIZE_MB} MB`);
        continue;
      }

      const seqNo    = files.length + results.length + 1;
      const seqStr   = String(seqNo).padStart(2, '0');
      const ext      = file.name.split('.').pop();
      const dispName = `${transmittalNo}_${namePrefix}${seqStr}`;
      const path     = `qc-transmittals/${projectId}/${transmittalNo}/${namePrefix}${seqStr}.${ext}`;

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
    setFiles(prev => {
      const next = prev.filter((_, i) => i !== idx);
      // Re-sequence display names
      return next.map((f, i) => ({
        ...f,
        name: `${transmittalNo}_${namePrefix}${String(i + 1).padStart(2, '0')}`,
      }));
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {/* File list */}
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

      {/* Upload button */}
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
export default function QcDocModal({ doc, onSave, onClose, projectDocs = [], isDuplicate = false }) {
  const { selectedProjectId, projects } = useApp();
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Generate TR number for new/duplicate
  const autoTrNo = generateTransmittalNo(projectDocs);

  function initForm() {
    if (doc) {
      // Edit mode — keep existing data
      return {
        ...doc,
        attachments:    Array.isArray(doc.attachments)    ? doc.attachments    : [],
        docTitleFiles:  Array.isArray(doc.docTitleFiles)  ? doc.docTitleFiles  : [],
      };
    }
    // Add / Duplicate
    const base = isDuplicate && doc ? { ...doc } : {};
    return {
      from:           base.from           ?? '',
      transmittalNo:  autoTrNo,
      transmittalDate: todayIso(),
      byEmail:        base.byEmail        ?? true,
      category:       base.category       ?? 'Structural',
      documentNo:     base.documentNo     ?? '',
      documentTitle:  isDuplicate ? `${base.documentTitle ?? ''} (Copy)` : '',
      receiveDate:    base.receiveDate    ?? '',
      rev:            '',
      status:         base.status         ?? 'For Review',
      attachments:    [],
      docTitleFiles:  [],
      projectNo:      selectedProject?.projectNo ?? '',
    };
  }

  const [form,          setForm]          = useState(() => initForm());
  const [attachments,   setAttachments]   = useState(form.attachments);
  const [docTitleFiles, setDocTitleFiles] = useState(form.docTitleFiles);
  const [submitting,    setSubmitting]    = useState(false);

  const isEdit     = !!doc && !isDuplicate;
  const trNo       = isEdit ? form.transmittalNo : autoTrNo;

  function setField(field) {
    return (e) => {
      const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm(f => ({ ...f, [field]: val }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.rev?.trim()) {
      alert('กรุณากรอก Rev.');
      return;
    }
    setSubmitting(true);
    try {
      onSave({
        ...form,
        transmittalNo: trNo,
        projectId:      selectedProjectId,
        attachments,
        docTitleFiles,
        // keep drawingLink for backward compat with old records
        drawingLink:    attachments[0]?.url ?? form.drawingLink ?? '',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={isEdit ? `Edit Transmittal — ${form.transmittalNo}` : isDuplicate ? `Duplicate — ${trNo}` : 'Add Transmittal / Drawing'}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Row 1: Project, TR No (auto/readonly), Date, From */}
        <FormGrid cols={4}>
          <FormField label="Project No." required>
            <Select value={form.projectNo || ''} onChange={setField('projectNo')} required>
              <option value="" disabled>Select project…</option>
              {projects.map(p => (
                <option key={p.id} value={p.projectNo}>
                  {p.projectNo} — {p.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Transmittal No." required>
            <div className="relative">
              <Input
                value={trNo}
                readOnly
                className="bg-slate-50 text-slate-500 cursor-not-allowed pr-8"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-orange-400 font-semibold">AUTO</span>
            </div>
          </FormField>

          <FormField label="Transmittal Date" required>
            <Input
              type="date"
              value={form.transmittalDate}
              onChange={setField('transmittalDate')}
              required
            />
          </FormField>

          <FormField label="Received From">
            <Input value={form.from} onChange={setField('from')} placeholder="Client / Consultant" />
          </FormField>
        </FormGrid>

        {/* Row 2: Document No, Rev (required), Receive Date */}
        <FormGrid cols={4}>
          <FormField label="Document No." required className="col-span-2">
            <Input value={form.documentNo} onChange={setField('documentNo')} placeholder="S-DWG-001" required />
          </FormField>

          <FormField label="Rev." required>
            <Input
              value={form.rev}
              onChange={setField('rev')}
              placeholder="A"
              maxLength={4}
              required
            />
          </FormField>

          <FormField label="Receive Date">
            <Input type="date" value={form.receiveDate} onChange={setField('receiveDate')} />
          </FormField>
        </FormGrid>

        {/* Document Title — text field */}
        <FormField label="Document Title" required>
          <Input
            value={form.documentTitle}
            onChange={setField('documentTitle')}
            placeholder="Full drawing / document title"
            required
          />
        </FormField>

        {/* Document Title Files upload */}
        <FileUploader
          label="เอกสารแนบ (Document Title Files)"
          transmittalNo={trNo}
          namePrefix="DocFile"
          files={docTitleFiles}
          setFiles={setDocTitleFiles}
          projectId={selectedProjectId}
        />

        {/* Category / Status / Delivery */}
        <FormGrid cols={3}>
          <FormField label="Category">
            <Select value={form.category} onChange={setField('category')}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={setField('status')}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label="Delivery Method">
            <div className="flex items-center gap-4 mt-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="radio"
                  name="delivery"
                  checked={form.byEmail === true}
                  onChange={() => setForm(f => ({ ...f, byEmail: true }))}
                  className="accent-orange-500"
                />
                By Email
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="radio"
                  name="delivery"
                  checked={form.byEmail === false}
                  onChange={() => setForm(f => ({ ...f, byEmail: false }))}
                  className="accent-orange-500"
                />
                By Hand
              </label>
            </div>
          </FormField>
        </FormGrid>

        {/* Drawing / Transmittal Attachments upload */}
        <FileUploader
          label="Drawing / Transmittal Attachments"
          transmittalNo={trNo}
          namePrefix="Attachment"
          files={attachments}
          setFiles={setAttachments}
          projectId={selectedProjectId}
        />

        {/* Legacy drawingLink notice (edit mode only) */}
        {isEdit && form.drawingLink && attachments.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700">
            <Paperclip size={12} />
            มี Drawing Link เดิม:{' '}
            <a href={form.drawingLink} target="_blank" rel="noopener noreferrer" className="underline truncate">
              {form.drawingLink}
            </a>
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-60"
          >
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : isDuplicate ? 'Create Copy' : 'Add Document'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
