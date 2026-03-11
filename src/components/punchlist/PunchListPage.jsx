import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Search, ExternalLink, CheckCircle2, Clock, PauseCircle, X, AlertTriangle } from 'lucide-react';
import { useApp }  from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import PunchModal from './PunchModal';

const STATUS_BADGE = {
  close:   'bg-green-100 text-green-700',
  ongoing: 'bg-amber-100 text-amber-700',
  hold:    'bg-slate-100 text-slate-600',
};
const STATUS_ICON = { close: '✅', ongoing: '🔧', hold: '⏸' };
const STATUS_LABEL = { close: 'Close', ongoing: 'Ongoing', hold: 'Hold' };

const CAT_BADGE = {
  A: 'bg-red-100 text-red-700',
  B: 'bg-orange-100 text-orange-700',
  C: 'bg-yellow-100 text-yellow-700',
  D: 'bg-slate-100 text-slate-600',
};
const CAT_DESC = { A: 'Safety/Critical', B: 'Major', C: 'Minor', D: 'Cosmetic' };

function ConfirmDelete({ item, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0"><Trash2 size={18} className="text-red-600" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Delete Punch Item?</h3>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2 space-y-0.5">
          <div className="text-xs font-bold text-slate-700">{item.punchNo}</div>
          <div className="text-[11px] text-slate-500 truncate">{item.description}</div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function PunchListPage() {
  const { punchlist, addPunch, updatePunch, deletePunch, selectedProjectId, selectedProject } = useApp();
  const { userProfile } = useAuth();
  const { canAction } = useMenuPermissions();

  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCat,    setFilterCat]    = useState('');
  const [filterArea,   setFilterArea]   = useState('');
  const [modalMode,    setModalMode]    = useState(null);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const canAddPunch    = canAction('punchlist', 'addPunch');
  const canEditPunch   = canAction('punchlist', 'editPunch');
  const canDeletePunch = canAction('punchlist', 'deletePunch');

  const projectItems = punchlist.filter(p => p.projectId === selectedProjectId);

  const areas = [...new Set(projectItems.map(p => p.area).filter(Boolean))];

  const filtered = useMemo(() => projectItems.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      p.punchNo.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.location || '').toLowerCase().includes(q) ||
      (p.area || '').toLowerCase().includes(q);
    const matchStatus = !filterStatus || p.inspectionStatus === filterStatus;
    const matchCat    = !filterCat    || p.categoryLegend  === filterCat;
    const matchArea   = !filterArea   || (p.area || '')    === filterArea;
    return matchSearch && matchStatus && matchCat && matchArea;
  }), [projectItems, search, filterStatus, filterCat, filterArea]);

  function handleSave(form) {
    if (modalMode === 'add') addPunch({ ...form, id: `pl-${Date.now()}`, projectId: selectedProjectId });
    else updatePunch(editTarget.id, form);
    setModalMode(null); setEditTarget(null);
  }

  const counts = {
    total:   projectItems.length,
    close:   projectItems.filter(p => p.inspectionStatus === 'close').length,
    ongoing: projectItems.filter(p => p.inspectionStatus === 'ongoing').length,
    hold:    projectItems.filter(p => p.inspectionStatus === 'hold').length,
  };
  const pct = counts.total > 0 ? Math.round((counts.close / counts.total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Punch List</h1>
          <p className="text-sm text-slate-500 mt-0.5">{selectedProject?.name} — Defect & Snag Tracking</p>
        </div>
        {canAddPunch && (
          <button onClick={() => setModalMode('add')} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm">
            <Plus size={15} /> Add Punch Item
          </button>
        )}
      </div>

      {/* Summary + progress */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Items', value: counts.total,   color: 'text-slate-700',  bg: 'bg-slate-100'  },
          { label: 'Closed',      value: counts.close,   color: 'text-green-700',  bg: 'bg-green-50'   },
          { label: 'Ongoing',     value: counts.ongoing, color: 'text-amber-700',  bg: 'bg-amber-50'   },
          { label: 'On Hold',     value: counts.hold,    color: 'text-slate-600',  bg: 'bg-slate-50'   },
          { label: 'Closed %',    value: `${pct}%`,      color: pct === 100 ? 'text-green-700' : 'text-violet-700', bg: pct === 100 ? 'bg-green-50' : 'bg-violet-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
              <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
            </div>
            <div className="text-[11px] text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-700">Punch List Completion</span>
          <span className={`text-xs font-bold ${pct === 100 ? 'text-green-600' : 'text-violet-600'}`}>{pct}% Closed</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-violet-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct === 100 && counts.total > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-green-600 font-semibold">
            <CheckCircle2 size={13} /> All punch items closed — area is eligible for handover!
          </div>
        )}
        {pct < 100 && counts.ongoing > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600">
            <AlertTriangle size={13} /> {counts.ongoing} item{counts.ongoing > 1 ? 's' : ''} still open — resolve before handover.
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 w-60 placeholder-slate-400 text-slate-700"
            placeholder="Search punch no., description, location…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-700" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="ongoing">Ongoing</option>
          <option value="close">Close</option>
          <option value="hold">Hold</option>
        </select>
        <select className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-700" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {['A', 'B', 'C', 'D'].map(c => <option key={c} value={c}>Cat. {c} — {CAT_DESC[c]}</option>)}
        </select>
        {areas.length > 0 && (
          <select className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-700" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
            <option value="">All Areas</option>
            {areas.map(a => <option key={a}>{a}</option>)}
          </select>
        )}
        {(search || filterStatus || filterCat || filterArea) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterCat(''); setFilterArea(''); }} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors">
            <X size={13} /> Clear
          </button>
        )}
        <span className="ml-auto text-[11px] text-slate-500">{filtered.length} items</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white">
                {['#', 'Punch No.', 'Cat.', 'Description', 'Area / Location', 'Open Date', 'Insp. Date', 'Status', 'Note', 'Photo', (canEditPunch || canDeletePunch) ? 'Actions' : ''].filter(Boolean).map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap text-[11px] tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-400">No punch items for <span className="font-semibold">{selectedProject?.name}</span>.</td></tr>
              )}
              {filtered.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono font-bold text-violet-700 whitespace-nowrap">{item.punchNo}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full w-fit flex items-center gap-1 whitespace-nowrap ${CAT_BADGE[item.categoryLegend] || 'bg-slate-100 text-slate-600'}`}>
                      {item.categoryLegend} <span className="font-normal opacity-70">— {CAT_DESC[item.categoryLegend]}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px]">
                    <div className="truncate" title={item.description}>{item.description}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="whitespace-nowrap">{item.location || '—'}</div>
                    {item.area && <div className="text-[10px] text-slate-400">{item.area}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">{item.openDate || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">{item.inspectionDate || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full w-fit whitespace-nowrap ${STATUS_BADGE[item.inspectionStatus] || 'bg-slate-100 text-slate-500'}`}>
                      <span>{STATUS_ICON[item.inspectionStatus]}</span>
                      {STATUS_LABEL[item.inspectionStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <div className="text-[11px] text-slate-500 truncate" title={item.note}>{item.note || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    {item.openPhoto ? (
                      <a href={item.openPhoto} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 whitespace-nowrap"><ExternalLink size={11} /> View</a>
                    ) : <span className="text-[11px] text-slate-300">—</span>}
                  </td>
                  {(canEditPunch || canDeletePunch) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEditPunch && (
                          <button onClick={() => { setEditTarget(item); setModalMode('edit'); }} className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"><Pencil size={12} className="text-blue-600" /></button>
                        )}
                        {canDeletePunch && (
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
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">{filtered.length} item{filtered.length !== 1 ? 's' : ''}{(search || filterStatus || filterCat || filterArea) ? ` (filtered from ${projectItems.length})` : ''}</span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-green-600 font-semibold">✅ {counts.close} Closed</span>
              <span className="text-amber-600 font-semibold">🔧 {counts.ongoing} Ongoing</span>
              <span className="text-slate-500 font-semibold">⏸ {counts.hold} Hold</span>
            </div>
          </div>
        )}
      </div>

      {(modalMode === 'add' || modalMode === 'edit') && (
        <PunchModal item={modalMode === 'edit' ? editTarget : null} onSave={handleSave} onClose={() => { setModalMode(null); setEditTarget(null); }} />
      )}
      {deleteTarget && (
        <ConfirmDelete item={deleteTarget} onConfirm={() => { deletePunch(deleteTarget.id); setDeleteTarget(null); }} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
