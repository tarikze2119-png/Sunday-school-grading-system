import React, { useState, useEffect } from 'react';
import teacherService, { TeacherListItem } from '../../services/teacherService';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { 
  Award, 
  UserPlus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Edit2, 
  Power, 
  X, 
  Mail,
  GraduationCap
} from 'lucide-react';

export const TeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherListItem | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Register Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [grandfatherName, setGrandfatherName] = useState('');
  const [spiritualTitle, setSpiritualTitle] = useState('መምህር');
  const [qualification, setQualification] = useState('');
  const [specialization, setSpecialization] = useState('ነገረ ሃይማኖት');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Form State
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editGrandfatherName, setEditGrandfatherName] = useState('');
  const [editSpiritualTitle, setEditSpiritualTitle] = useState('መምህር');
  const [editQualification, setEditQualification] = useState('');
  const [editSpecialization, setEditSpecialization] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const data = await teacherService.list({ search: searchTerm || undefined });
      setTeachers(data.teachers);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'መምህራንን መጫን አልተቻለም' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTeachers();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await teacherService.register({
        firstName,
        lastName,
        grandfatherName: grandfatherName || undefined,
        spiritualTitle,
        qualification: qualification || undefined,
        specialization,
        phone: phone || undefined,
        email: email || undefined,
      });
      setMsg({ type: 'success', text: res.message });
      setIsRegisterOpen(false);
      setFirstName('');
      setLastName('');
      setGrandfatherName('');
      setQualification('');
      setPhone('');
      setEmail('');
      fetchTeachers();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (t: TeacherListItem) => {
    setEditingTeacher(t);
    setEditFirstName(t.user.firstName || '');
    setEditLastName(t.user.lastName || '');
    setEditGrandfatherName('');
    setEditSpiritualTitle(t.spiritualTitle || 'መምህር');
    setEditQualification(t.qualification || '');
    setEditSpecialization(t.specialization || '');
    setEditPhone(t.user.phone || '');
    setEditEmail(t.user.email || '');
    setIsEditOpen(true);
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setUpdating(true);
    setMsg(null);
    try {
      const res = await teacherService.update(editingTeacher.id, {
        firstName: editFirstName,
        lastName: editLastName,
        grandfatherName: editGrandfatherName || undefined,
        spiritualTitle: editSpiritualTitle,
        qualification: editQualification || undefined,
        specialization: editSpecialization || undefined,
        phone: editPhone || undefined,
        email: editEmail || undefined,
      });
      setMsg({ type: 'success', text: res.message });
      setIsEditOpen(false);
      fetchTeachers();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = async (t: TeacherListItem) => {
    const nextStatus = !t.user.isActive;
    const actionLabel = nextStatus ? 'ማንቃት' : 'ማገድ';
    if (!window.confirm(`እርግጠኛ ነዎት የመምህር '${t.user.firstName} ${t.user.lastName}' አካውንት ${actionLabel} ይፈልጋሉ?`)) {
      return;
    }
    try {
      const res = await teacherService.toggleStatus(t.id, nextStatus);
      setMsg({ type: 'success', text: res.message });
      fetchTeachers();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || err.message });
    }
  };

  return (
    <div className="space-y-6 font-ethiopic">
      {/* Header Banner */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md w-fit">
            <Award className="w-3.5 h-3.5" />
            <span>የሰንበት ትምህርት ቤት መምህራን</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">የመምህራን እና የኮርስ ምደባዎች ዝርዝር</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            መምህራንን ይመዝግቡ፤ መረጃ ያስተካክሉ፤ የመንፈሳዊ ማዕረግና የትምህርት ዘርፍ መድበው የተሰጧቸውን የኮርስ ምደባዎች ይከታተሉ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="md" onClick={() => setIsRegisterOpen(true)}>
            <UserPlus className="w-4 h-4 mr-1.5" />
            አዲስ መምህር መዝግብ
          </Button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="በስም፣ በኮድ ወይም በዘርፍ ፈልግ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-72 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            ፈልግ
          </Button>
        </form>

        <span className="text-xs text-slate-500">
          ጠቅላላ የተመዘገቡ መምህራን፡ <strong>{teachers.length}</strong>
        </span>
      </div>

      {/* Teachers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teachers.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 hover:border-emerald-400 transition-colors flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                    {t.teacherCode}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2">
                    <span className="text-amber-700 text-sm mr-1 font-semibold">{t.spiritualTitle}</span>
                    {t.user.firstName} {t.user.lastName}
                  </h3>
                  <span className="inline-block text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded mt-1">
                    ዘርፍ፡ {t.specialization || 'አጠቃላይ'}
                  </span>
                </div>
                <div>
                  <Badge variant={t.user.isActive ? 'approved' : 'rejected'}>
                    {t.user.isActive ? 'ንቁ (Active)' : 'የታገደ (Inactive)'}
                  </Badge>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{t.user.phone || 'ስልክ አልተመዘገበም'}</span>
                </div>
                {t.user.email && (
                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{t.user.email}</span>
                  </div>
                )}
                <div className="text-[11px] text-slate-400 font-mono">@{t.user.username}</div>
              </div>

              {/* Course Assignments List */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">የተመደቡባቸው ኮርሶች:</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {t.assignments.length} ኮርሶች
                  </span>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {t.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{a.courseOffering.course.amharicTitle}</div>
                        <div className="text-[10px] text-slate-500">
                          {a.courseOffering.batch.name} ({a.courseOffering.academicYear.name})
                        </div>
                      </div>
                      {a.isPrimary && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          ዋና
                        </span>
                      )}
                    </div>
                  ))}

                  {t.assignments.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">እስካሁን የተመደበ ኮርስ የለም</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openEditModal(t)}
                className="text-xs"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                አስተካክል
              </Button>

              <Button
                variant={t.user.isActive ? 'outline' : 'secondary'}
                size="sm"
                onClick={() => handleToggleStatus(t)}
                className="text-xs"
              >
                <Power className="w-3.5 h-3.5 mr-1" />
                {t.user.isActive ? 'አግድ' : 'አንቃ'}
              </Button>
            </div>
          </div>
        ))}

        {teachers.length === 0 && !loading && (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300 space-y-3">
            <Award className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="font-bold text-slate-800">ምንም መምህር አልተገኘም</h4>
            <p className="text-xs text-slate-500">አዲስ መምህር ለመመዝገብ ከላይ ያለውን አዝራር ይጠቀሙ</p>
          </div>
        )}
      </div>

      {/* Modal: Edit Teacher Profile */}
      {isEditOpen && editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {editingTeacher.teacherCode}
                  </span>
                  <Badge variant={editingTeacher.user.isActive ? 'approved' : 'rejected'}>
                    {editingTeacher.user.isActive ? 'ንቁ' : 'የታገደ'}
                  </Badge>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mt-1">የመምህር መረጃ ማሻሻያ</h3>
                <p className="text-xs text-slate-500">የመምህሩን ስም፣ ማዕረግ፣ ዘርፍ ወይም አድራሻ ያስተካክሉ (የመምህር መለያ ኮድ አይቀየርም)</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTeacher} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">መንፈሳዊ ማዕረግ *</label>
                  <select
                    value={editSpiritualTitle}
                    onChange={(e) => setEditSpiritualTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                  >
                    <option value="መምህር">መምህር</option>
                    <option value="ዲያቆን">ዲያቆን</option>
                    <option value="ቀሲስ">ቀሲስ</option>
                    <option value="ሊቀ ጠበብት">ሊቀ ጠበብት</option>
                    <option value="መጋቤ ሐዲስ">መጋቤ ሐዲስ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የትምህርት ዘርፍ (Specialization) *</label>
                  <input
                    type="text"
                    required
                    value={editSpecialization}
                    onChange={(e) => setEditSpecialization(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">መጠሪያ ስም *</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የአባት ስም *</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የአያት ስም</label>
                  <input
                    type="text"
                    value={editGrandfatherName}
                    onChange={(e) => setEditGrandfatherName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የትምህርት ደረጃ (Qualification)</label>
                  <input
                    type="text"
                    value={editQualification}
                    onChange={(e) => setEditQualification(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ስልክ ቁጥር</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ኢሜይል</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                  ሰርዝ
                </Button>
                <Button type="submit" variant="primary" size="md" isLoading={updating}>
                  ለውጦችን መዝግብ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register Teacher */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">አዲስ መምህር መመዝገቢያ</h3>
                <p className="text-xs text-slate-500">የመምህሩን ማዕረግ፣ የግል መረጃ እና የትምህርት ዘርፍ ያስገቡ</p>
              </div>
              <button onClick={() => setIsRegisterOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">መንፈሳዊ ማዕረግ *</label>
                  <select
                    value={spiritualTitle}
                    onChange={(e) => setSpiritualTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                  >
                    <option value="መምህር">መምህር</option>
                    <option value="ዲያቆን">ዲያቆን</option>
                    <option value="ቀሲስ">ቀሲስ</option>
                    <option value="ሊቀ ጠበብት">ሊቀ ጠበብት</option>
                    <option value="መጋቤ ሐዲስ">መጋቤ ሐዲስ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የትምህርት ዘርፍ (Specialization) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ለምሳሌ፡ ነገረ ሃይማኖት፣ ዜማ፣ ታሪክ"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">መጠሪያ ስም *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የአባት ስም *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የአያት ስም</label>
                  <input
                    type="text"
                    value={grandfatherName}
                    onChange={(e) => setGrandfatherName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የትምህርት ደረጃ (Qualification)</label>
                  <input
                    type="text"
                    placeholder="ለምሳሌ፡ የነገረ መለኮት ድግሪ / ዲፕሎማ"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ስልክ ቁጥር</label>
                  <input
                    type="text"
                    placeholder="+2519..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ኢሜይል</label>
                  <input
                    type="email"
                    placeholder="teacher@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsRegisterOpen(false)}>
                  ሰርዝ
                </Button>
                <Button type="submit" variant="primary" size="md" isLoading={submitting}>
                  መምህሩን መዝግብ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeachersPage;
