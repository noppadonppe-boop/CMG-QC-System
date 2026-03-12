import { useState, useEffect, useRef } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { updateUserProfileDoc } from '../../auth/firebaseAuth';
import {
  APP_NAME, USER_ROLES, ROLE_LABELS, ROLE_COLORS,
  STATUS_COLORS, STATUS_LABELS, ADMIN_ROLES,
} from '../../auth/constants';
import { useAuth } from '../../auth/AuthContext';
import { useApp }  from '../../context/AppContext';
import {
  Users, Search, CheckCircle, XCircle, Clock, ChevronDown, X, Save,
  ShieldCheck, FolderOpen, Trash2, Plus,
} from 'lucide-react';

const USERS_PATH      = `${APP_NAME}/root/users`;
const ACTIVITY_PATH   = `${APP_NAME}/root/activityLogs`;
const ROLE_PERM_DOC   = `${APP_NAME}/root/appMeta/rolePermissions`;
const ROLE_META_DOC   = `${APP_NAME}/root/appMeta/rolesMeta`;

// ── Multi-select Role Dropdown ────────────────────────────────────────────────
function RoleDropdown({ value = [], onChange, disabled, options = USER_ROLES, roleLabels = ROLE_LABELS }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function toggle(role) {
    if (disabled) return;
    const next = value.includes(role)
      ? value.filter(r => r !== role)
      : [...value, role];
    onChange(next.length ? next : [role]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(v => !v)}
        className={`flex items-center gap-1 px-2 py-1 rounded border text-xs transition-colors min-w-[120px]
          ${disabled
            ? 'border-slate-600 bg-slate-800 cursor-not-allowed text-slate-500'
            : 'border-slate-500 bg-slate-700 hover:border-orange-500 text-slate-200 cursor-pointer'
          }`}
      >
        <span className="flex-1 text-left truncate">
          {value.length ? value.map(r => roleLabels[r] ?? r).join(', ') : 'เลือก Role'}
        </span>
        <ChevronDown size={11} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl py-1 min-w-[160px] max-h-56 overflow-y-auto">
          {options.map(role => (
            <label key={role} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={value.includes(role)}
                onChange={() => toggle(role)}
                className="accent-orange-500"
              />
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[role] ?? 'bg-slate-100 text-slate-700'}`}>
                {roleLabels[role] ?? role}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Multi-select Project Dropdown ─────────────────────────────────────────────
function ProjectDropdown({ value = [], onChange, projects, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function toggle(id) {
    if (disabled) return;
    onChange(
      value.includes(id)
        ? value.filter(x => x !== id)
        : [...value, id]
    );
  }

  const label = value.length === 0
    ? 'ไม่ได้กำหนดโครงการ'
    : value.length === projects.length
      ? 'ทุกโครงการ'
      : `${value.length} โครงการ`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(v => !v)}
        className={`flex items-center gap-1 px-2 py-1 rounded border text-xs transition-colors w-full
          ${disabled
            ? 'border-slate-600 bg-slate-800 cursor-not-allowed text-slate-500'
            : 'border-slate-500 bg-slate-700 hover:border-orange-500 text-slate-200 cursor-pointer'
          }`}
      >
        <FolderOpen size={11} className="text-slate-400 shrink-0" />
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown size={11} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl py-1 min-w-[220px] max-h-60 overflow-y-auto">
          {projects.length === 0 && (
            <div className="px-3 py-3 text-[11px] text-slate-500 text-center">ยังไม่มีโครงการในระบบ</div>
          )}
          {projects.map(p => (
            <label key={p.id} className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={value.includes(p.id)}
                onChange={() => toggle(p.id)}
                className="accent-orange-500 mt-0.5 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-slate-200 truncate">{p.name}</div>
                <div className="text-[10px] text-slate-500">{p.projectNo}</div>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add Role Modal ────────────────────────────────────────────────────────────
function AddRoleModal({ onClose, onSave, existingIds = [] }) {
  const [roleId, setRoleId] = useState('');
  const [label, setLabel]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const id = roleId.trim();
    const name = label.trim() || id;
    if (!id) {
      setError('กรุณากรอก Role ID');
      return;
    }
    if (existingIds.includes(id)) {
      setError('มี Role ID นี้อยู่แล้ว');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ id, label: name });
      onClose();
    } catch (err) {
      setError(err?.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">เพิ่ม Role ใหม่</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Role ID (ใช้เป็นโค้ดภายใน เช่น <span className="font-mono">Coordinator</span>)
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
              value={roleId}
              onChange={e => setRoleId(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">ชื่อที่แสดงในระบบ</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
              value={label}
              onChange={e => setLabel(e.target.value)}
              disabled={saving}
            />
            <p className="mt-1 text-[10px] text-slate-400">
              ถ้าเว้นว่าง ระบบจะแสดงตาม Role ID
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 text-slate-600 hover:bg-slate-50"
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg text-xs bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const icon = status === 'approved' ? <CheckCircle size={11} /> :
               status === 'rejected' ? <XCircle     size={11} /> :
               <Clock size={11} />;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {icon}
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Edit User Modal ───────────────────────────────────────────────────────────
/** รูป avatar แต่ละ row ใน table – มี state ของตัวเองเพื่อ fallback initials */
function UserAvatar({ photoURL, initials }) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [photoURL]);
  if (photoURL && !err) {
    return (
      <img
        src={photoURL}
        referrerPolicy="no-referrer"
        className="w-8 h-8 rounded-full object-cover shrink-0"
        alt=""
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
      {initials}
    </div>
  );
}

function EditUserModal({ user, onClose, currentUserUid, projects, roleOptions, roleLabels }) {
  const [roles,            setRoles]            = useState(
    Array.isArray(user.role) ? user.role : (user.role ? [user.role] : ['Staff'])
  );
  const [status,           setStatus]           = useState(user.status ?? 'pending');
  const [assignedProjects, setAssignedProjects] = useState(user.assignedProjects ?? []);
  const [saving,           setSaving]           = useState(false);
  const [error,            setError]            = useState('');
  const [avatarError,      setAvatarError]      = useState(false);

  const isSelf    = user.uid === currentUserUid;
  const isAdminUser = roles.some(r => ADMIN_ROLES.includes(r));

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await updateUserProfileDoc(user.uid, {
        role:             roles,
        status,
        assignedProjects: isAdminUser ? [] : assignedProjects,
      });
      onClose(true);
    } catch (err) {
      setError(err.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose(false)} />
      {/* Wrapper version 2: ไม่จำกัดความสูงของเนื้อหา เพื่อให้ dropdown กางได้เต็ม */}
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-100">แก้ไขผู้ใช้</h3>
          <button onClick={() => onClose(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-xl mb-4">
          {user.photoURL && !avatarError ? (
            <img
              src={user.photoURL}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover"
              alt=""
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-white">
              {((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || '?'}
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-slate-100">
              {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'ไม่มีชื่อ'}
            </div>
            <div className="text-xs text-slate-400">{user.email}</div>
            {user.position && <div className="text-[10px] text-slate-500">{user.position}</div>}
          </div>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>
        )}

        {isSelf && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs">
            คุณกำลังแก้ไขบัญชีของตัวเอง
          </div>
        )}

        <div className="space-y-4">
          {/* Roles */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Roles (เลือกได้หลาย role)</label>
            <RoleDropdown value={roles} onChange={setRoles} options={roleOptions} roleLabels={roleLabels} />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">สถานะ</label>
            <div className="flex gap-2">
              {['pending', 'approved', 'rejected'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors border
                    ${status === s
                      ? s === 'approved' ? 'bg-green-500 border-green-500 text-white'
                        : s === 'rejected' ? 'bg-red-500 border-red-500 text-white'
                        : 'bg-yellow-500 border-yellow-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Assigned Projects */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-400">โครงการที่เข้าถึงได้</label>
              {isAdminUser && (
                <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                  Admin เห็นทุกโครงการ
                </span>
              )}
            </div>
            {isAdminUser ? (
              <div className="px-3 py-2 bg-slate-700/40 border border-slate-600 rounded-lg text-[11px] text-slate-400">
                Role นี้มีสิทธิ์เข้าถึงทุกโครงการโดยอัตโนมัติ
              </div>
            ) : (
              <ProjectDropdown
                value={assignedProjects}
                onChange={setAssignedProjects}
                projects={projects}
              />
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={() => onClose(false)}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-300 transition-colors">
            ยกเลิก
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg text-xs font-semibold text-white transition-colors">
            {saving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={12} />}
            บันทึก
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete User Confirm Modal ────────────────────────────────────────────────
function DeleteUserModal({ user, onClose, currentUserUid }) {
  const [loading, setLoading] = useState(false);
  const isSelf = user.uid === currentUserUid;

  async function handleDelete() {
    if (isSelf) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, USERS_PATH, user.uid));
      onClose(true);
    } catch (e) {
      // เงียบ ๆ ถ้าลบไม่สำเร็จ ผู้ใช้ยังเห็นแถวเดิมอยู่
      onClose(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose(false)} />
      <div className="relative bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">ลบผู้ใช้</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">การลบนี้จะลบสิทธิ์และโปรไฟล์ออกจากระบบ QC System</p>
          </div>
        </div>

        <div className="mb-4 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700">
          <div className="text-xs font-semibold text-slate-100">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'ไม่มีชื่อ'}
          </div>
          <div className="text-[11px] text-slate-400">{user.email}</div>
          {user.position && <div className="text-[11px] text-slate-500 mt-0.5">{user.position}</div>}
        </div>

        {isSelf && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[11px]">
            ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้
          </div>
        )}

        <p className="text-[11px] text-slate-400 mb-4">
          ข้อมูลในเอกสาร (RFI, ITP, NCR ฯลฯ) ที่อ้างอิงอีเมลนี้ยังคงอยู่ในระบบ แต่ผู้ใช้งานจะไม่สามารถเข้าสู่ระบบได้อีก
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => onClose(false)}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || isSelf}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg text-xs font-semibold text-white transition-colors"
          >
            {loading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={12} />}
            ลบผู้ใช้
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function UserManagementPanel() {
  const { userProfile: currentUser } = useAuth();
  const { projects } = useApp();

  const [activeTab,    setActiveTab]    = useState('users'); // 'users' | 'activity' | 'roles'
  const [users,        setUsers]        = useState([]);
  const [search,       setSearch]       = useState('');
  const [editingUser,  setEditingUser]  = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const [activityLogs, setActivityLogs] = useState([]);
  const [rolePerms,    setRolePerms]    = useState({});
  const [customRoles,  setCustomRoles]  = useState([]);
  const [addingRole,   setAddingRole]   = useState(false);

  // Realtime subscribe to users
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, USERS_PATH),
      snap => setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() }))),
      () => {},
    );
    return () => unsub();
  }, []);

  // Realtime subscribe to activity logs
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, ACTIVITY_PATH),
      snap => {
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setActivityLogs(rows);
      },
      () => {},
    );
    return () => unsub();
  }, []);

  // Realtime subscribe to role permissions document
  useEffect(() => {
    const ref = doc(db, ROLE_PERM_DOC);
    const unsub = onSnapshot(
      ref,
      snap => {
        setRolePerms(snap.exists() ? (snap.data() || {}) : {});
      },
      () => {},
    );
    return () => unsub();
  }, []);

  // Realtime subscribe to custom roles metadata
  useEffect(() => {
    const ref = doc(db, ROLE_META_DOC);
    const unsub = onSnapshot(
      ref,
      snap => {
        const data = snap.exists() ? (snap.data() || {}) : {};
        const list = Array.isArray(data.roles) ? data.roles : [];
        setCustomRoles(list);
      },
      () => {},
    );
    return () => unsub();
  }, []);

  const filtered = users.filter(u => {
    const name  = `${u.firstName ?? ''} ${u.lastName ?? ''} ${u.email ?? ''}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    all:      users.length,
    pending:  users.filter(u => u.status === 'pending').length,
    approved: users.filter(u => u.status === 'approved').length,
    rejected: users.filter(u => u.status === 'rejected').length,
  };

  // รวม Role ทั้งระบบ (built-in + custom) และ label ที่ใช้แสดงผล
  const customRoleLabels = {};
  customRoles.forEach(r => {
    if (r && r.id) customRoleLabels[r.id] = r.label || r.id;
  });
  const allRoles = [
    ...USER_ROLES,
    ...customRoles.map(r => r.id).filter(id => id && !USER_ROLES.includes(id)),
  ];
  const mergedRoleLabels = { ...ROLE_LABELS, ...customRoleLabels };

  // Resolve assigned project names for table display
  function projectNames(assignedIds = []) {
    if (!Array.isArray(assignedIds) || assignedIds.length === 0) return null;
    const names = assignedIds
      .map(id => projects.find(p => p.id === id)?.name)
      .filter(Boolean);
    return names.length ? names.join(', ') : null;
  }

  // Helpers for Role Permissions tab
  const sidebarMenus = [
    { id: 'dashboard',     label: 'Dashboard' },
    { id: 'projects',      label: 'Project Data' },
    { id: 'qc-documents',  label: 'QC Document Control' },
    { id: 'itp',           label: 'ITP System' },
    { id: 'rfi',           label: 'RFI Workflow' },
    { id: 'materials',     label: 'Material Receive' },
    { id: 'ncr',           label: 'NCR Management' },
    { id: 'punchlist',     label: 'Punch List' },
    { id: 'handover',      label: 'Handover' },
    { id: 'final-package', label: 'Final Document Package' },
    { id: 'admin-users',   label: 'จัดการผู้ใช้' },
  ];

  // ฟังก์ชัน (actions) ที่อยู่ในแต่ละเมนู สำหรับกำหนดสิทธิ์เขียนแบบละเอียด
  const MENU_ACTIONS = {
    projects: [
      { id: 'addProject',    label: 'Add Project' },
      { id: 'editProject',   label: 'Edit Project' },
      { id: 'deleteProject', label: 'Delete Project' },
    ],
    'qc-documents': [
      { id: 'addTransmittal',       label: 'Add Transmittal' },
      { id: 'duplicateTransmittal', label: 'Duplicate Transmittal' },
      { id: 'editTransmittal',      label: 'Edit Transmittal' },
      { id: 'deleteTransmittal',    label: 'Delete Transmittal' },
    ],
    itp: [
      { id: 'addItp',    label: 'Add ITP Item' },
      { id: 'editItp',   label: 'Edit ITP Item' },
      { id: 'deleteItp', label: 'Delete ITP Item' },
    ],
    rfi: [
      { id: 'createRfi',        label: 'Create RFI (Stage 1)' },
      { id: 'editRfiNo',       label: 'กรอก / แก้ไข RFI No.' },
      { id: 'advanceRfiStage2', label: 'Advance Stage 2' },
      { id: 'advanceRfiStage3', label: 'Advance Stage 3' },
      { id: 'advanceRfiStage4', label: 'Advance Stage 4' },
      { id: 'editRfi',         label: 'Edit RFI (Stage 1)' },
      { id: 'editRfiStage2',   label: 'Edit RFI (Stage 2)' },
      { id: 'editRfiStage3',   label: 'Edit RFI (Stage 3)' },
      { id: 'editRfiStage4',   label: 'Edit RFI (Stage 4)' },
      { id: 'deleteRfi',       label: 'Delete RFI' },
    ],
    materials: [
      { id: 'addMaterial',    label: 'Add Material Record' },
      { id: 'editMaterial',   label: 'Edit Material Record' },
      { id: 'deleteMaterial', label: 'Delete Material Record' },
    ],
    ncr: [
      { id: 'addNcr',    label: 'Raise NCR' },
      { id: 'editNcr',   label: 'Edit NCR' },
      { id: 'deleteNcr', label: 'Delete NCR' },
    ],
    punchlist: [
      { id: 'addPunch',    label: 'Add Punch Item' },
      { id: 'editPunch',   label: 'Edit Punch Item' },
      { id: 'deletePunch', label: 'Delete Punch Item' },
    ],
    handover: [
      { id: 'addHandover',    label: 'Create Handover' },
      { id: 'editHandover',   label: 'Edit Handover' },
      { id: 'deleteHandover', label: 'Delete Handover' },
    ],
    'final-package': [
      { id: 'addFinalDoc',    label: 'Add Package Document' },
      { id: 'editFinalDoc',   label: 'Edit Package Document' },
      { id: 'deleteFinalDoc', label: 'Delete Package Document' },
    ],
  };

  function MenuActionsDropdown({ actions, selectedIds, disabled, onToggle }) {
    const [open, setOpen] = useState(false);

    if (!actions || actions.length === 0) return null;

    const summary = disabled
      ? 'เขียนทั้งหมด'
      : (selectedIds.length
        ? `${selectedIds.length} ฟังก์ชัน`
        : 'ยังไม่ได้เลือก');

    return (
      <div className="relative text-left">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(v => !v)}
          className={`w-full px-1.5 py-0.5 rounded border text-[10px] flex items-center justify-between gap-1
            ${disabled
              ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
              : 'border-slate-200 bg-white text-slate-700 hover:border-orange-400'}`}
        >
          <span className="truncate">{summary}</span>
          <span className="text-[9px] text-slate-400">{open ? '▲' : '▼'}</span>
        </button>
        {/* ไม่ปิดเองเมื่อเลือก ให้ปิดเฉพาะตอนกดปุ่มอีกครั้ง */}
        {open && !disabled && (
          <div
            className="absolute z-10 mt-1 w-40 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg p-1.5"
          >
            {actions.map(action => {
              const checked = selectedIds.includes(action.id);
              return (
                <label
                  key={action.id}
                  className="flex items-center gap-1.5 px-1 py-0.5 text-[10px] text-slate-600 hover:bg-slate-50 rounded"
                >
                  <input
                    type="checkbox"
                    className="accent-orange-500"
                    checked={checked}
                    onChange={() => {
                      onToggle(action.id);
                      // คง dropdown ให้อยู่ เปิดอยู่ต่อ เพื่อให้เลือกได้หลายอันต่อเนื่อง
                      setOpen(true);
                    }}
                  />
                  <span className="truncate">{action.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function toggleRolePerm(role, menuId, field) {
    const current = rolePerms?.[role]?.[menuId]?.[field] ?? false;
    const next = {
      ...rolePerms,
      [role]: {
        ...(rolePerms?.[role] || {}),
        [menuId]: {
          ...(rolePerms?.[role]?.[menuId] || {}),
          [field]: !current,
        },
      },
    };
    setRolePerms(next);
    setDoc(doc(db, ROLE_PERM_DOC), next).catch(() => {});
  }

  function setRoleMenuLevel(role, menuId, level) {
    const currentMenu = rolePerms?.[role]?.[menuId] || {};
    const base = { ...(currentMenu.actions ? { actions: currentMenu.actions } : {}) };
    let read = false;
    let write = false;
    if (level === 'read') {
      read = true;
    } else if (level === 'read-write') {
      read = true;
      write = true;
    }
    const nextMenu = {
      ...base,
      ...(read ? { read: true } : { read: false }),
      ...(write ? { write: true } : { write: false }),
    };
    // ถ้าไม่มีสิทธิ์เลย และไม่มี actions ให้ลบ menu ทิ้งจาก object เพื่อลดขนาด
    const isEmpty = !read && !write && !nextMenu.actions;
    const roleEntry = { ...(rolePerms?.[role] || {}) };
    if (isEmpty) {
      delete roleEntry[menuId];
    } else {
      roleEntry[menuId] = nextMenu;
    }
    const next = {
      ...rolePerms,
      [role]: roleEntry,
    };
    setRolePerms(next);
    setDoc(doc(db, ROLE_PERM_DOC), next).catch(() => {});
  }

  function toggleRoleAction(role, menuId, actionId) {
    const currentMenu = rolePerms?.[role]?.[menuId] || {};
    const currentActions = currentMenu.actions || {};
    const nextActions = {
      ...currentActions,
      [actionId]: !currentActions[actionId],
    };
    const next = {
      ...rolePerms,
      [role]: {
        ...(rolePerms?.[role] || {}),
        [menuId]: {
          ...currentMenu,
          actions: nextActions,
        },
      },
    };
    setRolePerms(next);
    setDoc(doc(db, ROLE_PERM_DOC), next).catch(() => {});
  }

  return (
    <>
      {addingRole && (
        <AddRoleModal
          onClose={() => setAddingRole(false)}
          onSave={async ({ id, label }) => {
            const next = [
              ...customRoles.filter(r => r.id !== id),
              { id, label },
            ];
            setCustomRoles(next);
            await setDoc(doc(db, ROLE_META_DOC), { roles: next });
          }}
          existingIds={[
            ...USER_ROLES,
            ...customRoles.map(r => r.id),
          ]}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          currentUserUid={currentUser?.uid}
          projects={projects}
          roleOptions={allRoles}
          roleLabels={mergedRoleLabels}
          onClose={() => setEditingUser(null)}
        />
      )}
      {deletingUser && (
        <DeleteUserModal
          user={deletingUser}
          currentUserUid={currentUser?.uid}
          onClose={(removed) => {
            setDeletingUser(null);
            if (removed) {
              setUsers(prev => prev.filter(u => u.uid !== deletingUser.uid));
            }
          }}
        />
      )}

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <Users size={16} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">จัดการผู้ใช้</h1>
              <p className="text-[11px] text-slate-500">อนุมัติสมาชิก · กำหนดสิทธิ์ · กำหนดโครงการ</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck size={13} className="text-orange-400" />
            MasterAdmin only
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-3 inline-flex rounded-xl bg-slate-900/5 p-0.5 text-xs font-semibold border border-slate-200">
          {[
            { id: 'users',    label: 'Users' },
            { id: 'activity', label: 'Activity Log' },
            { id: 'roles',    label: 'Set Role' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                activeTab === t.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats (เฉพาะแท็บ Users) */}
        {activeTab === 'users' && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { key: 'all',      label: 'ทั้งหมด',     color: 'bg-slate-100 text-slate-700' },
            { key: 'pending',  label: 'รออนุมัติ',   color: 'bg-yellow-100 text-yellow-700' },
            { key: 'approved', label: 'อนุมัติแล้ว', color: 'bg-green-100 text-green-700' },
            { key: 'rejected', label: 'ปฏิเสธ',      color: 'bg-red-100 text-red-700' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                filterStatus === s.key ? 'border-orange-400' : 'border-transparent'
              } bg-white shadow-sm`}
            >
              <div className="text-xl font-bold text-slate-800">{counts[s.key]}</div>
              <div className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${s.color}`}>
                {s.label}
              </div>
            </button>
          ))}
        </div>
        )}

        {/* Search (เฉพาะแท็บ Users) */}
        {activeTab === 'users' && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อหรืออีเมล..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-orange-400 transition-colors shadow-sm"
          />
        </div>
        )}

        {/* Users Table */}
        {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ผู้ใช้</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Roles</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">โครงการ</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">สถานะ</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">สมัครเมื่อ</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                      {search ? 'ไม่พบผู้ใช้ที่ค้นหา' : 'ยังไม่มีผู้ใช้'}
                    </td>
                  </tr>
                )}
                {filtered.map(u => {
                  const name     = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'ไม่มีชื่อ';
                  const initials = ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase() || '?';
                  const isMe     = u.uid === currentUser?.uid;
                  const roles    = Array.isArray(u.role) ? u.role : (u.role ? [u.role] : []);
                  const isAdmin  = roles.some(r => ADMIN_ROLES.includes(r));
                  const projLabel = isAdmin ? (
                    <span className="text-[10px] text-orange-500 font-medium">ทุกโครงการ</span>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      {projectNames(u.assignedProjects) ?? (
                        <span className="text-slate-300 italic">ยังไม่กำหนด</span>
                      )}
                    </span>
                  );

                  return (
                    <tr key={u.uid} className={`hover:bg-slate-50 transition-colors ${isMe ? 'bg-orange-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar photoURL={u.photoURL} initials={initials} />
                          <div>
                            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                              {name}
                              {isMe && <span className="text-[9px] px-1 py-0.5 bg-orange-100 text-orange-600 rounded-full">คุณ</span>}
                              {u.isFirstUser && <span className="text-[9px] px-1 py-0.5 bg-purple-100 text-purple-600 rounded-full">First</span>}
                            </div>
                            <div className="text-[10px] text-slate-400">{u.email}</div>
                            {u.position && <div className="text-[10px] text-slate-400">{u.position}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {roles.map(r => (
                            <span key={r} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[r] ?? 'bg-slate-100 text-slate-700'}`}>
                              {ROLE_LABELS[r] ?? r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <div className="truncate">{projLabel}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                        {u.createdAt?.toDate?.()?.toLocaleDateString('th-TH') ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 rounded-lg text-xs font-medium text-slate-600 transition-colors whitespace-nowrap"
                          >
                            แก้ไข
                          </button>
                          {!isMe && !u.isFirstUser && (
                            <button
                              onClick={() => setDeletingUser(u)}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-[11px] font-semibold text-red-600 rounded-lg transition-colors whitespace-nowrap"
                            >
                              ลบ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Activity Log Tab */}
        {activeTab === 'activity' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Activity Log</h2>
                <p className="text-[11px] text-slate-500">
                  ตารางบันทึกการใช้งานระบบ: LOGIN / REGISTER / ACTION ต่างๆ
                </p>
              </div>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {activityLogs.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400">ยังไม่มี Activity</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        เวลา
                      </th>
                      <th className="text-left px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="text-left px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="text-left px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        ผู้ใช้
                      </th>
                      <th className="text-left px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        อีเมล
                      </th>
                      <th className="text-left px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        รายละเอียด
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {activityLogs.map(log => {
                      const u = users.find(x => x.uid === log.uid);
                      const email = u?.email ?? log.uid;
                      const name  = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || '';
                      const ts    = log.createdAt?.toDate?.()?.toLocaleString('th-TH') ?? '-';
                      const method = log.meta?.method ?? '-';
                      let detail = '-';
                      if (log.meta) {
                        const { method: _m, ...rest } = log.meta;
                        const keys = Object.keys(rest || {});
                        if (keys.length > 0) {
                          detail = keys.map(k => `${k}: ${rest[k]}`).join(' | ');
                        }
                      }
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2 whitespace-nowrap text-[10px] text-slate-500">
                            {ts}
                          </td>
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center gap-1">
                              <span className="text-[11px] font-semibold text-slate-800">
                                {log.action}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {method !== '-' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {method}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <div className="text-[11px] text-slate-700 truncate">
                              {name || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="text-[11px] text-slate-500 font-mono truncate">
                              {email}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">
                              {detail}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Role Permissions Tab */}
        {activeTab === 'roles' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Set Role Permissions</h2>
                <p className="text-[11px] text-slate-500">
                  กำหนดว่า Role แต่ละตัว สามารถเข้าถึงเมนูใน Sidebar ได้แบบอ่าน และกำหนดสิทธิ์ฟังก์ชันเขียน (เช่น Add / Edit / Delete)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddingRole(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-orange-500 text-white hover:bg-orange-600"
              >
                <Plus size={12} />
                เพิ่ม Role
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">Role</th>
                    {sidebarMenus.map(m => (
                      <th key={m.id} className="px-3 py-2.5 text-center font-semibold text-slate-600 whitespace-nowrap">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allRoles.map(role => (
                    <tr key={role} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap">
                        {mergedRoleLabels[role] ?? role}
                      </td>
                      {sidebarMenus.map(m => {
                        const perm = rolePerms?.[role]?.[m.id] || {};
                        const actions = perm.actions || {};
                        const level = perm.write ? 'read-write' : (perm.read ? 'read' : 'none');
                        const selectedIds = Object.keys(actions).filter(id => actions[id]);
                        return (
                          <td key={m.id} className="px-3 py-2.5 text-center align-middle">
                            <div className="inline-flex flex-col gap-1 items-stretch">
                              {/* Dropdown ระดับสิทธิ์หลัก: ไม่มีสิทธิ์ / อ่าน / อ่าน+เขียนทั้งหมด */}
                              <select
                                className="text-[10px] px-1.5 py-1 rounded border border-slate-200 bg-white text-slate-700 w-full"
                                value={level}
                                onChange={e => setRoleMenuLevel(role, m.id, e.target.value)}
                              >
                                <option value="none">ไม่มีสิทธิ์</option>
                                <option value="read">อ่าน</option>
                                <option value="read-write">อ่าน + เขียนทั้งหมด</option>
                              </select>
                              {/* ช่องเขียน: ปุ่มที่กดแล้วเปิด dropdown list เลือกฟังก์ชันได้หลายรายการ */}
                              {MENU_ACTIONS[m.id] && (
                                <MenuActionsDropdown
                                  actions={MENU_ACTIONS[m.id]}
                                  selectedIds={selectedIds}
                                  disabled={!!perm.write || level === 'none'}
                                  onToggle={(actionId) => toggleRoleAction(role, m.id, actionId)}
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
