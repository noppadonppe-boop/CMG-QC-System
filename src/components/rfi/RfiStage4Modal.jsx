import { useRef, useState } from 'react';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';
import { storage } from '../../config/firebase';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import { Upload, X, Loader2, FileText, FileSpreadsheet, Image } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const RESULT_OPTIONS = ['Pass', 'Reject', 'Comment', 'Pass with comment'];
const STATUS_OPTIONS = ['', 'Pass', 'Fail', 'Pending'];
const TEST_OPTIONS = ['', 'Pass', 'Fail', 'N/A', 'Pending'];

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

const REVISION_STAGE1_FIELDS = [
  'requestNo',
  'rfiNo',
  'typeOfInspection',
  'tagNo',
  'requestDateInternal',
  'requestTimeInternal',
  'dueDate',
  'requestDateOwner',
  'requestTimeOwner',
  'requestedBy',
  'inspectedBy',
  'location',
  'area',
  'workingStep',
  'structureType',
  'detailInspection',
  'referDrawing',
  'referDrawingFiles',
];

const REVISION_STAGE2_FIELDS = [
  'inspectionPackage',
  'inspectionScheduleDate',
  'inspectionScheduleTime',
  'descriptionOfInspection',
  'stage2Note',
  'stage2EmailStatus',
  'stage2EmailSentAt',
  'stage2Files',
];

const REVISION_STAGE3_FIELDS = [
  'inspectionDate',
  'result',
  'stage3Note',
  'stage3Attachment',
  'concretePourDate',
  'brand',
  'cementQty',
  'cementUnit',
  'cementBillLink',
  'cementBillFiles',
  'status7Day',
  'status28Day',
  'steelTestResult',
  'soilTestResult',
  'stage3InspectorFiles',
];

const REVISION_ARRAY_FIELDS = ['referDrawingFiles', 'stage2Files', 'stage3InspectorFiles', 'cementBillFiles'];
const REVISION_ALL_FIELDS = [...new Set([...REVISION_STAGE1_FIELDS, ...REVISION_STAGE2_FIELDS, ...REVISION_STAGE3_FIELDS])];

function fileIcon(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet size={12} className="text-emerald-600 shrink-0" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image size={12} className="text-green-500 shrink-0" />;
  return <FileText size={12} className="text-orange-500 shrink-0" />;
}

function cloneFileEntries(files) {
  return Array.isArray(files) ? files.map(file => ({ ...file })) : [];
}

function createRevisionId() {
  return `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pickRevisionFields(source = {}) {
  return REVISION_ALL_FIELDS.reduce((acc, field) => {
    if (REVISION_ARRAY_FIELDS.includes(field)) {
      acc[field] = cloneFileEntries(source[field]);
      return acc;
    }
    acc[field] = source[field] ?? '';
    return acc;
  }, {});
}

function createRevisionSnapshot(source = {}, overrides = {}) {
  const now = new Date().toISOString();
  return {
    ...pickRevisionFields(source),
    revId: overrides.revId || source.revId || createRevisionId(),
    revNo: overrides.revNo ?? source.revNo ?? 1,
    createdAt: overrides.createdAt || source.createdAt || now,
    updatedAt: overrides.updatedAt || source.updatedAt || overrides.createdAt || now,
    basedOnRevNo: overrides.basedOnRevNo ?? source.basedOnRevNo ?? null,
  };
}

function getRevisionHistory(rfi) {
  const fallbackTimestamp = rfi.updatedAt || rfi.createdAt || new Date().toISOString();
  const rawHistory = Array.isArray(rfi.revisionHistory) && rfi.revisionHistory.length > 0
    ? rfi.revisionHistory
    : [
        createRevisionSnapshot(rfi, {
          revNo: rfi.currentRevisionNo || 1,
          createdAt: fallbackTimestamp,
          updatedAt: fallbackTimestamp,
        }),
      ];

  return rawHistory
    .map((item, index) => createRevisionSnapshot(item, {
      revNo: item.revNo ?? index + 1,
      createdAt: item.createdAt || fallbackTimestamp,
      updatedAt: item.updatedAt || item.createdAt || fallbackTimestamp,
      basedOnRevNo: item.basedOnRevNo ?? null,
    }))
    .sort((a, b) => (a.revNo || 0) - (b.revNo || 0));
}

function formatRevisionTimestamp(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createRevisionPersistPayload(revision, history, fallbackStatusDoc = '') {
  if (!revision) return {};
  return {
    ...pickRevisionFields(revision),
    revisionHistory: history.map(item => createRevisionSnapshot(item)),
    currentRevisionId: revision.revId,
    currentRevisionNo: revision.revNo,
    statusInsp: revision.result || '',
    statusDoc: fallbackStatusDoc,
  };
}

function ReferenceField({ label, value, tone = 'slate' }) {
  const tones = {
    slate: { label: 'text-slate-400', value: 'text-slate-800', empty: 'text-slate-300' },
    orange: { label: 'text-orange-400', value: 'text-orange-800', empty: 'text-orange-300' },
    blue: { label: 'text-blue-400', value: 'text-blue-800', empty: 'text-blue-300' },
    purple: { label: 'text-purple-400', value: 'text-purple-800', empty: 'text-purple-300' },
  };
  const c = tones[tone] || tones.slate;
  const hasValue = value !== null && value !== undefined && String(value) !== '';

  return (
    <div>
      <div className={`text-[10px] font-semibold ${c.label}`}>{label}</div>
      <div className={`text-xs font-medium mt-0.5 ${hasValue ? c.value : c.empty}`}>{hasValue ? value : '—'}</div>
    </div>
  );
}

function ReferenceFileList({ title, files, tone = 'slate' }) {
  if (!Array.isArray(files) || files.length === 0) return null;

  const tones = {
    slate: {
      wrap: 'border-slate-100',
      title: 'text-slate-400',
      chip: 'bg-white border-slate-200 text-slate-700 hover:border-slate-400',
    },
    orange: {
      wrap: 'border-orange-100',
      title: 'text-orange-400',
      chip: 'bg-white border-orange-200 text-orange-700 hover:border-orange-400',
    },
    blue: {
      wrap: 'border-blue-100',
      title: 'text-blue-400',
      chip: 'bg-white border-blue-200 text-blue-700 hover:border-blue-400',
    },
    purple: {
      wrap: 'border-purple-100',
      title: 'text-purple-400',
      chip: 'bg-white border-purple-200 text-purple-700 hover:border-purple-400',
    },
  };
  const c = tones[tone] || tones.slate;

  return (
    <div className={`mt-2 pt-2 border-t ${c.wrap}`}>
      <div className={`text-[10px] font-semibold mb-1 ${c.title}`}>{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {files.map((f, i) => (
          <a
            key={i}
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md border truncate max-w-[180px] ${c.chip}`}
            title={f.name}
          >
            {fileIcon(f.name)}
            <span className="truncate">{f.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function Stage4Uploader({
  label,
  files,
  setFiles,
  projectId,
  requestNo,
  folder,
  pathPrefix = 'rfi-stage4',
  disabled,
  locked = false,
  onUploaded,
  onRemoved,
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
      bg: 'bg-green-50',
      border: 'border-green-100',
      text: 'text-green-700',
      hover: 'hover:border-green-400 hover:text-green-700 hover:bg-green-50',
      spin: 'text-green-500',
    },
    teal: {
      bg: 'bg-teal-50',
      border: 'border-teal-100',
      text: 'text-teal-700',
      hover: 'hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50',
      spin: 'text-teal-500',
    },
  };
  const c = colors[accentColor] || colors.green;

  async function handleFiles(fileList) {
    if (isDisabled) return;
    if (!projectId || !requestNo) {
      setErrorMsg('Project/Request No not found');
      return;
    }
    setErrorMsg('');
    setUploading(true);
    onUploadingChange?.(true);

    try {
      const safeReq = String(requestNo).replace(/[/\\#?]/g, '-');
      const results = [];

      for (let i = 0; i < fileList.length; i += 1) {
        const file = fileList[i];
        if (!S4_MIME.includes(file.type)) {
          setErrorMsg(`"${file.name}" is not supported`);
          continue;
        }

        const seq = files.length + results.length + 1;
        const ext = file.name.split('.').pop();
        const path = `${pathPrefix}/${projectId}/${safeReq}/${folder}_${String(seq).padStart(2, '0')}.${ext}`;
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
      setErrorMsg(err?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function removeFile(idx) {
    if (isDisabled) return;
    const fileToRemove = files[idx];
    setUploading(true);
    onUploadingChange?.(true);

    try {
      if (fileToRemove?.url) {
        const fileRef = storageRef(storage, fileToRemove.url);
        await deleteObject(fileRef).catch(() => {});
      }

      setFiles(prev => {
        const nextFiles = prev.filter((_, i) => i !== idx);
        onRemoved?.(nextFiles, fileToRemove);
        return nextFiles;
      });
    } catch {
      setErrorMsg('Delete failed');
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
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
              {!isDisabled && (
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
          <>
            <Loader2 size={12} className={`animate-spin ${c.spin}`} />
            Uploading... {progress}%
          </>
        ) : (
          <>
            <Upload size={12} />
            {label}
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={S4_EXT}
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />

      {errorMsg && (
        <p className="text-[10px] text-red-500 flex items-center gap-1">
          <X size={10} /> {errorMsg}
        </p>
      )}
    </div>
  );
}

export default function RfiStage4Modal({ rfi, onSave, onClose }) {
  const { canAction } = useMenuPermissions();
  const { updateRfi } = useApp();
  const canEditRevision =
    canAction('rfi', 'editRfiStage4') ||
    canAction('rfi', 'editRfiStage3') ||
    canAction('rfi', 'editRfiStage2');
  const canUploadClientSign = canAction('rfi', 'uploadRfiS4ClientSign');
  const canUploadComplete = canAction('rfi', 'uploadRfiS4Complete');

  const initialRevisionHistory = getRevisionHistory(rfi);
  const initialSelectedRevision =
    initialRevisionHistory.find(item => item.revId === rfi.currentRevisionId) ||
    initialRevisionHistory[initialRevisionHistory.length - 1] ||
    createRevisionSnapshot(rfi);

  const [form, setForm] = useState({
    stage4Result: rfi.stage4Result || rfi.result || '',
    stage4Note: rfi.stage4Note || '',
    stage4Status: rfi.stage4Status || 'Waiting approve',
    stage4Attachment: rfi.stage4Attachment || rfi.stage3Attachment || '',
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
  const [revisionHistory, setRevisionHistory] = useState(initialRevisionHistory);
  const [selectedRevisionId, setSelectedRevisionId] = useState(initialSelectedRevision.revId);
  const [editingRevision, setEditingRevision] = useState(false);
  const [revisionForm, setRevisionForm] = useState(() => pickRevisionFields(initialSelectedRevision));

  const isUploadingDocuments = Object.values(uploadingSections).some(Boolean);
  const latestRevision = revisionHistory[revisionHistory.length - 1] || initialSelectedRevision;
  const selectedRevision =
    revisionHistory.find(item => item.revId === selectedRevisionId) ||
    latestRevision;
  const isLatestRevision = !!selectedRevision && !!latestRevision && selectedRevision.revId === latestRevision.revId;
  const revisionPreview =
    editingRevision && isLatestRevision && selectedRevision
      ? { ...selectedRevision, ...revisionForm }
      : selectedRevision;
  const latestRevisionPreview =
    editingRevision && isLatestRevision && latestRevision?.revId === selectedRevision?.revId
      ? { ...latestRevision, ...revisionForm }
      : latestRevision;
  const revisionFolderPrefix = selectedRevision ? `rev-${String(selectedRevision.revNo || 1).padStart(2, '0')}` : 'rev-01';

  const resultStyle = {
    Pass: 'bg-green-50 border-green-200 text-green-700',
    Reject: 'bg-red-50 border-red-200 text-red-700',
    Comment: 'bg-amber-50 border-amber-200 text-amber-700',
    'Pass with comment': 'bg-teal-50 border-teal-200 text-teal-700',
  };

  const set = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const setRevisionField = field => e => setRevisionForm(prev => ({ ...prev, [field]: e.target.value }));
  const setRevisionFiles = field => valueOrUpdater => {
    setRevisionForm(prev => {
      const currentFiles = Array.isArray(prev[field]) ? prev[field] : [];
      const nextFiles = typeof valueOrUpdater === 'function'
        ? valueOrUpdater(currentFiles)
        : valueOrUpdater;
      return { ...prev, [field]: cloneFileEntries(nextFiles) };
    });
  };

  function handleUploadingChange(section, isUploading) {
    setUploadingSections(prev => {
      if (prev[section] === isUploading) return prev;
      return { ...prev, [section]: isUploading };
    });
  }

  function getCurrentStatusDoc(nextStage4Status) {
    return nextStage4Status || workflowStatus || form.stage4Status || rfi.stage4Status || rfi.statusDoc || '';
  }

  function resetRevisionEditor(targetRevision = selectedRevision || latestRevision) {
    setEditingRevision(false);
    setRevisionForm(pickRevisionFields(targetRevision || latestRevision || rfi));
  }

  function selectRevision(targetRevision) {
    setSelectedRevisionId(targetRevision.revId);
    setEditingRevision(false);
    setRevisionForm(pickRevisionFields(targetRevision));
  }

  function getRevisionCommitState() {
    if (!latestRevisionPreview) return { revision: null, history: revisionHistory, edited: false };

    if (editingRevision && isLatestRevision && selectedRevision) {
      const nextRevision = createRevisionSnapshot(
        { ...selectedRevision, ...revisionForm },
        {
          revId: selectedRevision.revId,
          revNo: selectedRevision.revNo,
          createdAt: selectedRevision.createdAt,
          updatedAt: new Date().toISOString(),
          basedOnRevNo: selectedRevision.basedOnRevNo ?? null,
        },
      );
      const nextHistory = revisionHistory.map(item => (item.revId === selectedRevision.revId ? nextRevision : item));
      return { revision: nextRevision, history: nextHistory, edited: true };
    }

    return { revision: latestRevisionPreview, history: revisionHistory, edited: false };
  }

  function syncRevisionStateLocal(revisionState) {
    if (!revisionState?.revision) return;
    setRevisionHistory(revisionState.history);
    setSelectedRevisionId(revisionState.revision.revId);
    setRevisionForm(pickRevisionFields(revisionState.revision));
  }

  async function persist(changes, nextStatus) {
    setSaving(true);
    setSaveError('');
    try {
      await updateRfi(rfi.id, changes);
      if (nextStatus != null) setWorkflowStatus(nextStatus);
      return true;
    } catch (err) {
      setSaveError(err?.message ?? 'Save failed');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateRevision() {
    if (!canEditRevision || saving) return;

    const baseRevision = latestRevisionPreview || latestRevision || createRevisionSnapshot(rfi);
    const now = new Date().toISOString();
    const nextRevision = createRevisionSnapshot(baseRevision, {
      revId: createRevisionId(),
      revNo: (latestRevision?.revNo || revisionHistory.length || 0) + 1,
      createdAt: now,
      updatedAt: now,
      basedOnRevNo: latestRevision?.revNo || baseRevision.revNo || null,
    });
    const nextHistory = [...revisionHistory, nextRevision];

    const ok = await persist({
      ...createRevisionPersistPayload(nextRevision, nextHistory, getCurrentStatusDoc()),
      stage: 4,
    });
    if (!ok) return;

    setRevisionHistory(nextHistory);
    setSelectedRevisionId(nextRevision.revId);
    setRevisionForm(pickRevisionFields(nextRevision));
    setEditingRevision(true);
  }

  async function handleSaveRevision() {
    if (!canEditRevision || !selectedRevision || !isLatestRevision) return;

    const revisionState = getRevisionCommitState();
    const ok = await persist({
      ...createRevisionPersistPayload(revisionState.revision, revisionState.history, getCurrentStatusDoc()),
      stage: 4,
    });
    if (!ok) return;

    syncRevisionStateLocal(revisionState);
    setEditingRevision(false);
  }

  async function persistStage4Changes(extraChanges, nextStatus) {
    const revisionState = getRevisionCommitState();
    const payload = {
      ...(revisionState.revision
        ? createRevisionPersistPayload(revisionState.revision, revisionState.history, getCurrentStatusDoc(nextStatus))
        : {}),
      ...form,
      ...extraChanges,
      stage: 4,
      stage4Status: nextStatus ?? extraChanges.stage4Status ?? form.stage4Status ?? rfi.stage4Status ?? '',
      statusDoc: nextStatus ?? extraChanges.stage4Status ?? form.stage4Status ?? rfi.stage4Status ?? '',
      statusInsp: revisionState.revision?.result || latestRevisionPreview?.result || rfi.result || rfi.statusInsp || '',
    };

    const ok = await persist(payload, nextStatus);
    if (!ok) return false;

    syncRevisionStateLocal(revisionState);
    return true;
  }

  return (
    <Modal title={`Complete Document — Stage 4 (${rfi.rfiNo})`} onClose={onClose} size="lg">
      <div className="mb-5 bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">S4</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-green-800">Complete Document — QC Doc Center</div>
          <div className="text-[11px] text-green-600 mt-0.5">
            Ref: <span className="font-semibold">{revisionPreview?.requestNo || rfi.requestNo}</span> • {revisionPreview?.typeOfInspection || rfi.typeOfInspection}
          </div>
          <div className="text-[11px] text-green-500 mt-0.5 truncate">
            {revisionPreview?.location || rfi.location} • {revisionPreview?.area || rfi.area}
          </div>
        </div>
      </div>

      <div className="mb-5 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Stage 1 Request Detail (Reference)</div>
            <div className="text-[11px] text-orange-600 mt-1">
              Showing <span className="font-semibold">Rev. {revisionPreview?.revNo || 1}</span>
              {isLatestRevision ? ' (Latest)' : ' (History)'}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canEditRevision && editingRevision && isLatestRevision && (
              <button
                type="button"
                onClick={() => resetRevisionEditor()}
                className="px-2.5 py-1 text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
              >
                Cancel
              </button>
            )}
            {canEditRevision && isLatestRevision && (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (editingRevision) {
                    handleSaveRevision();
                    return;
                  }
                  setEditingRevision(true);
                  setRevisionForm(pickRevisionFields(selectedRevision || latestRevision || rfi));
                }}
                className="px-2.5 py-1 text-[10px] font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-md transition-colors"
              >
                {editingRevision ? 'Save Rev.' : 'Edit Rev.'}
              </button>
            )}
            {canEditRevision && (
              <button
                type="button"
                disabled={saving}
                onClick={handleCreateRevision}
                className="px-2.5 py-1 text-[10px] font-semibold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-50 rounded-md transition-colors"
              >
                New Rev.
              </button>
            )}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {revisionHistory.map(rev => (
            <button
              key={rev.revId}
              type="button"
              onClick={() => selectRevision(rev)}
              className={`px-2.5 py-1 rounded-md border text-[10px] font-semibold transition-colors ${
                rev.revId === selectedRevision?.revId
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-white border-orange-200 text-orange-700 hover:border-orange-400'
              }`}
            >
              Rev. {rev.revNo}
            </button>
          ))}
        </div>

        {revisionPreview && (
          <div className="mb-3 rounded-lg border border-orange-200 bg-white/80 px-3 py-2 text-[10px] text-orange-700">
            <span className="font-semibold">Created:</span> {formatRevisionTimestamp(revisionPreview.createdAt) || '-'}
            {'  '}|{'  '}
            <span className="font-semibold">Updated:</span> {formatRevisionTimestamp(revisionPreview.updatedAt) || '-'}
            {revisionPreview.basedOnRevNo ? `  |  Based on Rev. ${revisionPreview.basedOnRevNo}` : ''}
          </div>
        )}

        {editingRevision && isLatestRevision ? (
          <>
            <FormGrid cols={3}>
              <FormField label="Request No.">
                <Input value={revisionForm.requestNo} onChange={setRevisionField('requestNo')} />
              </FormField>
              <FormField label="RFI No.">
                <Input value={revisionForm.rfiNo} onChange={setRevisionField('rfiNo')} />
              </FormField>
              <FormField label="Type of Inspection">
                <Input value={revisionForm.typeOfInspection} onChange={setRevisionField('typeOfInspection')} />
              </FormField>
              <FormField label="Tag No.">
                <Input value={revisionForm.tagNo} onChange={setRevisionField('tagNo')} />
              </FormField>
              <FormField label="Request Date (Internal)">
                <Input type="date" value={revisionForm.requestDateInternal} onChange={setRevisionField('requestDateInternal')} />
              </FormField>
              <FormField label="Request Time (Internal)">
                <Input type="time" value={revisionForm.requestTimeInternal} onChange={setRevisionField('requestTimeInternal')} />
              </FormField>
              <FormField label="Due Date">
                <Input type="date" value={revisionForm.dueDate} onChange={setRevisionField('dueDate')} />
              </FormField>
              <FormField label="Request Date (Owner)">
                <Input type="date" value={revisionForm.requestDateOwner} onChange={setRevisionField('requestDateOwner')} />
              </FormField>
              <FormField label="Request Time (Owner)">
                <Input type="time" value={revisionForm.requestTimeOwner} onChange={setRevisionField('requestTimeOwner')} />
              </FormField>
              <FormField label="Requested By">
                <Input value={revisionForm.requestedBy} onChange={setRevisionField('requestedBy')} />
              </FormField>
              <FormField label="Inspected By">
                <Input value={revisionForm.inspectedBy} onChange={setRevisionField('inspectedBy')} />
              </FormField>
              <FormField label="Location">
                <Input value={revisionForm.location} onChange={setRevisionField('location')} />
              </FormField>
              <FormField label="Area">
                <Input value={revisionForm.area} onChange={setRevisionField('area')} />
              </FormField>
              <FormField label="Working Step">
                <Input value={revisionForm.workingStep} onChange={setRevisionField('workingStep')} />
              </FormField>
              <FormField label="Structure Type">
                <Input value={revisionForm.structureType} onChange={setRevisionField('structureType')} />
              </FormField>
            </FormGrid>

            <div className="mt-3 rounded-lg border border-orange-200 bg-white/80 p-3">
              <FormField label="Detail of Inspection">
                <Textarea value={revisionForm.detailInspection} onChange={setRevisionField('detailInspection')} rows={3} />
              </FormField>
            </div>

            <div className="mt-3 rounded-lg border border-orange-200 bg-white/80 p-3">
              <FormField label="Refer Drawing / Markup Drawing">
                <Textarea value={revisionForm.referDrawing} onChange={setRevisionField('referDrawing')} rows={2} />
              </FormField>
              <div className="mt-3">
                <Stage4Uploader
                  label="Upload Refer Drawing Files"
                  files={Array.isArray(revisionForm.referDrawingFiles) ? revisionForm.referDrawingFiles : []}
                  setFiles={setRevisionFiles('referDrawingFiles')}
                  projectId={rfi.projectId}
                  requestNo={revisionForm.requestNo || rfi.requestNo}
                  folder={`${revisionFolderPrefix}/stage1-refer`}
                  pathPrefix="rfi-revisions"
                  disabled={!editingRevision || !isLatestRevision}
                  onUploadingChange={(isUploading) => handleUploadingChange('rev-stage1-files', isUploading)}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <ReferenceField label="Request No." value={revisionPreview?.requestNo} tone="orange" />
              <ReferenceField label="RFI No." value={revisionPreview?.rfiNo} tone="orange" />
              <ReferenceField label="Type of Inspection" value={revisionPreview?.typeOfInspection} tone="orange" />
              <ReferenceField label="Tag No." value={revisionPreview?.tagNo} tone="orange" />
              <ReferenceField label="Request Date (Internal)" value={revisionPreview?.requestDateInternal} tone="orange" />
              <ReferenceField label="Request Time (Internal)" value={revisionPreview?.requestTimeInternal} tone="orange" />
              <ReferenceField label="Due Date" value={revisionPreview?.dueDate} tone="orange" />
              <ReferenceField label="Request Date (Owner)" value={revisionPreview?.requestDateOwner} tone="orange" />
              <ReferenceField label="Request Time (Owner)" value={revisionPreview?.requestTimeOwner} tone="orange" />
              <ReferenceField label="Requested By" value={revisionPreview?.requestedBy} tone="orange" />
              <ReferenceField label="Inspected By" value={revisionPreview?.inspectedBy} tone="orange" />
              <ReferenceField label="Location" value={revisionPreview?.location} tone="orange" />
              <ReferenceField label="Area" value={revisionPreview?.area} tone="orange" />
              <ReferenceField label="Working Step" value={revisionPreview?.workingStep} tone="orange" />
              <ReferenceField label="Structure Type" value={revisionPreview?.structureType} tone="orange" />
            </div>
            <div className="mt-3 rounded-lg border border-orange-200 bg-white/80 p-3">
              <div className="text-[10px] font-semibold text-orange-400 mb-1">Detail of Inspection</div>
              <div className="text-[11px] text-orange-800 whitespace-pre-wrap min-h-[20px]">{revisionPreview?.detailInspection || '—'}</div>
            </div>
            {(!Array.isArray(revisionPreview?.referDrawingFiles) || revisionPreview.referDrawingFiles.length === 0) && (
              <div className="mt-3 rounded-lg border border-orange-200 bg-white/80 p-3">
                <div className="text-[10px] font-semibold text-orange-400 mb-1">Refer Drawing / Markup Drawing</div>
                <div className="text-[11px] text-orange-800 whitespace-pre-wrap min-h-[20px]">{revisionPreview?.referDrawing || '—'}</div>
              </div>
            )}
            <ReferenceFileList
              title="Refer Drawing / Markup Drawing"
              files={Array.isArray(revisionPreview?.referDrawingFiles) ? revisionPreview.referDrawingFiles : []}
              tone="orange"
            />
          </>
        )}
      </div>

      <div className="mb-5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-2">Stage 2 Client Issue (Reference)</div>

        {editingRevision && isLatestRevision ? (
          <>
            <FormGrid cols={3}>
              <FormField label="Work Step">
                <Input value={revisionForm.inspectionPackage} onChange={setRevisionField('inspectionPackage')} />
              </FormField>
              <FormField label="Schedule Date">
                <Input type="date" value={revisionForm.inspectionScheduleDate} onChange={setRevisionField('inspectionScheduleDate')} />
              </FormField>
              <FormField label="Schedule Time">
                <Input type="time" value={revisionForm.inspectionScheduleTime} onChange={setRevisionField('inspectionScheduleTime')} />
              </FormField>
              <FormField label="Email Status">
                <Select value={revisionForm.stage2EmailStatus} onChange={setRevisionField('stage2EmailStatus')}>
                  <option value="">Pending</option>
                  <option value="ok">Sent</option>
                </Select>
              </FormField>
            </FormGrid>
            <div className="mt-3 rounded-lg border border-blue-200 bg-white/80 p-3">
              <FormField label="Inspection Scope">
                <Textarea value={revisionForm.descriptionOfInspection} onChange={setRevisionField('descriptionOfInspection')} rows={3} />
              </FormField>
            </div>
            <div className="mt-3 rounded-lg border border-blue-200 bg-white/80 p-3">
              <FormField label="Stage 2 Note">
                <Textarea value={revisionForm.stage2Note} onChange={setRevisionField('stage2Note')} rows={2} />
              </FormField>
              <div className="mt-3">
                <Stage4Uploader
                  label="Upload Stage 2 Files"
                  files={Array.isArray(revisionForm.stage2Files) ? revisionForm.stage2Files : []}
                  setFiles={setRevisionFiles('stage2Files')}
                  projectId={rfi.projectId}
                  requestNo={revisionForm.requestNo || rfi.requestNo}
                  folder={`${revisionFolderPrefix}/stage2-files`}
                  pathPrefix="rfi-revisions"
                  disabled={!editingRevision || !isLatestRevision}
                  onUploadingChange={(isUploading) => handleUploadingChange('rev-stage2-files', isUploading)}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <ReferenceField label="Work Step" value={revisionPreview?.inspectionPackage} tone="blue" />
              <ReferenceField label="Schedule Date" value={revisionPreview?.inspectionScheduleDate} tone="blue" />
              <ReferenceField label="Schedule Time" value={revisionPreview?.inspectionScheduleTime} tone="blue" />
              <ReferenceField
                label="Email Status"
                value={revisionPreview?.stage2EmailStatus === 'ok' ? 'Sent' : 'Pending'}
                tone="blue"
              />
              <ReferenceField label="Status Doc" value={workflowStatus || form.stage4Status || rfi.stage4Status || rfi.statusDoc} tone="blue" />
              <ReferenceField label="Status Insp" value={latestRevisionPreview?.result || rfi.result || rfi.statusInsp} tone="blue" />
            </div>
            <div className="mt-3 rounded-lg border border-blue-200 bg-white/80 p-3">
              <div className="text-[10px] font-semibold text-blue-400 mb-1">Inspection Scope</div>
              <div className="text-[11px] text-blue-800 whitespace-pre-wrap min-h-[20px]">{revisionPreview?.descriptionOfInspection || '—'}</div>
            </div>
            <div className="mt-3 rounded-lg border border-blue-200 bg-white/80 p-3">
              <div className="text-[10px] font-semibold text-blue-400 mb-1">Stage 2 Note</div>
              <div className="text-[11px] text-blue-800 whitespace-pre-wrap min-h-[20px]">{revisionPreview?.stage2Note || '—'}</div>
            </div>
            <ReferenceFileList
              title="Stage 2 Files"
              files={Array.isArray(revisionPreview?.stage2Files) ? revisionPreview.stage2Files : []}
              tone="blue"
            />
          </>
        )}
      </div>

      <div className="mb-5 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
        <div className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-2">Stage 3 Inspection Result (Reference)</div>

        {editingRevision && isLatestRevision ? (
          <>
            <FormGrid cols={3}>
              <FormField label="Inspection Date">
                <Input type="date" value={revisionForm.inspectionDate} onChange={setRevisionField('inspectionDate')} />
              </FormField>
              <FormField label="Onsite Result">
                <Select value={revisionForm.result} onChange={setRevisionField('result')}>
                  <option value="">— Select Result —</option>
                  {RESULT_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Stage 3 Attachment URL">
                <Input value={revisionForm.stage3Attachment} onChange={setRevisionField('stage3Attachment')} />
              </FormField>
            </FormGrid>
            <div className="mt-3 rounded-lg border border-purple-200 bg-white/80 p-3">
              <FormField label="Inspector Note">
                <Textarea value={revisionForm.stage3Note} onChange={setRevisionField('stage3Note')} rows={3} />
              </FormField>
            </div>
            <div className="mt-3 rounded-lg border border-purple-200 bg-white/80 p-3">
              <div className="mb-2 text-[10px] font-semibold text-purple-500 uppercase tracking-wider">Concrete / Material Test (if applicable)</div>
              <FormGrid cols={4}>
                <FormField label="Concrete Date">
                  <Input type="date" value={revisionForm.concretePourDate} onChange={setRevisionField('concretePourDate')} />
                </FormField>
                <FormField label="Brand">
                  <Input value={revisionForm.brand} onChange={setRevisionField('brand')} />
                </FormField>
                <FormField label="Actual Qty">
                  <Input type="number" min="0" step="any" value={revisionForm.cementQty} onChange={setRevisionField('cementQty')} />
                </FormField>
                <FormField label="Unit">
                  <Input value={revisionForm.cementUnit} onChange={setRevisionField('cementUnit')} />
                </FormField>
                <FormField label="Status 7 Day">
                  <Select value={revisionForm.status7Day} onChange={setRevisionField('status7Day')}>
                    {STATUS_OPTIONS.map(option => (
                      <option key={option || 'empty-7'} value={option}>{option || '—'}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Status 28 Day">
                  <Select value={revisionForm.status28Day} onChange={setRevisionField('status28Day')}>
                    {STATUS_OPTIONS.map(option => (
                      <option key={option || 'empty-28'} value={option}>{option || '—'}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Steel Test">
                  <Select value={revisionForm.steelTestResult} onChange={setRevisionField('steelTestResult')}>
                    {TEST_OPTIONS.map(option => (
                      <option key={option || 'empty-steel'} value={option}>{option || '—'}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Soil Test">
                  <Select value={revisionForm.soilTestResult} onChange={setRevisionField('soilTestResult')}>
                    {TEST_OPTIONS.map(option => (
                      <option key={option || 'empty-soil'} value={option}>{option || '—'}</option>
                    ))}
                  </Select>
                </FormField>
              </FormGrid>
              <div className="mt-3">
                <FormField label="Cement Bill Link">
                  <Input value={revisionForm.cementBillLink} onChange={setRevisionField('cementBillLink')} />
                </FormField>
              </div>
              <div className="mt-3">
                <Stage4Uploader
                  label="Upload Inspector Files"
                  files={Array.isArray(revisionForm.stage3InspectorFiles) ? revisionForm.stage3InspectorFiles : []}
                  setFiles={setRevisionFiles('stage3InspectorFiles')}
                  projectId={rfi.projectId}
                  requestNo={revisionForm.requestNo || rfi.requestNo}
                  folder={`${revisionFolderPrefix}/stage3-inspector`}
                  pathPrefix="rfi-revisions"
                  disabled={!editingRevision || !isLatestRevision}
                  onUploadingChange={(isUploading) => handleUploadingChange('rev-stage3-files', isUploading)}
                />
              </div>
              <div className="mt-3">
                <Stage4Uploader
                  label="Upload Cement Bill Files"
                  files={Array.isArray(revisionForm.cementBillFiles) ? revisionForm.cementBillFiles : []}
                  setFiles={setRevisionFiles('cementBillFiles')}
                  projectId={rfi.projectId}
                  requestNo={revisionForm.requestNo || rfi.requestNo}
                  folder={`${revisionFolderPrefix}/cement-bill`}
                  pathPrefix="rfi-revisions"
                  disabled={!editingRevision || !isLatestRevision}
                  onUploadingChange={(isUploading) => handleUploadingChange('rev-cement-files', isUploading)}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <ReferenceField label="Inspection Date" value={revisionPreview?.inspectionDate} tone="purple" />
              <div>
                <div className="text-[10px] text-purple-400 font-semibold">Onsite Result</div>
                <div className="mt-0.5">
                  {revisionPreview?.result ? (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${resultStyle[revisionPreview.result] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {revisionPreview.result}
                    </span>
                  ) : (
                    <span className="text-xs text-purple-400">Not yet filled</span>
                  )}
                </div>
              </div>
              <ReferenceField label="Stage 3 Attachment" value={revisionPreview?.stage3Attachment} tone="purple" />
            </div>
            <div className="mt-3 rounded-lg border border-purple-200 bg-white/80 p-3">
              <div className="text-[10px] text-purple-400 font-semibold mb-1">Inspector Note</div>
              <div className="text-[11px] text-purple-700 whitespace-pre-wrap min-h-[20px]">{revisionPreview?.stage3Note || '—'}</div>
            </div>
            <div className="mt-3 rounded-lg border border-purple-200 bg-white/80 p-3">
              <div className="mb-2 text-[10px] font-semibold text-purple-500 uppercase tracking-wider">Concrete / Material Test (if applicable)</div>
              <div className="grid grid-cols-4 gap-3">
                <ReferenceField label="Concrete Date" value={revisionPreview?.concretePourDate} tone="purple" />
                <ReferenceField label="Brand" value={revisionPreview?.brand} tone="purple" />
                <ReferenceField label="Actual Qty" value={revisionPreview?.cementQty} tone="purple" />
                <ReferenceField label="Unit" value={revisionPreview?.cementUnit} tone="purple" />
                <ReferenceField label="Status 7 Day" value={revisionPreview?.status7Day} tone="purple" />
                <ReferenceField label="Status 28 Day" value={revisionPreview?.status28Day} tone="purple" />
                <ReferenceField label="Steel Test" value={revisionPreview?.steelTestResult} tone="purple" />
                <ReferenceField label="Soil Test" value={revisionPreview?.soilTestResult} tone="purple" />
              </div>
              {revisionPreview?.cementBillLink && (
                <div className="mt-3 rounded-lg border border-purple-100 bg-purple-50/50 p-3">
                  <div className="text-[10px] font-semibold text-purple-400 mb-1">Cement Bill Link</div>
                  <a
                    href={revisionPreview.cementBillLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-purple-700 hover:underline break-all"
                  >
                    {revisionPreview.cementBillLink}
                  </a>
                </div>
              )}
            </div>
            <ReferenceFileList
              title="Inspector Files (Stage 3)"
              files={Array.isArray(revisionPreview?.stage3InspectorFiles) ? revisionPreview.stage3InspectorFiles : []}
              tone="purple"
            />
            <ReferenceFileList
              title="Cement Bill Files"
              files={Array.isArray(revisionPreview?.cementBillFiles) ? revisionPreview.cementBillFiles : []}
              tone="purple"
            />
          </>
        )}
      </div>

      <div className="space-y-5">
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Document Workflow (Stage 4)</div>
              <div className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                Status: <span className="text-slate-900">{workflowStatus || form.stage4Status || '—'}</span>
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
          <Textarea
            value={form.stage4Note}
            onChange={set('stage4Note')}
            placeholder="Final remarks, conditions, document filing instructions..."
            rows={3}
          />
        </FormField>

        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Document Uploads</div>

          <FormField label="Step 1 — QC Sign (Upload)">
            <Stage4Uploader
              label={canUploadClientSign ? 'Upload QC Sign' : 'View only'}
              files={clientSignFiles}
              setFiles={setClientSignFiles}
              projectId={rfi.projectId}
              requestNo={latestRevisionPreview?.requestNo || rfi.requestNo}
              folder="qc-sign"
              disabled={!canUploadClientSign}
              locked={completeFiles.length > 0}
              onUploadingChange={(isUploading) => handleUploadingChange('qc-sign', isUploading)}
              onUploaded={async (merged) => {
                const next = S4_WORKFLOW.QC_SIGNED;
                await persistStage4Changes({
                  stage4ClientSignFiles: merged,
                }, next);
              }}
              onRemoved={async (remaining) => {
                const next = remaining.length === 0 ? 'Waiting approve' : S4_WORKFLOW.QC_SIGNED;
                await persistStage4Changes({
                  stage4ClientSignFiles: remaining,
                }, next);
              }}
              accentColor="teal"
            />
          </FormField>

          <FormField label="Step 2 — Contractor Signed (Upload)">
            <Stage4Uploader
              label={clientSignFiles.length === 0 ? 'Wait for Step 1' : canUploadComplete ? 'Upload Contractor Sign' : 'View only'}
              files={completeFiles}
              setFiles={setCompleteFiles}
              projectId={rfi.projectId}
              requestNo={latestRevisionPreview?.requestNo || rfi.requestNo}
              folder="contractor-sign"
              disabled={(clientSignFiles.length === 0 && completeFiles.length === 0) || !canUploadComplete}
              locked={ownerSignFiles.length > 0}
              onUploadingChange={(isUploading) => handleUploadingChange('contractor-sign', isUploading)}
              onUploaded={async (merged) => {
                const next = S4_WORKFLOW.CONTRACTOR_SIGNED;
                await persistStage4Changes({
                  stage4CompleteFiles: merged,
                }, next);
              }}
              onRemoved={async (remaining) => {
                const next = remaining.length === 0 ? S4_WORKFLOW.QC_SIGNED : S4_WORKFLOW.CONTRACTOR_SIGNED;
                await persistStage4Changes({
                  stage4CompleteFiles: remaining,
                }, next);
              }}
              accentColor="green"
            />
          </FormField>

          <FormField label="Step 3 — Owner Sign (Upload)">
            <Stage4Uploader
              label={completeFiles.length === 0 ? 'Wait for Step 2' : canUploadComplete ? 'Upload Owner Sign' : 'View only'}
              files={ownerSignFiles}
              setFiles={setOwnerSignFiles}
              projectId={rfi.projectId}
              requestNo={latestRevisionPreview?.requestNo || rfi.requestNo}
              folder="owner-sign"
              disabled={(completeFiles.length === 0 && ownerSignFiles.length === 0) || !canUploadComplete}
              onUploadingChange={(isUploading) => handleUploadingChange('owner-sign', isUploading)}
              onUploaded={async (merged) => {
                const next = S4_WORKFLOW.RFI_CLOSED;
                await persistStage4Changes({
                  stage4OwnerSignFiles: merged,
                }, next);
              }}
              onRemoved={async (remaining) => {
                const next = remaining.length === 0 ? S4_WORKFLOW.CONTRACTOR_SIGNED : S4_WORKFLOW.RFI_CLOSED;
                await persistStage4Changes({
                  stage4OwnerSignFiles: remaining,
                }, next);
              }}
              accentColor="green"
            />
          </FormField>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || isUploadingDocuments}
            onClick={async () => {
              const ok = await persistStage4Changes({}, workflowStatus || form.stage4Status || rfi.stage4Status || '');
              if (!ok) return;
              if (editingRevision && isLatestRevision) setEditingRevision(false);
              onClose();
            }}
            className="px-6 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            title={isUploadingDocuments ? 'Please wait for uploads to finish' : 'Save form fields and close modal'}
          >
            {isUploadingDocuments ? 'Uploading...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
