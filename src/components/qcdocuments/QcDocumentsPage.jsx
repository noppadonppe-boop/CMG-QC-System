import { useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, Search, ExternalLink,
  Layers, ChevronDown, ChevronRight, History, Eye, EyeOff,
  FileText, Filter, Copy
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import QcDocModal, { generateTransmittalNo } from './QcDocModal';
import { useMenuPermissions } from '../../auth/useMenuPermissions';

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

function getLatestRevDocs(docs) {
  const grouped = {};
  for (const doc of docs) {
    if (!grouped[doc.documentNo]) {
      grouped[doc.documentNo] = doc;
    } else {
      if (revOrder(doc.rev) > revOrder(grouped[doc.documentNo].rev)) {
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
          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 whitespace-nowrap">
            <ExternalLink size={10} />{f.name}
          </a>
        ))}
      </div>
    );
  }
  if (doc.drawingLink) {
    return (
      <a href={doc.drawingLink} target="_blank" rel="noopener noreferrer"
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
            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
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
function DocRow({ doc, isLatest, isHistory, onEdit, onDelete, onDuplicate, rowIndex }) {
  return (
    <tr className={`group transition-colors ${
      isHistory ? 'bg-slate-50/60 text-slate-400' : 'hover:bg-orange-50/40'
    }`}>
      <td className="px-4 py-2.5 text-slate-400 font-mono text-[11px]">{rowIndex}</td>
      <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap text-[11px]">{doc.transmittalNo}</td>
      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap text-[11px]">{doc.transmittalDate || '—'}</td>
      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap text-[11px]">{doc.from || '—'}</td>
      <td className="px-4 py-2.5">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${CAT_COLORS[doc.category] || 'bg-slate-100 text-slate-600'}`}>
          {doc.category}
        </span>
      </td>
      <td className="px-4 py-2.5 font-mono font-semibold text-slate-800 whitespace-nowrap text-[11px]">{doc.documentNo}</td>
      <td className="px-4 py-2.5 max-w-[240px]">
        <TitleCell doc={doc} isHistory={isHistory} />
      </td>
      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-[11px] font-mono">{doc.receiveDate || '—'}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
            isLatest
              ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300'
              : 'bg-slate-100 text-slate-500'
          }`}>
            Rev. {doc.rev}
          </span>
          {isLatest && (
            <span className="text-[9px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-200">
              LATEST
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[doc.status] || 'bg-slate-100 text-slate-600'}`}>
          {doc.status}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-[11px] text-slate-500 whitespace-nowrap">
          {doc.byEmail ? '📧 Email' : '🤝 Hand'}
        </span>
      </td>
      <td className="px-4 py-2.5 min-w-[140px]">
        <AttachmentLinks doc={doc} />
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onDuplicate && (
            <button
              onClick={() => onDuplicate(doc)}
              className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition-colors"
              title="Duplicate"
            >
              <Copy size={12} className="text-amber-600" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(doc)}
              className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
              title="Edit"
            >
              <Pencil size={12} className="text-blue-600" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(doc)}
              className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
              title="Delete"
            >
              <Trash2 size={12} className="text-red-500" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Grouped rows with expand/collapse ─────────────────────────────────────────
function DocGroup({ docNo, docs, latestId, showAllRevs, onEdit, onDelete, onDuplicate, startIndex }) {
  const [expanded, setExpanded] = useState(false);
  const latestDoc   = docs.find(d => d.id === latestId);
  const historyDocs = docs.filter(d => d.id !== latestId).sort((a, b) => revOrder(b.rev) - revOrder(a.rev));
  const hasHistory  = historyDocs.length > 0;

  if (showAllRevs) {
    const sorted = [...docs].sort((a, b) => revOrder(b.rev) - revOrder(a.rev));
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
      <tr className="group hover:bg-orange-50/40 transition-colors">
        <td className="px-4 py-2.5 text-slate-400 font-mono text-[11px]">{startIndex}</td>
        <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap text-[11px]">{latestDoc?.transmittalNo}</td>
        <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap text-[11px]">{latestDoc?.transmittalDate || '—'}</td>
        <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap text-[11px]">{latestDoc?.from || '—'}</td>
        <td className="px-4 py-2.5">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${CAT_COLORS[latestDoc?.category] || 'bg-slate-100 text-slate-600'}`}>
            {latestDoc?.category}
          </span>
        </td>
        <td className="px-4 py-2.5 font-mono font-semibold text-slate-800 whitespace-nowrap text-[11px]">
          <div className="flex items-center gap-1.5">
            {hasHistory && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                title={expanded ? 'Collapse history' : `Show ${historyDocs.length} older revision(s)`}
              >
                {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>
            )}
            <span>{docNo}</span>
            {hasHistory && (
              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
                {docs.length} rev
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-2.5 max-w-[240px]">
          <TitleCell doc={latestDoc || {}} isHistory={false} />
        </td>
        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-[11px] font-mono">{latestDoc?.receiveDate || '—'}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 ring-1 ring-orange-300 whitespace-nowrap">
              Rev. {latestDoc?.rev}
            </span>
            <span className="text-[9px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-200">
              LATEST
            </span>
          </div>
        </td>
        <td className="px-4 py-2.5">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[latestDoc?.status] || 'bg-slate-100 text-slate-600'}`}>
            {latestDoc?.status}
          </span>
        </td>
        <td className="px-4 py-2.5">
          <span className="text-[11px] text-slate-500 whitespace-nowrap">
            {latestDoc?.byEmail ? '📧 Email' : '🤝 Hand'}
          </span>
        </td>
        <td className="px-4 py-2.5 min-w-[140px]">
          <AttachmentLinks doc={latestDoc || {}} />
        </td>
        {(onDuplicate || onEdit || onDelete) && (
          <td className="px-4 py-2.5">
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onDuplicate && (
                <button onClick={() => onDuplicate(latestDoc)} className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition-colors" title="Duplicate">
                  <Copy size={12} className="text-amber-600" />
                </button>
              )}
              {onEdit && (
                <button onClick={() => onEdit(latestDoc)} className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors" title="Edit">
                  <Pencil size={12} className="text-blue-600" />
                </button>
              )}
              {onDelete && (
                <button onClick={() => onDelete(latestDoc)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors" title="Delete">
                  <Trash2 size={12} className="text-red-500" />
                </button>
              )}
            </div>
          </td>
        )}
      </tr>

      {expanded && historyDocs.map((doc, i) => (
        <DocRow
          key={doc.id}
          doc={doc}
          isLatest={false}
          isHistory={true}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          rowIndex={`  ↳`}
        />
      ))}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function QcDocumentsPage() {
  const { qcDocuments, addQcDocument, updateQcDocument, deleteQcDocument, selectedProjectId, selectedProject } = useApp();
  const { canAction } = useMenuPermissions();

  const [showAllRevs,    setShowAllRevs]    = useState(false);
  const [search,         setSearch]         = useState('');
  const [filterCat,      setFilterCat]      = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [modalMode,      setModalMode]      = useState(null);
  const [editTarget,     setEditTarget]     = useState(null);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [duplicateSource, setDuplicateSource] = useState(null);

  const canAddTransmittal       = canAction('qc-documents', 'addTransmittal');
  const canDuplicateTransmittal = canAction('qc-documents', 'duplicateTransmittal');
  const canEditTransmittal      = canAction('qc-documents', 'editTransmittal');
  const canDeleteTransmittal    = canAction('qc-documents', 'deleteTransmittal');

  // Filter to selected project first
  const projectDocs = qcDocuments.filter(d => d.projectId === selectedProjectId);

  // Apply search + filters
  const filtered = useMemo(() => {
    return projectDocs.filter(d => {
      const matchSearch = !search || [d.transmittalNo, d.documentNo, d.documentTitle, d.from, d.category].some(v =>
        (v || '').toLowerCase().includes(search.toLowerCase())
      );
      const matchCat    = !filterCat    || d.category === filterCat;
      const matchStatus = !filterStatus || d.status   === filterStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [projectDocs, search, filterCat, filterStatus]);

  // Build grouped structure: { documentNo -> [docs] }
  const grouped = useMemo(() => {
    const map = {};
    for (const doc of filtered) {
      if (!map[doc.documentNo]) map[doc.documentNo] = [];
      map[doc.documentNo].push(doc);
    }
    // For each group, find latest id
    const result = Object.entries(map).map(([docNo, docs]) => {
      const latest = docs.reduce((best, d) => revOrder(d.rev) > revOrder(best.rev) ? d : best);
      return { docNo, docs, latestId: latest.id };
    });
    // Sort groups by documentNo
    result.sort((a, b) => a.docNo.localeCompare(b.docNo));
    return result;
  }, [filtered]);

  // Counts
  const totalDocs   = filtered.length;
  const uniqueDocs  = grouped.length;
  const categories  = [...new Set(projectDocs.map(d => d.category))];
  const statuses    = [...new Set(projectDocs.map(d => d.status))];

  function handleSave(form) {
    if (modalMode === 'edit') {
      updateQcDocument(editTarget.id, form);
    } else {
      // add or duplicate — both create a new record
      addQcDocument({ ...form, id: `doc-${Date.now()}` });
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">QC Document Control</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedProject?.name} — Drawing & Transmittal Register
          </p>
        </div>
        {canAddTransmittal && (
          <button
            onClick={() => setModalMode('add')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus size={15} />
            Add Transmittal
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Transmittals', value: totalDocs,  color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Unique Documents',   value: uniqueDocs, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Approved',           value: filtered.filter(d => d.status === 'Approved').length,         color: 'text-green-600', bg: 'bg-green-50'  },
          { label: 'For Construction',   value: filtered.filter(d => d.status === 'For Construction').length, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
              <FileText size={16} className={s.color} />
            </div>
            <div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 w-64 text-slate-700 placeholder-slate-400"
            placeholder="Search transmittal, doc no., title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-400" />
          <select
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-700"
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Status filter */}
        <select
          className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-700"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>

        {/* ── LATEST REV TOGGLE ── */}
        <button
          onClick={() => setShowAllRevs(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
            showAllRevs
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
          }`}
        >
          {showAllRevs ? <EyeOff size={13} /> : <Eye size={13} />}
          {showAllRevs ? 'Showing All Revisions' : 'Show All Revisions'}
          {showAllRevs && (
            <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
              {totalDocs} records
            </span>
          )}
        </button>

        <span className="ml-auto text-[11px] text-slate-500">
          {showAllRevs
            ? `${totalDocs} records`
            : `${uniqueDocs} documents (latest rev only)`}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white">
                {['#', 'Transmittal No.', 'Trans. Date', 'From', 'Category', 'Document No.', 'Document Title', 'Receive Date', 'Revision', 'Status', 'Delivery', 'Attachments', (canDuplicateTransmittal || canAddTransmittal || canEditTransmittal || canDeleteTransmittal) ? 'Actions' : ''].filter(Boolean).map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap text-[11px] tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {grouped.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-400">
                    No documents found for <span className="font-semibold">{selectedProject?.name}</span>.
                    {search || filterCat || filterStatus ? ' Try clearing filters.' : ''}
                  </td>
                </tr>
              )}
              {grouped.map(({ docNo, docs, latestId }) => {
                rowCounter++;
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
                    startIndex={idx}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Layers size={12} className="text-slate-400" />
            {uniqueDocs} unique document numbers
          </span>
          <span className="flex items-center gap-1.5">
            <History size={12} className="text-slate-400" />
            {totalDocs - uniqueDocs} older revisions on record
          </span>
          {!showAllRevs && (
            <span className="text-orange-600 font-medium">
              ✦ Showing latest revision per document. Use "Show All Revisions" to view full history.
            </span>
          )}
        </div>
      </div>

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
    </div>
  );
}
