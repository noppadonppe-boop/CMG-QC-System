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
import { Upload, X, Loader2, Paperclip, FileText, Image, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';

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

/**
 * Generate next Transmittal No. in format TR-{ProjectNoNoHyphen}-0001
 * e.g. Project No. J-74 → TR-J74-0001; CMG-2024-001 → TR-CMG2024001-0001
 */
export function generateTransmittalNo(projectNo, projectDocs) {
  if (!projectNo?.trim()) return '';
  const projectKey = projectNo.replace(/-/g, '');
  const prefix = `TR-${projectKey}-`;
  const nums = (projectDocs || [])
    .map(d => {
      const no = d.transmittalNo ?? '';
      if (!no.startsWith(prefix)) return NaN;
      return parseInt(no.slice(prefix.length), 10);
    })
    .filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

function fileIcon(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image size={12} className="text-green-500 shrink-0" />;
  if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet size={12} className="text-emerald-600 shrink-0" />;
  return <FileText size={12} className="text-orange-500 shrink-0" />;
}

// ── File Uploader ──────────────────────────────────────────────────────────────
function FileUploader({ label, required, transmittalNo, namePrefix, files, setFiles, projectId, maxSizeMB = MAX_SIZE_MB }) {
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
      if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
        setErrorMsg(`"${file.name}" มีขนาดเกิน ${maxSizeMB} MB`);
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

  // Generate TR number for new/duplicate: TR-{ProjectNo ไม่มี -}-0001
  const autoTrNo = generateTransmittalNo(selectedProject?.projectNo ?? '', projectDocs);

  function initForm() {
    if (doc) {
      // Edit mode — keep existing data
      return {
        ...doc,
        attachments:    Array.isArray(doc.attachments)    ? doc.attachments    : [],
        docTitleFiles:  Array.isArray(doc.docTitleFiles)  ? doc.docTitleFiles  : [],
        isExternal:     typeof doc.isExternal === 'boolean' ? doc.isExternal : false,
      };
    }
    // Add / Duplicate
    const base = isDuplicate && doc ? { ...doc } : {};
    return {
      transmittalNoRef: base.transmittalNoRef ?? '',
      isExternal:     typeof base.isExternal === 'boolean' ? base.isExternal : false,
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
      projectNo:      selectedProject?.projectNo ?? '', // ใช้โปรเจกต์ที่เลือกไว้ด้านบน
    };
  }

  const [form,          setForm]          = useState(() => initForm());
  const [attachments,   setAttachments]   = useState(form.attachments);
  const [docTitleFiles, setDocTitleFiles] = useState(form.docTitleFiles);
  const [submitting,    setSubmitting]    = useState(false);
  const [docRows,       setDocRows]      = useState([{ documentNo: '', rev: '', receiveDate: '' }]);

  const isEdit     = !!doc && !isDuplicate;
  const trNo       = isEdit ? form.transmittalNo : autoTrNo;

  // Generate TR number for a given row index (multi-row Add mode)
  function getRowTrNo(rowIndex) {
    const match = autoTrNo.match(/^(.+-)(\d+)$/);
    if (!match) return autoTrNo;
    return `${match[1]}${String(parseInt(match[2], 10) + rowIndex).padStart(match[2].length, '0')}`;
  }

  function addDocRow() {
    setDocRows(prev => [...prev, { documentNo: '', rev: '', receiveDate: '' }]);
  }

  function removeDocRow(idx) {
    setDocRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }

  function updateDocRow(idx, field, value) {
    setDocRows(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }

  function setField(field) {
    return (e) => {
      const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm(f => ({ ...f, [field]: val }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (form.isExternal === true && !form.transmittalNoRef?.trim()) {
      alert('กรุณากรอก Transmittal No Ref. เนื่องจากเลือก Type เป็น External');
      return;
    }
    if (!selectedProjectId || !selectedProject) {
      alert('ไม่พบโปรเจกต์ที่เลือก — กรุณาเลือกโปรเจกต์จากเมนูด้านบนก่อน');
      return;
    }

    if (isEdit) {
      /* ── Edit mode — single record ── */
      if (!form.rev?.trim()) { alert('กรุณากรอก Rev.'); return; }
      setSubmitting(true);
      try {
        onSave({
          ...form,
          transmittalNo: trNo,
          projectId: selectedProjectId,
          projectNo: selectedProject.projectNo,
          attachments, docTitleFiles,
          drawingLink: attachments[0]?.url ?? form.drawingLink ?? '',
        });
      } finally { setSubmitting(false); }
    } else {
      /* ── Add / Duplicate mode — multi-row ── */
      for (let i = 0; i < docRows.length; i++) {
        if (!docRows[i].documentNo?.trim()) { alert(`กรุณากรอก Document No. ในแถวที่ ${i + 1}`); return; }
        if (!docRows[i].rev?.trim()) { alert(`กรุณากรอก Rev. ในแถวที่ ${i + 1}`); return; }
      }
      for (let i = 0; i < docRows.length; i++) {
        const trNum = getRowTrNo(i);
        if (projectDocs.some(d => (d.transmittalNo || '').trim() === trNum)) {
          alert(`Transmittal No. "${trNum}" มีในระบบแล้ว\nกรุณาปิดหน้าต่างนี้แล้วกด Add Transmittal ใหม่`);
          return;
        }
      }
      setSubmitting(true);
      try {
        const records = docRows.map((row, i) => ({
          ...form,
          transmittalNo: getRowTrNo(i),
          projectId: selectedProjectId,
          projectNo: selectedProject.projectNo,
          documentNo: row.documentNo,
          rev: row.rev,
          receiveDate: row.receiveDate,
          attachments, docTitleFiles,
          drawingLink: attachments[0]?.url ?? form.drawingLink ?? '',
        }));
        onSave(records);
      } finally { setSubmitting(false); }
    }
  }

  const headerTitle = isEdit ? 'Edit Transmittal' : isDuplicate ? 'Duplicate' : 'Add Transmittal / Drawing';

  return (
    <Modal
      title={
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold text-slate-800">{headerTitle}</h2>
          <span className="text-xl font-bold text-blue-600 tracking-tight">{trNo}</span>
          {!isEdit && (
            <span className="text-[10px] text-orange-500 font-semibold">AUTO</span>
          )}
        </div>
      }
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* โปรเจกต์ใช้ค่าจาก Dropdown ด้านบน (ไม่ให้เลือกในฟอร์ม) */}
        {selectedProject && (
          <p className="text-[11px] text-slate-500">
            โปรเจกต์: <span className="font-semibold text-slate-700">{selectedProject.projectNo} — {selectedProject.name}</span>
          </p>
        )}

        {/* Type: Internal / External */}
        <FormField label="Type">
          <div className="flex items-center gap-4 mt-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="radio"
                name="docType"
                checked={form.isExternal === false}
                onChange={() => setForm(f => ({ ...f, isExternal: false }))}
                className="accent-orange-500"
              />
              Internal
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="radio"
                name="docType"
                checked={form.isExternal === true}
                onChange={() => setForm(f => ({ ...f, isExternal: true }))}
                className="accent-orange-500"
              />
              External
            </label>
          </div>
        </FormField>

        {/* Transmittal No Ref — required when External */}
        <FormField label="Transmittal No Ref." required={form.isExternal === true}>
          <Input
            value={form.transmittalNoRef || ''}
            onChange={setField('transmittalNoRef')}
            placeholder={form.isExternal ? 'กรอกเลข Transmittal อ้างอิง (บังคับ)' : 'อ้างอิงเลข Transmittal เดิม (ถ้ามี)'}
            required={form.isExternal === true}
          />
        </FormField>

        {/* Row 2: Transmittal Date, From */}
        <FormGrid cols={2}>
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

        {isEdit ? (
          /* Edit mode — single record */
          <FormGrid cols={4}>
            <FormField label="Document No." required className="col-span-2">
              <Input value={form.documentNo} onChange={setField('documentNo')} placeholder="S-DWG-001" required />
            </FormField>
            <FormField label="Rev." required>
              <Input value={form.rev} onChange={setField('rev')} placeholder="A" maxLength={4} required />
            </FormField>
            <FormField label="Receive Date">
              <Input type="date" value={form.receiveDate} onChange={setField('receiveDate')} />
            </FormField>
          </FormGrid>
        ) : (
          /* Add / Duplicate mode — multi-row table */
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">
                Document List <span className="text-red-500 ml-0.5">*</span>
              </label>
              <button type="button" onClick={addDocRow}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors">
                <Plus size={12} /> Add Row
              </button>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 w-10">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 text-[10px]">Transmittal No.</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Document No. <span className="text-red-500">*</span></th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 w-24">Rev. <span className="text-red-500">*</span></th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 w-40">Receive Date</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {docRows.map((row, i) => (
                    <tr key={i} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-3 py-1.5 text-slate-400 font-mono text-center">{i + 1}</td>
                      <td className="px-3 py-1.5">
                        <span className="text-[10px] font-mono text-blue-600 font-semibold">{getRowTrNo(i)}</span>
                      </td>
                      <td className="px-3 py-1.5">
                        <input className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-700"
                          value={row.documentNo} onChange={e => updateDocRow(i, 'documentNo', e.target.value)} placeholder="S-DWG-001" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-700"
                          value={row.rev} onChange={e => updateDocRow(i, 'rev', e.target.value)} placeholder="A" maxLength={4} />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="date" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-700"
                          value={row.receiveDate} onChange={e => updateDocRow(i, 'receiveDate', e.target.value)} />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {docRows.length > 1 && (
                          <button type="button" onClick={() => removeDocRow(i)}
                            className="w-6 h-6 rounded-md bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors" title="Remove row">
                            <Trash2 size={11} className="text-red-500" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400">
              แต่ละ Row จะสร้างเป็น 1 รายการแยก โดย Transmittal No. จะรันต่อกันอัตโนมัติ ({docRows.length} รายการ)
            </p>
          </div>
        )}

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
          maxSizeMB={null}
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
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : `Add ${docRows.length} Document${docRows.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
