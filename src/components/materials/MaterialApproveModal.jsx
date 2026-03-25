import { useState, useRef } from 'react';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { storage } from '../../config/firebase';
import { Upload, X, Loader2, FileText, Image, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

const APPROVAL_TYPES = [
  'Initial Review',
  'Technical Approval', 
  'Quality Approval',
  'Final Approve'
];

const APPROVAL_RESULTS = [
  'Approved',
  'Approved with Comments',
  'Rejected',
  'Hold for Review'
];

const DOCUMENT_MIME = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
];
const DOCUMENT_EXT = '.pdf,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp';
const DOCUMENT_MAX_MB = 20;

function documentFileIcon(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  return 'pdf';
}

function DocumentThumb({ file, onRemove }) {
  const type = documentFileIcon(file.name);
  return (
    <div className="relative group">
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-green-300 transition-colors w-24 shrink-0"
      >
        {type === 'image' ? (
          <img src={file.url} alt="" className="w-14 h-14 object-cover rounded border border-slate-200" />
        ) : (
          <div className="w-14 h-14 rounded border border-slate-200 bg-white flex items-center justify-center">
            {type === 'excel' ? (
              <FileSpreadsheet size={24} className="text-emerald-600" />
            ) : (
              <FileText size={24} className="text-green-500" />
            )}
          </div>
        )}
        <span className="text-[10px] text-slate-600 truncate w-full text-center" title={file.name}>{file.name}</span>
      </a>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

export default function MaterialApproveModal({ material, onSave, onClose }) {
  const { selectedProjectId } = useApp();
  const { userProfile } = useAuth();

  const displayName = [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || userProfile?.email || '';
  const currentApprovalCount = (material.approvals || []).length;
  const approvalNumber = currentApprovalCount + 1;

  // Calculate remaining quantity
  const totalQuantity = parseFloat(material.quantity) || 0;
  const approvedQuantity = (material.approvals || []).reduce((sum, approval) => {
    return sum + (parseFloat(approval.approvedQuantity) || 0);
  }, 0);
  const remainingQuantity = totalQuantity - approvedQuantity;

  const [form, setForm] = useState({
    approvalType: 'Initial Review',
    result: 'Approved',
    approvedBy: displayName,
    approvalDate: new Date().toISOString().slice(0, 10),
    approvedQuantity: remainingQuantity.toString(),
    comments: '',
    documents: [],
  });

  const [documents, setDocuments] = useState([]);
  const documentInputRef = useRef(null);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documentProgress, setDocumentProgress] = useState(0);
  const [documentError, setDocumentError] = useState('');

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleDocumentFiles(fileList) {
    if (!selectedProjectId || !material?.matRevNo?.trim()) {
      setDocumentError('กรุณาเลือกโปรเจกต์และมี Material Rev No.');
      return;
    }
    setDocumentError('');
    setDocumentUploading(true);
    const safeMatRevNo = material.matRevNo.replace(/[/\\#?]/g, '-');
    const results = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!DOCUMENT_MIME.includes(file.type)) {
        setDocumentError(`"${file.name}" ไม่รองรับ — อัปโหลดได้เฉพาะ PDF, Excel, รูปภาพ`);
        continue;
      }
      if (file.size > DOCUMENT_MAX_MB * 1024 * 1024) {
        setDocumentError(`"${file.name}" มีขนาดเกิน ${DOCUMENT_MAX_MB} MB`);
        continue;
      }
      const seq = documents.length + results.length + 1;
      const ext = file.name.split('.').pop();
      const path = `material-approvals/${selectedProjectId}/${safeMatRevNo}/approval-${approvalNumber}/${String(seq).padStart(2, '0')}.${ext}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);
      await new Promise((resolve, reject) => {
        task.on('state_changed', (snap) => setDocumentProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)), reject, () => resolve());
      });
      const url = await getDownloadURL(task.snapshot.ref);
      results.push({ name: file.name, url });
    }
    setDocuments(prev => [...prev, ...results]);
    setDocumentUploading(false);
    setDocumentProgress(0);
    if (documentInputRef.current) documentInputRef.current.value = '';
  }

  function removeDocument(idx) {
    setDocuments(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.approvalType.trim() || !form.result.trim()) return;

    const approvalData = {
      ...form,
      documents,
      approvalNumber,
      timestamp: new Date().toISOString(),
    };

    onSave(material, approvalData);
  }

  const resultStyle = {
    'Approved': 'bg-green-50 border-green-300 text-green-700',
    'Approved with Comments': 'bg-blue-50 border-blue-300 text-blue-700',
    'Rejected': 'bg-red-50 border-red-300 text-red-700',
    'Hold for Review': 'bg-amber-50 border-amber-300 text-amber-700',
  };

  return (
    <Modal
      title={
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold text-slate-800">Material Approve</h2>
          <span className="text-lg font-bold text-green-600 tracking-tight">{material.matRevNo}</span>
          <span className="text-[10px] text-green-500 font-semibold">APPROVAL #{approvalNumber}</span>
        </div>
      }
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Section 1: Material Info ── */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-slate-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">ℹ</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Material Information</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Description:</span>
              <div className="font-semibold text-slate-800 mt-0.5">{material.description}</div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Category:</span>
              <div className="font-semibold text-slate-800 mt-0.5">{material.category}</div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Supplier:</span>
              <div className="font-semibold text-slate-800 mt-0.5">{material.supplier || '—'}</div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Material Spec / Package Ref.:</span>
              <div className="font-semibold text-slate-800 mt-0.5">{material.materialSpecPackage || '—'}</div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Total Quantity:</span>
              <div className="font-semibold text-slate-800 mt-0.5">{totalQuantity} {material.unit}</div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Approved Quantity:</span>
              <div className="font-semibold text-green-600 mt-0.5">{approvedQuantity} {material.unit}</div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Remaining Quantity:</span>
              <div className={`font-bold mt-0.5 ${remainingQuantity > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {remainingQuantity} {material.unit}
              </div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Previous Approvals:</span>
              <div className="font-semibold text-slate-800 mt-0.5">{currentApprovalCount} time{currentApprovalCount !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Approval Details ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Approval Details</h3>
          </div>
          <FormGrid cols={3}>
            <FormField label="Approval Type" required>
              <Select value={form.approvalType} onChange={set('approvalType')} required>
                {APPROVAL_TYPES.map(t => <option key={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Approval Date" required>
              <Input type="date" value={form.approvalDate} onChange={set('approvalDate')} required />
            </FormField>
            <FormField label="Approved By" required>
              <Input value={form.approvedBy} onChange={set('approvedBy')} placeholder="Name" required />
            </FormField>
          </FormGrid>

          <div className="mt-4">
            <FormField label={`Approved Quantity (${material.unit})`} required>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={form.approvedQuantity}
                  onChange={set('approvedQuantity')}
                  placeholder="0"
                  min="0"
                  max={remainingQuantity}
                  step="0.01"
                  required
                />
                <div className="text-xs text-slate-500 whitespace-nowrap">
                  Max: {remainingQuantity} {material.unit}
                </div>
              </div>
              {parseFloat(form.approvedQuantity) > remainingQuantity && (
                <p className="text-[11px] text-red-500 mt-1">
                  ⚠️ Approved quantity cannot exceed remaining quantity ({remainingQuantity} {material.unit})
                </p>
              )}
            </FormField>
          </div>

          {/* Result radio cards */}
          <div className="mt-4">
            <FormField label="Approval Result" required>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {APPROVAL_RESULTS.map(r => (
                  <label
                    key={r}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold ${
                      form.result === r
                        ? resultStyle[r]
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="approvalResult"
                      value={r}
                      checked={form.result === r}
                      onChange={set('result')}
                      className="hidden"
                    />
                    <span>
                      {r === 'Approved' ? '✅' : r === 'Approved with Comments' ? '💬' : r === 'Rejected' ? '❌' : '⏸'}
                    </span>
                    {r}
                  </label>
                ))}
              </div>
            </FormField>
          </div>
        </div>

        {/* ── Section 3: Comments & Documents ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Comments & Documents</h3>
          </div>

          <FormField label="Approval Comments / Notes">
            <Textarea
              value={form.comments}
              onChange={set('comments')}
              placeholder="Enter approval comments, conditions, or notes..."
              rows={3}
            />
          </FormField>

          <div className="mt-4">
            <FormField label="Upload Approval Documents">
              <div className="space-y-2">
                {/* Document Thumbnails */}
                {documents.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {documents.map((doc, i) => (
                      <DocumentThumb key={i} file={doc} onRemove={() => removeDocument(i)} />
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => documentInputRef.current?.click()}
                    disabled={documentUploading}
                    className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-slate-600 border border-dashed border-slate-300 rounded-lg hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {documentUploading ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-green-500" />
                        อัปโหลด... {documentProgress}%
                      </>
                    ) : (
                      <>
                        <Upload size={13} />
                        เลือกไฟล์ (PDF, Excel, รูปภาพ) — อัปได้หลายไฟล์
                      </>
                    )}
                  </button>
                  <input
                    ref={documentInputRef}
                    type="file"
                    multiple
                    accept={DOCUMENT_EXT}
                    className="hidden"
                    onChange={e => handleDocumentFiles(e.target.files)}
                  />
                </div>
                {documentError && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <X size={11} /> {documentError}
                  </p>
                )}
              </div>
            </FormField>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
            <CheckCircle2 size={14} />
            {form.approvalType === 'Final Approve' ? 'Final Approve' : 'Submit Approval'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
