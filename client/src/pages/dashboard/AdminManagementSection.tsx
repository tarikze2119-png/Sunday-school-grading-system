import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { User, AdminResponsibility } from '../../types/user.types';
import Button from '../../components/common/Button';
import {
  ShieldCheck,
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Sliders,
  Award,
  Users,
  Megaphone,
  UserCheck,
  BookOpen,
} from 'lucide-react';

export const RESPONSIBILITY_CONFIG: {
  key: AdminResponsibility;
  label: string;
  badge: string;
  color: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    key: 'ANNOUNCEMENT_ADMIN',
    label: 'የማስታወቂያ አስተዳዳሪ (Announcement Admin)',
    badge: 'ማስታወቂያ',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'ማስታወቂያዎችን የመጻፍ፣ የማሰራጨት እና ታሪካዊ ሁኔታቸውን የመከታተል ፈቃድ።',
    icon: Megaphone,
  },
  {
    key: 'USER_REGISTRATION_ADMIN',
    label: 'የተማሪዎች ምዝገባ አስተዳዳሪ (User Registration Admin)',
    badge: 'ምዝገባ',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'ተማሪዎችን የመመዝገብ፣ ወደ ኮርስ የማስገባት እና ወደ አዲስ የትምህርት ዓመት የማሸጋገር ፈቃድ።',
    icon: UserCheck,
  },
  {
    key: 'COURSE_TEACHER_ADMIN',
    label: 'የኮርሶችና መምህራን አስተዳዳሪ (Course & Teacher Admin)',
    badge: 'ኮርስ/መምህር',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'የትምህርት ዘመናትን፣ ምድቦችን፣ ኮርሶችንና የመምህራን ምደባዎችን የማስተዳደር ፈቃድ።',
    icon: BookOpen,
  },
  {
    key: 'RESULT_MANAGEMENT_ADMIN',
    label: 'የውጤት ዝግጅት አስተዳዳሪ (Result Management Admin)',
    badge: 'ውጤት',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'የውጤት መመዘኛዎችን (Grading Scheme) የማዋቀር እና የቀረቡ ውጤቶችን የመመርመር ፈቃድ።',
    icon: Sliders,
  },
];

export const AdminManagementSection: React.FC = () => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Registration Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [grandfatherName, setGrandfatherName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [createResponsibilities, setCreateResponsibilities] = useState<AdminResponsibility[]>([]);

  // Update Responsibilities Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editResponsibilities, setEditResponsibilities] = useState<AdminResponsibility[]>([]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users?role=ADMIN&limit=100');
      const allAdmins: User[] = res.data?.data?.users || [];
      setAdmins(allAdmins);
    } catch (err: any) {
      console.error(err);
      setAlertMsg({ type: 'error', text: err.message || 'የአስተዳዳሪዎችን ዝርዝር ማምጣት አልተቻለም።' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const generalAdminUser = admins.find((a) => a.isGeneralAdmin);
  const subordinateAdmins = admins.filter((a) => !a.isGeneralAdmin);

  const filteredSubordinates = subordinateAdmins.filter((a) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const fullName = `${a.firstName} ${a.lastName} ${a.grandfatherName || ''}`.toLowerCase();
    return (
      fullName.includes(q) ||
      a.username.toLowerCase().includes(q) ||
      (a.phone && a.phone.includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q))
    );
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !firstName.trim() || !lastName.trim()) {
      setAlertMsg({ type: 'error', text: 'እባክዎ ሙሉ ስም እና የተጠቃሚ ስም በትክክል ያስገቡ።' });
      return;
    }

    try {
      setActionLoading(true);
      setAlertMsg(null);

      await api.post('/users', {
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        grandfatherName: grandfatherName.trim() || undefined,
        role: 'ADMIN',
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        password: password.trim() || undefined,
        adminResponsibilities: createResponsibilities,
      });

      setAlertMsg({
        type: 'success',
        text: `አዲስ ረዳት አስተዳዳሪ '${username.trim()}' በተሳካ ሁኔታ ተመዝግቧል!`,
      });
      setTimeout(() => setAlertMsg(null), 4000);

      // Reset form
      setUsername('');
      setFirstName('');
      setLastName('');
      setGrandfatherName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setCreateResponsibilities([]);
      setIsCreateModalOpen(false);

      await fetchAdmins();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'ረዳት አስተዳዳሪውን መመዝገብ አልተቻለም።' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateResponsibilitiesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setActionLoading(true);
      setAlertMsg(null);

      const res = await api.patch(`/users/${editingUser.id}/responsibilities`, {
        responsibilities: editResponsibilities,
      });

      setAlertMsg({
        type: 'success',
        text:
          editResponsibilities.length === 0
            ? `የተጠቃሚ '${editingUser.username}' ኃላፊነቶች በሙሉ ተሽረዋል።`
            : res.data?.message || `የአስተዳዳሪ '${editingUser.username}' ኃላፊነቶች በተሳካ ሁኔታ ተሻሽለዋል!`,
      });
      setTimeout(() => setAlertMsg(null), 4000);

      setEditingUser(null);
      setEditResponsibilities([]);

      await fetchAdmins();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'ኃላፊነቶችን ማስተካከል አልተቻለም።' });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleCreateResponsibility = (key: AdminResponsibility) => {
    setCreateResponsibilities((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]
    );
  };

  const toggleEditResponsibility = (key: AdminResponsibility) => {
    setEditResponsibilities((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-6 font-ethiopic">
      {/* Alert Notification */}
      {alertMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm transition-all ${
            alertMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {alertMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{alertMsg.text}</span>
          </div>
          <button
            onClick={() => setAlertMsg(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* General Admin Department Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-900 to-slate-900 text-white p-6 rounded-3xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-[11px] font-black tracking-wide flex items-center gap-1.5">
              ⭐ የትምህርት ክፍል ኃላፊ (ዋና አስተዳዳሪ)
            </span>
            <span className="text-xs text-slate-300">
              {generalAdminUser
                ? `${generalAdminUser.firstName} ${generalAdminUser.lastName} (@${generalAdminUser.username})`
                : user
                ? `${user.firstName} ${user.lastName} (@${user.username})`
                : '-'}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white">
            የረዳት አስተዳዳሪዎች ማኔጅመንት (Subordinate Admin Management)
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            የክፍሉን ረዳት አስተዳዳሪዎች ይመዝግቡ፤ ከ4ቱ የአስተዳደር ኃላፊነቶች (ማስታወቂያ፣ ምዝገባ፣ ኮርስ/መምህር፣ ውጤት)
            ይመድቡ ወይም ይሽሩ። ዋና አስተዳዳሪው የውጤት ማጽደቅና ይፋ የማድረግ ብቸኛ ስልጣን አለው።
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setCreateResponsibilities([]);
            setIsCreateModalOpen(true);
          }}
          className="self-start md:self-center shrink-0 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20 border border-amber-400"
        >
          <UserPlus className="w-4 h-4 mr-1.5" />
          + አዲስ ረዳት አስተዳዳሪ መዝግብ
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {RESPONSIBILITY_CONFIG.map((resp) => {
          const Icon = resp.icon;
          const assignedCount = subordinateAdmins.filter(
            (a) => a.adminResponsibilities && a.adminResponsibilities.includes(resp.key)
          ).length;
          return (
            <div
              key={resp.key}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${resp.color}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-slate-500 truncate">{resp.badge} አስተዳዳሪ</div>
                <div className="text-lg font-black text-slate-900">{assignedCount} ሰው</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Subordinate Admin Table Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search & Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-700" />
              የተመዘገቡ ረዳት አስተዳዳሪዎች ({subordinateAdmins.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              በዋና አስተዳዳሪው ስር የተመደቡ እና የሚተዳደሩ ረዳት አስተዳዳሪዎች ዝርዝር
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="በስም፣ በተጠቃሚ ስም ወይም በስልክ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">ሙሉ ስም</th>
                <th className="p-3">የተጠቃሚ ስም</th>
                <th className="p-3">ስልክ / ኢሜይል</th>
                <th className="p-3">የተመደቡ ኃላፊነቶች (4 Permitted Domains)</th>
                <th className="p-3 text-center">ሁኔታ</th>
                <th className="p-3 text-right">ተግባራት</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    ዝርዝሩ እየተጫነ ነው...
                  </td>
                </tr>
              ) : filteredSubordinates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {searchTerm ? 'በፍለጋው መስፈርት የተገኘ ረዳት አስተዳዳሪ የለም።' : 'ምንም የተመዘገበ ረዳት አስተዳዳሪ አልተገኘም።'}
                  </td>
                </tr>
              ) : (
                filteredSubordinates.map((admin, idx) => (
                  <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">
                        {admin.firstName} {admin.lastName} {admin.grandfatherName || ''}
                      </div>
                      <div className="text-[10px] text-slate-400">ረዳት አስተዳዳሪ</div>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-700">@{admin.username}</td>
                    <td className="p-3 text-slate-600">
                      <div>{admin.phone || '-'}</div>
                      <div className="text-[10px] text-slate-400">{admin.email || ''}</div>
                    </td>
                    <td className="p-3">
                      {admin.adminResponsibilities && admin.adminResponsibilities.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {admin.adminResponsibilities.map((resp) => {
                            const cfg = RESPONSIBILITY_CONFIG.find((c) => c.key === resp);
                            return (
                              <span
                                key={resp}
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                  cfg ? cfg.color : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {cfg ? cfg.badge : resp}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 italic">
                          ኃላፊነት አልተመደበም
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {admin.isActive ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                          ንቁ (Active)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px] border border-red-200">
                          የታገደ (Suspended)
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingUser(admin);
                          setEditResponsibilities((admin.adminResponsibilities as AdminResponsibility[]) || []);
                        }}
                        disabled={actionLoading}
                        className="text-[11px] font-bold"
                      >
                        <Sliders className="w-3.5 h-3.5 mr-1 text-brand-700" />
                        ኃላፊነት መድብ / ቀይር
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: REGISTER SUBORDINATE ADMIN                      */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-50 text-brand-700 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">አዲስ ረዳት አስተዳዳሪ መመዝገቢያ</h3>
                  <p className="text-[11px] text-slate-500">የአስተዳዳሪውን መረጃ ይሙሉ እና ኃላፊነት መድቡ</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ስም *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="ዮሐንስ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">የአባት ስም *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="ተስፋዬ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">የአያት ስም</label>
                  <input
                    type="text"
                    value={grandfatherName}
                    onChange={(e) => setGrandfatherName(e.target.value)}
                    placeholder="ገብሬ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    የተጠቃሚ ስም (Username) *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="yohannes_admin"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ስልክ ቁጥር</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0911223344"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ኢሜይል (አማራጭ)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@haimote.org"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">የይለፍ ቃል (አማራጭ)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ነባሪ፡ Temporary@2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Responsibilities Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-black text-slate-900">
                  የሚመደቡ ኃላፊነቶች (ከ4ቱ የተፈቀዱት ይምረጡ)
                </label>
                <div className="space-y-2">
                  {RESPONSIBILITY_CONFIG.map((resp) => {
                    const isSelected = createResponsibilities.includes(resp.key);
                    return (
                      <label
                        key={resp.key}
                        onClick={() => toggleCreateResponsibility(resp.key)}
                        className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-brand-50/70 border-brand-300 shadow-sm'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <div className="space-y-0.5">
                          <div className="text-xs font-extrabold text-slate-900">{resp.label}</div>
                          <div className="text-[10px] text-slate-500 leading-tight">
                            {resp.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={actionLoading}
                >
                  ሰርዝ
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={actionLoading}>
                  {actionLoading ? 'እየተመዘገበ ነው...' : 'አካውንቱን መዝግብ'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: UPDATE RESPONSIBILITIES                         */}
      {/* ========================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    የአስተዳዳሪ ኃላፊነቶች ማስተካከያ
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ለተጠቃሚ @{editingUser.username} ({editingUser.firstName} {editingUser.lastName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateResponsibilitiesSubmit} className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-700" />
                  የኃላፊነት አመዳደብ መመሪያ
                </div>
                <p>
                  አስተዳዳሪው እንዲያከናውን የሚፈቅዱለትን ኃላፊነቶች ይምረጡ። ሁሉንም ሳጥኖች በማንሳት (Uncheck) ኃላፊነቶችን
                  በሙሉ መሻር ይችላሉ።
                </p>
              </div>

              <div className="space-y-2">
                {RESPONSIBILITY_CONFIG.map((resp) => {
                  const isSelected = editResponsibilities.includes(resp.key);
                  return (
                    <label
                      key={resp.key}
                      onClick={() => toggleEditResponsibility(resp.key)}
                      className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-50/70 border-purple-300 shadow-sm'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="space-y-0.5">
                        <div className="text-xs font-extrabold text-slate-900">{resp.label}</div>
                        <div className="text-[10px] text-slate-500 leading-tight">
                          {resp.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditResponsibilities([])}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 underline"
                >
                  ሁሉንም ኃላፊነቶች ሽር (Revoke All)
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setEditingUser(null)}
                    disabled={actionLoading}
                  >
                    ሰርዝ
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={actionLoading}>
                    {actionLoading ? 'እየተስተካከለ ነው...' : 'ኃላፊነቶችን አጽድቅ'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagementSection;
