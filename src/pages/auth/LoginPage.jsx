import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, HardHat, FileSearch, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { loginWithEmail, loginWithGoogle } from '../../auth/firebaseAuth';
import { useAuth } from '../../auth/AuthContext';

const ERROR_MSG = {
  'invalid-credential':    'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  'user-not-found':        'ไม่พบบัญชีผู้ใช้นี้',
  'popup-closed':          'ปิด popup ก่อนเสร็จ กรุณาลองใหม่',
  'unauthorized-domain':   'Domain นี้ยังไม่ได้รับอนุญาต — เพิ่ม localhost ใน Firebase Console > Authentication > Authorized domains',
  'popup-blocked':         'Browser บล็อก popup — กรุณาอนุญาต popup สำหรับเว็บนี้แล้วลองใหม่',
  'operation-not-allowed': 'Google Sign-in ยังไม่ได้เปิดใช้งาน — ไปที่ Firebase Console > Authentication > Sign-in methods > เปิด Google',
  'network-error':         'ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้',
  'firestore-permission':  'Firestore Security Rules ยังไม่ได้ตั้งค่า — ตรวจสอบ Rules ใน Firebase Console',
  'rejected':              'บัญชีของคุณถูกปฏิเสธ กรุณาติดต่อผู้ดูแลระบบ',
};

const FEATURES = [
  {
    icon: FileSearch,
    title: 'ติดตาม RFI & Document',
    desc:  'บริหาร RFI Workflow และ QC Document Control ครบวงจร',
  },
  {
    icon: ClipboardCheck,
    title: 'ITP & Inspection Realtime',
    desc:  'บันทึกและติดตามผลการตรวจสอบแบบ Realtime ทุกขั้นตอน',
  },
  {
    icon: ShieldCheck,
    title: 'ระบบสิทธิ์หลายระดับ',
    desc:  'จัดการ Role-Based Access Control สำหรับทุกทีม QC',
  },
];

export default function LoginPage() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/';

  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPass,      setShowPass]      = useState(false);
  const [errorKey,      setErrorKey]      = useState(location.state?.error ?? null);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.status === 'rejected') { setErrorKey('rejected'); return; }
    if (userProfile.status === 'pending')  { navigate('/pending',  { replace: true }); return; }
    if (userProfile.status === 'approved') { navigate(from, { replace: true }); }
  }, [userProfile, from, navigate]);

  async function handleEmailLogin(e) {
    e.preventDefault();
    setLoading(true);
    setErrorKey(null);
    try {
      await loginWithEmail(email, password);
      await refreshProfile();
    } catch (err) {
      setErrorKey(err.message ?? 'unknown');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setErrorKey(null);
    try {
      await loginWithGoogle();
      await refreshProfile();
    } catch (err) {
      // err.message เป็น key ที่เรา map ไว้, หรือ Firebase raw message
      const key = err.message ?? '';
      setErrorKey(ERROR_MSG[key] ? key : `__raw__${err.message}`);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left Panel ─────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[46%] flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0d1f3c 0%, #0a172e 60%, #0c1e38 100%)' }}
      >
        {/* Background decorative circles */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
        <div className="absolute bottom-10 -right-16 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #f97316, transparent)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <HardHat size={22} className="text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-white font-bold text-sm tracking-wide">CMG</div>
            <div className="text-slate-400 text-[11px] tracking-widest uppercase">QC System</div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold leading-tight mb-4">
            <span className="text-white">ระบบจัดการ</span>
            <br />
            <span className="text-orange-400">คุณภาพงาน QC</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs">
            Construction Management Group<br />
            บริหาร QC Inspection, RFI, NCR และเอกสารก่อสร้าง
            อย่างมีประสิทธิภาพ โปร่งใส และตรวจสอบได้
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={15} className="text-orange-400" />
                </div>
                <div>
                  <div className="text-white text-xs font-semibold">{title}</div>
                  <div className="text-slate-500 text-[11px] leading-relaxed mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-slate-600 text-[11px]">© 2026 CMG · All rights reserved</p>
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm">

          {/* Mobile brand (only on small screens) */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
              <HardHat size={18} className="text-white" />
            </div>
            <div>
              <div className="text-slate-800 font-bold text-sm">CMG QC System</div>
              <div className="text-slate-400 text-[10px] uppercase tracking-widest">Quality Control</div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-800">ยินดีต้อนรับ 👋</h2>
            <p className="text-slate-400 text-sm mt-1">กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ</p>
          </div>

          {/* Error */}
          {errorKey && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm leading-relaxed">
              {errorKey.startsWith('__raw__')
                ? <><span className="font-semibold">เกิดข้อผิดพลาด:</span> <span className="text-xs font-mono break-all">{errorKey.replace('__raw__', '')}</span></>
                : (ERROR_MSG[errorKey] ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่')
              }
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors mb-5 shadow-sm"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
            )}
            {googleLoading ? 'กำลังเชื่อมต่อ...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">หรือเข้าด้วย Email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password / รหัสผ่าน</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-11 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              style={{ background: loading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              เข้าสู่ระบบ
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            ยังไม่มีบัญชี?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
              สมัครใช้งาน
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
