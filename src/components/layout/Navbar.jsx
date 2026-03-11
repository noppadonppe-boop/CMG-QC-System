import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown, Building2, HardHat, LogOut, User, Pencil, X, Save,
} from 'lucide-react';
import { useApp }  from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { logout, updateUserProfileDoc } from '../../auth/firebaseAuth';
import { ROLE_LABELS } from '../../auth/constants';
import { useNavigate } from 'react-router-dom';

function ProfileUpdateModal({ onClose }) {
  const { userProfile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    firstName: userProfile?.firstName ?? '',
    lastName:  userProfile?.lastName  ?? '',
    position:  userProfile?.position  ?? '',
    photoURL:  userProfile?.photoURL  ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateUserProfileDoc(userProfile.uid, {
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        position:  form.position.trim(),
        photoURL:  form.photoURL.trim() || null,
      });
      await refreshProfile();
      onClose();
    } catch (err) {
      setError(err.message ?? 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-slate-100">อัปเดตโปรไฟล์</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">ชื่อ</label>
              <input value={form.firstName} onChange={set('firstName')} placeholder="ชื่อ"
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-600 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">นามสกุล</label>
              <input value={form.lastName} onChange={set('lastName')} placeholder="นามสกุล"
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-600 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">ตำแหน่ง</label>
            <input value={form.position} onChange={set('position')} placeholder="เช่น QC Engineer"
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-600 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">URL รูปโปรไฟล์ (Google Drive / ลิงก์รูป)</label>
            <input value={form.photoURL} onChange={set('photoURL')} placeholder="https://..."
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-600 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors" />
            <p className="text-[10px] text-slate-600 mt-1">รองรับ Google Profile Photo หรือลิงก์รูปภาพใดก็ได้</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-300 transition-colors">
              ยกเลิก
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg text-xs font-semibold text-white transition-colors">
              {saving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={12} />}
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { selectedProjectId, setSelectedProjectId, visibleProjects: projects } = useApp();
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [userOpen,    setUserOpen]    = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // reset error ทุกครั้งที่ photoURL เปลี่ยน (เช่น หลัง login ใหม่)
  useEffect(() => { setAvatarError(false); }, [userProfile?.photoURL]);

  const userRef    = useRef(null);
  const projectRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (userRef.current    && !userRef.current.contains(e.target))    setUserOpen(false);
      if (projectRef.current && !projectRef.current.contains(e.target)) setProjectOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const userRoles   = userProfile?.role ?? [];
  const firstName   = userProfile?.firstName ?? '';
  const lastName    = userProfile?.lastName  ?? '';
  const displayName = (firstName + ' ' + lastName).trim() || userProfile?.email || '';
  const initials    = (
    (firstName[0] ?? '') + (lastName[0] ?? '')
  ).toUpperCase() || (userProfile?.email?.[0] ?? '?').toUpperCase();

  const primaryRole = userRoles[0];
  const roleLabel   = ROLE_LABELS[primaryRole] ?? primaryRole ?? '';

  async function handleLogout() {
    setUserOpen(false);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      {showProfile && <ProfileUpdateModal onClose={() => setShowProfile(false)} />}

      <header className="bg-slate-900 text-white shadow-lg z-50 relative">
        <div className="flex items-center justify-between px-4 h-14">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-orange-500 rounded-lg">
              <HardHat size={18} className="text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-wide text-white">CMG</div>
              <div className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">QC Management</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Project Selector */}
            <div ref={projectRef} className="relative">
              <button
                onClick={() => setProjectOpen(v => !v)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors px-3 py-1.5 rounded-lg border border-slate-700 text-sm max-w-xs"
              >
                <Building2 size={15} className="text-orange-400 shrink-0" />
                <span className="truncate max-w-[180px] text-slate-200 text-xs font-medium">
                  {selectedProject ? selectedProject.name : 'Select Project'}
                </span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform shrink-0 ${projectOpen ? 'rotate-180' : ''}`} />
              </button>
              {projectOpen && (
                <div className="absolute right-0 mt-1 w-72 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Projects</span>
                  </div>
                  {projects.length === 0 && (
                    <div className="px-3 py-4 text-xs text-slate-400 text-center">ยังไม่มีโปรเจกต์</div>
                  )}
                  {projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProjectId(p.id); setProjectOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 flex flex-col gap-0.5 hover:bg-orange-50 transition-colors ${selectedProjectId === p.id ? 'bg-orange-50 border-l-2 border-orange-500' : ''}`}
                    >
                      <span className="text-xs font-semibold text-slate-800">{p.name}</span>
                      <span className="text-[11px] text-slate-500">{p.projectNo} · {p.location}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile */}
            <div ref={userRef} className="relative">
              <button
                onClick={() => setUserOpen(v => !v)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors px-3 py-1.5 rounded-lg border border-slate-700"
              >
                {userProfile?.photoURL && !avatarError ? (
                  <img
                    src={userProfile.photoURL}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-[11px] font-bold text-white">
                    {initials}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200 leading-tight">{displayName || 'User'}</div>
                  {roleLabel && <div className="text-[10px] text-slate-400">{roleLabel}</div>}
                </div>
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${userOpen ? 'rotate-180' : ''}`} />
              </button>

              {userOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                  {/* Header */}
                  <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100">
                    <div className="text-xs font-semibold text-slate-800 truncate">{displayName || 'User'}</div>
                    <div className="text-[10px] text-slate-500 truncate">{userProfile?.email}</div>
                    {userRoles.length > 0 && (
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {userRoles.map(r => ROLE_LABELS[r] ?? r).join(', ')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setUserOpen(false); setShowProfile(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User size={14} className="text-slate-400" />
                    อัปเดตโปรไฟล์
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
                  >
                    <LogOut size={14} />
                    ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
