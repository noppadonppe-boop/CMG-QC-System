import { useState } from 'react';
import {
  LayoutDashboard, FolderOpen, FileText, ClipboardList,
  AlertTriangle, PackageCheck, ListChecks, Handshake,
  Archive, ChevronDown, ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['MD', 'CD', 'PM', 'QcDocCenter', 'SiteQcInspector'],
  },
  {
    id: 'projects',
    label: 'Project Data',
    icon: FolderOpen,
    roles: ['MD', 'CD', 'PM'],
  },
  {
    id: 'qc-documents',
    label: 'QC Document Control',
    icon: FileText,
    roles: ['MD', 'CD', 'PM'],
  },
  {
    id: 'itp',
    label: 'ITP System',
    icon: ClipboardList,
    roles: ['MD', 'CD', 'PM', 'QcDocCenter'],
  },
  {
    id: 'rfi',
    label: 'RFI Workflow',
    icon: AlertTriangle,
    roles: ['MD', 'CD', 'PM', 'QcDocCenter', 'SiteQcInspector'],
  },
  {
    id: 'materials',
    label: 'Material Receive',
    icon: PackageCheck,
    roles: ['QcDocCenter'],
  },
  {
    id: 'ncr',
    label: 'NCR Management',
    icon: AlertTriangle,
    roles: ['QcDocCenter'],
  },
  {
    id: 'punchlist',
    label: 'Punch List',
    icon: ListChecks,
    roles: ['QcDocCenter'],
  },
  {
    id: 'handover',
    label: 'Handover',
    icon: Handshake,
    roles: ['QcDocCenter'],
  },
  {
    id: 'final-package',
    label: 'Final Document Package',
    icon: Archive,
    roles: ['MD', 'CD', 'PM', 'QcDocCenter'],
  },
];

export default function Sidebar({ activePage, setActivePage }) {
  const { currentUser, selectedProject } = useApp();

  const visibleItems = NAV_ITEMS.filter(item =>
    item.roles.includes(currentUser.role)
  );

  return (
    <aside className="w-56 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
      {/* Project badge */}
      {selectedProject && (
        <div className="px-3 py-3 border-b border-slate-800 bg-slate-800/50">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Current Project</div>
          <div className="text-xs font-semibold text-orange-400 truncate">{selectedProject.name}</div>
          <div className="text-[10px] text-slate-500">{selectedProject.projectNo}</div>
        </div>
      )}

      <nav className="flex-1 py-2 overflow-y-auto">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 text-xs font-medium
                ${isActive
                  ? 'bg-orange-500/10 text-orange-400 border-r-2 border-orange-500'
                  : 'hover:bg-slate-800 hover:text-white text-slate-400'
                }`}
            >
              <Icon size={16} className={isActive ? 'text-orange-400' : 'text-slate-500'} />
              <span className="leading-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-slate-800">
        <div className="text-[10px] text-slate-600 text-center">CMG QC System v1.0</div>
      </div>
    </aside>
  );
}
