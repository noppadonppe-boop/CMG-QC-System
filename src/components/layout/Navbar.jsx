import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Building2, User, LogOut, HardHat } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ROLE_LABELS, ROLE_COLORS } from '../../data/mockData';

export default function Navbar() {
  const { currentUser, setCurrentUser, users, selectedProjectId, setSelectedProjectId, projects } = useApp();
  const [userOpen, setUserOpen]       = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const userRef    = useRef(null);
  const projectRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (userRef.current && !userRef.current.contains(e.target))       setUserOpen(false);
      if (projectRef.current && !projectRef.current.contains(e.target)) setProjectOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
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

          {/* User Switcher */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => setUserOpen(v => !v)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors px-3 py-1.5 rounded-lg border border-slate-700"
            >
              <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-[11px] font-bold text-white">
                {currentUser.avatar}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-200 leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400">{ROLE_LABELS[currentUser.role]}</div>
              </div>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${userOpen ? 'rotate-180' : ''}`} />
            </button>
            {userOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Switch User</span>
                </div>
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setCurrentUser(u); setUserOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors ${currentUser.id === u.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                      {u.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800">{u.name}</div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </div>
                    {currentUser.id === u.id && (
                      <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
