import { useState, useMemo } from 'react';
import {
  Plus, Search, Eye, Pencil, ArrowRight, Trash2,
  AlertTriangle, Clock, FileCheck2, Send,
  ClipboardCheck, X
} from 'lucide-react';
import { useApp }  from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import RfiStage1Modal from './RfiStage1Modal';
import RfiStage2Modal from './RfiStage2Modal';
import RfiStage3Modal from './RfiStage3Modal';
import RfiStage4Modal from './RfiStage4Modal';
import RfiDetailModal from './RfiDetailModal';

// ── Stage config ───────────────────────────────────────────────────────────────
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

// ── Confirm Delete modal ──────────────────────────────────────────────────────
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
          <div className="text-[10px] text-slate-400">{rfi.area} · {rfi.location}</div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Delete RFI</button>
        </div>
      </div>
    </div>
  );
}

// ── Per-stage action label config ──────────────────────────────────────────────
const STAGE_ADVANCE = {
  1: { label: 'Issue →',    color: 'bg-blue-600'   },
  2: { label: 'Inspect →',  color: 'bg-purple-600' },
  3: { label: 'Complete →', color: 'bg-green-600'  },
};

// ── RFI Kanban Card ────────────────────────────────────────────────────────────
function RfiCard({ rfi, stage, canAdvance, canEdit, canDelete, onView, onEdit, onAdvance, onDelete }) {
  const isCurrentStage = rfi.stage === stage.id;
  const isDone         = rfi.stage > stage.id;

  const result = stage.id === 1 ? rfi.statusInsp
               : stage.id === 2 ? (rfi.inspectionScheduleDate ? 'Scheduled' : 'Issued')
               : stage.id === 3 ? rfi.result
               : rfi.stage4Status;

  const advanceCfg = STAGE_ADVANCE[rfi.stage];

  return (
    <div
      className={`rounded-xl border shadow-sm p-3.5 transition-all hover:shadow-md cursor-pointer group
        ${isDone        ? 'bg-white border-slate-100 opacity-60' :
          isCurrentStage ? `bg-white ${stage.border} shadow-sm` :
          'bg-white border-slate-100 opacity-40 pointer-events-none'}`}
      onClick={() => onView(rfi)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDone ? 'bg-green-400' : stage.dot}`} />
          <span className="text-[11px] font-bold text-slate-700 font-mono truncate">{rfi.rfiNo}</span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${stage.badge}`}>
          S{rfi.stage}
        </span>
      </div>

      {/* Type & area */}
      <div className="mb-2">
        <div className="text-xs font-semibold text-slate-800 truncate">{rfi.typeOfInspection}</div>
        <div className="text-[11px] text-slate-500 truncate">{rfi.area} · {rfi.location}</div>
      </div>

      {/* Stage-specific context snippet */}
      {stage.id === 2 && rfi.inspectionScheduleDate && (
        <div className="text-[10px] text-blue-600 bg-blue-50 rounded px-2 py-1 mb-2">
          📅 {rfi.inspectionScheduleDate} {rfi.inspectionScheduleTime}
        </div>
      )}
      {stage.id === 2 && rfi.stage2EmailStatus === 'ok' && (
        <div className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded px-2 py-1 mb-2">
          ➜ Send Email OK
        </div>
      )}
      {stage.id === 3 && rfi.result && (
        <div className={`text-[10px] font-semibold rounded px-2 py-1 mb-2 ${RESULT_COLORS[rfi.result] || 'bg-slate-100 text-slate-500'}`}>
          Onsite: {rfi.result}
        </div>
      )}
      {stage.id === 4 && rfi.stage4Status && (
        <div className={`text-[10px] font-semibold rounded px-2 py-1 mb-2 ${
          rfi.stage4Status === 'Close' ? 'bg-green-100 text-green-700' :
          rfi.stage4Status === 'Complete document' ? 'bg-blue-100 text-blue-700' :
          'bg-amber-100 text-amber-700'}`}>
          🔒 {rfi.stage4Status}
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          {result && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${RESULT_COLORS[result] || 'bg-slate-100 text-slate-500'}`}>
              {result}
            </span>
          )}
          {rfi.dueDate && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock size={9} /> {rfi.dueDate}
            </span>
          )}
        </div>

        {/* Actions — only on current stage card, role-gated */}
        {isCurrentStage && (canAdvance || canEdit || canDelete) && (
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            {canEdit && (
              <button
                onClick={() => onEdit(rfi)}
                className="w-6 h-6 rounded bg-slate-100 hover:bg-blue-100 flex items-center justify-center transition-colors"
                title="Edit"
              >
                <Pencil size={10} className="text-slate-600" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(rfi)}
                className="w-6 h-6 rounded bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors"
                title="Delete RFI"
              >
                <Trash2 size={10} className="text-slate-500 hover:text-red-600" />
              </button>
            )}
            {canAdvance && rfi.stage < 4 && advanceCfg && (
              <button
                onClick={() => onAdvance(rfi)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold text-white transition-colors ${advanceCfg.color} hover:opacity-90`}
                title={`Advance to Stage ${rfi.stage + 1}`}
              >
                <ArrowRight size={10} />
                {advanceCfg.label}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Overdue warning */}
      {rfi.dueDate && rfi.stage < 4 && new Date(rfi.dueDate) < new Date() && (
        <div className="mt-2 text-[10px] text-red-500 font-semibold flex items-center gap-1">
          <AlertTriangle size={9} /> Overdue
        </div>
      )}
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ stage, rfis, getCardPerms, onView, onEdit, onAdvance, onDelete }) {
  const stageRfis = rfis.filter(r => r.stage === stage.id);
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

// ── Main Page ─────────────────────────────────────────────────────────────────
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

  // Per-card permission resolver — ใช้ Set Role เป็นหลัก
  function getCardPerms(rfi) {
    const s = rfi.stage;
    return {
      canAdvance: canAdvanceForRfi(rfi),
      canEdit:    canEditForStage(s),
      canDelete:  canDeleteRfi,
    };
  }

  const [search,       setSearch]       = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [viewMode,     setViewMode]     = useState('kanban');

  // Modal states
  const [stage1Modal,   setStage1Modal]  = useState(false);
  const [stage2Modal,   setStage2Modal]  = useState(null);
  const [stage3Modal,   setStage3Modal]  = useState(null);
  const [stage4Modal,   setStage4Modal]  = useState(null);
  const [detailModal,   setDetailModal]  = useState(null);
  const [editTarget,    setEditTarget]   = useState(null);
  const [deleteTarget,  setDeleteTarget] = useState(null);

  const projectRfis = rfiItems.filter(r => r.projectId === selectedProjectId);

  const filtered = useMemo(() => {
    return projectRfis.filter(r => {
      const matchSearch = !search || [r.rfiNo, r.requestNo, r.typeOfInspection, r.location, r.area].some(v =>
        (v || '').toLowerCase().includes(search.toLowerCase())
      );
      const matchType = !filterType || r.typeOfInspection === filterType;
      return matchSearch && matchType;
    });
  }, [projectRfis, search, filterType]);

  const types = [...new Set(projectRfis.map(r => r.typeOfInspection))];

  // ── Handlers ──────────────────────────────────────────────────────────────
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
    };
    addRfi(newRfi);
    setStage1Modal(false);
  }

  function handleEditStage1(form) {
    updateRfi(editTarget.id, form);
    setEditTarget(null);
  }

  // Advance button dispatcher — opens the correct modal for the next stage
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

  function handleSaveStage3(form) {
    // Advance to stage 3; also update statusInsp from result
    updateRfi(stage3Modal.id, {
      ...form,
      stage: 3,
      statusInsp: form.result,
    });
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

  function confirmDelete() {
    if (deleteTarget) {
      deleteRfi(deleteTarget.id);
      // close detail modal if it was showing this rfi
      if (detailModal?.id === deleteTarget.id) setDetailModal(null);
      setDeleteTarget(null);
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stageCount = [1, 2, 3, 4].map(s => projectRfis.filter(r => r.stage === s).length);
  const totalPass  = projectRfis.filter(r => r.stage4Result === 'Pass' || r.result === 'Pass').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">RFI Workflow</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedProject?.name} — Request for Inspection
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {['kanban', 'table'].map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${
                  viewMode === m ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
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
            placeholder="Search RFI no., type, location…"
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
        <span className="ml-auto text-[11px] text-slate-500">{filtered.length} RFIs</span>
      </div>

      {/* ── KANBAN VIEW ────────────────────────────────────────────────────── */}
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

      {/* ── TABLE VIEW ─────────────────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-800 text-white">
                  {['#', 'RFI No.', 'Request No.', 'Type', 'Location / Area', 'Due Date', 'Stage', 'Status Insp.', 'Status Doc', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap text-[11px] tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                      No RFI records for <span className="font-semibold">{selectedProject?.name}</span>.
                    </td>
                  </tr>
                )}
                {filtered.map((rfi, idx) => {
                  const stage = STAGES[rfi.stage - 1];
                  return (
                    <tr key={rfi.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">{rfi.rfiNo}</td>
                      <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{rfi.requestNo}</td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{rfi.typeOfInspection}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{rfi.location}</div>
                        <div className="text-[10px] text-slate-400">{rfi.area}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono">{rfi.dueDate || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${stage?.badge}`}>
                          {stage?.label}: {stage?.title}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${RESULT_COLORS[rfi.statusInsp] || 'bg-slate-100 text-slate-500'}`}>
                          {rfi.statusInsp || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${RESULT_COLORS[rfi.statusDoc] || 'bg-slate-100 text-slate-500'}`}>
                          {rfi.statusDoc || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const { canAdvance, canEdit, canDelete } = getCardPerms(rfi);
                          const advCfg = STAGE_ADVANCE[rfi.stage];
                          return (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setDetailModal(rfi)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                                title="View detail"
                              >
                                <Eye size={12} className="text-slate-600" />
                              </button>
                              {canEdit && (
                                <button
                                  onClick={() => openEdit(rfi)}
                                  className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                                  title="Edit Stage 1"
                                >
                                  <Pencil size={12} className="text-blue-600" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(rfi)}
                                  className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                                  title="Delete RFI"
                                >
                                  <Trash2 size={12} className="text-red-500" />
                                </button>
                              )}
                              {canAdvance && rfi.stage < 4 && advCfg && (
                                <button
                                  onClick={() => handleAdvance(rfi)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold text-white transition-colors ${advCfg.color}`}
                                  title={`Advance to Stage ${rfi.stage + 1}`}
                                >
                                  <ArrowRight size={10} /> {advCfg.label}
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
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
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
