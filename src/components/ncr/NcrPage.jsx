import { useState } from 'react';
import {
  Plus, Pencil, Trash2, Search, ExternalLink,
  AlertOctagon, CheckCircle2, XCircle, Clock, MessageSquare, X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import NcrModal from './NcrModal';

const STATUS_BADGE = {
  'Open':         'bg-red-100 text-red-700',
  'In Progress':  'bg-amber-100 text-amber-700',
  'With Comment': 'bg-blue-100 text-blue-700',
  'Reject':       'bg-rose-100 text-rose-700',
  'Close':        'bg-green-100 text-green-700',
};
const STATUS_ICON = {
  'Open':         '🔴',
  'In Progress':  '🟡',
  'With Comment': '💬',
  'Reject':       '❌',
  'Close':        '🔒',
};
const TYPE_BADGE = {
  'Internal NCR': 'bg-slate-100 text-slate-700',
  'External NCR': 'bg-orange-100 text-orange-700',
};

function ConfirmDelete({ item, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Delete NCR?</h3>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2 space-y-0.5">
          <div className="text-xs font-bold text-slate-700">{item.ncrNo}</div>
          <div className="text-[11px] text-slate-500 truncate">{item.description || item.actionToClose || '—'}</div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function NcrPage() {
  const { ncrItems, addNcr, updateNcr, deleteNcr, selectedProjectId, selectedProject, currentUser } = useApp();

  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [modalMode,    setModalMode]    = useState(null);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandRow,    setExpandRow]    = useState(null);

  const canEdit = currentUser.role === 'QcDocCenter';

  const projectItems = ncrItems.filter(n => n.projectId === selectedProjectId);

  const filtered = projectItems.filter(n => {
    const matchSearch = !search ||
      n.ncrNo.toLowerCase().includes(search.toLowerCase()) ||
      (n.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (n.assignedTo || '').toLowerCase().includes(search.toLowerCase()) ||
      (n.actionToClose || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || n.status === filterStatus;
    const matchType   = !filterType   || n.type   === filterType;
    return matchSearch && matchStatus && matchType;
  });

  function handleSave(form) {
    if (modalMode === 'add') {
      addNcr({ ...form, id: `ncr-${Date.now()}`, projectId: selectedProjectId });
    } else {
      updateNcr(editTarget.id, form);
    }
    setModalMode(null);
    setEditTarget(null);
  }

  const counts = {
    total:      projectItems.length,
    open:       projectItems.filter(n => n.status === 'Open').length,
    inProgress: projectItems.filter(n => n.status === 'In Progress').length,
    comment:    projectItems.filter(n => n.status === 'With Comment').length,
    reject:     projectItems.filter(n => n.status === 'Reject').length,
    close:      projectItems.filter(n => n.status === 'Close').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">NCR Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{selectedProject?.name} — Non-Conformance Reports</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setModalMode('add')}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus size={15} />
            Raise NCR
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: 'Total',       value: counts.total,      color: 'text-slate-700',  bg: 'bg-slate-100',  emoji: '📋' },
          { label: 'Open',        value: counts.open,       color: 'text-red-700',    bg: 'bg-red-50',     emoji: '🔴' },
          { label: 'In Progress', value: counts.inProgress, color: 'text-amber-700',  bg: 'bg-amber-50',   emoji: '🟡' },
          { label: 'Comment',     value: counts.comment,    color: 'text-blue-700',   bg: 'bg-blue-50',    emoji: '💬' },
          { label: 'Reject',      value: counts.reject,     color: 'text-rose-700',   bg: 'bg-rose-50',    emoji: '❌' },
          { label: 'Closed',      value: counts.close,      color: 'text-green-700',  bg: 'bg-green-50',   emoji: '🔒' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base ${s.bg}`}>
              {s.emoji}
            </div>
            <div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-slate-500 leading-none mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 w-64 text-slate-700 placeholder-slate-400"
            placeholder="Search NCR no., description, assigned to…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 text-slate-700"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {['Open', 'In Progress', 'With Comment', 'Reject', 'Close'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select
          className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 text-slate-700"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          <option>Internal NCR</option>
          <option>External NCR</option>
        </select>
        {(search || filterStatus || filterType) && (
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); }}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors"
          >
            <X size={13} /> Clear
          </button>
        )}
        <span className="ml-auto text-[11px] text-slate-500">{filtered.length} NCRs</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white">
                {['#', 'NCR No.', 'Issue Date', 'Type', 'Category', 'Description', 'Assigned To', 'Action to Close', 'Attachment', 'Status', canEdit ? 'Actions' : ''].filter(Boolean).map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap text-[11px] tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                    No NCR records for <span className="font-semibold">{selectedProject?.name}</span>.
                  </td>
                </tr>
              )}
              {filtered.map((item, idx) => (
                <>
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    onClick={() => setExpandRow(expandRow === item.id ? null : item.id)}
                  >
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-700 whitespace-nowrap">{item.ncrNo}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">{item.issueDate || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${TYPE_BADGE[item.type] || 'bg-slate-100 text-slate-600'}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {item.category || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <div className="text-[11px] text-slate-700 font-medium truncate" title={item.description}>
                        {item.description || '—'}
                      </div>
                      {item.location && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">{item.location}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{item.assignedTo || '—'}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="text-[11px] text-slate-500 truncate" title={item.actionToClose}>
                        {item.actionToClose || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.attDocument ? (
                        <a
                          href={item.attDocument}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 whitespace-nowrap"
                        >
                          <ExternalLink size={11} /> View
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full w-fit whitespace-nowrap ${STATUS_BADGE[item.status] || 'bg-slate-100 text-slate-500'}`}>
                        <span>{STATUS_ICON[item.status]}</span>
                        {item.status}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => { setEditTarget(item); setModalMode('edit'); }}
                            className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                          >
                            <Pencil size={12} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                          >
                            <Trash2 size={12} className="text-red-500" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                  {/* Expandable detail row */}
                  {expandRow === item.id && (
                    <tr key={`${item.id}-detail`} className="bg-rose-50/40">
                      <td colSpan={canEdit ? 11 : 10} className="px-6 py-4">
                        <div className="grid grid-cols-3 gap-6">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</div>
                            <div className="text-xs text-slate-700">{item.description || '—'}</div>
                            {item.location && (
                              <div className="text-[11px] text-slate-500 mt-1">📍 {item.location}</div>
                            )}
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Root Cause</div>
                            <div className="text-xs text-slate-700">{item.rootCause || '—'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Action to Close</div>
                            <div className="text-xs text-slate-700">{item.actionToClose || '—'}</div>
                            {item.status === 'Close' && item.closedDate && (
                              <div className="mt-1.5 text-[11px] text-green-700 font-semibold">
                                🔒 Closed {item.closedDate} by {item.closedBy || 'N/A'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {filtered.length} NCR{filtered.length !== 1 ? 's' : ''} shown
              {(search || filterStatus || filterType) ? ` (filtered from ${projectItems.length})` : ''}
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-red-600 font-semibold">🔴 {counts.open} Open</span>
              <span className="text-amber-600 font-semibold">🟡 {counts.inProgress} In Progress</span>
              <span className="text-green-600 font-semibold">🔒 {counts.close} Closed</span>
            </div>
          </div>
        )}
      </div>

      {(modalMode === 'add' || modalMode === 'edit') && (
        <NcrModal
          item={modalMode === 'edit' ? editTarget : null}
          onSave={handleSave}
          onClose={() => { setModalMode(null); setEditTarget(null); }}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          item={deleteTarget}
          onConfirm={() => { deleteNcr(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
