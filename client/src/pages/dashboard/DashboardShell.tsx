import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import SuperAdminDashboard from './SuperAdminDashboard';
import AdminDashboard from './AdminDashboard';
import ManagementDashboard from './ManagementDashboard';
import TeacherDashboard from './TeacherDashboard';
import StudentDashboard from './StudentDashboard';
import ChangePasswordModal from '../../components/auth/ChangePasswordModal';
import NotificationBell from '../../components/common/NotificationBell';
import Button from '../../components/common/Button';
import { 
  GraduationCap, 
  LogOut, 
  KeyRound, 
  Menu, 
  X, 
  User as UserIcon, 
  ShieldCheck 
} from 'lucide-react';

export const DashboardShell: React.FC = () => {
  const { user, logout } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'ዋና አስተዳዳሪ';
      case 'ADMIN':
        return 'አስተዳዳሪ';
      case 'MANAGEMENT':
        return 'የሰንበት ት/ቤት አመራር';
      case 'TEACHER':
        return 'መምህር';
      case 'STUDENT':
        return 'ተማሪ';
      default:
        return 'ተጠቃሚ';
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MANAGEMENT':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'TEACHER':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'STUDENT':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-ethiopic text-slate-900 overflow-x-hidden">
      {/* Top Main Navigation Bar */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and System Title */}
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-1.5 rounded-xl border border-white/20 shadow-md shrink-0">
                <img
                  src="/assets/haimote-abraham-logo.png"
                  alt="ሐይመተ አብርሃም ሰንበት ትምህርት ቤት ሎጎ"
                  className="h-9 w-auto object-contain"
                />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white leading-tight">
                  ሐይመተ አብርሃም ሰንበት ትምህርት ቤት
                </h1>
                <p className="text-[11px] text-brand-100 hidden sm:block">
                  የተማሪዎች ውጤት አስተዳደር ሥርዓት (Grading Management System)
                </p>
              </div>
            </div>

            {/* Desktop User Profile and Actions */}
            <div className="hidden md:flex items-center gap-3">
              <NotificationBell />

              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getRoleBadgeStyle(
                    user?.role
                  )}`}
                >
                  {getRoleLabel(user?.role)}
                </span>
                <span className="text-xs text-slate-200 font-bold">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="text-xs border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                onClick={() => setIsPasswordModalOpen(true)}
              >
                <KeyRound className="w-3.5 h-3.5 mr-1" />
                <span>የይለፍ ቃል ቀይር</span>
              </Button>

              <Button
                variant="danger"
                size="sm"
                className="text-xs font-bold"
                onClick={logout}
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                <span>ውጣ</span>
              </Button>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex md:hidden items-center gap-2">
              <NotificationBell />
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${getRoleBadgeStyle(
                  user?.role
                )}`}
              >
                {getRoleLabel(user?.role)}
              </span>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 pt-3 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-3 py-2 border-b border-slate-800">
              <div className="w-10 h-10 rounded-full bg-brand-800 flex items-center justify-center font-bold text-sm text-white">
                {user?.firstName?.[0] || 'ተ'}
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-400">
                  {user?.username} • {getRoleLabel(user?.role)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsPasswordModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 text-left"
              >
                <KeyRound className="w-4 h-4 text-gold-400" />
                <span>የይለፍ ቃል ቀይር</span>
              </button>

              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600/30 text-left"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>ከሲስተሙ ውጣ</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Dynamic Role Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6">
        {user?.role === 'SUPER_ADMIN' && <SuperAdminDashboard />}
        {user?.role === 'ADMIN' && <AdminDashboard />}
        {user?.role === 'MANAGEMENT' && <ManagementDashboard />}
        {user?.role === 'TEACHER' && <TeacherDashboard />}
        {user?.role === 'STUDENT' && <StudentDashboard />}
      </main>

      {/* Professional Footer in Amharic */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p className="font-medium">
          © 2019-2026 ሐይመተ አብርሃም ሰንበት ትምህርት ቤት | ትምህርት ክፍል
        </p>
      </footer>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};

export default DashboardShell;
