import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import { Lock, User as UserIcon, Eye, EyeOff, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-slate-900 to-brand-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-ethiopic text-charcoal-900">
      {/* Institutional Header & Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4 space-y-3">
        <div className="inline-block p-2 rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/20 mb-1 transition-transform hover:scale-105 duration-300">
          <img
            src="/assets/haimote-abraham-logo.png"
            alt="ሐይመተ አብርሃም ሰንበት ትምህርት ቤት ሎጎ"
            className="h-24 w-auto object-contain mx-auto drop-shadow-lg"
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          ሐይመተ አብርሃም ሰንበት ትምህርት ቤት
        </h1>
        <p className="text-xs sm:text-sm text-brand-100 font-medium">
          የተማሪዎች ውጤት አስተዳደር ሥርዓት (Grading Management System)
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-100 space-y-6">
          <div className="border-b border-slate-100 pb-4 text-center">
            <h2 className="text-lg font-bold text-slate-800">ወደ ሲስተሙ ይግቡ</h2>
            <p className="text-xs text-slate-500 mt-1">መለያዎን (ስልክ/የተጠቃሚ ስም) እና የይለፍ ቃልዎን ያስገቡ</p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                የተጠቃሚ ስም / ስልክ ቁጥር / ኢሜይል
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ለምሳሌ፡ 0911... ወይም admin"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-800 bg-slate-50/50 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                የይለፍ ቃል
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="የይለፍ ቃልዎን ያስገቡ"
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-800 bg-slate-50/50 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'የይለፍ ቃል ደብቅ' : 'የይለፍ ቃል አሳይ'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-3 font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-3 shadow-lg shadow-brand-500/25 transition-all"
              isLoading={loading}
            >
              ይግቡ
            </Button>
          </form>
        </div>

        {/* Institutional Footer */}
        <p className="mt-8 text-center text-xs text-slate-300 font-medium">
          © 2016-2026 ሐይመተ አብርሃም ሰንበት ትምህርት ቤት | የውጤት አስተዳደር ማዕከል
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
