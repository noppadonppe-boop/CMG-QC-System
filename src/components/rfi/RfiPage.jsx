import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Search, Eye, Pencil, ArrowRight, Trash2,
  AlertTriangle, Clock, FileCheck2, Send,
  ClipboardCheck, X, Download, Upload, Loader2,
  Filter, SlidersHorizontal, Check
} from 'lucide-react';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { useApp }  from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import { storage } from '../../config/firebase';
import RfiStage1Modal from './RfiStage1Modal';
import RfiStage2Modal from './RfiStage2Modal';
import RfiStage3Modal from './RfiStage3Modal';
import RfiStage4Modal from './RfiStage4Modal';
import RfiDetailModal from './RfiDetailModal';
import TableColumnVisibility from '../common/TableColumnVisibility';

// โ”€โ”€ Stage config โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
const STAGES = [
  {
    id: 1,
    label: 'Stage 1',
    title: 'RFI Request',
    subtitle: 'Created by QcDocCenter',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    headerBg: 'bg-orange-500',
    dot: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-700',
  },
  {
    id: 2,
    label: 'Stage 2',
    title: 'Issued to Client',
    subtitle: 'Scheduled for inspection',
    icon: Send,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    headerBg: 'bg-blue-600',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    id: 3,
    label: 'Stage 3',
    title: 'Onsite Inspection',
    subtitle: 'Filled by SiteQcInspector',
    icon: ClipboardCheck,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    headerBg: 'bg-purple-600',
    dot: 'bg-purple-500',
    badge: 'bg-purple-100 text-purple-700',
  },
  {
    id: 4,
    label: 'Stage 4',
    title: 'Document Complete',
    subtitle: 'Closed by QcDocCenter',
    icon: FileCheck2,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    headerBg: 'bg-green-600',
    dot: 'bg-green-500',
    badge: 'bg-green-100 text-green-700',
  },
];

const RESULT_COLORS = {
  'Pass':              'bg-green-100 text-green-700',
  'Reject':            'bg-red-100 text-red-700',
  'Comment':           'bg-amber-100 text-amber-700',
  'Pass with comment': 'bg-teal-100 text-teal-700',
  'Pending':           'bg-slate-100 text-slate-500',
};

const RFI_TABLE_COLUMNS = [
  { key: 'row', label: '#' },
  { key: 'rfiNo', label: 'RFI No.' },
  { key: 'requestNo', label: 'Request No.' },
  { key: 'type', label: 'Type' },
  { key: 'tagNo', label: 'Tag No.' },
  { key: 'location', label: 'Location' },
  { key: 'area', label: 'Area', defaultHidden: true },
  { key: 'requestDateInternal', label: 'Stage 1 Request Date (Internal)', defaultHidden: true },
  { key: 'requestTimeInternal', label: 'Stage 1 Request Time (Internal)', defaultHidden: true },
  { key: 'requestDateOwner', label: 'Stage 1 Request Date (Owner)', defaultHidden: true },
  { key: 'requestTimeOwner', label: 'Stage 1 Request Time (Owner)', defaultHidden: true },
  { key: 'workingStep', label: 'Stage 1 Working Step', defaultHidden: true },
  { key: 'structureType', label: 'Stage 1 Structure Type', defaultHidden: true },
  { key: 'requestedBy', label: 'Stage 1 Requested By', defaultHidden: true },
  { key: 'inspectedBy', label: 'Stage 1 Inspected By', defaultHidden: true },
  { key: 'detailInspection', label: 'Stage 1 Detail', defaultHidden: true },
  { key: 'dueDate', label: 'Issue Date' },
  { key: 'stage', label: 'Stage' },
  { key: 'inspectionPackage', label: 'Stage 2 Work Step', defaultHidden: true },
  { key: 'inspectionScheduleDate', label: 'Stage 2 Schedule Date', defaultHidden: true },
  { key: 'inspectionScheduleTime', label: 'Stage 2 Schedule Time', defaultHidden: true },
  { key: 'descriptionOfInspection', label: 'Stage 2 Inspection Scope', defaultHidden: true },
  { key: 'stage2Note', label: 'Stage 2 Note', defaultHidden: true },
  { key: 'stage2EmailStatus', label: 'Stage 2 Email Status', defaultHidden: true },
  { key: 'inspectionDate', label: 'Stage 3 Inspection Date', defaultHidden: true },
  { key: 'stage3Result', label: 'Stage 3 Result', defaultHidden: true },
  { key: 'stage3Note', label: 'Stage 3 Note', defaultHidden: true },
  { key: 'concretePourDate', label: 'Stage 3 Concrete Pour Date', defaultHidden: true },
  { key: 'brand', label: 'Stage 3 Cement Brand', defaultHidden: true },
  { key: 'cementQty', label: 'Stage 3 Cement Qty', defaultHidden: true },
  { key: 'cementUnit', label: 'Stage 3 Cement Unit', defaultHidden: true },
  { key: 'steelTestResult', label: 'Stage 3 Steel Test', defaultHidden: true },
  { key: 'soilTestResult', label: 'Stage 3 Soil Test', defaultHidden: true },
  { key: 'stage4Status', label: 'Stage 4 Status', defaultHidden: true },
  { key: 'stage4Note', label: 'Stage 4 Note', defaultHidden: true },
  { key: 'stage4Progress', label: 'Stage 4 Progress', defaultHidden: true },
  { key: 'statusInsp', label: 'Status Insp.' },
  { key: 'statusDoc', label: 'Status Doc' },
  { key: 'test7', label: '7-Day Test' },
  { key: 'test28', label: '28-Day Test' },
  { key: 'actions', label: 'Actions', locked: true },
];

const TEST_RESULT_MIME = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const TEST_RESULT_EXT = '.pdf,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp';
const TEST_RESULT_MAX_MB = null;
const EMPTY_VALUE = '-';

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(dateString, days) {
  if (!dateString) return null;
  const value = startOfDay(dateString);
  if (Number.isNaN(value.getTime())) return null;
  value.setDate(value.getDate() + days);
  return value;
}

function formatDate(date) {
  if (!date) return EMPTY_VALUE;
  return date.toISOString().slice(0, 10);
}

function getUserDisplayName(user) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  const email = (user?.email || '').trim();
  if (!email) return '';
  return email.includes('@') ? email.split('@')[0] : email;
}

function isConcreteTestSkipped(rfi) {
  return !!(rfi?.concreteTestSkip || rfi?.status7Day === 'Skipped' || rfi?.status28Day === 'Skipped');
}

function getConcreteTestAlerts(rfi) {
  const isSkipped = isConcreteTestSkipped(rfi);
  if (!rfi.concretePourDate) {
    return {
      due7Date: null,
      due28Date: null,
      is7Due: false,
      is28Due: false,
      isSkipped,
      is7Uploaded: Array.isArray(rfi.test7DayFiles) && rfi.test7DayFiles.length > 0,
      is28Uploaded: Array.isArray(rfi.test28DayFiles) && rfi.test28DayFiles.length > 0,
      hasPendingAlert: false,
    };
  }
  const today = startOfDay(new Date());
  const due7Date = addDays(rfi.concretePourDate, 7);
  const due28Date = addDays(rfi.concretePourDate, 28);
  const is7Uploaded = Array.isArray(rfi.test7DayFiles) && rfi.test7DayFiles.length > 0;
  const is28Uploaded = Array.isArray(rfi.test28DayFiles) && rfi.test28DayFiles.length > 0;
  const is7Due = !isSkipped && !!due7Date && due7Date <= today && !is7Uploaded;
  const is28Due = !isSkipped && !!due28Date && due28Date <= today && !is28Uploaded;
  return {
    due7Date,
    due28Date,
    is7Due,
    is28Due,
    isSkipped,
    is7Uploaded,
    is28Uploaded,
    hasPendingAlert: is7Due || is28Due,
  };
}

function getStage4CompletedSteps(rfi) {
  return [
    Array.isArray(rfi.stage4ClientSignFiles) && rfi.stage4ClientSignFiles.length > 0,
    Array.isArray(rfi.stage4CompleteFiles) && rfi.stage4CompleteFiles.length > 0,
    Array.isArray(rfi.stage4OwnerSignFiles) && rfi.stage4OwnerSignFiles.length > 0,
  ].filter(Boolean).length;
}

function getStage4ProgressPercent(rfi) {
  return Math.round((getStage4CompletedSteps(rfi) / 3) * 100);
}

function getDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const parsed = value.toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function shouldShowStage3Reject(rfi) {
  if (rfi.stage !== 3 || rfi.result !== 'Reject') return true;
  const rejectAt = getDateValue(rfi.stage3RejectAt || rfi.updatedAt);
  if (!rejectAt) return true;
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
  return Date.now() - rejectAt.getTime() < threeDaysInMs;
}

function sortStageRfis(stageId, rfis) {
  if (stageId !== 4) return rfis;
  return [...rfis].sort((a, b) => {
    const aHasAlert = getConcreteTestAlerts(a).hasPendingAlert ? 1 : 0;
    const bHasAlert = getConcreteTestAlerts(b).hasPendingAlert ? 1 : 0;
    return bHasAlert - aHasAlert;
  });
}

function getRfiFieldValue(rfi, key) {
  switch (key) {
    case 'rfiNo': return rfi.rfiNo || '';
    case 'requestNo': return rfi.requestNo || '';
    case 'type': return rfi.typeOfInspection || '';
    case 'tagNo': return rfi.tagNo || '';
    case 'location': return rfi.location || '';
    case 'area': return rfi.area || '';
    case 'dueDate': return rfi.dueDate || '';
    case 'stage': return STAGES[rfi.stage - 1]?.label || '';
    case 'statusInsp': return rfi.statusInsp || '';
    case 'statusDoc': return rfi.statusDoc || '';
    case 'workingStep': return rfi.workingStep || '';
    case 'structureType': return rfi.structureType || '';
    case 'requestedBy': return rfi.requestedBy || '';
    case 'inspectedBy': return rfi.inspectedBy || '';
    case 'inspectionPackage': return rfi.inspectionPackage || '';
    case 'stage3Result': return rfi.result || '';
    case 'brand': return rfi.brand || '';
    case 'cementQty': return rfi.cementQty || '';
    case 'cementUnit': return rfi.cementUnit || '';
    case 'steelTestResult': return rfi.steelTestResult || '';
    case 'soilTestResult': return rfi.soilTestResult || '';
    case 'stage4Status': return rfi.stage4Status || '';
    default: return '';
  }
}

// โ”€โ”€ Per-Column Filter Dropdown โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
function ColumnFilterDropdown({ colKey, label, allDocs, activeValues, onChange }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const ref                 = useRef(null);

  const options = useMemo(() => {
    const set = new Set();
    allDocs.forEach(d => { const v = getRfiFieldValue(d, colKey); if (v) set.add(v); });
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allDocs, colKey]);

  const filtered = search ? options.filter(o => o.toLowerCase().includes(search.toLowerCase())) : options;
  const hasActive = activeValues.length > 0;

  useEffect(() => {
    if (!open) return;
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function toggle(val) {
    onChange(activeValues.includes(val) ? activeValues.filter(v => v !== val) : [...activeValues, val]);
  }

  function selectAll()   { onChange([...options]); }
  function clearAll()    { onChange([]); }

  return (
    <div ref={ref} className="relative inline-flex" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        title={`Filter by ${label}`}
        className={`ml-1.5 w-4 h-4 rounded flex items-center justify-center transition-all ${
          hasActive
            ? 'bg-orange-500 text-white'
            : 'text-slate-400 hover:text-white hover:bg-slate-500/20'
        }`}
      >
        <SlidersHorizontal size={9} />
      </button>

      {open && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl w-52 overflow-hidden" style={{ minWidth: '180px' }}>
          {/* Header */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">{label}</span>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X size={11} />
            </button>
          </div>

          {/* Search within options */}
          {options.length > 6 && (
            <div className="px-2 pt-2">
              <input
                className="w-full text-slate-800 bg-white text-[10px] px-2 py-1 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}

          {/* Select all / Clear */}
          <div className="px-2 pt-1.5 flex gap-1.5">
            <button onClick={selectAll} className="flex-1 text-[9px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded px-1.5 py-0.5 transition-colors">All</button>
            <button onClick={clearAll}  className="flex-1 text-[9px] font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded px-1.5 py-0.5 transition-colors">Clear</button>
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-[10px] text-slate-400 text-center">No options</div>
            )}
            {filtered.map(val => (
              <label key={val} className="flex items-center gap-2 px-3 py-1.5 hover:bg-orange-50 cursor-pointer group">
                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                  activeValues.includes(val)
                    ? 'bg-orange-500 border-orange-500'
                    : 'border-slate-300 group-hover:border-orange-400'
                }`}>
                  {activeValues.includes(val) && <Check size={9} className="text-white" />}
                </div>
                <input type="checkbox" className="sr-only" checked={activeValues.includes(val)} onChange={() => toggle(val)} />
                <span className="text-[10px] text-slate-700 truncate" title={val}>{val || '(blank)'}</span>
              </label>
            ))}
          </div>

          {hasActive && (
            <div className="px-3 py-1.5 border-t border-slate-100 bg-orange-50">
              <span className="text-[9px] text-orange-600 font-medium">{activeValues.length} selected</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// โ”€โ”€ Confirm Delete modal โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
function ConfirmDeleteRfi({ rfi, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Delete RFI?</h3>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-1">
          <div className="text-xs font-bold text-slate-700 font-mono">{rfi.rfiNo}</div>
          <div className="text-[11px] text-slate-500">{rfi.typeOfInspection}</div>
          <div className="text-[10px] text-slate-400">{rfi.area} - {rfi.location}</div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Delete RFI</button>
        </div>
      </div>
    </div>
  );
}

function TestResultUploadCell({
  label,
  dueDate,
  isDue,
  isSkipped = false,
  files,
  uploading,
  canSkip = false,
  skipping = false,
  onUploadClick,
  onSkip,
  inputRef,
  onFileChange,
}) {
  const hasFiles = Array.isArray(files) && files.length > 0;
  const showUploadButton = isDue && !hasFiles && !isSkipped;

  return (
    <div className={`inline-flex max-w-full items-center gap-2 rounded-md border px-2 py-1 ${
      isSkipped ? 'border-amber-300 bg-amber-50' :
      isDue ? 'border-red-300 bg-red-50' :
      'border-slate-200 bg-white'
    }`}>
      <span className={`text-[10px] font-semibold whitespace-nowrap ${
        isSkipped ? 'text-amber-700' : 'text-slate-600'
      }`}>{label}</span>
      <span className={`text-[10px] whitespace-nowrap ${
        isSkipped ? 'text-amber-700 font-semibold' :
        isDue ? 'text-red-700 font-semibold' :
        'text-slate-500'
      }`}>
        Due: {formatDate(dueDate)}
      </span>
      {hasFiles ? (
        <a
          href={files[0].url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 hover:bg-green-200"
          title={files[0].name}
        >
          <span className="truncate max-w-[88px]">{files[0].name}</span>
        </a>
      ) : isSkipped ? (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 whitespace-nowrap">
          Not required
        </span>
      ) : showUploadButton ? (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={onUploadClick}
            disabled={uploading || skipping}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors whitespace-nowrap ${
              isDue
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            } disabled:opacity-60`}
          >
            {uploading ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          {canSkip && (
            <button
              type="button"
              onClick={onSkip}
              disabled={uploading || skipping}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-200 whitespace-nowrap disabled:opacity-60"
            >
              {skipping ? <Loader2 size={10} className="animate-spin" /> : null}
              {skipping ? 'Skipping...' : 'Skip'}
            </button>
          )}
        </div>
      ) : (
        <span className="text-[10px] text-slate-400 whitespace-nowrap">Waiting</span>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={TEST_RESULT_EXT}
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}

// โ”€โ”€ Per-stage action label config โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
const STAGE_ADVANCE = {
  1: { label: 'Issue ->',    color: 'bg-blue-600'   },
  2: { label: 'Inspect ->',  color: 'bg-purple-600' },
  3: { label: 'Complete ->', color: 'bg-green-600'  },
};

// โ”€โ”€ RFI Kanban Card โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
function RfiCard({ rfi, stage, canAdvance, canEdit, canDelete, onView, onEdit, onAdvance, onDelete }) {
  const isCurrentStage = rfi.stage === stage.id;
  const isDone         = rfi.stage > stage.id;
  const overdueTypes = [];
  if (rfi.requestDateOwner && rfi.stage < 4) {
    const reqDate = new Date(rfi.requestDateOwner);
    const isPass = String(rfi.result).toLowerCase() === 'pass';
    const now = new Date();

    if (isPass && rfi.inspectionDate) {
      const inspDate = new Date(rfi.inspectionDate);
      if (inspDate > reqDate) {
        overdueTypes.push('Overdue Inspect');
      }
      if (rfi.stage === 3) {
        const passPlus7 = new Date(inspDate);
        passPlus7.setDate(passPlus7.getDate() + 7);
        if (now > passPlus7) {
          overdueTypes.push('Overdue Compleate');
        }
      }
    } else if (!isPass) {
      if (now > reqDate) {
        overdueTypes.push('Overdue Inspect');
      }
    }
  }
  const overdueText = overdueTypes.join(', ');
  const concreteAlerts = getConcreteTestAlerts(rfi);
  const stage4CompletedSteps = getStage4CompletedSteps(rfi);
  const stage4ProgressPercent = getStage4ProgressPercent(rfi);
  const cardInspectionLabel = stage.id === 2
    ? (rfi.structureType || rfi.typeOfInspection)
    : rfi.typeOfInspection;

  const result = stage.id === 1 ? rfi.statusInsp
               : stage.id === 3 ? rfi.result
               : stage.id === 4 ? rfi.stage4Status
               : null;

  const advanceCfg = STAGE_ADVANCE[rfi.stage];

  const stage2Line = stage.id === 2
    ? [
        rfi.inspectionScheduleDate ? `${rfi.inspectionScheduleDate}${rfi.inspectionScheduleTime ? ' ' + rfi.inspectionScheduleTime : ''}` : null,
        rfi.stage2EmailStatus === 'ok' ? 'Send Email OK' : null,
      ].filter(Boolean).join(' - ')
    : null;

  return (
    <div
      className={`rounded-lg border shadow-sm p-2.5 transition-all hover:shadow-md cursor-pointer group
        ${isDone        ? `bg-white ${concreteAlerts.hasPendingAlert ? 'border-red-400' : 'border-slate-100'} opacity-60` :
          isCurrentStage ? `bg-white ${concreteAlerts.hasPendingAlert ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.18)]' : `${stage.border} shadow-sm`}` :
          'bg-white border-slate-100 opacity-40 pointer-events-none'}`}
      onClick={() => onView(rfi)}
    >
      {/* Top row: stage badge + RFI No. + Request No. */}
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${stage.badge}`}>S{rfi.stage}</span>
          <span className="text-[11px] font-bold text-slate-800 font-mono truncate">{rfi.rfiNo && rfi.rfiNo !== '-' ? rfi.rfiNo : rfi.requestNo}</span>
          {rfi.rfiNo && rfi.rfiNo !== '-' && (
            <span className="text-[10px] text-slate-500 truncate">{rfi.requestNo}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {concreteAlerts.hasPendingAlert && (
            <AlertTriangle size={12} className="text-red-600 animate-pulse" />
          )}
          <div className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-green-400' : stage.dot}`} />
        </div>
      </div>

      {/* Primary inspection label */}
      <div className="text-[10px] font-semibold text-slate-700 truncate mb-0.5">{cardInspectionLabel}</div>

      {/* Detail Inspection */}
      <div className="text-[9px] text-slate-400 truncate mb-1" title={rfi.detailInspection}>{rfi.detailInspection}</div>

      {/* Stage-specific chips */}
      {stage2Line && (
        <div className="text-[9px] text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 mb-1 truncate">{stage2Line}</div>
      )}
      {stage.id === 3 && rfi.result && (
        <div className={`text-[9px] font-semibold rounded px-1.5 py-0.5 mb-1 truncate ${RESULT_COLORS[rfi.result] || 'bg-slate-100 text-slate-500'}`}>
          Onsite: {rfi.result}
        </div>
      )}
      {stage.id === 4 && rfi.stage4Status && (
        <div className={`text-[9px] font-semibold rounded px-1.5 py-0.5 mb-1 truncate ${
          rfi.stage4Status === 'Close' ? 'bg-green-100 text-green-700' :
          rfi.stage4Status === 'Complete document' ? 'bg-blue-100 text-blue-700' :
          'bg-amber-100 text-amber-700'}`}>
          {rfi.stage4Status}
        </div>
      )}
      {stage.id === 4 && (
        <div className="mb-1.5 rounded-md border border-green-200 bg-green-50 px-2 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-green-700">Document Progress</span>
            <span className="text-[14px] font-extrabold leading-none text-green-700">{stage4ProgressPercent}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-green-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${stage4ProgressPercent}%` }}
            />
          </div>
          <div className="mt-1 text-[9px] text-green-700">
            {stage4CompletedSteps}/3 steps uploaded
          </div>
        </div>
      )}
      {concreteAlerts.hasPendingAlert && (
        <div className="mb-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[9px] font-semibold text-red-700">
          Concrete test due: {concreteAlerts.is7Due ? '7-day' : ''}{concreteAlerts.is7Due && concreteAlerts.is28Due ? ' + ' : ''}{concreteAlerts.is28Due ? '28-day' : ''} upload pending
        </div>
      )}

      {/* Meta row: result badge + actions */}
      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100 mt-1">
        <div className="flex items-center gap-1">
          {result && (
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${RESULT_COLORS[result] || 'bg-slate-100 text-slate-500'}`}>
              {result}
            </span>
          )}
        </div>

        {isCurrentStage && (canAdvance || canEdit || canDelete) && (
          <div
            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            {canEdit && (
              <button onClick={() => onEdit(rfi)}
                className="w-5 h-5 rounded bg-slate-100 hover:bg-blue-100 flex items-center justify-center transition-colors">
                <Pencil size={9} className="text-slate-600" />
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(rfi)}
                className="w-5 h-5 rounded bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                <Trash2 size={9} className="text-slate-500 hover:text-red-600" />
              </button>
            )}
            {canAdvance && rfi.stage < 4 && advanceCfg && (
              <button onClick={() => onAdvance(rfi)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold text-white ${advanceCfg.color} hover:opacity-90`}>
                <ArrowRight size={9} />
                {advanceCfg.label}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Request Date (Owner) + overdue — bottom row */}
      {rfi.requestDateOwner && (
        <div className={`flex items-center gap-1 mt-1 text-[9px] ${overdueTypes.length > 0 ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
          <Clock size={8} /> {rfi.requestDateOwner}
          {overdueTypes.length > 0 && <><AlertTriangle size={8} className="ml-0.5" /> {overdueText}</>}
        </div>
      )}
    </div>
  );
}

// โ”€โ”€ Kanban Column โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
function KanbanColumn({ stage, rfis, getCardPerms, onView, onEdit, onAdvance, onDelete }) {
  const stageRfis = sortStageRfis(stage.id, rfis.filter(r => {
    if (r.stage !== stage.id) return false;
    if (stage.id === 3 && !shouldShowStage3Reject(r)) return false;
    if (stage.id === 4 && getStage4ProgressPercent(r) === 100) return false;
    return true;
  }));
  const Icon = stage.icon;

  return (
    <div className="flex flex-col min-w-[260px] w-full">
      <div className={`${stage.headerBg} rounded-t-xl px-4 py-3 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={15} className="text-white/80" />
            <span className="text-xs font-bold">{stage.label}: {stage.title}</span>
          </div>
          <span className="bg-white/20 text-white text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center">
            {stageRfis.length}
          </span>
        </div>
        <div className="text-[10px] text-white/70 mt-0.5">{stage.subtitle}</div>
      </div>

      <div className={`flex-1 ${stage.bg} rounded-b-xl border-x border-b ${stage.border} p-2.5 space-y-2.5 min-h-[200px]`}>
        {stageRfis.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2 opacity-50">
            <Icon size={22} className={stage.color} />
            <span className="text-[11px] text-slate-400">No RFIs in this stage</span>
          </div>
        )}
        {stageRfis.map(rfi => {
          const { canAdvance, canEdit, canDelete } = getCardPerms(rfi);
          return (
            <RfiCard
              key={rfi.id}
              rfi={rfi}
              stage={stage}
              canAdvance={canAdvance}
              canEdit={canEdit}
              canDelete={canDelete}
              onView={onView}
              onEdit={onEdit}
              onAdvance={onAdvance}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </div>
  );
}

// โ”€โ”€ Main Page โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
// โ”€โ”€ CSV Export Function โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
function exportToCSV(data, filename) {
  // Convert data to CSV format
  const headers = Object.keys(data[0] || {});
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header] || '';
      // Escape quotes and wrap in quotes if contains comma or quote
      const escapedValue = String(value).replace(/"/g, '""');
      return escapedValue.includes(',') || escapedValue.includes('"') ? `"${escapedValue}"` : escapedValue;
    }).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function RfiPage() {
  const {
    rfiItems, addRfi, updateRfi, deleteRfi,
    selectedProjectId, selectedProject,
  } = useApp();
  const { userProfile } = useAuth();
  const { canAction } = useMenuPermissions();

  const canCreateRfi       = canAction('rfi', 'createRfi');
  const canAdvanceRfiStage2 = canAction('rfi', 'advanceRfiStage2');
  const canAdvanceRfiStage3 = canAction('rfi', 'advanceRfiStage3');
  const canAdvanceRfiStage4 = canAction('rfi', 'advanceRfiStage4');
  const canEditRfi          = canAction('rfi', 'editRfi');
  const canEditRfiStage2    = canAction('rfi', 'editRfiStage2');
  const canEditRfiStage3    = canAction('rfi', 'editRfiStage3');
  const canEditRfiStage4    = canAction('rfi', 'editRfiStage4');
  const canDeleteRfi        = canAction('rfi', 'deleteRfi');
  const canSkipConcreteTests = Array.isArray(userProfile?.role)
    ? userProfile.role.includes('QcDocCenter') || userProfile.role.includes('MasterAdmin')
    : userProfile?.role === 'QcDocCenter' || userProfile?.role === 'MasterAdmin';

  function canAdvanceForRfi(rfi) {
    const stage = rfi.stage;
    if (stage === 1) return canAdvanceRfiStage2;
    if (stage === 2) return canAdvanceRfiStage3 && rfi.stage2EmailStatus === 'ok';
    if (stage === 3) return canAdvanceRfiStage4;
    return false;
  }

  function canEditForStage(stage) {
    if (stage === 1) return canEditRfi;
    if (stage === 2) return canEditRfiStage2;
    if (stage === 3) return canEditRfiStage3;
    if (stage === 4) return canEditRfiStage4;
    return false;
  }

  // Per-card permission resolver โ€” เนเธเน Set Role เน€เธเนเธเธซเธฅเธฑเธ
  function getCardPerms(rfi) {
    const s = rfi.stage;
    // Hide Edit and Delete buttons for Stage 4 RFI with status "RFI Closed"
    const isRfiClosed = s === 4 && rfi.stage4Status === 'RFI Closed';
    // Hide Edit, Delete, and Complete buttons for Stage 3 RFI with status "Reject"
    const isStage3Rejected = s === 3 && rfi.result === 'Reject';
    return {
      canAdvance: isStage3Rejected ? false : canAdvanceForRfi(rfi),
      canEdit:    isRfiClosed || isStage3Rejected ? false : canEditForStage(s),
      canDelete:  userProfile?.role?.includes('MasterAdmin') ? true : (isRfiClosed || isStage3Rejected ? false : canDeleteRfi),
    };
  }

  const [search,       setSearch]       = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [viewMode,     setViewMode]     = useState('kanban');

  const [columnFilters, setColumnFilters] = useState({});
  function setColFilter(key, vals) { setColumnFilters(prev => ({ ...prev, [key]: vals })); }
  const FILTERABLE_COLS = ['rfiNo', 'requestNo', 'type', 'tagNo', 'location', 'area', 'dueDate', 'stage', 'statusInsp', 'statusDoc', 'workingStep', 'structureType', 'requestedBy', 'inspectedBy', 'inspectionPackage', 'stage3Result', 'brand', 'cementQty', 'cementUnit', 'steelTestResult', 'soilTestResult', 'stage4Status'];

  // Modal states
  const [stage1Modal,   setStage1Modal]  = useState(false);
  const [stage2Modal,   setStage2Modal]  = useState(null);
  const [stage3Modal,   setStage3Modal]  = useState(null);
  const [stage4Modal,   setStage4Modal]  = useState(null);
  const [detailModal,   setDetailModal]  = useState(null);
  const [editTarget,    setEditTarget]   = useState(null);
  const [deleteTarget,  setDeleteTarget] = useState(null);
  const uploadInputRefs = useRef({});
  const [uploadingTests, setUploadingTests] = useState({});
  const [skippingConcreteTests, setSkippingConcreteTests] = useState({});

  const projectRfis = rfiItems.filter(r => r.projectId === selectedProjectId);

  const filtered = useMemo(() => {
    return projectRfis.filter(r => {
      const matchSearch = !search || [r.rfiNo, r.requestNo, r.typeOfInspection, r.location, r.area].some(v =>
        (v || '').toLowerCase().includes(search.toLowerCase())
      );
      const matchType = !filterType || r.typeOfInspection === filterType;
      if (!(matchSearch && matchType)) return false;

      // Per-column filters
      for (const [key, vals] of Object.entries(columnFilters)) {
        if (!vals || vals.length === 0) continue;
        const cellVal = getRfiFieldValue(r, key);
        if (!vals.includes(cellVal)) return false;
      }
      return true;
    });
  }, [projectRfis, search, filterType, columnFilters]);

  const activeFilterCount = Object.values(columnFilters).filter(v => v && v.length > 0).length;

  const types = [...new Set(projectRfis.map(r => r.typeOfInspection))];

  // โ”€โ”€ Handlers โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
  function handleCreateStage1(form) {
    const newRfi = {
      ...form,
      id:        `rfi-${Date.now()}`,
      projectId: selectedProjectId,
      stage:     1,
      sn:        projectRfis.length + 1,
      // Stage 2-4 empty
      issueDate: '', descriptionOfInspection: '', inspectionPackage: '',
      inspectionScheduleDate: '', inspectionScheduleTime: '', stage2Note: '',
      inspectionDate: '', result: '', stage3Note: '', stage3Attachment: '',
      stage4Result: '', stage4Note: '', stage4Status: '', stage4Attachment: '',
      test7DayFiles: [], test28DayFiles: [],
      status7Day: 'Pending', status28Day: 'Pending',
      concreteTestSkip: false, concreteTestSkipAt: '', concreteTestSkipBy: '',
    };
    addRfi(newRfi);
    setStage1Modal(false);
  }

  function handleEditStage1(form) {
    updateRfi(editTarget.id, form);
    setEditTarget(null);
  }

  // Advance button dispatcher โ€” opens the correct modal for the next stage
  function handleAdvance(rfi) {
    if (!canAdvanceForRfi(rfi)) return;
    if (rfi.stage === 1) { setStage2Modal(rfi); return; }
    if (rfi.stage === 2) { setStage3Modal(rfi); return; }
    if (rfi.stage === 3) { setStage4Modal(rfi); return; }
  }

  function handleSaveStage2(form) {
    updateRfi(stage2Modal.id, { ...form, stage: 2 });
    setStage2Modal(null);
  }

  function handleSaveStage2Draft(form) {
    if (!stage2Modal) return;
    // Save current values without forcing stage transition.
    updateRfi(stage2Modal.id, { ...form });
    setStage2Modal(null);
  }

  function handleSaveStage3(form) {
    const stage3RejectAt = form.result === 'Reject' ? new Date().toISOString() : '';
    // Check if result is 'Comment' - if so, move back to Stage 2 and reset email status
    if (form.result === 'Comment') {
      updateRfi(stage3Modal.id, {
        ...form,
        stage: 2, // Move back to Stage 2
        statusInsp: form.result,
        stage2EmailStatus: '', // Reset email status to allow sending new Issue email
        stage3RejectAt: '',
      });
    } else {
      // Normal flow - advance to stage 3
      updateRfi(stage3Modal.id, {
        ...form,
        stage: 3,
        statusInsp: form.result,
        stage3RejectAt,
      });
    }
    setStage3Modal(null);
  }

  function handleSaveStage4(form) {
    // Advance to stage 4; update statusDoc from stage4Status
    updateRfi(stage4Modal.id, {
      ...form,
      stage: 4,
      statusDoc: form.stage4Status,
      statusInsp: form.stage4Result,
    });
    setStage4Modal(null);
  }

  function openEdit(rfi) {
    if (!canEditForStage(rfi.stage)) return;
    if (rfi.stage === 1) setEditTarget(rfi);
    if (rfi.stage === 2) setStage2Modal(rfi);
    if (rfi.stage === 3) setStage3Modal(rfi);
    if (rfi.stage === 4) setStage4Modal(rfi);
  }

  function handleDelete(rfi) {
    if (canDeleteRfi) setDeleteTarget(rfi);
  }

  function handleExcelExport() {
    const exportData = filtered.map((rfi, idx) => ({
      'No.': idx + 1,
      'RFI No.': rfi.rfiNo,
      'Request No.': rfi.requestNo,
      'Type': rfi.typeOfInspection,
      'Location': rfi.location,
      'Area': rfi.area,
      'Issue Date': rfi.dueDate || '',
      'Stage': `Stage ${rfi.stage}`,
      'Status Insp.': rfi.statusInsp || '',
      'Status Doc': rfi.statusDoc || '',
      'Created Date': rfi.requestDateInternal || '',
      'Inspection Date': rfi.inspectionDate || '',
      'Result': rfi.result || '',
    }));
    
    const filename = `RFI_Report_${selectedProject?.name || 'Export'}_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(exportData, filename);
  }

  function confirmDelete() {
    if (deleteTarget) {
      deleteRfi(deleteTarget.id);
      // close detail modal if it was showing this rfi
      if (detailModal?.id === deleteTarget.id) setDetailModal(null);
      setDeleteTarget(null);
    }
  }

  function getUploadKey(rfiId, type) {
    return `${rfiId}:${type}`;
  }

  function setUploadInputRef(rfiId, type, node) {
    uploadInputRefs.current[getUploadKey(rfiId, type)] = node;
  }

  function openTestUploadDialog(rfiId, type) {
    uploadInputRefs.current[getUploadKey(rfiId, type)]?.click();
  }

  async function handleConcreteTestUpload(rfi, type, fileList) {
    if (!fileList?.length) return;
    const uploadKey = getUploadKey(rfi.id, type);
    setUploadingTests(prev => ({ ...prev, [uploadKey]: true }));
    try {
      const safeReq = String(rfi.requestNo || rfi.rfiNo || rfi.id).replace(/[/\\#?]/g, '-');
      const field = type === '7day' ? 'test7DayFiles' : 'test28DayFiles';
      const statusField = type === '7day' ? 'status7Day' : 'status28Day';
      const existingFiles = Array.isArray(rfi[field]) ? rfi[field] : [];
      const results = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (!TEST_RESULT_MIME.includes(file.type)) {
          window.alert(`File "${file.name}" is not supported.`);
          continue;
        }
        const ext = file.name.split('.').pop();
        const seq = existingFiles.length + results.length + 1;
        const path = `rfi-concrete-tests/${rfi.projectId}/${safeReq}/${type}_${String(seq).padStart(2, '0')}.${ext}`;
        const sRef = storageRef(storage, path);
        const task = uploadBytesResumable(sRef, file);
        await new Promise((resolve, reject) => {
          task.on('state_changed', undefined, reject, () => resolve());
        });
        const url = await getDownloadURL(task.snapshot.ref);
        results.push({ name: file.name, url });
      }
      if (!results.length) return;
      updateRfi(rfi.id, {
        [field]: [...existingFiles, ...results],
        [statusField]: 'Uploaded',
        concreteTestSkip: false,
      });
    } finally {
      setUploadingTests(prev => ({ ...prev, [uploadKey]: false }));
      const input = uploadInputRefs.current[uploadKey];
      if (input) input.value = '';
    }
  }

  async function handleSkipConcreteTests(rfi) {
    if (!canSkipConcreteTests) return;
    const confirmed = window.confirm('Skip concrete test uploads for both 7-day and 28-day results?');
    if (!confirmed) return;

    const skipKey = getUploadKey(rfi.id, 'skip-concrete-tests');
    setSkippingConcreteTests(prev => ({ ...prev, [skipKey]: true }));
    try {
      await updateRfi(rfi.id, {
        concreteTestSkip: true,
        concreteTestSkipAt: new Date().toISOString(),
        concreteTestSkipBy: getUserDisplayName(userProfile),
        status7Day: 'Skipped',
        status28Day: 'Skipped',
      });
    } finally {
      setSkippingConcreteTests(prev => ({ ...prev, [skipKey]: false }));
    }
  }

  // โ”€โ”€ Stats โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
  const stageCount = [1, 2, 3, 4].map(s => projectRfis.filter(r => r.stage === s).length);
  const totalPass  = projectRfis.filter(r => r.stage4Result === 'Pass' || r.result === 'Pass').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">RFI Workflow</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedProject?.name} - Request for Inspection
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {['kanban', 'table'].map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m === 'kanban' ? 'Board' : 'Table'}
              </button>
            ))}
          </div>
          {/* CSV Download Button - Only show in table view */}
          {viewMode === 'table' && filtered.length > 0 && (
            <button
              onClick={handleExcelExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors shadow-sm"
              title="Download CSV"
            >
              <Download size={12} />
              CSV
            </button>
          )}
          {canCreateRfi && (
            <button
              onClick={() => setStage1Modal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Plus size={15} />
              Create RFI
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total RFIs',  value: projectRfis.length, color: 'text-slate-700',   bg: 'bg-slate-100'  },
          { label: 'Stage 1',     value: stageCount[0],      color: 'text-orange-600',  bg: 'bg-orange-50'  },
          { label: 'Stage 2',     value: stageCount[1],      color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { label: 'Stage 3',     value: stageCount[2],      color: 'text-purple-600',  bg: 'bg-purple-50'  },
          { label: 'Completed',   value: stageCount[3],      color: 'text-green-600',   bg: 'bg-green-50'   },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
              <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
            </div>
            <div className={`text-[11px] font-medium ${s.color}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Notice for read-only */}
      {!canCreateRfi && !canAdvanceRfiStage2 && !canAdvanceRfiStage3 && !canAdvanceRfiStage4 && !canEditRfi && !canEditRfiStage2 && !canEditRfiStage3 && !canEditRfiStage4 && !canDeleteRfi && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-medium bg-slate-50 border-slate-200 text-slate-600">
          <ClipboardCheck size={15} />
          You have read-only access to RFI records.
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 w-60 text-slate-700 placeholder-slate-400"
            placeholder="Search RFI no., type, location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-700"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All Inspection Types</option>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
        {(search || filterType) && (
          <button
            onClick={() => { setSearch(''); setFilterType(''); }}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors"
          >
            <X size={13} /> Clear filters
          </button>
        )}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-200 rounded-lg">
            <Filter size={10} className="text-orange-500" />
            <span className="text-[10px] font-semibold text-orange-600">{activeFilterCount} col filter{activeFilterCount > 1 ? 's' : ''}</span>
            <button onClick={() => setColumnFilters({})} className="ml-0.5 text-orange-400 hover:text-orange-700" title="Clear all column filters">
              <X size={9} />
            </button>
          </div>
        )}
        <span className="ml-auto text-[11px] text-slate-500">{filtered.length} RFIs</span>
      </div>

      {/* โ”€โ”€ KANBAN VIEW โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€ */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-4 gap-4">
          {STAGES.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              rfis={filtered}
              getCardPerms={getCardPerms}
              onView={setDetailModal}
              onEdit={openEdit}
              onAdvance={handleAdvance}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* โ”€โ”€ TABLE VIEW โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€ */}
      {viewMode === 'table' && (
        <TableColumnVisibility
          storageKey={`rfi-table-columns:${userProfile?.uid || userProfile?.email || 'guest'}:${selectedProjectId || 'all'}`}
          tableId="rfi-table"
          columns={RFI_TABLE_COLUMNS}
          className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden p-2 pt-0"
        >
          {({ columnWidths, setColumnWidth }) => (
            <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
              <table data-column-table="rfi-table" className="w-full text-xs [&_td]:max-w-0 [&_td]:truncate relative">
                <thead className="sticky top-0 z-30 shadow-sm">
                  <tr className="bg-slate-800 text-white">
                    {RFI_TABLE_COLUMNS.map(h => (
                      <th
                        key={h.key}
                        className="relative px-3 py-2 text-left font-semibold whitespace-nowrap text-[10px] tracking-wide"
                        style={{ width: columnWidths[h.key] || 'auto', minWidth: columnWidths[h.key] || '80px', maxWidth: columnWidths[h.key] || 'auto' }}
                      >
                        <div className="flex items-center gap-0.5 pr-2">
                          <span>{h.label}</span>
                        {FILTERABLE_COLS.includes(h.key) && (
                          <ColumnFilterDropdown
                            colKey={h.key}
                            label={h.label}
                            allDocs={projectRfis}
                            activeValues={columnFilters[h.key] || []}
                            onChange={vals => setColFilter(h.key, vals)}
                          />
                        )}
                      </div>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-orange-500 z-10 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.pageX;
                          const th = e.currentTarget.parentElement;
                          const startWidth = th.offsetWidth;
                          
                          const onMouseMove = (moveEvent) => {
                            const newWidth = Math.max(50, startWidth + (moveEvent.pageX - startX));
                            th.style.width = `${newWidth}px`;
                            th.style.minWidth = `${newWidth}px`;
                            th.style.maxWidth = `${newWidth}px`;
                          };
                          
                          const onMouseUp = (upEvent) => {
                            const finalWidth = Math.max(50, startWidth + (upEvent.pageX - startX));
                            setColumnWidth(h.key, finalWidth);
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                          };
                          
                          document.addEventListener('mousemove', onMouseMove);
                          document.addEventListener('mouseup', onMouseUp);
                        }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={RFI_TABLE_COLUMNS.length} className="px-4 py-12 text-center text-slate-400">
                      No RFI records for <span className="font-semibold">{selectedProject?.name}</span>.
                    </td>
                  </tr>
                )}
                {filtered.map((rfi, idx) => {
                  const stage = STAGES[rfi.stage - 1];
                  const concreteAlerts = getConcreteTestAlerts(rfi);
                  const rowClass = concreteAlerts.hasPendingAlert
                    ? 'border-y border-red-300 bg-red-50/70 hover:bg-red-50'
                    : 'hover:bg-slate-50';
                  const rowTextClass = concreteAlerts.hasPendingAlert ? 'text-red-700' : '';
                  return (
                    <tr 
                      key={rfi.id} 
                      className={`transition-colors cursor-pointer select-none group ${rowClass}`}
                      onDoubleClick={() => setDetailModal(rfi)}
                      title="Double-click to view details"
                    >
                      <td className={`px-3 py-0.5 font-mono text-xs ${concreteAlerts.hasPendingAlert ? 'text-red-500' : 'text-slate-400'}`}>{idx + 1}</td>
                      <td className={`px-3 py-0.5 font-mono font-bold whitespace-nowrap text-xs ${concreteAlerts.hasPendingAlert ? 'text-red-800' : 'text-slate-800'}`}>{rfi.rfiNo}</td>
                      <td className={`px-3 py-0.5 font-mono whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.requestNo}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-700'}`}>{rfi.typeOfInspection}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.tagNo || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.location || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.area || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap font-mono text-xs ${rowTextClass || 'text-slate-500'}`}>{rfi.requestDateInternal || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap font-mono text-xs ${rowTextClass || 'text-slate-500'}`}>{rfi.requestTimeInternal || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap font-mono text-xs ${rowTextClass || 'text-slate-500'}`}>{rfi.requestDateOwner || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap font-mono text-xs ${rowTextClass || 'text-slate-500'}`}>{rfi.requestTimeOwner || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.workingStep || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.structureType || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.requestedBy || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.inspectedBy || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 text-xs min-w-[220px] ${rowTextClass || 'text-slate-600'}`}>
                        <div className="truncate" title={rfi.detailInspection || EMPTY_VALUE}>{rfi.detailInspection || EMPTY_VALUE}</div>
                      </td>
                      <td className={`px-3 py-0.5 whitespace-nowrap font-mono text-xs ${rowTextClass || 'text-slate-500'}`}>{rfi.dueDate || EMPTY_VALUE}</td>
                      <td className="px-3 py-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-px rounded-full ${stage?.badge}`}>
                          {stage?.label}
                        </span>
                      </td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.inspectionPackage || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap font-mono text-xs ${rowTextClass || 'text-slate-500'}`}>{rfi.inspectionScheduleDate || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap font-mono text-xs ${rowTextClass || 'text-slate-500'}`}>{rfi.inspectionScheduleTime || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 text-xs min-w-[220px] ${rowTextClass || 'text-slate-600'}`}>
                        <div className="truncate" title={rfi.descriptionOfInspection || EMPTY_VALUE}>{rfi.descriptionOfInspection || EMPTY_VALUE}</div>
                      </td>
                      <td className={`px-3 py-0.5 text-xs min-w-[200px] ${rowTextClass || 'text-slate-600'}`}>
                        <div className="truncate" title={rfi.stage2Note || EMPTY_VALUE}>{rfi.stage2Note || EMPTY_VALUE}</div>
                      </td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.stage2EmailStatus || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap font-mono text-xs ${rowTextClass || 'text-slate-500'}`}>{rfi.inspectionDate || EMPTY_VALUE}</td>
                      <td className="px-3 py-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-px rounded-full ${RESULT_COLORS[rfi.result] || 'bg-slate-100 text-slate-500'}`}>
                          {rfi.result || EMPTY_VALUE}
                        </span>
                      </td>
                      <td className={`px-3 py-0.5 text-xs min-w-[200px] ${rowTextClass || 'text-slate-600'}`}>
                        <div className="truncate" title={rfi.stage3Note || EMPTY_VALUE}>{rfi.stage3Note || EMPTY_VALUE}</div>
                      </td>
                      <td className={`px-3 py-0.5 whitespace-nowrap font-mono text-xs ${rowTextClass || 'text-slate-500'}`}>{rfi.concretePourDate || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.brand || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.cementQty || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.cementUnit || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.steelTestResult || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.soilTestResult || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 whitespace-nowrap text-xs ${rowTextClass || 'text-slate-600'}`}>{rfi.stage4Status || EMPTY_VALUE}</td>
                      <td className={`px-3 py-0.5 text-xs min-w-[200px] ${rowTextClass || 'text-slate-600'}`}>
                        <div className="truncate" title={rfi.stage4Note || EMPTY_VALUE}>{rfi.stage4Note || EMPTY_VALUE}</div>
                      </td>
                      <td className="px-3 py-0.5">
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                          {Math.round(([
                            Array.isArray(rfi.stage4ClientSignFiles) && rfi.stage4ClientSignFiles.length > 0,
                            Array.isArray(rfi.stage4CompleteFiles) && rfi.stage4CompleteFiles.length > 0,
                            Array.isArray(rfi.stage4OwnerSignFiles) && rfi.stage4OwnerSignFiles.length > 0,
                          ].filter(Boolean).length / 3) * 100)}%
                        </span>
                      </td>
                      <td className="px-3 py-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-px rounded-full ${RESULT_COLORS[rfi.statusInsp] || 'bg-slate-100 text-slate-500'}`}>
                          {rfi.statusInsp || EMPTY_VALUE}
                        </span>
                      </td>
                      <td className="px-3 py-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-px rounded-full ${RESULT_COLORS[rfi.statusDoc] || 'bg-slate-100 text-slate-500'}`}>
                          {rfi.statusDoc || EMPTY_VALUE}
                        </span>
                      </td>
                      <td className="px-3 py-0.5 align-middle">
                        {rfi.concretePourDate ? (
                          <TestResultUploadCell
                            label={rfi.status7Day || 'Pending'}
                            dueDate={concreteAlerts.due7Date}
                            isDue={concreteAlerts.is7Due}
                            isSkipped={concreteAlerts.isSkipped}
                            files={rfi.test7DayFiles}
                            uploading={!!uploadingTests[getUploadKey(rfi.id, '7day')]}
                            canSkip={canSkipConcreteTests && concreteAlerts.is7Due}
                            skipping={!!skippingConcreteTests[getUploadKey(rfi.id, 'skip-concrete-tests')]}
                            onUploadClick={() => openTestUploadDialog(rfi.id, '7day')}
                            onSkip={() => handleSkipConcreteTests(rfi)}
                            inputRef={node => setUploadInputRef(rfi.id, '7day', node)}
                            onFileChange={e => handleConcreteTestUpload(rfi, '7day', e.target.files)}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">{EMPTY_VALUE}</span>
                        )}
                      </td>
                      <td className="px-3 py-0.5 align-middle">
                        {rfi.concretePourDate && !concreteAlerts.is7Due ? (
                          <TestResultUploadCell
                            label={rfi.status28Day || 'Pending'}
                            dueDate={concreteAlerts.due28Date}
                            isDue={concreteAlerts.is28Due}
                            isSkipped={concreteAlerts.isSkipped}
                            files={rfi.test28DayFiles}
                            uploading={!!uploadingTests[getUploadKey(rfi.id, '28day')]}
                            onUploadClick={() => openTestUploadDialog(rfi.id, '28day')}
                            inputRef={node => setUploadInputRef(rfi.id, '28day', node)}
                            onFileChange={e => handleConcreteTestUpload(rfi, '28day', e.target.files)}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">{EMPTY_VALUE}</span>
                        )}
                      </td>
                      <td className="px-3 py-0.5">
                        {(() => {
                          const { canAdvance, canEdit, canDelete } = getCardPerms(rfi);
                          const advCfg = STAGE_ADVANCE[rfi.stage];
                          return (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setDetailModal(rfi)}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                                title="View detail"
                              >
                                <Eye size={9} className="text-slate-600" />
                              </button>
                              {canEdit && (
                                <button
                                  onClick={() => openEdit(rfi)}
                                  className="w-5 h-5 rounded bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                                  title="Edit Stage 1"
                                >
                                  <Pencil size={9} className="text-blue-600" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(rfi)}
                                  className="w-5 h-5 rounded bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                                  title="Delete RFI"
                                >
                                  <Trash2 size={9} className="text-red-500" />
                                </button>
                              )}
                              {canAdvance && rfi.stage < 4 && advCfg && (
                                <button
                                  onClick={() => handleAdvance(rfi)}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white transition-colors ${advCfg.color}`}
                                  title={`Advance to Stage ${rfi.stage + 1}`}
                                >
                                  <ArrowRight size={8} /> {advCfg.label}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </TableColumnVisibility>
      )}

      {/* โ”€โ”€ Modals โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€ */}
      {stage1Modal && (
        <RfiStage1Modal
          rfi={null}
          onSave={handleCreateStage1}
          onClose={() => setStage1Modal(false)}
        />
      )}
      {editTarget && (
        <RfiStage1Modal
          rfi={editTarget}
          onSave={handleEditStage1}
          onClose={() => setEditTarget(null)}
        />
      )}
      {stage2Modal && (
        <RfiStage2Modal
          rfi={stage2Modal}
          onSave={handleSaveStage2}
          onSaveDraft={handleSaveStage2Draft}
          onClose={() => setStage2Modal(null)}
        />
      )}
      {stage3Modal && (
        <RfiStage3Modal
          rfi={stage3Modal}
          onSave={handleSaveStage3}
          onClose={() => setStage3Modal(null)}
        />
      )}
      {stage4Modal && (
        <RfiStage4Modal
          rfi={stage4Modal}
          onSave={handleSaveStage4}
          onClose={() => setStage4Modal(null)}
        />
      )}
      {detailModal && (
        <RfiDetailModal
          rfi={rfiItems.find(r => r.id === detailModal.id) || detailModal}
          onClose={() => setDetailModal(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteRfi
          rfi={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
