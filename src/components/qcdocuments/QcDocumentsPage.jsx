import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, Search, ExternalLink,
  Layers, ChevronDown, ChevronLeft, ChevronRight, History, Eye, EyeOff,
  FileText, Filter, Copy, SlidersHorizontal, X, Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import QcDocModal, { generateTransmittalNo } from './QcDocModal';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import TableColumnVisibility from '../common/TableColumnVisibility';

const STATUS_COLORS = {
  'Approved':         'bg-green-100 text-green-700',
  'For Construction': 'bg-blue-100 text-blue-700',
  'For Review':       'bg-amber-100 text-amber-700',
  'As-Built':         'bg-purple-100 text-purple-700',
  'Superseded':       'bg-slate-100 text-slate-500 line-through',
  'Void':             'bg-red-100 text-red-500 line-through',
};

const CAT_COLORS = {
  Structural:    'bg-orange-100 text-orange-700',
  Architectural: 'bg-sky-100 text-sky-700',
  Mechanical:    'bg-teal-100 text-teal-700',
  Electrical:    'bg-yellow-100 text-yellow-700',
  Civil:         'bg-lime-100 text-lime-700',
  HVAC:          'bg-cyan-100 text-cyan-700',
  Plumbing:      'bg-indigo-100 text-indigo-700',
  Landscape:     'bg-green-100 text-green-700',
  Other:         'bg-slate-100 text-slate-600',
};

const CAT_GROUP_COLORS = {
  'Work method':       'bg-rose-100 text-rose-700',
  'Material approved': 'bg-amber-100 text-amber-700',
  'Drawing':           'bg-blue-100 text-blue-700',
};

const QC_DOC_TABLE_COLUMNS = [
  { key: 'row', label: '#' },
  { key: 'transmittalNo', label: 'Transmittal No.' },
  { key: 'transRef', label: 'Trans Ref' },
  { key: 'transDate', label: 'Trans. Date' },
  { key: 'from', label: 'From' },
  { key: 'type', label: 'Type' },
  { key: 'catGroup', label: 'Category Group' },
  { key: 'cat', label: 'Category' },
  { key: 'documentNo', label: 'Document No.' },
  { key: 'documentTitle', label: 'Document Title' },
  { key: 'receiveDate', label: 'Stamp Date' },
  { key: 'revision', label: 'Revision' },
  { key: 'status', label: 'Status' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'attachments', label: 'Attachments' },
  { key: 'actions', label: 'Actions', locked: true },
];

// ── Column value extractor (for filter options) ───────────────────────────────
function getDocFieldValue(doc, key) {
  switch (key) {
    case 'transmittalNo':  return doc.transmittalNo || '';
    case 'transRef':       return doc.transmittalNoRef || '';
    case 'transDate':      return doc.transmittalDate || '';
    case 'from':           return doc.from || '';
    case 'type':           return doc.isExternal ? 'External' : 'Internal';
    case 'catGroup':       return doc.categoryGroup || '';
    case 'cat':            return doc.category || '';
    case 'documentNo':     return doc.documentNo || '';
    case 'documentTitle':  return doc.documentTitle || '';
    case 'receiveDate':    return doc.receiveDate || '';
    case 'revision':       return doc.rev ? `Rev. ${doc.rev}` : '';
    case 'status':         return doc.status || '';
    case 'delivery':       return doc.byEmail ? 'Email' : 'Hand';
    default:               return '';
  }
}

// ── Per-Column Filter Dropdown ─────────────────────────────────────────────────
function ColumnFilterDropdown({ colKey, label, allDocs, activeValues, onChange }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const ref                 = useRef(null);

  // Unique non-empty values for this column
  const options = useMemo(() => {
    const set = new Set();
    allDocs.forEach(d => { const v = getDocFieldValue(d, colKey); if (v) set.add(v); });
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allDocs, colKey]);

  const filtered = search ? options.filter(o => o.toLowerCase().includes(search.toLowerCase())) : options;
  const hasActive = activeValues.length > 0;

  // Close on outside click
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
            : 'text-slate-400 hover:text-white hover:bg-white/20'
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
                className="w-full text-[10px] px-2 py-1 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400"
                placeholder="Search…"
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

function ConfirmDelete({ doc, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Delete Transmittal?</h3>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2">
          <div className="text-xs font-semibold text-slate-700">{doc.transmittalNo} — {doc.documentNo}</div>
          <div className="text-[11px] text-slate-500 truncate">{doc.documentTitle}</div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Document Detail Modal (double-click preview) ──────────────────────────────
function DocDetailModal({ doc, onClose, onEdit, onDelete }) {
  if (!doc) return null;
  const statusCls = STATUS_COLORS[doc.status] || 'bg-slate-100 text-slate-600';
  const catCls    = CAT_COLORS[doc.category]  || 'bg-slate-100 text-slate-600';
  const catGrpCls = CAT_GROUP_COLORS[doc.categoryGroup] || 'bg-slate-100 text-slate-600';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="bg-slate-800 px-6 py-4 flex items-start justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-mono mb-0.5">{doc.transmittalNo}</div>
            <h2 className="text-base font-bold text-white leading-snug">{doc.documentNo}</h2>
            <p className="text-sm text-slate-300 mt-0.5 line-clamp-2">{doc.documentTitle}</p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            {onEdit && (
              <button onClick={() => { onClose(); onEdit(doc); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors">
                <Pencil size={12} /> Edit
              </button>
            )}
            {onDelete && (
              <button onClick={() => { onClose(); onDelete(doc); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors">
                <Trash2 size={12} /> Delete
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors">
              <X size={14} className="text-slate-300" />
            </button>
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4 text-sm max-h-[70vh] overflow-y-auto">
          {[
            { label: 'Transmittal No.', value: doc.transmittalNo },
            { label: 'Trans. Ref',      value: doc.transmittalNoRef || '—' },
            { label: 'Trans. Date',     value: doc.transmittalDate || '—' },
            { label: 'Stamp Date',      value: doc.receiveDate || '—' },
            { label: 'From',            value: doc.from || '—' },
            { label: 'Type',            value: doc.isExternal ? 'External' : 'Internal' },
            { label: 'Category Group',  value: doc.categoryGroup || '—' },
            { label: 'Category',        value: doc.category || '—' },
            { label: 'Revision',        value: doc.rev ? `Rev. ${doc.rev}` : '—' },
            { label: 'Status',          value: doc.status || '—' },
            { label: 'Delivery',        value: doc.byEmail ? '📧 Email' : '🤝 Hand' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</div>
              <div className="text-sm text-slate-800 font-medium">{value}</div>
            </div>
          ))}
          <div className="col-span-2">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Document Title</div>
            <div className="text-sm text-slate-800 font-medium">{doc.documentTitle || '—'}</div>
          </div>
          <div className="col-span-2 flex flex-wrap gap-2 pt-1">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCls}`}>{doc.status}</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${catCls}`}>{doc.category}</span>
            {doc.categoryGroup && <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${catGrpCls}`}>{doc.categoryGroup}</span>}
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${doc.isExternal ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
              {doc.isExternal ? 'External' : 'Internal'}
            </span>
          </div>
          {((Array.isArray(doc.attachments) && doc.attachments.length > 0) || doc.drawingLink || (Array.isArray(doc.docTitleFiles) && doc.docTitleFiles.length > 0)) && (
            <div className="col-span-2">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Attachments</div>
              <div className="flex flex-col gap-1">
                {Array.isArray(doc.attachments) && doc.attachments.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"><ExternalLink size={11}/>{f.name}</a>
                ))}
                {doc.drawingLink && <a href={doc.drawingLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"><ExternalLink size={11}/>Open Drawing</a>}
                {Array.isArray(doc.docTitleFiles) && doc.docTitleFiles.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800"><ExternalLink size={11}/>{f.name}</a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Latest Rev Logic ──────────────────────────────────────────────────────────
// Sort revisions: numeric first, then alpha. Higher = latest.
function revOrder(rev) {
  const n = parseInt(rev, 10);
  if (!isNaN(n)) return n;
  // Alpha: A=1, B=2 ... Z=26, AA=27 etc.
  let val = 0;
  for (const ch of rev.toUpperCase()) val = val * 26 + (ch.charCodeAt(0) - 64);
  return val;
}

function transmittalOrder(transmittalNo = '') {
  const normalized = String(transmittalNo || '').trim();
  if (!normalized) return Number.NEGATIVE_INFINITY;

  const parts = normalized.match(/\d+/g);
  if (!parts?.length) return Number.NEGATIVE_INFINITY;

  // Prefer the last numeric block because generated transmittals increment there.
  return parseInt(parts[parts.length - 1], 10);
}

function compareDocsForLatest(a, b) {
  const revDiff = revOrder(a?.rev || '') - revOrder(b?.rev || '');
  if (revDiff !== 0) return revDiff;

  const transmittalDiff = transmittalOrder(a?.transmittalNo) - transmittalOrder(b?.transmittalNo);
  if (transmittalDiff !== 0) return transmittalDiff;

  return String(a?.transmittalNo || '').localeCompare(String(b?.transmittalNo || ''), undefined, { numeric: true });
}

function getLatestRevDocs(docs) {
  const grouped = {};
  for (const doc of docs) {
    if (!grouped[doc.documentNo]) {
      grouped[doc.documentNo] = doc;
    } else {
      if (compareDocsForLatest(doc, grouped[doc.documentNo]) > 0) {
        grouped[doc.documentNo] = doc;
      }
    }
  }
  return Object.values(grouped);
}

// ── Attachment links helper (supports new array format & legacy string) ────────
function AttachmentLinks({ doc }) {
  if (Array.isArray(doc.attachments) && doc.attachments.length > 0) {
    return (
      <div className="flex flex-col gap-0.5">
        {doc.attachments.map((f, i) => (
          <a
            key={i}
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 whitespace-nowrap">
            <ExternalLink size={10} />{f.name}
          </a>
        ))}
      </div>
    );
  }
  if (doc.drawingLink) {
    return (
      <a
        href={doc.drawingLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 whitespace-nowrap">
        <ExternalLink size={11} /> Open
      </a>
    );
  }
  return <span className="text-[11px] text-slate-300">—</span>;
}

// ── Document Title with attached doc files ─────────────────────────────────────
function TitleCell({ doc, isHistory }) {
  return (
    <div className={`text-[11px] ${isHistory ? 'text-slate-400' : 'text-slate-700'}`}>
      <div className="truncate" title={doc.documentTitle}>{doc.documentTitle}</div>
      {Array.isArray(doc.docTitleFiles) && doc.docTitleFiles.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-0.5">
          {doc.docTitleFiles.map((f, i) => (
            <a
              key={i}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] text-purple-600 hover:text-purple-800 whitespace-nowrap">
              <ExternalLink size={9} />{f.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Row Component ─────────────────────────────────────────────────────────────
function DocRow({ doc, isLatest, isHistory, onEdit, onDelete, onDuplicate, onView, rowIndex }) {
  return (
    <tr
      className={`group transition-colors cursor-pointer select-none ${
        isHistory ? 'bg-slate-50/60 text-slate-400' : 'hover:bg-orange-50/60'
      }`}
      onClick={() => onView && onView(doc)}
      title="Click to view details"
    >
      <td className="px-3 py-0.5 text-slate-400 font-mono text-xs">{rowIndex}</td>
      <td className="px-3 py-0.5 font-mono text-slate-700 whitespace-nowrap text-xs">{doc.transmittalNo}</td>
      <td className="px-3 py-0.5 font-mono text-slate-500 whitespace-nowrap text-xs">{doc.transmittalNoRef || '—'}</td>
      <td className="px-3 py-0.5 text-slate-600 whitespace-nowrap text-xs">{doc.transmittalDate || '—'}</td>
      <td className="px-3 py-0.5 text-slate-600 whitespace-nowrap text-xs">{doc.from || '—'}</td>
      <td className="px-3 py-0.5">
        <span className={`text-[10px] px-1.5 py-px rounded-full font-medium whitespace-nowrap ${doc.isExternal ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
          {doc.isExternal ? 'Ext' : 'Int'}
        </span>
      </td>
      <td className="px-3 py-0.5">
        {doc.categoryGroup
          ? <span className={`text-[10px] px-1.5 py-px rounded-full font-medium whitespace-nowrap ${CAT_GROUP_COLORS[doc.categoryGroup] || 'bg-slate-100 text-slate-600'}`}>{doc.categoryGroup}</span>
          : <span className="text-xs text-slate-300">—</span>}
      </td>
      <td className="px-3 py-0.5">
        <span className={`text-[10px] px-1.5 py-px rounded-full font-medium whitespace-nowrap ${CAT_COLORS[doc.category] || 'bg-slate-100 text-slate-600'}`}>{doc.category}</span>
      </td>
      <td className="px-3 py-0.5 font-mono font-semibold text-slate-800 whitespace-nowrap text-xs">{doc.documentNo}</td>
      <td className="px-3 py-0.5 max-w-[220px]"><TitleCell doc={doc} isHistory={isHistory} /></td>
      <td className="px-3 py-0.5 text-slate-500 whitespace-nowrap text-xs font-mono">{doc.receiveDate || '—'}</td>
      <td className="px-3 py-0.5">
        <div className="flex items-center gap-1">
          <span className={`text-[10px] font-bold px-1.5 py-px rounded-full whitespace-nowrap ${
            isLatest ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300' : 'bg-slate-100 text-slate-500'
          }`}>{doc.rev}</span>
          {isLatest && <span className="text-[9px] font-semibold text-orange-600 bg-orange-50 px-1 py-px rounded-full border border-orange-200">LATEST</span>}
        </div>
      </td>
      <td className="px-3 py-0.5">
        <span className={`text-[10px] font-semibold px-1.5 py-px rounded-full whitespace-nowrap ${STATUS_COLORS[doc.status] || 'bg-slate-100 text-slate-600'}`}>{doc.status}</span>
      </td>
      <td className="px-3 py-0.5"><span className="text-xs text-slate-500">{doc.byEmail ? '📧' : '🤝'}</span></td>
      <td className="px-3 py-0.5 min-w-[110px]"><AttachmentLinks doc={doc} /></td>
      <td className="px-3 py-0.5">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onDuplicate && <button onClick={e => { e.stopPropagation(); onDuplicate(doc); }} className="w-5 h-5 rounded bg-amber-50 hover:bg-amber-100 flex items-center justify-center" title="Duplicate"><Copy size={9} className="text-amber-600" /></button>}
          {onEdit     && <button onClick={e => { e.stopPropagation(); onEdit(doc); }}      className="w-5 h-5 rounded bg-blue-50 hover:bg-blue-100 flex items-center justify-center"   title="Edit"><Pencil size={9} className="text-blue-600" /></button>}
          {onDelete   && <button onClick={e => { e.stopPropagation(); onDelete(doc); }}    className="w-5 h-5 rounded bg-red-50 hover:bg-red-100 flex items-center justify-center"    title="Delete"><Trash2 size={9} className="text-red-500" /></button>}
        </div>
      </td>
    </tr>
  );
}

// ── Grouped rows with expand/collapse ─────────────────────────────────────────
function DocGroup({ docNo, docs, latestId, showAllRevs, onEdit, onDelete, onDuplicate, onView, startIndex }) {
  const [expanded, setExpanded] = useState(false);
  const latestDoc   = docs.find(d => d.id === latestId);
  const historyDocs = docs
    .filter(d => d.id !== latestId)
    .sort((a, b) => compareDocsForLatest(b, a));
  const hasHistory  = historyDocs.length > 0;

  if (showAllRevs) {
    const sorted = [...docs].sort((a, b) => compareDocsForLatest(b, a));
    return sorted.map((doc, i) => (
      <DocRow
        key={doc.id}
        doc={doc}
        isLatest={doc.id === latestId}
        isHistory={doc.id !== latestId}
        onEdit={onEdit}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        rowIndex={startIndex + i}
      />
    ));
  }

  return (
    <>
      <tr
        className="group hover:bg-orange-50/60 transition-colors cursor-pointer select-none"
        onClick={() => onView && onView(latestDoc)}
        title="Click to view details"
      >
        <td className="px-3 py-0.5 text-slate-400 font-mono text-xs">{startIndex}</td>
        <td className="px-3 py-0.5 font-mono text-slate-700 whitespace-nowrap text-xs">{latestDoc?.transmittalNo}</td>
        <td className="px-3 py-0.5 font-mono text-slate-500 whitespace-nowrap text-xs">{latestDoc?.transmittalNoRef || '—'}</td>
        <td className="px-3 py-0.5 text-slate-600 whitespace-nowrap text-xs">{latestDoc?.transmittalDate || '—'}</td>
        <td className="px-3 py-0.5 text-slate-600 whitespace-nowrap text-xs">{latestDoc?.from || '—'}</td>
        <td className="px-3 py-0.5">
          <span className={`text-[10px] px-1.5 py-px rounded-full font-medium whitespace-nowrap ${latestDoc?.isExternal ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
            {latestDoc?.isExternal ? 'Ext' : 'Int'}
          </span>
        </td>
        <td className="px-3 py-0.5">
          {latestDoc?.categoryGroup
            ? <span className={`text-[10px] px-1.5 py-px rounded-full font-medium whitespace-nowrap ${CAT_GROUP_COLORS[latestDoc?.categoryGroup] || 'bg-slate-100 text-slate-600'}`}>{latestDoc?.categoryGroup}</span>
            : <span className="text-xs text-slate-300">—</span>}
        </td>
        <td className="px-3 py-0.5">
          <span className={`text-[10px] px-1.5 py-px rounded-full font-medium whitespace-nowrap ${CAT_COLORS[latestDoc?.category] || 'bg-slate-100 text-slate-600'}`}>{latestDoc?.category}</span>
        </td>
        <td className="px-3 py-0.5 font-mono font-semibold text-slate-800 whitespace-nowrap text-xs">
          <div className="flex items-center gap-1">
            {hasHistory && (
              <button onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                className="w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                title={expanded ? 'Collapse history' : `Show ${historyDocs.length} older revision(s)`}>
                {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              </button>
            )}
            <span>{docNo}</span>
            {hasHistory && <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-px rounded-full font-medium">{docs.length}r</span>}
          </div>
        </td>
        <td className="px-3 py-0.5 max-w-[220px]"><TitleCell doc={latestDoc || {}} isHistory={false} /></td>
        <td className="px-3 py-0.5 text-slate-500 whitespace-nowrap text-xs font-mono">{latestDoc?.receiveDate || '—'}</td>
        <td className="px-3 py-0.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold px-1.5 py-px rounded-full bg-orange-100 text-orange-700 ring-1 ring-orange-300 whitespace-nowrap">{latestDoc?.rev}</span>
            <span className="text-[9px] font-semibold text-orange-600 bg-orange-50 px-1 py-px rounded-full border border-orange-200">LATEST</span>
          </div>
        </td>
        <td className="px-3 py-0.5">
          <span className={`text-[10px] font-semibold px-1.5 py-px rounded-full whitespace-nowrap ${STATUS_COLORS[latestDoc?.status] || 'bg-slate-100 text-slate-600'}`}>{latestDoc?.status}</span>
        </td>
        <td className="px-3 py-0.5"><span className="text-xs text-slate-500">{latestDoc?.byEmail ? '📧' : '🤝'}</span></td>
        <td className="px-3 py-0.5 min-w-[110px]"><AttachmentLinks doc={latestDoc || {}} /></td>
        {(onDuplicate || onEdit || onDelete) && (
          <td className="px-3 py-0.5">
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onDuplicate && <button onClick={e => { e.stopPropagation(); onDuplicate(latestDoc); }} className="w-5 h-5 rounded bg-amber-50 hover:bg-amber-100 flex items-center justify-center" title="Duplicate"><Copy size={9} className="text-amber-600" /></button>}
              {onEdit     && <button onClick={e => { e.stopPropagation(); onEdit(latestDoc); }}      className="w-5 h-5 rounded bg-blue-50 hover:bg-blue-100 flex items-center justify-center"   title="Edit"><Pencil size={9} className="text-blue-600" /></button>}
              {onDelete   && <button onClick={e => { e.stopPropagation(); onDelete(latestDoc); }}    className="w-5 h-5 rounded bg-red-50 hover:bg-red-100 flex items-center justify-center"    title="Delete"><Trash2 size={9} className="text-red-500" /></button>}
            </div>
          </td>
        )}
      </tr>

      {expanded && historyDocs.map((doc) => (
        <DocRow key={doc.id} doc={doc} isLatest={false} isHistory={true}
          onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} onView={onView} rowIndex="  ↳" />
      ))}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function QcDocumentsPage() {
  const { qcDocuments, addQcDocument, updateQcDocument, deleteQcDocument, selectedProjectId, selectedProject } = useApp();
  const { canAction } = useMenuPermissions();
  const PAGE_SIZE = 20;

  const [showAllRevs,    setShowAllRevs]    = useState(false);
  const [search,         setSearch]         = useState('');
  const [currentPage,    setCurrentPage]    = useState(1);
  const [columnFilters,  setColumnFilters]  = useState({});
  const [modalMode,      setModalMode]      = useState(null);
  const [editTarget,     setEditTarget]     = useState(null);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [duplicateSource, setDuplicateSource] = useState(null);
  const [viewTarget,     setViewTarget]     = useState(null);

  function setColFilter(key, vals) {
    setColumnFilters(prev => ({ ...prev, [key]: vals }));
  }

  // Filterable column keys (exclude row, attachments, actions)
  const FILTERABLE_COLS = ['transmittalNo','transRef','transDate','from','type','catGroup','cat','documentNo','documentTitle','receiveDate','revision','status','delivery'];

  const canAddTransmittal       = canAction('qc-documents', 'addTransmittal');
  const canDuplicateTransmittal = canAction('qc-documents', 'duplicateTransmittal');
  const canEditTransmittal      = canAction('qc-documents', 'editTransmittal');
  const canDeleteTransmittal    = canAction('qc-documents', 'deleteTransmittal');

  // Filter to selected project first
  const projectDocs = qcDocuments.filter(d => d.projectId === selectedProjectId);

  // Apply search + column filters
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projectDocs.filter(d => {
      // Global search: match any field value
      if (q) {
        const allValues = [
          d.transmittalNo, d.transmittalNoRef, d.transmittalDate,
          d.from, d.isExternal ? 'External' : 'Internal',
          d.categoryGroup, d.category, d.documentNo, d.documentTitle,
          d.receiveDate, d.rev ? `Rev. ${d.rev}` : '', d.status,
          d.byEmail ? 'Email' : 'Hand',
        ];
        const match = allValues.some(v => (v || '').toLowerCase().includes(q));
        if (!match) return false;
      }
      // Per-column filters
      for (const [key, vals] of Object.entries(columnFilters)) {
        if (!vals || vals.length === 0) continue;
        const cellVal = getDocFieldValue(d, key);
        if (!vals.includes(cellVal)) return false;
      }
      return true;
    });
  }, [projectDocs, search, columnFilters]);

  // Build grouped structure: { documentNo -> [docs] }
  const grouped = useMemo(() => {
    const map = {};
    for (const doc of filtered) {
      if (!map[doc.documentNo]) map[doc.documentNo] = [];
      map[doc.documentNo].push(doc);
    }
    // For each group, find latest id
    const result = Object.entries(map).map(([docNo, docs]) => {
      const latest = docs.reduce((best, d) => compareDocsForLatest(d, best) > 0 ? d : best);
      return { docNo, docs, latestId: latest.id, latestDocId: latest.id };
    });
    // Default sort: newest uploaded first (by id descending — id is doc-${Date.now()}-${i})
    result.sort((a, b) => {
      const aId = a.latestDocId || '';
      const bId = b.latestDocId || '';
      return bId.localeCompare(aId);
    });
    return result;
  }, [filtered]);

  // Counts
  const totalDocs   = filtered.length;
  const uniqueDocs  = grouped.length;
  const totalPages  = Math.max(1, Math.ceil(uniqueDocs / PAGE_SIZE));
  const pageStart   = (currentPage - 1) * PAGE_SIZE;
  const pagedGrouped = grouped.slice(pageStart, pageStart + PAGE_SIZE);
  const pageEnd     = pageStart + pagedGrouped.length;

  // Active column filter count (for badge)
  const activeFilterCount = Object.values(columnFilters).filter(v => v && v.length > 0).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, columnFilters, selectedProjectId]);

  useEffect(() => {
    setCurrentPage(prev => Math.min(prev, totalPages));
  }, [totalPages]);

  function handleSave(formOrArray) {
    if (modalMode === 'edit') {
      updateQcDocument(editTarget.id, formOrArray);
    } else {
      const forms = Array.isArray(formOrArray) ? formOrArray : [formOrArray];
      forms.forEach((form, i) => {
        addQcDocument({ ...form, id: `doc-${Date.now()}-${i}` });
      });
    }
    setModalMode(null);
    setEditTarget(null);
    setDuplicateSource(null);
  }

  function handleDelete() {
    deleteQcDocument(deleteTarget.id);
    setDeleteTarget(null);
  }

  function handleDuplicate(doc) {
    setDuplicateSource(doc);
    setModalMode('duplicate');
  }

  // Row counter
  let rowCounter = 0;

  return (
    <div className="space-y-3">
      {/* Header — compact single row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">QC Document Control</h1>
            <p className="text-[11px] text-slate-500">{selectedProject?.name} — Drawing &amp; Transmittal Register</p>
          </div>
          {/* Inline stat pills */}
          <div className="flex items-center gap-2">
            {[
              { label: 'Transmittals', value: totalDocs,  color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100'   },
              { label: 'Unique Docs',  value: uniqueDocs, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
              { label: 'Approved',     value: filtered.filter(d => d.status === 'Approved').length,         color: 'text-green-600', bg: 'bg-green-50 border-green-100'  },
              { label: 'For Const.',   value: filtered.filter(d => d.status === 'For Construction').length, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${s.bg}`}>
                <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                <span className="text-[10px] text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        {canAddTransmittal && (
          <button
            onClick={() => setModalMode('add')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus size={13} />
            Add Transmittal
          </button>
        )}
      </div>

      {/* Toolbar — compact */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="text-[11px] pl-7 pr-7 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 w-64 text-slate-700 placeholder-slate-400"
            placeholder="Search all columns…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={11} />
            </button>
          )}
        </div>

        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-200 rounded-lg">
            <Filter size={10} className="text-orange-500" />
            <span className="text-[10px] font-semibold text-orange-600">{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}</span>
            <button onClick={() => setColumnFilters({})} className="ml-0.5 text-orange-400 hover:text-orange-700" title="Clear all column filters">
              <X size={9} />
            </button>
          </div>
        )}

        <button
          onClick={() => setShowAllRevs(v => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
            showAllRevs ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
          }`}
        >
          {showAllRevs ? <EyeOff size={11} /> : <Eye size={11} />}
          {showAllRevs ? 'All Revisions' : 'Latest Rev Only'}
        </button>

        <span className="ml-auto text-[10px] text-slate-400">
          {showAllRevs ? `${totalDocs} records` : `${uniqueDocs} docs · newest first`}
          {uniqueDocs > 0 ? ` • ${PAGE_SIZE} per page` : ''}
        </span>
      </div>

      {/* Table */}
      <TableColumnVisibility
        storageKey="qc-documents-table-columns"
        tableId="qc-documents-table"
        columns={QC_DOC_TABLE_COLUMNS}
        className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden p-2 pt-0"
      >
        <div className="overflow-x-auto">
          <table data-column-table="qc-documents-table" className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white">
                {QC_DOC_TABLE_COLUMNS
                  .filter(col => col.key !== 'actions' || (canDuplicateTransmittal || canAddTransmittal || canEditTransmittal || canDeleteTransmittal))
                  .map(col => (
                    <th key={col.key} className="px-3 py-2 text-left font-semibold whitespace-nowrap text-[10px] tracking-wide">
                      <div className="flex items-center gap-0.5">
                        <span>{col.label}</span>
                        {FILTERABLE_COLS.includes(col.key) && (
                          <ColumnFilterDropdown
                            colKey={col.key}
                            label={col.label}
                            allDocs={projectDocs}
                            activeValues={columnFilters[col.key] || []}
                            onChange={vals => setColFilter(col.key, vals)}
                          />
                        )}
                      </div>
                    </th>
                  ))
                }
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {grouped.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-4 py-12 text-center text-slate-400">
                    No documents found for <span className="font-semibold">{selectedProject?.name}</span>.
                    {(search || activeFilterCount > 0) ? ' Try clearing filters.' : ''}
                  </td>
                </tr>
              )}
              {pagedGrouped.map(({ docNo, docs, latestId }, index) => {
                rowCounter = pageStart + index + 1;
                const idx = rowCounter;
                return (
                  <DocGroup
                    key={docNo}
                    docNo={docNo}
                    docs={docs}
                    latestId={latestId}
                    showAllRevs={showAllRevs}
                    onDuplicate={canDuplicateTransmittal ? handleDuplicate : null}
                    onEdit={canEditTransmittal ? (doc) => { setEditTarget(doc); setModalMode('edit'); } : null}
                    onDelete={canDeleteTransmittal ? (doc) => setDeleteTarget(doc) : null}
                    onView={(doc) => setViewTarget(doc)}
                    startIndex={idx}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4 flex-wrap text-[11px] text-slate-500">
          <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <Layers size={12} className="text-slate-400" />
            {uniqueDocs} unique document numbers
          </span>
          <span className="flex items-center gap-1.5">
            <History size={12} className="text-slate-400" />
            {totalDocs - uniqueDocs} older revisions on record
          </span>
          {uniqueDocs > 0 && (
            <span>
              Showing {pageStart + 1}-{pageEnd} of {uniqueDocs}
            </span>
          )}
          {!showAllRevs && (
            <span className="text-orange-600 font-medium">
              ✦ Showing latest revision per document. Use "Show All Revisions" to view full history.
            </span>
          )}
        </div>
          {uniqueDocs > PAGE_SIZE && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-300"
              >
                <ChevronLeft size={12} />
                Prev
              </button>
              <span className="min-w-[72px] text-center text-slate-600 font-medium">
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-300"
              >
                Next
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </TableColumnVisibility>

      {/* Modals */}
      {(modalMode === 'add' || modalMode === 'edit' || modalMode === 'duplicate') && (
        <QcDocModal
          doc={modalMode === 'edit' ? editTarget : modalMode === 'duplicate' ? duplicateSource : null}
          isDuplicate={modalMode === 'duplicate'}
          projectDocs={projectDocs}
          onSave={handleSave}
          onClose={() => { setModalMode(null); setEditTarget(null); setDuplicateSource(null); }}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          doc={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {viewTarget && (
        <DocDetailModal
          doc={viewTarget}
          onClose={() => setViewTarget(null)}
          onEdit={canEditTransmittal ? (doc) => { setViewTarget(null); setEditTarget(doc); setModalMode('edit'); } : null}
          onDelete={canDeleteTransmittal ? (doc) => { setViewTarget(null); setDeleteTarget(doc); } : null}
        />
      )}
    </div>
  );
}
