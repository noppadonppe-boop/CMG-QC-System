import { useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, Search, Building2, MapPin, User,
  Calendar, LayoutGrid, List, Check,
  HardHat, SlidersHorizontal, X, Briefcase
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import ProjectModal from './ProjectModal';
import TableColumnVisibility from '../common/TableColumnVisibility';

const STATUS_CONFIG = {
  Active: {
    label: 'Active',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    dot: 'bg-emerald-400',
    borderTop: 'bg-emerald-300',
    accentBg: 'bg-emerald-50 text-emerald-600',
    statBg: 'bg-emerald-50/60 text-emerald-800 border-emerald-100/80',
  },
  Handover: {
    label: 'Handover',
    color: 'bg-sky-50 text-sky-700 border-sky-200/70',
    dot: 'bg-sky-400',
    borderTop: 'bg-sky-300',
    accentBg: 'bg-sky-50 text-sky-600',
    statBg: 'bg-sky-50/60 text-sky-800 border-sky-100/80',
  },
  'On Hold': {
    label: 'On Hold',
    color: 'bg-amber-50 text-amber-700 border-amber-200/70',
    dot: 'bg-amber-400',
    borderTop: 'bg-amber-300',
    accentBg: 'bg-amber-50 text-amber-600',
    statBg: 'bg-amber-50/60 text-amber-800 border-amber-100/80',
  },
  Closed: {
    label: 'Closed',
    color: 'bg-slate-50 text-slate-600 border-slate-200/70',
    dot: 'bg-slate-300',
    borderTop: 'bg-slate-300',
    accentBg: 'bg-slate-50 text-slate-600',
    statBg: 'bg-slate-50/60 text-slate-700 border-slate-200/70',
  },
};

const PROJECT_TABLE_COLUMNS = [
  { key: 'row', label: '#' },
  { key: 'projectNo', label: 'Project No.' },
  { key: 'projectName', label: 'Project Name' },
  { key: 'location', label: 'Location' },
  { key: 'client', label: 'Client' },
  { key: 'pm', label: 'PM' },
  { key: 'cm', label: 'CM' },
  { key: 'start', label: 'Start' },
  { key: 'finish', label: 'Finish' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', locked: true },
];

function ConfirmDelete({ project, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
            <Trash2 size={17} className="text-rose-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Delete Project?</h3>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
          <div className="text-xs font-semibold text-slate-800">{project.name}</div>
          <div className="text-[11px] font-mono text-slate-500 mt-0.5">{project.projectNo}</div>
          {project.location && (
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <MapPin size={10} /> {project.location}
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors shadow-xs"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  isCurrent,
  stats,
  canEdit,
  canDelete,
  onSelect,
  onEdit,
  onDelete,
}) {
  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.Active;

  return (
    <div
      className={`relative bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden group shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
        isCurrent
          ? 'border-orange-300/80 ring-2 ring-orange-100 bg-gradient-to-b from-orange-50/20 via-white to-white shadow-xs'
          : 'border-slate-200/70 hover:border-slate-300/90'
      }`}
    >
      {/* Top Status Accent Line */}
      <div className={`h-1.5 w-full ${statusCfg.borderTop}`} />

      {/* Main Card Body */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        {/* Header: Status & Project No & Quick Actions */}
        <div className="flex items-center justify-between gap-1.5">
          {/* Status Pill */}
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            <span>{project.status || 'Active'}</span>
          </div>

          {/* Project No. & Actions */}
          <div className="flex items-center gap-1">
            <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200/60">
              {project.projectNo}
            </span>

            {(canEdit || canDelete) && (
              <div className="flex items-center gap-0.5 ml-0.5">
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(project);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                    title="Edit Project"
                  >
                    <Pencil size={11.5} />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(project);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 size={11.5} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Project Name & Client */}
        <div className="space-y-1">
          <div className="flex items-start gap-2.5">
            <div
              className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                isCurrent
                  ? 'bg-orange-50 text-orange-600 border-orange-200/70'
                  : 'bg-slate-50 text-slate-500 border-slate-200/50 group-hover:bg-orange-50/60 group-hover:text-orange-600 transition-colors'
              }`}
            >
              <Building2 size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={onSelect}
                className="text-left font-bold text-slate-800 hover:text-orange-600 text-xs leading-snug line-clamp-2 transition-colors w-full"
                title={`Switch to ${project.name}`}
              >
                {project.name}
              </button>
              {project.clientName && (
                <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5" title={project.clientName}>
                  <Briefcase size={10} className="text-slate-400 shrink-0" />
                  <span className="truncate">{project.clientName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Project Meta Info */}
        <div className="bg-slate-50/70 rounded-xl p-2.5 space-y-1.5 text-[11px] border border-slate-100/90">
          <div className="flex items-center gap-1.5 text-slate-600">
            <MapPin size={11} className="text-slate-400 shrink-0" />
            <span className="truncate font-medium text-slate-700">{project.location || '—'}</span>
          </div>

          <div className="flex items-center justify-between gap-1 text-slate-500">
            <div className="flex items-center gap-1.5 truncate">
              <User size={11} className="text-slate-400 shrink-0" />
              <span className="truncate">PM: <strong className="font-medium text-slate-700">{project.pm || '—'}</strong></span>
            </div>
            {project.cm && (
              <div className="flex items-center gap-1 truncate text-slate-400">
                <HardHat size={10} className="shrink-0" />
                <span className="truncate">CM: {project.cm}</span>
              </div>
            )}
          </div>

          {(project.startDate || project.finishDate) && (
            <div className="flex items-center gap-1.5 text-slate-500 pt-0.5 border-t border-slate-200/50">
              <Calendar size={11} className="text-slate-400 shrink-0" />
              <span className="font-mono text-[10px] text-slate-600">
                {project.startDate || '—'} → {project.finishDate || '—'}
              </span>
            </div>
          )}

          {project.note && (
            <div className="text-[10px] text-slate-500 bg-white/90 px-2 py-1 rounded-md border border-slate-200/50 truncate" title={project.note}>
              💬 {project.note}
            </div>
          )}
        </div>

        {/* Live QC Mini-Stats (Soft Pastel Tones) */}
        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          <div className="bg-sky-50/60 border border-sky-100/70 rounded-lg py-1 px-1.5 text-center">
            <div className="text-[9px] text-sky-700 font-semibold uppercase tracking-wider">RFIs</div>
            <div className="text-xs font-bold text-sky-800">{stats.rfis}</div>
          </div>
          <div className={`rounded-lg py-1 px-1.5 text-center border ${
            stats.ncrs > 0
              ? 'bg-rose-50/70 border-rose-100/80 text-rose-700'
              : 'bg-slate-50/70 border-slate-100 text-slate-500'
          }`}>
            <div className={`text-[9px] font-semibold uppercase tracking-wider ${
              stats.ncrs > 0 ? 'text-rose-600' : 'text-slate-400'
            }`}>
              NCR
            </div>
            <div className="text-xs font-bold">{stats.ncrs}</div>
          </div>
          <div className="bg-amber-50/60 border border-amber-100/70 rounded-lg py-1 px-1.5 text-center">
            <div className="text-[9px] text-amber-700 font-semibold uppercase tracking-wider">Punch</div>
            <div className="text-xs font-bold text-amber-800">{stats.punch}</div>
          </div>
        </div>
      </div>

      {/* Card Footer: Select/Switch Button */}
      <div className="p-3 pt-0">
        {isCurrent ? (
          <div className="w-full py-1.5 px-3 rounded-xl bg-orange-50/90 text-orange-700 border border-orange-200/80 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs">
            <Check size={13} className="stroke-[2.5] text-orange-600" />
            <span>Current Active</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className="w-full py-1.5 px-3 rounded-xl bg-slate-50/80 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200/70 hover:border-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-all duration-150"
          >
            <span>Switch to Project</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const {
    visibleProjects: projects,
    addProject,
    updateProject,
    deleteProject,
    selectedProjectId,
    setSelectedProjectId,
    rfiItems,
    ncrItems,
    punchlist,
  } = useApp();

  const { canAction } = useMenuPermissions();
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Active' | 'Handover' | 'On Hold' | 'Closed'
  const [sortBy, setSortBy]           = useState('no_asc'); // 'no_asc' | 'no_desc' | 'name_asc' | 'start_desc'
  const [viewMode, setViewMode]       = useState('card'); // 'card' | 'table'

  const [modalMode, setModalMode]     = useState(null); // null | 'add' | 'edit'
  const [editTarget, setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Status counts for filter pills
  const statusCounts = useMemo(() => {
    const counts = { ALL: projects.length, Active: 0, Handover: 0, 'On Hold': 0, Closed: 0 };
    projects.forEach(p => {
      if (counts[p.status] !== undefined) {
        counts[p.status]++;
      }
    });
    return counts;
  }, [projects]);

  // Filtered & Sorted Projects
  const filteredAndSortedProjects = useMemo(() => {
    return projects
      .filter(p => {
        // Status filter
        if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;

        // Search text
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return [
          p.projectNo,
          p.name,
          p.location,
          p.clientName,
          p.pm,
          p.cm,
          p.mainContractor,
          p.subContractor,
          p.note,
        ].some(v => (v || '').toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (sortBy === 'no_asc') {
          return (a.projectNo || '').localeCompare(b.projectNo || '', undefined, { numeric: true, sensitivity: 'base' });
        }
        if (sortBy === 'no_desc') {
          return (b.projectNo || '').localeCompare(a.projectNo || '', undefined, { numeric: true, sensitivity: 'base' });
        }
        if (sortBy === 'name_asc') {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'start_desc') {
          return (b.startDate || '').localeCompare(a.startDate || '');
        }
        return 0;
      });
  }, [projects, search, statusFilter, sortBy]);

  // Project Stats Map
  const projectStatsMap = useMemo(() => {
    const map = {};
    projects.forEach(p => {
      const rfis = (rfiItems || []).filter(r => r.projectId === p.id).length;
      const ncrs = (ncrItems || []).filter(n => n.projectId === p.id && n.status !== 'Close').length;
      const punch = (punchlist || []).filter(item => item.projectId === p.id && item.inspectionStatus !== 'close').length;
      map[p.id] = { rfis, ncrs, punch };
    });
    return map;
  }, [projects, rfiItems, ncrItems, punchlist]);

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
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-600 shadow-2xs shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Project Data Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              จัดการและเข้าถึงโครงการทั้งหมดในระบบ ({projects.length} โครงการ)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {/* View Switcher */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'card'
                  ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Card Grid View (5 Columns)"
            >
              <LayoutGrid size={13.5} />
              <span>Card Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List size={13.5} />
              <span>Table</span>
            </button>
          </div>

          {canAddProject && (
            <button
              onClick={() => setModalMode('add')}
              className="flex items-center gap-2 px-3.5 py-2 bg-orange-500/90 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
            >
              <Plus size={14} />
              <span>Add Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Status Stats Filter Banner (Pastel Palette) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { key: 'ALL', label: 'All Projects', count: statusCounts.ALL, color: 'text-slate-700', bg: 'bg-white', border: 'border-slate-200/80', dot: 'bg-slate-400' },
          { key: 'Active', label: 'Active', count: statusCounts.Active, color: 'text-emerald-800', bg: 'bg-emerald-50/40', border: 'border-emerald-200/70', dot: 'bg-emerald-400' },
          { key: 'Handover', label: 'Handover', count: statusCounts.Handover, color: 'text-sky-800', bg: 'bg-sky-50/40', border: 'border-sky-200/70', dot: 'bg-sky-400' },
          { key: 'On Hold', label: 'On Hold', count: statusCounts['On Hold'], color: 'text-amber-800', bg: 'bg-amber-50/40', border: 'border-amber-200/70', dot: 'bg-amber-400' },
          { key: 'Closed', label: 'Closed', count: statusCounts.Closed, color: 'text-slate-600', bg: 'bg-slate-50/60', border: 'border-slate-200/70', dot: 'bg-slate-300' },
        ].map(item => {
          const isSelected = statusFilter === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              className={`p-3 rounded-2xl border transition-all duration-150 text-left flex items-center justify-between ${item.bg} ${item.border} ${
                isSelected
                  ? 'ring-2 ring-orange-200 border-orange-300 shadow-2xs'
                  : 'hover:border-slate-300 hover:shadow-2xs'
              }`}
            >
              <div>
                <div className="text-[11px] font-medium text-slate-500">{item.label}</div>
                <div className={`text-xl font-bold mt-0.5 ${item.color}`}>{item.count}</div>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
            </button>
          );
        })}
      </div>

      {/* Search, Filter Tabs & Sort Controls */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 text-slate-800 placeholder-slate-400 transition-all"
            placeholder="Search by project no, name, location, client, PM, CM..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Sort & Count Controls */}
        <div className="flex items-center gap-3 self-end md:self-auto text-xs">
          <span className="text-slate-400 hidden sm:inline">
            Showing <strong className="text-slate-700">{filteredAndSortedProjects.length}</strong> of {projects.length}
          </span>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 rounded-xl px-2.5 py-1.5">
            <SlidersHorizontal size={13} className="text-slate-400" />
            <span className="text-slate-500 font-medium text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="no_asc">Project No. (0-9, A-Z)</option>
              <option value="no_desc">Project No. (Z-A)</option>
              <option value="name_asc">Project Name (A-Z)</option>
              <option value="start_desc">Start Date (Newest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area: Card Grid (5x) or Table View */}
      {viewMode === 'card' ? (
        <>
          {filteredAndSortedProjects.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 flex items-center justify-center mx-auto">
                <Search size={22} />
              </div>
              <div className="text-sm font-semibold text-slate-700">No projects found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No project matches your search query or status filter. Try clearing filters or search terms.
              </p>
              {(search || statusFilter !== 'ALL') && (
                <button
                  onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
                  className="px-4 py-2 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100/70 rounded-xl transition-colors border border-orange-200/60"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            /* 5-Column Responsive Card Grid (1 col on mobile -> 2 sm -> 3 md -> 4 lg -> 5 xl/2xl) */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
              {filteredAndSortedProjects.map(proj => (
                <ProjectCard
                  key={proj.id}
                  project={proj}
                  isCurrent={proj.id === selectedProjectId}
                  stats={projectStatsMap[proj.id] || { rfis: 0, ncrs: 0, punch: 0 }}
                  canEdit={canEditProject}
                  canDelete={canDeleteProject}
                  onSelect={() => setSelectedProjectId(proj.id)}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* Table View */
        <TableColumnVisibility
          storageKey="projects-table-columns"
          tableId="projects-table"
          columns={PROJECT_TABLE_COLUMNS}
          className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden p-4 pt-3"
        >
          <div className="overflow-x-auto">
            <table data-column-table="projects-table" className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['#', 'Project No.', 'Project Name', 'Location', 'Client', 'PM', 'CM', 'Start', 'Finish', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAndSortedProjects.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                      No projects found.
                    </td>
                  </tr>
                )}
                {filteredAndSortedProjects.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50/80 transition-colors group ${
                      p.id === selectedProjectId ? 'bg-orange-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-700 whitespace-nowrap">{p.projectNo}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedProjectId(p.id)}
                        className="font-semibold text-slate-800 hover:text-orange-600 transition-colors text-left flex items-center gap-1.5"
                        title="Switch to this project"
                      >
                        <span>{p.name}</span>
                        {p.id === selectedProjectId && (
                          <span className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.2 rounded font-medium">Active</span>
                        )}
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
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap border ${STATUS_CONFIG[p.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEditProject && (
                          <button
                            onClick={() => openEdit(p)}
                            className="w-7 h-7 rounded-lg bg-sky-50 hover:bg-sky-100/80 flex items-center justify-center transition-colors"
                            title="Edit project"
                          >
                            <Pencil size={12.5} className="text-sky-600" />
                          </button>
                        )}
                        {canDeleteProject && (
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100/80 flex items-center justify-center transition-colors"
                            title="Delete project"
                          >
                            <Trash2 size={12.5} className="text-rose-500" />
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
          <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-4 text-[11px] text-slate-500 bg-slate-50/60">
            {['Active', 'Handover', 'Closed', 'On Hold'].map(s => {
              const count = projects.filter(p => p.status === s).length;
              return count > 0 ? (
                <span key={s} className="flex items-center gap-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    s === 'Active'    ? 'bg-emerald-400' :
                    s === 'Handover'  ? 'bg-sky-400'  :
                    s === 'Closed'    ? 'bg-slate-300'  :
                    'bg-amber-400'
                  }`} />
                  {s}: <span className="font-semibold text-slate-700">{count}</span>
                </span>
              ) : null;
            })}
            <span className="ml-auto">Total: <span className="font-semibold text-slate-700">{projects.length}</span></span>
          </div>
        </TableColumnVisibility>
      )}

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

