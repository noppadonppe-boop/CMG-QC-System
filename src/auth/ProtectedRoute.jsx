import { Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// ถ้า profile ยังไม่มาภายใน TIMEOUT_MS ถือว่า doc ถูกลบ → redirect to login
const PROFILE_TIMEOUT_MS = 8000;

/**
 * @param {{ requireApproved?: boolean, requireRoles?: string[], children: React.ReactNode }} props
 */
export default function ProtectedRoute({ children, requireApproved = true, requireRoles }) {
  const { firebaseUser, userProfile, loading } = useAuth();
  const location = useLocation();
  const [profileTimedOut, setProfileTimedOut] = useState(false);

  // ถ้า firebaseUser มีแต่ profile ยังไม่มา ให้เริ่มนับเวลา
  useEffect(() => {
    if (!firebaseUser || userProfile) {
      setProfileTimedOut(false);
      return;
    }
    const t = setTimeout(() => setProfileTimedOut(true), PROFILE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [firebaseUser, userProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Firebase user is known but profile is still fetching
  if (!userProfile) {
    // หมดเวลา → profile ถูกลบไปแล้ว ส่งกลับ login
    if (profileTimedOut) {
      return <Navigate to="/login" replace />;
    }
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">กำลังโหลดโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  if (userProfile.status === 'pending') {
    return <Navigate to="/pending" replace />;
  }

  if (userProfile.status === 'rejected') {
    return <Navigate to="/login" state={{ error: 'rejected' }} replace />;
  }

  if (requireApproved && userProfile.status !== 'approved') {
    return <Navigate to="/pending" replace />;
  }

  if (requireRoles?.length > 0) {
    const hasRole = (userProfile.role ?? []).some(r => requireRoles.includes(r));
    if (!hasRole) return <Navigate to="/" replace />;
  }

  return children;
}
