import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';
import { KeyRound, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('እባክዎ ሁሉንም የይለፍ ቃል ሳጥኖች ይሙሉ');
      return;
    }

    if (newPassword.length < 8) {
      setError('አዲሱ የይለፍ ቃል ቢያንስ 8 ፊደላት ወይም ቁጥሮች መሆን አለበት');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('አዲሱ የይለፍ ቃል እና ማረጋገጫው አይመሳሰሉም');
      return;
    }

    setLoading(true);
    try {
      const msg = await changePassword(currentPassword, newPassword);
      setSuccess(msg);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'የይለፍ ቃል መቀየር አልተሳካም');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-ethiopic">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-brand-50 text-brand-700 rounded-xl">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">የይለፍ ቃል መቀየሪያ</h3>
            <p className="text-xs text-slate-500">አካውንትዎ ደህንነቱ የተጠበቀ እንዲሆን ሚስጥራዊ ቃልዎን ይቀይሩ</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              የአሁኑ የይለፍ ቃል *
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-slate-800"
              placeholder="ነባሩን የይለፍ ቃል ያስገቡ"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              አዲስ የይለፍ ቃል (ቢያንስ 8 ፊደላት) *
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-slate-800"
              placeholder="አዲሱን ጠንካራ የይለፍ ቃል ያስገቡ"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              አዲሱን የይለፍ ቃል ያረጋግጡ *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-slate-800"
              placeholder="አዲሱን የይለፍ ቃል በድጋሚ ያስገቡ"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              ሰርዝ
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={loading}>
              የይለፍ ቃል ቀይር
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
