import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HardHat, Mail, Lock, User, Briefcase, Eye, EyeOff, UserPlus } from 'lucide-react';
import { registerWithEmail } from '../../auth/firebaseAuth';
import { useAuth } from '../../auth/AuthContext';

export default function RegisterPage() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [form,    setForm]    = useState({ email: '', password: '', confirm: '', firstName: '', lastName: '', position: '' });
  const [showPass, setShowPass] = useState(false);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.status === 'pending')  { navigate('/pending', { replace: true }); return; }
    if (userProfile.status === 'approved') { navigate('/',        { replace: true }); }
  }, [userProfile, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }
    if (form.password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await registerWithEmail(form.email, form.password, form.firstName, form.lastName, form.position);
      await refreshProfile();
    } catch (err) {
      const code = err.code ?? err.message ?? '';
      if (code.includes('email-already-in-use')) setError('อีเมลนี้ถูกใช้งานแล้ว');
      else if (code.includes('invalid-email'))   setError('รูปแบบอีเมลไม่ถูกต้อง');
      else if (code.includes('weak-password'))   setError('รหัสผ่านอ่อนเกินไป');
      else setError('เกิดข้อผิดพลาด: ' + (err.message ?? code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 bg-orange-500 rounded-2xl mb-4 shadow-lg shadow-orange-500/30">
            <HardHat size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">CMG QC System</h1>
          <p className="text-slate-400 text-sm mt-1">สมัครบัญชีใหม่</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-lg font-semibold text-slate-100 mb-6">สร้างบัญชีผู้ใช้</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">ชื่อ *</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={form.firstName} onChange={set('firstName')} placeholder="ชื่อ" required
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">นามสกุล *</label>
                <input type="text" value={form.lastName} onChange={set('lastName')} placeholder="นามสกุล" required
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">ตำแหน่ง</label>
              <div className="relative">
                <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={form.position} onChange={set('position')} placeholder="เช่น QC Engineer"
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">อีเมล *</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="email" value={form.email} onChange={set('email')} placeholder="your@email.com" required
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">รหัสผ่าน *</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="อย่างน้อย 6 ตัวอักษร" required
                  className="w-full pl-8 pr-9 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">ยืนยันรหัสผ่าน *</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="password" value={form.confirm} onChange={set('confirm')} placeholder="••••••••" required
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 mt-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg text-sm font-semibold text-white transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus size={15} />
              )}
              สร้างบัญชี
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            มีบัญชีแล้ว?{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
              เข้าสู่ระบบ
            </Link>
          </p>

          <div className="mt-4 px-3 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600">
            <p className="text-[11px] text-slate-400 text-center">
              หลังสมัคร บัญชีจะ&nbsp;<span className="text-yellow-400 font-medium">รออนุมัติ</span>&nbsp;จากผู้ดูแลระบบ
              (ยกเว้นผู้ใช้คนแรกจะได้รับสิทธิ์ MasterAdmin ทันที)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
