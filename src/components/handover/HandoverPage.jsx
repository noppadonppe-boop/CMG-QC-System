import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Search, CheckCircle2, AlertTriangle, Lock, X, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import HandoverModal from './HandoverModal';
import TableColumnVisibility from '../common/TableColumnVisibility';

const STATUS_BADGE = {
  'Verified': 'bg-green-700 text-white',
  'Wait verified': 'bg-blue-700 text-white',
  'Cancel': 'bg-red-100 text-red-600',
};

const HANDOVER_TABLE_COLUMNS = [
  { key: 'timestamp', label: 'ประทับเวลา' },
  { key: 'documentIssuance', label: 'Document issuance' },
  { key: 'noticeNo', label: 'Notice No.' },
  { key: 'description', label: 'Description' },
  { key: 'areaSection', label: 'Area / Section' },
  { key: 'attachmentOpen', label: 'Attachment Document(open)' },
  { key: 'attachmentClose', label: 'Attachment Document(close)' },
  { key: 'subtopic', label: 'Subtopic' },
  { key: 'status', label: 'Status' },
  { key: 'verified', label: 'Verified' },
  { key: 'waitVerified', label: 'Wait verified' },
  { key: 'cancel', label: 'Cancel' },
  { key: 'actions', label: 'Actions', locked: true },
];

function ConfirmDelete({ item, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0"><Trash2 size={18} className="text-red-600" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Delete Handover Record?</h3>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2">
          <div className="text-xs font-bold text-slate-700">{item.noticeNo || item.areaSection}</div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

function AreaReadinessCard({ area, punchItems }) {
  const areaItems = punchItems.filter(p => (p.area || p.location || '') === area || p.area === area);
  const total = areaItems.length;
  const closed = areaItems.filter(p => p.inspectionStatus === 'close').length;
  const allClosed = total > 0 && closed === total;
  const pct = total > 0 ? Math.round((closed / total) * 100) : 0;
  const hasOpen = areaItems.some(p => p.inspectionStatus === 'ongoing');

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${allClosed ? 'border-green-300 bg-green-50' : hasOpen ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${allClosed ? 'bg-green-500' : 'bg-slate-200'}`}>
            {allClosed ? <CheckCircle2 size={16} className="text-white" /> : <AlertTriangle size={16} className="text-slate-500" />}
          </div>
          <span className="text-xs font-bold text-slate-800 truncate">{area}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${allClosed ? 'text-green-700 bg-green-100' : 'text-amber-700 bg-amber-100'}`}>
          {allClosed ? 'Ready' : 'Not Ready'}
        </span>
      </div>
      <div className="mb-2">
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-slate-500">{closed}/{total} punch items closed</span>
          <span className={`font-bold ${allClosed ? 'text-green-600' : 'text-slate-500'}`}>{pct}%</span>
        </div>
        <div className="w-full bg-white rounded-full h-1.5 border border-slate-200">
          <div className={`h-1.5 rounded-full transition-all duration-500 ${allClosed ? 'bg-green-500' : pct > 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function LinkCell({ href }) {
  if (!href) return '—';
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800">
      <ExternalLink size={12} /> Open
    </a>
  );
}

export default function HandoverPage() {
  const { handover, addHandover, updateHandover, deleteHandover, punchlist, selectedProjectId, selectedProject } = useApp();
  const { canAction } = useMenuPermissions();

  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [blockedArea, setBlockedArea] = useState(null);

  const canAddHandover = canAction('handover', 'addHandover');
  const canEditHandover = canAction('handover', 'editHandover');
  const canDeleteHandover = canAction('handover', 'deleteHandover');

  const projectHandovers = handover.filter(h => h.projectId === selectedProjectId);
  const projectPunch = punchlist.filter(p => p.projectId === selectedProjectId);
  const punchAreas = [...new Set(projectPunch.map(p => p.area).filter(Boolean))];
  const allAreas = [...new Set([...punchAreas, ...projectHandovers.map(h => h.areaSection || h.areaName).filter(Boolean)])];

  function isPunchClearForArea(areaName) {
    const areaItems = projectPunch.filter(p => p.area === areaName || p.location === areaName);
    if (areaItems.length === 0) return true;
    return areaItems.every(p => p.inspectionStatus === 'close');
  }

  function handleSave(form) {
    if (modalMode === 'add') {
      if (!isPunchClearForArea(form.areaSection || form.areaName)) {
        setBlockedArea(form.areaSection || form.areaName);
        return;
      }
      addHandover({ ...form, id: `ho-${Date.now()}`, projectId: selectedProjectId });
    } else {
      updateHandover(editTarget.id, form);
    }
    setModalMode(null);
    setEditTarget(null);
  }

  const filtered = useMemo(() => projectHandovers.filter(h => {
    const q = search.toLowerCase();
    return !search ||
      (h.noticeNo || '').toLowerCase().includes(q) ||
      (h.description || '').toLowerCase().includes(q) ||
      (h.areaSection || h.areaName || '').toLowerCase().includes(q) ||
      (h.subtopic || '').toLowerCase().includes(q);
  }), [projectHandovers, search]);

  const counts = {
    total: projectHandovers.length,
    verified: projectHandovers.filter(h => h.status === 'Verified').length,
    wait: projectHandovers.filter(h => h.status === 'Wait verified').length,
    cancel: projectHandovers.filter(h => h.status === 'Cancel').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Area Handover</h1>
          <p className="text-sm text-slate-500 mt-0.5">{selectedProject?.name} — LOGSHEEL CONTROL HANDOVER</p>
        </div>
        {canAddHandover && (
          <button onClick={() => setModalMode('add')} className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm">
            <Plus size={15} /> Create Handover
          </button>
        )}
      </div>

      {blockedArea && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
            <Lock size={15} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-red-800">Handover Blocked — Punch List Not Cleared</div>
            <div className="text-[11px] text-red-600 mt-0.5">
              Area <span className="font-semibold">"{blockedArea}"</span> has open punch items. All punch list items for this area must be Closed before handover can proceed.
            </div>
          </div>
          <button onClick={() => setBlockedArea(null)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Handovers', value: counts.total, color: 'text-slate-700', bg: 'bg-slate-100' },
          { label: 'Verified', value: counts.verified, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Wait verified', value: counts.wait, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Cancel', value: counts.cancel, color: 'text-red-700', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
              <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
            </div>
            <div className="text-[11px] text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {allAreas.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
              <CheckCircle2 size={14} className="text-violet-600" />
            </div>
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Area Punch List Readiness</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {allAreas.map(area => <AreaReadinessCard key={area} area={area} punchItems={projectPunch} />)}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 w-72 placeholder-slate-400 text-slate-700"
            placeholder="Search notice no., description, area…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="ml-auto text-[11px] text-slate-500">{filtered.length} records</span>
      </div>

      <TableColumnVisibility
        storageKey="handover-table-columns"
        tableId="handover-table"
        columns={HANDOVER_TABLE_COLUMNS}
        className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden p-4 pt-3"
      >
        <div className="overflow-x-auto">
          <table data-column-table="handover-table" className="w-full text-xs">
            <thead>
              <tr className="bg-slate-300 text-slate-900">
                {['ประทับเวลา', 'Document issuance', 'Notice No.', 'Description', 'Area / Section', 'Attachment Document(open)', 'Attachment Document(close)', 'Subtopic', 'Status', 'Verified', 'Wait verified', 'Cancel', (canEditHandover || canDeleteHandover) ? 'Actions' : ''].filter(Boolean).map((h, idx) => (
                  <th key={h} className={`px-3 py-3 text-center font-bold whitespace-nowrap text-[11px] border border-slate-500 ${idx === 9 ? 'bg-emerald-700 text-white' : ''} ${idx === 10 ? 'bg-blue-700 text-white' : ''} ${idx === 11 ? 'bg-red-100 text-red-600' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-400 border border-slate-300">
                    No handover records for <span className="font-semibold">{selectedProject?.name}</span>.
                  </td>
                </tr>
              )}
              {filtered.map(item => (
                <tr key={item.id} className="group hover:bg-slate-50">
                  <td className="px-3 py-2 text-center text-slate-700 font-mono text-[11px] border border-slate-300 whitespace-nowrap">{item.timestamp || '—'}</td>
                  <td className="px-3 py-2 text-center text-slate-700 font-mono text-[11px] border border-slate-300 whitespace-nowrap">{item.documentIssuance || item.handoverDate || '—'}</td>
                  <td className="px-3 py-2 text-center text-slate-800 font-medium border border-slate-300 whitespace-nowrap">{item.noticeNo || '—'}</td>
                  <td className="px-3 py-2 text-center text-slate-800 border border-slate-300 whitespace-nowrap">{item.description || '—'}</td>
                  <td className="px-3 py-2 text-center text-slate-800 border border-slate-300 whitespace-nowrap">{item.areaSection || item.areaName || '—'}</td>
                  <td className="px-3 py-2 text-center border border-slate-300"><LinkCell href={item.attachmentOpen} /></td>
                  <td className="px-3 py-2 text-center border border-slate-300"><LinkCell href={item.attachmentClose} /></td>
                  <td className="px-3 py-2 text-center text-slate-800 border border-slate-300 whitespace-nowrap">{item.subtopic || '—'}</td>
                  <td className="px-3 py-2 border border-slate-300 text-center">
                    <span className={`inline-flex min-w-[132px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-bold whitespace-nowrap ${STATUS_BADGE[item.status] || 'bg-slate-100 text-slate-500'}`}>
                      {item.status || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center border border-slate-300">{item.verifiedCount ?? (item.status === 'Verified' ? 1 : 0)}</td>
                  <td className="px-3 py-2 text-center border border-slate-300">{item.waitVerifiedCount ?? (item.status === 'Wait verified' ? 1 : 0)}</td>
                  <td className="px-3 py-2 text-center border border-slate-300">{item.cancelCount ?? (item.status === 'Cancel' ? 1 : 0)}</td>
                  {(canEditHandover || canDeleteHandover) && (
                    <td className="px-3 py-2 border border-slate-300">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEditHandover && (
                          <button onClick={() => { setEditTarget(item); setModalMode('edit'); }} className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"><Pencil size={12} className="text-blue-600" /></button>
                        )}
                        {canDeleteHandover && (
                          <button onClick={() => setDeleteTarget(item)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"><Trash2 size={12} className="text-red-500" /></button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableColumnVisibility>

      {(modalMode === 'add' || modalMode === 'edit') && (
        <HandoverModal item={modalMode === 'edit' ? editTarget : null} onSave={handleSave} onClose={() => { setModalMode(null); setEditTarget(null); setBlockedArea(null); }} />
      )}
      {deleteTarget && (
        <ConfirmDelete item={deleteTarget} onConfirm={() => { deleteHandover(deleteTarget.id); setDeleteTarget(null); }} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
