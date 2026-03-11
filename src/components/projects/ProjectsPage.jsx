import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, Building2, MapPin, User, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import ProjectModal from './ProjectModal';

const STATUS_COLORS = {
  Active:    'bg-green-100 text-green-700',
  Handover:  'bg-blue-100 text-blue-700',
  Closed:    'bg-slate-100 text-slate-600',
  'On Hold': 'bg-amber-100 text-amber-700',
};

function ConfirmDelete({ project, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Delete Project?</h3>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2">
          <div className="text-xs font-semibold text-slate-700">{project.name}</div>
          <div className="text-[11px] text-slate-500">{project.projectNo}</div>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { visibleProjects: projects, addProject, updateProject, deleteProject, setSelectedProjectId } = useApp();
  const { canAction } = useMenuPermissions();
  const [search, setSearch]         = useState('');
  const [modalMode, setModalMode]   = useState(null); // null | 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = projects.filter(p =>
    [p.projectNo, p.name, p.location, p.clientName, p.pm].some(v =>
      (v || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  function handleSave(form) {
    if (modalMode === 'add') {
      addProject({ ...form, id: `proj-${Date.now()}` });
    } else {
      updateProject(editTarget.id, form);
    }
    setModalMode(null);
    setEditTarget(null);
  }

  function openEdit(proj) {
    setEditTarget(proj);
    setModalMode('edit');
  }

  function handleDelete() {
    deleteProject(deleteTarget.id);
    setDeleteTarget(null);
  }

  const canAddProject = canAction('projects', 'addProject');
  const canEditProject = canAction('projects', 'editProject');
  const canDeleteProject = canAction('projects', 'deleteProject');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Project Data Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{projects.length} projects in system</p>
        </div>
        {canAddProject && (
          <button
            onClick={() => setModalMode('add')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus size={15} />
            Add Project
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative w-80">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-700 placeholder-slate-400"
          placeholder="Search by name, no., location, client…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['#', 'Project No.', 'Project Name', 'Location', 'Client', 'PM', 'CM', 'Start', 'Finish', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                    No projects found.
                  </td>
                </tr>
              )}
              {filtered.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-700 whitespace-nowrap">{p.projectNo}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedProjectId(p.id)}
                      className="font-semibold text-slate-800 hover:text-orange-600 transition-colors text-left"
                      title="Switch to this project"
                    >
                      {p.name}
                    </button>
                    {p.note && (
                      <div className="text-[11px] text-slate-400 max-w-[180px] truncate mt-0.5">{p.note}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} className="text-slate-400 shrink-0" />
                      {p.location}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.clientName || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <User size={11} className="text-slate-400 shrink-0" />
                      {p.pm || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.cm || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono">{p.startDate || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono">{p.finishDate || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEditProject && (
                        <button
                          onClick={() => openEdit(p)}
                          className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                          title="Edit project"
                        >
                          <Pencil size={13} className="text-blue-600" />
                        </button>
                      )}
                      {canDeleteProject && (
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                          title="Delete project"
                        >
                          <Trash2 size={13} className="text-red-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-4 text-[11px] text-slate-500 bg-slate-50">
          {['Active', 'Handover', 'Closed', 'On Hold'].map(s => {
            const count = projects.filter(p => p.status === s).length;
            return count > 0 ? (
              <span key={s} className="flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  s === 'Active'    ? 'bg-green-500' :
                  s === 'Handover'  ? 'bg-blue-500'  :
                  s === 'Closed'    ? 'bg-slate-400'  :
                  'bg-amber-500'
                }`} />
                {s}: <span className="font-semibold text-slate-700">{count}</span>
              </span>
            ) : null;
          })}
          <span className="ml-auto">Total: <span className="font-semibold text-slate-700">{projects.length}</span></span>
        </div>
      </div>

      {/* Modals */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <ProjectModal
          project={modalMode === 'edit' ? editTarget : null}
          onSave={handleSave}
          onClose={() => { setModalMode(null); setEditTarget(null); }}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          project={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
