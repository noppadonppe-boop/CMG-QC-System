import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, ExternalLink, ClipboardList } from 'lucide-react';
import { useApp }  from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import ItpModal from './ItpModal';

const ITP_BY_COLORS = {
  'Client ITP': 'bg-blue-100 text-blue-700',
  'CMG ITP':    'bg-orange-100 text-orange-700',
};

const TYPE_COLORS = {
  'Civil':           'bg-lime-100 text-lime-700',
  'Building':        'bg-sky-100 text-sky-700',
  'Steel Structure': 'bg-slate-200 text-slate-700',
  'Mechanical':      'bg-teal-100 text-teal-700',
  'Electrical':      'bg-yellow-100 text-yellow-700',
  'HVAC':            'bg-cyan-100 text-cyan-700',
  'Sanitary':        'bg-indigo-100 text-indigo-700',
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
            <h3 className="text-sm font-bold text-slate-800">Delete ITP Item?</h3>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2">
          <div className="text-xs font-semibold text-slate-700 truncate">{item.item}</div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function ItpPage() {
  const { itpItems, addItp, updateItp, deleteItp, selectedProjectId, selectedProject } = useApp();
  const { userProfile } = useAuth();
  const { canAction } = useMenuPermissions();

  const [search,       setSearch]       = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [filterBy,     setFilterBy]     = useState('');
  const [modalMode,    setModalMode]    = useState(null);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const canAddItp    = canAction('itp', 'addItp');
  const canEditItp   = canAction('itp', 'editItp');
  const canDeleteItp = canAction('itp', 'deleteItp');

  const projectItems = itpItems.filter(i => i.projectId === selectedProjectId);

  const filtered = projectItems.filter(i => {
    const matchSearch = !search || i.item.toLowerCase().includes(search.toLowerCase()) || (i.note || '').toLowerCase().includes(search.toLowerCase());
    const matchType   = !filterType || i.typeItc === filterType;
    const matchBy     = !filterBy   || i.itpBy   === filterBy;
    return matchSearch && matchType && matchBy;
  });

  const types  = [...new Set(projectItems.map(i => i.typeItc))];
  const byOpts = [...new Set(projectItems.map(i => i.itpBy))];

  function handleSave(form) {
    if (modalMode === 'add') {
      addItp({ ...form, id: `itp-${Date.now()}`, projectId: selectedProjectId });
    } else {
      updateItp(editTarget.id, form);
    }
    setModalMode(null);
    setEditTarget(null);
  }

  function handleDelete() {
    deleteItp(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">ITP System</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedProject?.name} — Inspection &amp; Test Plans
          </p>
        </div>
        {canAddItp && (
          <button
            onClick={() => setModalMode('add')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus size={15} />
            Add ITP Item
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total ITP Items', value: projectItems.length,                                        color: 'text-slate-700',   bg: 'bg-slate-100'   },
          { label: 'Client ITP',      value: projectItems.filter(i => i.itpBy === 'Client ITP').length,  color: 'text-blue-600',    bg: 'bg-blue-50'     },
          { label: 'CMG ITP',         value: projectItems.filter(i => i.itpBy === 'CMG ITP').length,     color: 'text-orange-600',  bg: 'bg-orange-50'   },
          { label: 'With Attachment', value: projectItems.filter(i => i.attachmentLink).length,          color: 'text-green-600',   bg: 'bg-green-50'    },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
              <ClipboardList size={16} className={s.color} />
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
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 w-60 text-slate-700 placeholder-slate-400"
            placeholder="Search ITP items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-700"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
        <select
          className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-700"
          value={filterBy}
          onChange={e => setFilterBy(e.target.value)}
        >
          <option value="">All ITP By</option>
          {byOpts.map(b => <option key={b}>{b}</option>)}
        </select>
        <span className="ml-auto text-[11px] text-slate-500">{filtered.length} items</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white">
                {['#', 'ITP Item / Description', 'ITP By', 'Type ITC', 'Attachment', 'Note', (canEditItp || canDeleteItp) ? 'Actions' : ''].filter(Boolean).map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap text-[11px] tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No ITP items for <span className="font-semibold">{selectedProject?.name}</span>.
                  </td>
                </tr>
              )}
              {filtered.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px] w-10">{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800 max-w-xs">
                    <div className="truncate" title={item.item}>{item.item}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ITP_BY_COLORS[item.itpBy] || 'bg-slate-100 text-slate-600'}`}>
                      {item.itpBy}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${TYPE_COLORS[item.typeItc] || 'bg-slate-100 text-slate-600'}`}>
                      {item.typeItc}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.attachmentLink ? (
                      <a href={item.attachmentLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 whitespace-nowrap">
                        <ExternalLink size={11} /> Open Link
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px]">
                    <div className="text-[11px] truncate" title={item.note}>{item.note || '—'}</div>
                  </td>
                  {(canEditItp || canDeleteItp) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEditItp && (
                          <button
                            onClick={() => { setEditTarget(item); setModalMode('edit'); }}
                            className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                          >
                            <Pencil size={12} className="text-blue-600" />
                          </button>
                        )}
                        {canDeleteItp && (
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                          >
                            <Trash2 size={12} className="text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(modalMode === 'add' || modalMode === 'edit') && (
        <ItpModal
          itpItem={modalMode === 'edit' ? editTarget : null}
          onSave={handleSave}
          onClose={() => { setModalMode(null); setEditTarget(null); }}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          item={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
