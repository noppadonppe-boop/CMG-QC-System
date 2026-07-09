import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * PublicRoute - ใช้ครอบหน้า public เช่น /login, /register
 *
 * กติกาสำคัญ (ป้องกันหน้า Login กระพริบ):
 * 1. ขณะ loading === true (กำลังเช็ค Token จาก Firebase) ให้แสดง Spinner เท่านั้น
 *    ห้ามเรนเดอร์หน้า Login/Register เด็ดขาด
 * 2. เมื่อ loading จบแล้ว ถ้าพบว่ามี Token (firebaseUser) ให้ Redirect ไปหน้าหลัก
 *    (หรือหน้ารออนุมัติ ถ้า status ยังไม่ approved) ทันที โดยไม่แสดงหน้า Login
 * 3. ถ้าไม่มี Token เลย จึงจะแสดงหน้า Login/Register แบบเต็มรูปแบบ
 */
export default function PublicRoute({ children }) {
  const { firebaseUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  if (firebaseUser) {
    const from = location.state?.from?.pathname || '/';

    if (!userProfile) {
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
    if (userProfile.status === 'approved') {
      return <Navigate to={from} replace />;
    }
  }

  return children;
}
