import { useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, Search, ExternalLink, X,
  ClipboardList, Package, AlertOctagon, FileCheck2,
  CheckCircle2, Clock, Archive, FileText, Eye
} from 'lucide-react';
import { useApp }  from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import FinalPackageModal from './FinalPackageModal';

// ── Pillar config ─────────────────────────────────────────────────────────────
const PILLARS = [
  {
    key:     'ITP / RFI',
    label:   'ITP / RFI',
    icon:    ClipboardList,
    color:   'text-orange-600',
    bg:      'bg-orange-50',
    border:  'border-orange-200',
    header:  'bg-gradient-to-br from-orange-500 to-orange-600',
    badge:   'bg-orange-100 text-orange-700',
    desc:    'Inspection & Test Plans + Request for Inspections',
  },
  {
    key:     'Material Approval',
    label:   'Material Approval',
    icon:    Package,
    color:   'text-teal-600',
    bg:      'bg-teal-50',
    border:  'border-teal-200',
    header:  'bg-gradient-to-br from-teal-500 to-teal-600',
    badge:   'bg-teal-100 text-teal-700',
    desc:    'Approved material submittals, test certs & mill certs',
  },
  {
    key:     'NCR / Punch List',
    label:   'NCR / Punch List',
    icon:    AlertOctagon,
    color:   'text-rose-600',
    bg:      'bg-rose-50',
    border:  'border-rose-200',
    header:  'bg-gradient-to-br from-rose-500 to-rose-600',
    badge:   'bg-rose-100 text-rose-700',
    desc:    'Non-conformance reports & closed punch list items',
  },
  {
    key:     'Handover Documents',
    label:   'Handover Documents',
    icon:    FileCheck2,
    color:   'text-sky-600',
    bg:      'bg-sky-50',
    border:  'border-sky-200',
    header:  'bg-gradient-to-br from-sky-500 to-sky-600',
    badge:   'bg-sky-100 text-sky-700',
    desc:    'Area handover certificates & completion records',
  },
];

const STATUS_BADGE = {
  'Draft':        'bg-slate-100 text-slate-600',
  'Under Review': 'bg-amber-100 text-amber-700',
  'Approved':     'bg-blue-100 text-blue-700',
  'Archived':     'bg-green-100 text-green-700',
};
const STATUS_ICON = {
  'Draft':        '📝',
  'Under Review': '🔍',
  'Approved':     '✅',
  'Archived':     '🗄',
};

function ConfirmDelete({ item, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0"><Trash2 size={18} className="text-red-600" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Remove from Package?</h3>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2 space-y-0.5">
          <div className="text-xs font-bold text-slate-700">{item.title}</div>
          <div className="text-[11px] text-slate-500">{item.pillar} · {item.ref || '—'}</div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Remove</button>
        </div>
      </div>
    </div>
  );
}

// ── Pillar Column Card ─────────────────────────────────────────────────────────
function PillarColumn({ pillar, items, canEdit, onAdd, onEdit, onDelete }) {
  const Icon = pillar.icon;
  const archived = items.filter(i => i.status === 'Archived').length;
  const approved = items.filter(i => i.status === 'Approved').length;
  const allDone  = items.length > 0 && items.every(i => i.status === 'Archived' || i.status === 'Approved');

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden shadow-md border border-slate-100">
      {/* Pillar header */}
      <div className={`${pillar.header} px-4 py-4 text-white`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Icon size={18} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">{pillar.label}</div>
              <div className="text-[10px] text-white/70 mt-0.5">{pillar.desc}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">{items.length} docs</span>
            {allDone && items.length > 0 && (
              <span className="bg-green-400/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={9} /> Complete
              </span>
            )}
          </div>
        </div>
        {/* Mini progress */}
        <div className="mt-1">
          <div className="w-full bg-white/20 rounded-full h-1">
            <div
              className="h-1 bg-white/80 rounded-full transition-all duration-500"
              style={{ width: items.length > 0 ? `${Math.round(((archived + approved) / items.length) * 100)}%` : '0%' }}
            />
          </div>
          <div className="text-[9px] text-white/60 mt-0.5">{archived + approved}/{items.length} approved/archived</div>
        </div>
      </div>

      {/* Items list */}
      <div className={`flex-1 ${pillar.bg} p-3 space-y-2 min-h-[180px]`}>
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2 opacity-40">
            <Icon size={24} className={pillar.color} />
            <span className="text-[11px] text-slate-400 text-center">No documents in this pillar</span>
          </div>
        )}
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-slate-100 p-3 hover:shadow-sm transition-shadow group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText size={10} className={pillar.color} />
                  <span className="text-[10px] font-mono text-slate-400">{item.ref || '—'}</span>
                </div>
                <div className="text-xs font-semibold text-slate-800 leading-snug">{item.title}</div>
                {item.description && (
                  <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{item.description}</div>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[item.status] || 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_ICON[item.status]} {item.status}
                  </span>
                  {item.date && <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>}
                  {item.fileLink && (
                    <a href={item.fileLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-700 ml-auto"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink size={9} /> File
                    </a>
                  )}
                </div>
              </div>
              {canEdit && (
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => onEdit(item)} className="w-6 h-6 rounded bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors">
                    <Pencil size={9} className="text-blue-600" />
                  </button>
                  <button onClick={() => onDelete(item)} className="w-6 h-6 rounded bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                    <Trash2 size={9} className="text-red-500" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add button at bottom of column */}
      {canEdit && (
        <button
          onClick={() => onAdd(pillar.key)}
          className={`w-full py-2.5 text-[11px] font-semibold ${pillar.color} bg-white hover:${pillar.bg} border-t border-slate-100 flex items-center justify-center gap-1.5 transition-colors`}
        >
          <Plus size={12} /> Add to {pillar.label}
        </button>
      )}
    </div>
  );
}

// ── Package Completeness Gauge ────────────────────────────────────────────────
function CompletenessGauge({ items }) {
  const pillarsWithDocs  = PILLARS.filter(p => items.some(i => i.pillar === p.key)).length;
  const totalArchived    = items.filter(i => i.status === 'Archived').length;
  const totalApproved    = items.filter(i => i.status === 'Approved').length;
  const done             = totalArchived + totalApproved;
  const total            = items.length;
  const pct              = total > 0 ? Math.round((done / total) * 100) : 0;
  const allPillarsActive = pillarsWithDocs === 4;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Archive size={18} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Final Package Status</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Overall document package completeness</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-extrabold ${pct === 100 ? 'text-green-600' : 'text-indigo-600'}`}>{pct}%</div>
          <div className="text-[11px] text-slate-400">{done}/{total} completed</div>
        </div>
      </div>

      {/* Big progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-3 mb-4">
        <div
          className={`h-3 rounded-full transition-all duration-700 ${pct === 100 ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-indigo-400 to-indigo-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Pillar status pills */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {PILLARS.map(p => {
          const pItems   = items.filter(i => i.pillar === p.key);
          const pDone    = pItems.filter(i => i.status === 'Archived' || i.status === 'Approved').length;
          const pAll     = pItems.length > 0 && pDone === pItems.length;
          const Icon = p.icon;
          return (
            <div key={p.key} className={`rounded-xl p-2.5 border-2 text-center transition-all ${pAll ? `${p.border} ${p.bg}` : 'border-slate-200 bg-slate-50'}`}>
              <Icon size={16} className={`${pAll ? p.color : 'text-slate-300'} mx-auto mb-1`} />
              <div className={`text-[10px] font-bold ${pAll ? p.color : 'text-slate-400'}`}>{p.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{pDone}/{pItems.length}</div>
              {pAll && pItems.length > 0 && <div className="text-[9px] text-green-600 font-bold mt-0.5">✓ Done</div>}
            </div>
          );
        })}
      </div>

      {/* Readiness checklist */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'All 4 pillars have documents', ok: allPillarsActive },
          { label: 'All docs approved / archived', ok: total > 0 && pct === 100 },
          { label: 'Package ready for submission', ok: allPillarsActive && total > 0 && pct === 100 },
        ].map(c => (
          <div key={c.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium border ${c.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
            <span className="text-base">{c.ok ? '✅' : '⬜'}</span>
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinalPackagePage() {
  const { finalPackage, addFinalPackage, updateFinalPackage, deleteFinalPackage, selectedProjectId, selectedProject } = useApp();
  const { userProfile } = useAuth();
  const { canAction } = useMenuPermissions();

  const [modalMode,    setModalMode]    = useState(null);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [defaultPillar, setDefaultPillar] = useState(null);
  const [search,       setSearch]       = useState('');
  const [viewMode,     setViewMode]     = useState('pillars'); // 'pillars' | 'table'

  const canAddFinalDoc    = canAction('final-package', 'addFinalDoc');
  const canEditFinalDoc   = canAction('final-package', 'editFinalDoc');
  const canDeleteFinalDoc = canAction('final-package', 'deleteFinalDoc');

  const projectItems = finalPackage.filter(f => f.projectId === selectedProjectId);

  const filtered = useMemo(() => {
    if (!search) return projectItems;
    const q = search.toLowerCase();
    return projectItems.filter(f =>
      f.title.toLowerCase().includes(q) ||
      (f.ref || '').toLowerCase().includes(q) ||
      f.pillar.toLowerCase().includes(q)
    );
  }, [projectItems, search]);

  function handleSave(form) {
    if (modalMode === 'add') {
      addFinalPackage({ ...form, id: `fp-${Date.now()}`, projectId: selectedProjectId });
    } else {
      updateFinalPackage(editTarget.id, form);
    }
    setModalMode(null);
    setEditTarget(null);
    setDefaultPillar(null);
  }

  function openAddForPillar(pillarKey) {
    setDefaultPillar(pillarKey);
    setModalMode('add');
  }

  const modalItem = modalMode === 'edit' ? editTarget
    : defaultPillar ? { pillar: defaultPillar } : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Final Document Package</h1>
          <p className="text-sm text-slate-500 mt-0.5">{selectedProject?.name} — QC Closeout Package</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {[['pillars', '🏛 Pillars'], ['table', '📋 Table']].map(([m, label]) => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === m ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>
          {canAddFinalDoc && (
            <button onClick={() => { setDefaultPillar(null); setModalMode('add'); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm">
              <Plus size={15} /> Add Document
            </button>
          )}
        </div>
      </div>

      {/* Completeness gauge */}
      <CompletenessGauge items={projectItems} />

      {/* Search (shared for both views) */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 w-60 placeholder-slate-400 text-slate-700"
            placeholder="Search title, ref, pillar…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        {search && <button onClick={() => setSearch('')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors"><X size={13} /> Clear</button>}
        <span className="ml-auto text-[11px] text-slate-500">{filtered.length} documents</span>
      </div>

      {/* ── PILLARS VIEW ─────────────────────────────────────────────────── */}
      {viewMode === 'pillars' && (
        <div className="grid grid-cols-4 gap-4">
          {PILLARS.map(pillar => (
            <PillarColumn
              key={pillar.key}
              pillar={pillar}
              items={filtered.filter(f => f.pillar === pillar.key)}
              canEdit={canAddFinalDoc}
              onAdd={openAddForPillar}
              onEdit={canEditFinalDoc ? (item => { setEditTarget(item); setModalMode('edit'); }) : null}
              onDelete={canDeleteFinalDoc ? setDeleteTarget : null}
            />
          ))}
        </div>
      )}

      {/* ── TABLE VIEW ───────────────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-800 text-white">
                  {['#', 'Pillar', 'Title', 'Ref.', 'Date', 'Status', 'Description', 'File', (canEditFinalDoc || canDeleteFinalDoc) ? 'Actions' : ''].filter(Boolean).map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap text-[11px] tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">No documents in the final package for <span className="font-semibold">{selectedProject?.name}</span>.</td></tr>
                )}
                {filtered.map((item, idx) => {
                  const pillar = PILLARS.find(p => p.key === item.pillar) || PILLARS[0];
                  const Icon = pillar.icon;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit whitespace-nowrap ${pillar.badge}`}>
                          <Icon size={10} /> {item.pillar}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 max-w-[200px]">
                        <div className="truncate" title={item.title}>{item.title}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">{item.ref || '—'}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">{item.date || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_BADGE[item.status] || 'bg-slate-100 text-slate-500'}`}>
                          {STATUS_ICON[item.status]} {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="text-[11px] text-slate-500 truncate" title={item.description}>{item.description || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        {item.fileLink ? (
                          <a href={item.fileLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 whitespace-nowrap"><ExternalLink size={11} /> View</a>
                        ) : <span className="text-[11px] text-slate-300">—</span>}
                      </td>
                      {(canEditFinalDoc || canDeleteFinalDoc) && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canEditFinalDoc && (
                              <button onClick={() => { setEditTarget(item); setModalMode('edit'); }} className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"><Pencil size={12} className="text-blue-600" /></button>
                            )}
                            {canDeleteFinalDoc && (
                              <button onClick={() => setDeleteTarget(item)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"><Trash2 size={12} className="text-red-500" /></button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <FinalPackageModal
          item={modalMode === 'edit' ? editTarget : (defaultPillar ? { ...{}, pillar: defaultPillar, title: '', ref: '', date: '', status: 'Draft', description: '', fileLink: '' } : null)}
          onSave={handleSave}
          onClose={() => { setModalMode(null); setEditTarget(null); setDefaultPillar(null); }}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          item={deleteTarget}
          onConfirm={() => { deleteFinalPackage(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
