import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import { GraduationCap, Lock, User as UserIcon, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const demoAccounts = [
    { label: 'ዋና አስተዳዳሪ', user: 'superadmin', pass: 'Admin@SundaySchool2026', roleColor: 'border-purple-300 bg-purple-50 text-purple-800' },
    { label: 'አስተዳዳሪ', user: 'admin_mulugeta', pass: 'Admin@2026', roleColor: 'border-blue-300 bg-blue-50 text-blue-800' },
    { label: 'የሰንበት ት/ቤት አመራር', user: 'mgmt_berhanu', pass: 'Mgmt@2026', roleColor: 'border-amber-300 bg-amber-50 text-amber-800' },
    { label: 'መምህር', user: 'teacher_tekle', pass: 'Teacher@2026', roleColor: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
    { label: 'ተማሪ', user: 'student_yohannes', pass: 'Student@2026', roleColor: 'border-indigo-300 bg-indigo-50 text-indigo-800' },
  ];

  const handleSelectDemo = (user: string, pass: string) => {
    setIdentifier(user);
    setPassword(pass);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('እባክዎ የተጠቃሚ ስም/ስልክ እና የይለፍ ቃል ያስገቡ');
      return;
    }

    setLoading(true);
    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'መግባት አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-ethiopic">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex p-3 bg-gold-600 text-white rounded-2xl shadow-xl shadow-gold-600/30 mb-4">
          <GraduationCap className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          የሰንበት ትምህርት ቤት የተማሪዎች ውጤት አስተዳደር ሥርዓት
        </h2>
        <p className="mt-2 text-xs text-slate-300">
          የተማሪዎች ውጤት መመዝገቢያ እና ማጽደቂያ የበይነመረብ መተግበሪያ
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100 space-y-6">
          <div className="border-b border-slate-100 pb-4 text-center">
            <h3 className="text-lg font-bold text-slate-800">ወደ ሲስተሙ ይግቡ</h3>
            <p className="text-xs text-slate-500 mt-1">መለያዎን እና ሚስጥራዊ ቃልዎን ያስገቡ</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                የተጠቃሚ ስም / ስልክ ቁጥር / ኢሜይል
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ለምሳሌ፡ superadmin ወይም 0911..."
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                የይለፍ ቃል
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="የይለፍ ቃልዎን ያስገቡ"
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 font-bold"
              isLoading={loading}
            >
              ይግቡ
            </Button>
          </form>

          {/* Quick Demo Selector for Testing all 5 roles */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2.5">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              <span>የሙከራ መለያዎች፦</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              {demoAccounts.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectDemo(d.user, d.pass)}
                  className={`text-left p-2 rounded-lg border text-xs flex justify-between items-center hover:opacity-90 transition-opacity ${d.roleColor}`}
                >
                  <span className="font-semibold">{d.label}</span>
                  <span className="font-mono text-[10px] opacity-75">{d.user}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © 2016-2026 የሰንበት ትምህርት ቤት የተማሪዎች ውጤት አስተዳደር ሥርዓት
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
