import { useEffect, useState } from 'react';
import { HardHat, Clock, LogOut, RefreshCw } from 'lucide-react';
import { logout } from '../../auth/firebaseAuth';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function PendingApprovalPage() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking]     = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!userProfile) {
      navigate('/login', { replace: true });
    } else if (userProfile.status === 'approved') {
      navigate('/', { replace: true });
    }
  }, [userProfile, navigate]);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  }

  async function handleCheckStatus() {
    setChecking(true);
    await refreshProfile();
    setChecking(false);
    // navigate is handled by the useEffect above if status changed
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 bg-orange-500 rounded-2xl mb-4 shadow-lg shadow-orange-500/30">
            <HardHat size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CMG QC System</h1>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 border-2 border-yellow-500/30 flex items-center justify-center">
              <Clock size={28} className="text-yellow-400" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-slate-100 mb-2">รอการอนุมัติ</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ<br />
            กรุณารอสักครู่ หรือติดต่อ MasterAdmin เพื่อขออนุมัติ
          </p>

          {userProfile && (
            <div className="mb-6 p-4 bg-slate-700/50 rounded-xl border border-slate-600 text-left">
              <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide font-medium">ข้อมูลบัญชี</div>
              <div className="text-sm text-slate-200 font-medium">
                {userProfile.firstName || userProfile.lastName
                  ? `${userProfile.firstName} ${userProfile.lastName}`.trim()
                  : 'ยังไม่ได้กรอกชื่อ'
                }
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{userProfile.email}</div>
              {userProfile.position && (
                <div className="text-xs text-slate-400 mt-0.5">{userProfile.position}</div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCheckStatus}
              disabled={checking || loggingOut}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-slate-200 transition-colors"
            >
              <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
              {checking ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะ'}
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut || checking}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-60 disabled:cursor-not-allowed border border-red-500/30 rounded-lg text-sm font-medium text-red-400 transition-colors"
            >
              <LogOut size={14} className={loggingOut ? 'animate-pulse' : ''} />
              {loggingOut ? 'กำลังออก...' : 'ออกจากระบบ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
