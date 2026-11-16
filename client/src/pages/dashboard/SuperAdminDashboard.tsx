import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import AdminDashboard from './AdminDashboard';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { toEthiopianDateString } from '../../utils/ethiopianCalendar';
import { 
  Users, 
  ShieldAlert, 
  UserPlus, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Search, 
  Settings, 
  Award, 
  BookOpen, 
  KeyRound, 
  Lock, 
  Clock, 
  Layers, 
  ShieldCheck, 
  AlertCircle,
  Eye
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const [activeNav, setActiveNav] = useState<
    'dashboard' | 'general-admin' | 'management' | 'users' | 'audit' | 'settings'
  >('dashboard');

  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [generalAdminData, setGeneralAdminData] = useState<{
    isConfigured: boolean;
    generalAdmin: any | null;
  }>({ isConfigured: false, generalAdmin: null });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Management Account Modal Form State (Super Admin registers Management)
  const [isCreateManagementModalOpen, setIsCreateManagementModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('የትምህርት ክፍል');
  const [positionTitle, setPositionTitle] = useState('የትምህርት ክፍል ኃላፊ');

  // Register General Admin Modal State (Super Admin registers and appoints General Admin)
  const [isRegisterGAModalOpen, setIsRegisterGAModalOpen] = useState(false);
  const [gaUsername, setGaUsername] = useState('');
  const [gaFirstName, setGaFirstName] = useState('');
  const [gaLastName, setGaLastName] = useState('');
  const [gaGrandfatherName, setGaGrandfatherName] = useState('');
  const [gaPhone, setGaPhone] = useState('');
  const [gaEmail, setGaEmail] = useState('');
  const [gaPassword, setGaPassword] = useState('');

  // Appoint / Transfer Existing Admin Modal State
  const [isAppointExistingModalOpen, setIsAppointExistingModalOpen] = useState(false);
  const [selectedTargetAdminId, setSelectedTargetAdminId] = useState('');

  // Password Reset Modal State
  const [resettingUser, setResettingUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users?limit=100');
      setUsers(res.data.data.users);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneralAdminStatus = async () => {
    try {
      const res = await api.get('/system-admin/general-admin/status');
      setGeneralAdminData(res.data.data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/users/audit-logs?limit=40');
      setAuditLogs(res.data.data.logs);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const res = await api.get('/academic/years');
      setAcademicYears(res.data.data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchGeneralAdminStatus();
    fetchAuditLogs();
    fetchAcademicYears();
  }, []);

  // Compute metrics
  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.role === 'ADMIN').length;
  const totalManagement = users.filter((u) => u.role === 'MANAGEMENT').length;
  const totalTeachers = users.filter((u) => u.role === 'TEACHER').length;
  const totalStudents = users.filter((u) => u.role === 'STUDENT').length;
  const activeYearsCount = academicYears.filter((y) => y.status === 'ACTIVE' || y.isCurrent).length;
  const eligibleAdmins = users.filter(
    (u) => u.role === 'ADMIN' && u.isActive && !u.isDeleted && !u.isGeneralAdmin
  );

  const handleToggleStatus = async (userId: string, currentStatus: boolean, usernameVal: string) => {
    const actionLabel = currentStatus ? 'ማገድ' : 'ማንቃት';
    if (!window.confirm(`እርግጠኛ ነዎት የተጠቃሚ '${usernameVal}' አካውንትን ${actionLabel} ይፈልጋሉ?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await api.patch(`/users/${userId}/status`, { isActive: !currentStatus });
      setAlertMsg({ type: 'success', text: `የተጠቃሚ '${usernameVal}' አካውንት በተሳካ ሁኔታ ተስተካክሏል።` });
      setTimeout(() => setAlertMsg(null), 3500);
      await fetchUsers();
      await fetchAuditLogs();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'ሁኔታውን መቀየር አልተቻለም።' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateManagementAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setAlertMsg(null);

      await api.post('/users', {
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: 'MANAGEMENT',
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        department: department.trim(),
        positionTitle: positionTitle.trim(),
      });

      setAlertMsg({
        type: 'success',
        text: `አዲስ የአመራር አካውንት '${username}' በተሳካ ሁኔታ ተፈጥሯል!`,
      });
      setTimeout(() => setAlertMsg(null), 3500);

      setUsername('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setIsCreateManagementModalOpen(false);

      await fetchUsers();
      await fetchAuditLogs();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'አካውንት መፍጠር አልተቻለም።' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegisterGeneralAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setAlertMsg(null);

      const res = await api.post('/system-admin/general-admin/register', {
        username: gaUsername.trim(),
        firstName: gaFirstName.trim(),
        lastName: gaLastName.trim(),
        grandfatherName: gaGrandfatherName.trim() || undefined,
        phone: gaPhone.trim() || undefined,
        email: gaEmail.trim() || undefined,
        password: gaPassword.trim() || undefined,
      });

      setAlertMsg({
        type: 'success',
        text: res.data?.message || 'አዲስ ዋና አስተዳዳሪ ተመዝግቦ በተሳካ ሁኔታ ተሹሟል!',
      });
      setTimeout(() => setAlertMsg(null), 3500);

      setGaUsername('');
      setGaFirstName('');
      setGaLastName('');
      setGaGrandfatherName('');
      setGaPhone('');
      setGaEmail('');
      setGaPassword('');
      setIsRegisterGAModalOpen(false);

      await fetchUsers();
      await fetchGeneralAdminStatus();
      await fetchAuditLogs();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'ዋና አስተዳዳሪ መመዝገብ አልተቻለም።' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferOrAppointExistingAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetAdminId) return;

    try {
      setActionLoading(true);
      setAlertMsg(null);

      const endpoint = generalAdminData.isConfigured
        ? '/system-admin/general-admin/transfer'
        : '/system-admin/general-admin/appoint';

      const payload = generalAdminData.isConfigured
        ? { newTargetUserId: selectedTargetAdminId }
        : { targetUserId: selectedTargetAdminId };

      const res = await api.post(endpoint, payload);
      setAlertMsg({
        type: 'success',
        text: res.data?.message || 'ዋና አስተዳዳሪ በተሳካ ሁኔታ ተሹሟል/ተላልፏል!',
      });
      setTimeout(() => setAlertMsg(null), 3500);

      setIsAppointExistingModalOpen(false);
      setSelectedTargetAdminId('');

      await fetchUsers();
      await fetchGeneralAdminStatus();
      await fetchAuditLogs();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'ሹመት ማስተላለፍ/መሾም አልተቻለም።' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !newPassword) return;

    try {
      setActionLoading(true);
      await api.post(`/users/${resettingUser.id}/reset-password`, {
        newPassword,
      });

      setAlertMsg({
        type: 'success',
        text: `ለተጠቃሚ '${resettingUser.username}' አዲስ የይለፍ ቃል በተሳካ ሁኔታ ተቀምጧል!`,
      });
      setTimeout(() => setAlertMsg(null), 3500);
      setResettingUser(null);
      setNewPassword('');
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'የይለፍ ቃል መቀየር አልተቻለም።' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAppointGeneralAdmin = async (targetUserId: string, targetUsername: string) => {
    if (!window.confirm(`ተጠቃሚ '${targetUsername}'ን በዋና አስተዳዳሪነት (General Admin) ለመሾም እርግጠኛ ነዎት?`)) return;
    try {
      setActionLoading(true);
      const res = await api.post('/system-admin/general-admin/appoint', { targetUserId });
      setAlertMsg({ type: 'success', text: res.data.message || 'ዋና አስተዳዳሪ በተሳካ ሁኔታ ተሹሟል።' });
      setTimeout(() => setAlertMsg(null), 3500);
      await fetchUsers();
      await fetchGeneralAdminStatus();
      await fetchAuditLogs();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'ዋና አስተዳዳሪ መሾም አልተቻለም።' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeGeneralAdmin = async (targetUsername?: string) => {
    const name = targetUsername || generalAdminData.generalAdmin?.username || '';
    if (!window.confirm(`የተጠቃሚ '${name}'ን የዋና አስተዳዳሪነት ሹመት ለመሻር እርግጠኛ ነዎት?`)) return;
    try {
      setActionLoading(true);
      const res = await api.post('/system-admin/general-admin/revoke', {});
      setAlertMsg({ type: 'success', text: res.data.message || 'የዋና አስተዳዳሪነት ሹመት ተሽሯል።' });
      setTimeout(() => setAlertMsg(null), 3500);
      await fetchUsers();
      await fetchGeneralAdminStatus();
      await fetchAuditLogs();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'የዋና አስተዳዳሪነት ሹመት መሻር አልተቻለም።' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSoftDeleteUser = async (targetUserId: string, targetUsername: string) => {
    if (!window.confirm(`ተጠቃሚ '${targetUsername}'ን ከሲስተሙ ለመሰረዝ (Soft delete) እርግጠኛ ነዎት?`)) return;
    try {
      setActionLoading(true);
      const res = await api.delete(`/users/${targetUserId}`);
      setAlertMsg({ type: 'success', text: res.data.message || 'ተጠቃሚው በተሳካ ሁኔታ ተሰርዟል።' });
      setTimeout(() => setAlertMsg(null), 3500);
      await fetchUsers();
      await fetchGeneralAdminStatus();
      await fetchAuditLogs();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'ተጠቃሚውን መሰረዝ አልተቻለም።' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreUser = async (targetUserId: string, targetUsername: string) => {
    if (!window.confirm(`የተሰረዘውን ተጠቃሚ '${targetUsername}' ወደ ሲስተሙ ለመመለስ (Restore) እርግጠኛ ነዎት?`)) return;
    try {
      setActionLoading(true);
      const res = await api.patch(`/users/${targetUserId}/restore`);
      setAlertMsg({ type: 'success', text: res.data.message || 'ተጠቃሚው በተሳካ ሁኔታ ተመልሷል።' });
      setTimeout(() => setAlertMsg(null), 3500);
      await fetchUsers();
      await fetchGeneralAdminStatus();
      await fetchAuditLogs();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'ተጠቃሚውን መመለስ አልተቻለም።' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));

    if (activeNav === 'management') return u.role === 'MANAGEMENT' && matchesSearch;
    if (roleFilter !== 'ALL') return u.role === roleFilter && matchesSearch;
    return matchesSearch;
  });

  const getAmharicRoleName = (role: string) => {
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
        return role;
    }
  };

  const navTabs = [
    { key: 'dashboard', label: 'ዳሽቦርድ', icon: Layers },
    {
      key: 'general-admin',
      label: 'ዋና አስተዳዳሪ (General Admin)',
      icon: ShieldCheck,
      count: generalAdminData.generalAdmin ? 1 : 0,
    },
    { key: 'management', label: 'ማኔጅመንት', icon: Award, count: totalManagement },
    { key: 'users', label: 'የተጠቃሚ አስተዳደር', icon: Users, count: totalUsers },
    { key: 'audit', label: 'የእንቅስቃሴ መዝገብ', icon: Activity },
    { key: 'settings', label: 'ቅንብሮች', icon: Settings },
  ];

  return (
    <div className="space-y-6 font-ethiopic">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-md border border-purple-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-400/30">
            ደረጃ 1 • የበላይ አስተዳዳሪ ማዕከል
          </span>
          <h1 className="text-xl sm:text-2xl font-black mt-2">የስርዓት የበላይ ቁጥጥር እና የተጠቃሚዎች ማዕከል</h1>
          <p className="text-xs text-purple-200 mt-1">
            ዋና አስተዳዳሪን (General Admin) እና የአመራር አካላትን ይመዝግቡ፤ የተጠቃሚዎችን ሁኔታ ያስተዳድሩ፤ የደህንነት እንቅስቃሴዎችን ይቆጣጠሩ።
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsRegisterGAModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border border-amber-400"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" /> አዲስ ዋና አስተዳዳሪ መዝግብ
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsCreateManagementModalOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
          >
            <UserPlus className="w-4 h-4 mr-1.5" /> አዲስ ማኔጅመንት መዝግብ
          </Button>
        </div>
      </div>

      {/* Navigation Pills Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1.5 overflow-x-auto">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeNav === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveNav(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-brand-700 text-white shadow-md shadow-brand-700/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {alertMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            alertMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {alertMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: DASHBOARD OVERVIEW (6 Stat Cards + Recent Activity) */}
      {/* ========================================================= */}
      {activeNav === 'dashboard' && (
        <div className="space-y-6">
          {/* 6 Required Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">ጠቅላላ ተጠቃሚዎች</span>
              <div className="text-xl font-black text-slate-900">{totalUsers}</div>
              <p className="text-[10px] text-slate-400">በሲስተሙ የተመዘገቡ</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm space-y-1 bg-blue-50/20">
              <span className="text-[11px] font-bold text-blue-700 block">አስተዳዳሪዎች</span>
              <div className="text-xl font-black text-blue-900">{totalAdmins}</div>
              <p className="text-[10px] text-blue-500">የአካዳሚክ አስተዳዳሪዎች</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm space-y-1 bg-amber-50/20">
              <span className="text-[11px] font-bold text-amber-700 block">ማኔጅመንት</span>
              <div className="text-xl font-black text-amber-900">{totalManagement}</div>
              <p className="text-[10px] text-amber-500">የሰንበት ት/ቤት አመራሮች</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm space-y-1 bg-emerald-50/20">
              <span className="text-[11px] font-bold text-emerald-700 block">መምህራን</span>
              <div className="text-xl font-black text-emerald-900">{totalTeachers}</div>
              <p className="text-[10px] text-emerald-500">የኮርስ አስተማሪዎች</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-sm space-y-1 bg-indigo-50/20">
              <span className="text-[11px] font-bold text-indigo-700 block">ተማሪዎች</span>
              <div className="text-xl font-black text-indigo-900">{totalStudents}</div>
              <p className="text-[10px] text-indigo-500">የተመዘገቡ ተማሪዎች</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm space-y-1 bg-purple-50/20">
              <span className="text-[11px] font-bold text-purple-700 block">ንቁ የትምህርት ዘመናት</span>
              <div className="text-xl font-black text-purple-900">{activeYearsCount}</div>
              <p className="text-[10px] text-purple-500">ንቁና ወቅታዊ ዘመናት</p>
            </div>
          </div>

          {/* Recent Activities (Audit Log Feed) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-700" /> የቅርብ ጊዜ የስርዓት እንቅስቃሴዎች (Recent Activities)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  በተጠቃሚዎች የተከናወኑ የደህንነት፣ የአካዳሚክ እና የውጤት አስተዳደር ክንውኖች
                </p>
              </div>
              <button
                onClick={() => setActiveNav('audit')}
                className="text-xs font-bold text-brand-700 hover:text-brand-800"
              >
                ሁሉንም ተመልከት &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {auditLogs.slice(0, 8).map((log) => {
                const date = new Date(log.createdAt);
                const ethiopianDate = toEthiopianDateString(date);

                return (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5 font-bold text-xs">
                        {log.user?.firstName?.[0] || 'ስ'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'የስርዓት ክንውን'}{' '}
                          <span className="font-normal text-slate-600">({log.action})</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          የተከናወነበት አካል፦ <strong className="text-slate-700">{log.entityName}</strong>
                          {log.details && ` • ${JSON.stringify(log.details).slice(0, 70)}...`}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                      {ethiopianDate}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: GENERAL ADMIN APPOINTMENT & MANAGEMENT             */}
      {/* ========================================================= */}
      {activeNav === 'general-admin' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  ደረጃ 1 አስተዳደር • የበላይ ቁጥጥር
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-2">
                  የትምህርት ክፍል ዋና አስተዳዳሪ (General Admin) ሹመት እና ቁጥጥር
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                  በሲስተሙ ደንብ መሰረት በየትኛውም ወቅት <strong>አንድ ንቁ ዋና አስተዳዳሪ</strong> ብቻ ይኖራል። ዋና አስተዳዳሪው 
                  የክፍሉን ረዳት አስተዳዳሪዎች የመመዝገብ፣ ኃላፊነት የመስጠት እና የውጤት ይፋ የማድረግ ብቸኛ ስልጣን አለው።
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsRegisterGAModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border border-amber-400"
                >
                  <UserPlus className="w-4 h-4 mr-1.5" /> አዲስ ዋና አስተዳዳሪ መዝግብ
                </Button>
                {eligibleAdmins.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsAppointExistingModalOpen(true)}
                  >
                    <ShieldCheck className="w-4 h-4 mr-1.5" />
                    {generalAdminData.isConfigured ? 'በሌላ አስተዳዳሪ ተካ' : 'ካሉት አስተዳዳሪዎች ሹም'}
                  </Button>
                )}
              </div>
            </div>

            {/* Current General Admin Card */}
            {generalAdminData.isConfigured && generalAdminData.generalAdmin ? (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-slate-50 border border-amber-200 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="p-3 rounded-2xl bg-amber-100 text-amber-800 shadow-sm">
                      <ShieldCheck className="w-7 h-7" />
                    </span>
                    <div>
                      <div className="text-xs font-black text-amber-900">በአሁኑ ሰዓት የተሾሙ ዋና አስተዳዳሪ፦</div>
                      <div className="text-lg font-black text-slate-900">
                        {generalAdminData.generalAdmin.firstName} {generalAdminData.generalAdmin.lastName}{' '}
                        <span className="font-mono text-xs text-slate-600 font-bold">
                          (@{generalAdminData.generalAdmin.username})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {generalAdminData.generalAdmin.isActive ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ንቁ (Active)
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        የታገደ (Suspended)
                      </span>
                    )}

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRevokeGeneralAdmin(generalAdminData.generalAdmin.username)}
                      loading={actionLoading}
                    >
                      ሹመት ሽር (Revoke)
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs border-t border-amber-200/60">
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">ስልክ ቁጥር</span>
                    <span className="font-bold text-slate-800">{generalAdminData.generalAdmin.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">ኢሜይል</span>
                    <span className="font-bold text-slate-800">{generalAdminData.generalAdmin.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[10px]">የስልጣን ወሰን</span>
                    <span className="font-bold text-amber-900">የ4ቱም ዘርፎች የበላይ አስተባባሪ & የውጤት አጽዳቂ</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-red-100 text-red-700 shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-red-900">የተሾመ ዋና አስተዳዳሪ (General Admin) የለም!</h4>
                    <p className="text-xs text-red-700 mt-0.5">
                      ዋና አስተዳዳሪ ካልተሾመ ረዳት አስተዳዳሪዎችን ማስተዳደር እና የውጤት ማጽደቅ ተግባራት ይታገዳሉ።
                    </p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsRegisterGAModalOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold shrink-0"
                >
                  <UserPlus className="w-4 h-4 mr-1.5" /> አሁን ዋና አስተዳዳሪ ሹም
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3 & 4: USER LISTS (Management, All Users)              */}
      {/* ========================================================= */}
      {(activeNav === 'management' || activeNav === 'users') && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="በስም፣ በተጠቃሚ ስም ወይም በስልክ ቁጥር ፈልግ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {activeNav === 'users' && (
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">ሁሉም ሚናዎች</option>
                  <option value="SUPER_ADMIN">ዋና አስተዳዳሪ</option>
                  <option value="ADMIN">አስተዳዳሪ</option>
                  <option value="MANAGEMENT">ማኔጅመንት</option>
                  <option value="TEACHER">መምህር</option>
                  <option value="STUDENT">ተማሪ</option>
                </select>
              )}
            </div>

            {activeNav === 'management' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateManagementModalOpen(true)}
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                አዲስ የአመራር አባል መዝግብ
              </Button>
            )}
          </div>

          {/* User Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">ሙሉ ስም</th>
                    <th className="p-3">የተጠቃሚ ስም</th>
                    <th className="p-3">ስልክ / ኢሜይል</th>
                    <th className="p-3">ሚና</th>
                    <th className="p-3 text-center">ሁኔታ</th>
                    <th className="p-3 text-right">ተግባራት</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        እየተጫነ ነው...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        ምንም የተጠቃሚ መዝገብ አልተገኘም።
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, idx) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">
                          {u.firstName} {u.lastName} {u.grandfatherName || ''}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700">{u.username}</td>
                        <td className="p-3 text-slate-600">
                          <div>{u.phone || '-'}</div>
                          <div className="text-[10px] text-slate-400">{u.email || ''}</div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              {u.isGeneralAdmin ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                  ⭐ ዋና አስተዳዳሪ (GA)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800">
                                  {getAmharicRoleName(u.role)}
                                </span>
                              )}
                            </div>
                            {u.role === 'ADMIN' && u.adminResponsibilities && u.adminResponsibilities.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {u.adminResponsibilities.map((resp: string) => (
                                  <span
                                    key={resp}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200"
                                  >
                                    {resp === 'ANNOUNCEMENT_ADMIN'
                                      ? 'ማስታወቂያ'
                                      : resp === 'USER_REGISTRATION_ADMIN'
                                      ? 'ምዝገባ'
                                      : resp === 'COURSE_TEACHER_ADMIN'
                                      ? 'ኮርስ/መምህር'
                                      : resp === 'RESULT_MANAGEMENT_ADMIN'
                                      ? 'ውጤት'
                                      : resp}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {u.isDeleted ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px]">
                              የተሰረዘ
                            </span>
                          ) : u.isActive ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              ንቁ
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                              የታገደ
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end flex-wrap gap-1">
                            {/* Admin specific actions: General Admin & Responsibilities */}
                            {u.role === 'ADMIN' && !u.isDeleted && (
                              <>
                                {u.isGeneralAdmin ? (
                                  <button
                                    onClick={() => handleRevokeGeneralAdmin(u.username)}
                                    disabled={actionLoading}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold"
                                    title="የዋና አስተዳዳሪነት ሹመት ሽር"
                                  >
                                    ሹመት ሽር
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAppointGeneralAdmin(u.id, u.username)}
                                    disabled={actionLoading || !u.isActive}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                                      u.isActive
                                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                    title="ዋና አስተዳዳሪ አድርግ"
                                  >
                                    ⭐ ሹም
                                  </button>
                                )}
                              </>
                            )}

                            {/* Toggle Status (Active / Inactive) */}
                            {u.role !== 'SUPER_ADMIN' && !u.isDeleted && (
                              <button
                                onClick={() => handleToggleStatus(u.id, u.isActive, u.username)}
                                disabled={actionLoading}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                  u.isActive
                                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {u.isActive ? 'እገድ' : 'አንቃ'}
                              </button>
                            )}

                            {/* Soft Delete or Restore */}
                            {u.role !== 'SUPER_ADMIN' && (
                              u.isDeleted ? (
                                <button
                                  onClick={() => handleRestoreUser(u.id, u.username)}
                                  disabled={actionLoading}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[10px] font-bold"
                                  title="አካውንቱን ወደ ሲስተሙ መልስ"
                                >
                                  መልስ
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSoftDeleteUser(u.id, u.username)}
                                  disabled={actionLoading}
                                  className="px-2 py-1 bg-slate-100 text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-bold"
                                  title="አካውንቱን ሰርዝ (Soft delete)"
                                >
                                  ሰርዝ
                                </button>
                              )
                            )}

                            {/* Reset Password */}
                            {!u.isDeleted && (
                              <button
                                onClick={() => {
                                  setResettingUser(u);
                                  setNewPassword('');
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-0.5"
                                title="የይለፍ ቃል ቀይር"
                              >
                                <KeyRound className="w-3 h-3" /> ቃል
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: AUDIT LOGS (የእንቅስቃሴ መዝገብ)                       */}
      {/* ========================================================= */}
      {activeNav === 'audit' && (
        <div className="space-y-4">
          {/* Audit Filter Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                placeholder="በተጠቃሚ ስም ወይም ተግባር ፈልግ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">የተግባር አይነት፦</span>
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 font-bold"
              >
                <option value="ALL">ሁሉም የተከናወኑ ተግባራት</option>
                <option value="USER_CREATED">አዲስ አካውንት መፍጠር</option>
                <option value="USER_ACTIVATED">አካውንት ማንቃት (Activate)</option>
                <option value="USER_DEACTIVATED">አካውንት ማገድ (Suspend)</option>
                <option value="REGISTER_STUDENT">ተማሪ መመዝገብ</option>
                <option value="PROMOTE_STUDENT">ተማሪ ማስተላለፍ/ማሳለፍ</option>
                <option value="REGISTER_TEACHER">መምህር መመዝገብ</option>
                <option value="ASSIGN_TEACHER">መምህር መመደብ</option>
                <option value="SAVE_DRAFT_GRADES">ውጤት በረቂቅነት መመዝገብ</option>
                <option value="SUBMIT_GRADES_FOR_APPROVAL">ውጤት ለማጽደቅ ማቅረብ</option>
                <option value="APPROVE_GRADE_SUBMISSION">ውጤት ማጽደቅ</option>
                <option value="REJECT_GRADE_SUBMISSION">ውጤት ውድቅ ማድረግ</option>
                <option value="PUBLISH_GRADE_SUBMISSION">ውጤት ይፋ ማድረግ</option>
                <option value="SET_GRADE_DEADLINE">ቀነ-ገደብ መወሰን</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>የስርዓት ደህንነት እና የተግባራት ኦዲት መዝገብ (System Audit Trail)</span>
              <span>ጠቅላላ ክንውኖች፦ {auditLogs.filter((log) => {
                if (auditActionFilter !== 'ALL' && log.action !== auditActionFilter) return false;
                if (searchTerm) {
                  const q = searchTerm.toLowerCase();
                  const uMatch = `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.toLowerCase().includes(q);
                  const aMatch = log.action.toLowerCase().includes(q);
                  return uMatch || aMatch;
                }
                return true;
              }).length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">ተጠቃሚ</th>
                    <th className="p-3">የተከናወነ ተግባር</th>
                    <th className="p-3">የተከናወነበት ክፍል</th>
                    <th className="p-3">ዝርዝር መረጃ</th>
                    <th className="p-3">ቀንና ሰዓት</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs
                    .filter((log) => {
                      if (auditActionFilter !== 'ALL' && log.action !== auditActionFilter) return false;
                      if (searchTerm) {
                        const q = searchTerm.toLowerCase();
                        const uMatch = `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.toLowerCase().includes(q);
                        const aMatch = log.action.toLowerCase().includes(q);
                        return uMatch || aMatch;
                      }
                      return true;
                    })
                    .map((log, idx) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'የሲስተም'}
                        {log.user?.role && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {getAmharicRoleName(log.user.role)}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-brand-800">{log.action}</td>
                      <td className="p-3 text-slate-700 font-mono">{log.entityName}</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {toEthiopianDateString(new Date(log.createdAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: SETTINGS & ACADEMIC SHORTCUTS                      */}
      {/* ========================================================= */}
      {activeNav === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">ሐይመተ አብርሃም ሰንበት ትምህርት ቤት ተቋማዊ ቅንብሮች</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block">የተቋሙ ስም፦</span>
                <strong className="text-slate-900 text-sm">የደብረ ሰላም ቅዱስ እስጢፋኖስ ሰንበት ትምህርት ቤት</strong>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block">የሰዓት ቀጠና (Timezone)፦</span>
                <strong className="text-slate-900 text-sm">Africa/Addis_Ababa (UTC+3)</strong>
              </div>
            </div>
          </div>

          {/* Embedded Academic Management Access for Super Admin */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 px-1">የአካዳሚክ እና የውጤት አስተዳደር መቆጣጠሪያ</h3>
            <AdminDashboard />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: Register and Appoint General Admin               */}
      {/* ========================================================= */}
      {isRegisterGAModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-ethiopic">
          <form
            onSubmit={handleRegisterGeneralAdmin}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">አዲስ ዋና አስተዳዳሪ (General Admin) መዝግብ እና ሹም</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterGAModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
              <strong>የስልጣን ደንብ፦</strong>
              <p>
                ዋና አስተዳዳሪው 4ቱንም ዘርፎች (ማስታወቂያ፣ ምዝገባ፣ ኮርስ/መምህር፣ ውጤት) በበላይነት ስለሚመራ ንዑስ ኃላፊነት መምረጥ
                አያስፈልግም። አካውንቱ እንደተመዘገበ በቀጥታ በዋና አስተዳዳሪነት ይሾማል።
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">የተጠቃሚ ስም (Username) *</label>
                <input
                  type="text"
                  required
                  value={gaUsername}
                  onChange={(e) => setGaUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="ምሳሌ፦ general_admin"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">መጠሪያ ስም *</label>
                <input
                  type="text"
                  required
                  value={gaFirstName}
                  onChange={(e) => setGaFirstName(e.target.value)}
                  placeholder="ምሳሌ፦ ተስፋዬ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">የአባት ስም *</label>
                <input
                  type="text"
                  required
                  value={gaLastName}
                  onChange={(e) => setGaLastName(e.target.value)}
                  placeholder="ምሳሌ፦ ገብሬ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">የአያት ስም</label>
                <input
                  type="text"
                  value={gaGrandfatherName}
                  onChange={(e) => setGaGrandfatherName(e.target.value)}
                  placeholder="ምሳሌ፦ ወልደየስ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ስልክ ቁጥር</label>
                <input
                  type="text"
                  value={gaPhone}
                  onChange={(e) => setGaPhone(e.target.value)}
                  placeholder="+2519..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ኢሜይል</label>
                <input
                  type="email"
                  value={gaEmail}
                  onChange={(e) => setGaEmail(e.target.value)}
                  placeholder="admin@haimote.org"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">የይለፍ ቃል (አማራጭ)</label>
                <input
                  type="password"
                  value={gaPassword}
                  onChange={(e) => setGaPassword(e.target.value)}
                  placeholder="ባዶ ከሆነ ነባሪው፡ Temporary@2026"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsRegisterGAModalOpen(false)}
              >
                ይቅር
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={actionLoading}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border border-amber-400"
              >
                መዝግብ እና ሹም
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: Appoint or Transfer Existing Admin as GA         */}
      {/* ========================================================= */}
      {isAppointExistingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-ethiopic">
          <form
            onSubmit={handleTransferOrAppointExistingAdmin}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {generalAdminData.isConfigured ? 'ዋና አስተዳዳሪን በሌላ ተካ' : 'ካሉት አስተዳዳሪዎች ሹም'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAppointExistingModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              በዋና አስተዳዳሪነት (General Admin) የሚሾሙትን ንቁ አስተዳዳሪ ይምረጡ፦
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">አስተዳዳሪ ምረጥ *</label>
              <select
                required
                value={selectedTargetAdminId}
                onChange={(e) => setSelectedTargetAdminId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">-- አስተዳዳሪ ይምረጡ --</option>
                {eligibleAdmins.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    {adm.firstName} {adm.lastName} (@{adm.username})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsAppointExistingModalOpen(false)}
              >
                ይቅር
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={actionLoading}
                disabled={!selectedTargetAdminId}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border border-amber-400"
              >
                {generalAdminData.isConfigured ? 'አስተላልፍ እና ተካ' : 'ዋና አስተዳዳሪ አድርግ'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: Create Management Account                        */}
      {/* ========================================================= */}
      {isCreateManagementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-ethiopic">
          <form
            onSubmit={handleCreateManagementAccount}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-brand-700" />
                <h3 className="text-base font-bold text-slate-900">አዲስ የአመራር አካል (Management) መዝግብ</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateManagementModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">የተጠቃሚ ስም (Username) *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="ምሳሌ፦ mgmt_solomon"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">መጠሪያ ስም *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="ምሳሌ፦ ሰሎሞን"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">የአባት ስም *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="ምሳሌ፦ ታደሰ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ስልክ ቁጥር</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2519..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ኢሜይል</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ክፍል (Department) *</label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="ምሳሌ፦ የትምህርት ክፍል"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">የኃላፊነት መጠሪያ *</label>
                <input
                  type="text"
                  required
                  value={positionTitle}
                  onChange={(e) => setPositionTitle(e.target.value)}
                  placeholder="ምሳሌ፦ የትምህርት ክፍል ዋና ኃላፊ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
              የመጀመሪያ የይለፍ ቃል በራስ-ሰር <strong>SundaySchool@2026</strong> ሆኖ የሚመዘገብ ሲሆን ተጠቃሚው ሲገባ ይቀይረዋል።
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsCreateManagementModalOpen(false)}
              >
                ይቅር
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={actionLoading}>
                መዝግብ እና ፍጠር
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: Reset User Password                              */}
      {/* ========================================================= */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-ethiopic">
          <form
            onSubmit={handleResetPassword}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-brand-700">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">የይለፍ ቃል መቀየር</h3>
            </div>
            <p className="text-xs text-slate-600">
              ለተጠቃሚ <strong>{resettingUser.firstName} {resettingUser.lastName}</strong> ({resettingUser.username}) አዲስ የይለፍ ቃል ያስገቡ።
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                አዲስ የይለፍ ቃል (ቢያንስ 8 ፊደላት) *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="አዲስ የይለፍ ቃል..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setResettingUser(null)}
              >
                ይቅር
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={actionLoading}>
                የይለፍ ቃል ቀይር
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
