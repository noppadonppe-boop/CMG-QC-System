import { useState, useEffect } from 'react';
import {
  LayoutDashboard, FolderOpen, FileText, ClipboardList,
  AlertTriangle, PackageCheck, ListChecks, Handshake,
  Archive, ChevronDown, ChevronRight, Users, ShieldCheck,
} from 'lucide-react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useApp }  from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABELS, ROLE_COLORS, ADMIN_ROLES, APP_NAME } from '../../auth/constants';

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
  // admin-users ถูกควบคุมเพิ่มเติมด้านล่าง (MasterAdmin เท่านั้น)
];

const ROLE_PERM_DOC = `${APP_NAME}/root/appMeta/rolePermissions`;

export default function Sidebar({ activePage, setActivePage }) {
  const { selectedProject }  = useApp();
  const { userProfile }      = useAuth();

  const userRoles = userProfile?.role ?? [];
  const isAdmin   = userRoles.some(r => ADMIN_ROLES.includes(r));

  const [rolePerms, setRolePerms] = useState({});
  const [avatarError, setAvatarError] = useState(false);

  // reset error ทุกครั้งที่ photoURL เปลี่ยน
  useEffect(() => { setAvatarError(false); }, [userProfile?.photoURL]);

  useEffect(() => {
    const ref = doc(db, ROLE_PERM_DOC);
    const unsub = onSnapshot(
      ref,
      snap => setRolePerms(snap.exists() ? (snap.data() || {}) : {}),
      () => {},
    );
    return () => unsub();
  }, []);

  const visibleItems = NAV_ITEMS.filter(item => {
    if (!userProfile) return false;

    // admin-users แสดงเฉพาะ MasterAdmin เสมอ
    if (item.id === 'admin-users') {
      return userRoles.includes('MasterAdmin');
    }

    // ถ้าไม่มี config ใน rolePerms ให้ fallback ใช้ roles เดิม
    const hasConfig = Object.keys(rolePerms || {}).length > 0;
    if (!hasConfig) {
      if (isAdmin) return true;
      return item.roles.some(r => userRoles.includes(r));
    }

    // มี config แล้ว: เมนูจะแสดงถ้าอย่างน้อยหนึ่ง role มีสิทธิ์ read
    return userRoles.some(role => !!rolePerms?.[role]?.[item.id]?.read);
  });

  // Build display info
  const firstName   = userProfile?.firstName  ?? '';
  const lastName    = userProfile?.lastName   ?? '';
  const displayName = (firstName + ' ' + lastName).trim() || userProfile?.email || '';
  const initials    = (
    (firstName[0] ?? '') + (lastName[0] ?? '')
  ).toUpperCase() || (userProfile?.email?.[0] ?? '?').toUpperCase();

  const rolesDisplay = userRoles.map(r => ROLE_LABELS[r] ?? r).join(' · ');
  const primaryRole  = userRoles[0];
  const roleColor    = ROLE_COLORS[primaryRole] ?? 'bg-slate-100 text-slate-700';

  function navBtn(item) {
    const Icon     = item.icon;
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
  }

  return (
    <aside className="w-56 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">

      {/* ── Profile Card ─────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-3 border-b border-slate-800 bg-slate-800/40">
        <div className="flex items-center gap-2.5">
          {userProfile?.photoURL && !avatarError ? (
            <img
              src={userProfile.photoURL}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-orange-500/40 shrink-0"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-slate-100 truncate leading-tight">{displayName}</div>
            {primaryRole && (
              <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-tight ${roleColor}`}>
                {ROLE_LABELS[primaryRole] ?? primaryRole}
              </span>
            )}
            {userRoles.length > 1 && (
              <div className="text-[9px] text-slate-500 mt-0.5 truncate">+{userRoles.length - 1} roles</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Current Project ───────────────────────────────────────────────── */}
      {selectedProject && (
        <div className="px-3 py-2.5 border-b border-slate-800 bg-slate-800/30">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Current Project</div>
          <div className="text-xs font-semibold text-orange-400 truncate">{selectedProject.name}</div>
          <div className="text-[10px] text-slate-500">{selectedProject.projectNo}</div>
        </div>
      )}

      {/* ── Nav Items ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {visibleItems.map(item => navBtn(item))}
      </nav>

      {/* ── Bottom: User Management (MasterAdmin only) ────────────────────── */}
      <div className="border-t border-slate-800">
        {userRoles.includes('MasterAdmin') && (
          <button
            onClick={() => setActivePage('admin-users')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 text-xs font-medium
              ${activePage === 'admin-users'
                ? 'bg-orange-500/10 text-orange-400 border-r-2 border-orange-500'
                : 'hover:bg-slate-800 hover:text-white text-slate-400'
              }`}
          >
            <Users size={16} className={activePage === 'admin-users' ? 'text-orange-400' : 'text-slate-500'} />
            <span>จัดการผู้ใช้</span>
          </button>
        )}
        <div className="px-3 py-2.5">
          <div className="text-[10px] text-slate-600 text-center">CMG QC System v1.0</div>
        </div>
      </div>
    </aside>
  );
}
