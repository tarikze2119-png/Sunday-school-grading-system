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
  BookOpen, 
  Phone, 
  Layers, 
  Calendar 
} from 'lucide-react';

export const TeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [spiritualTitle, setSpiritualTitle] = useState('መምህር');
  const [qualification, setQualification] = useState('');
  const [specialization, setSpecialization] = useState('ነገረ ሃይማኖት');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await teacherService.register({
        firstName,
        lastName,
        spiritualTitle,
        qualification,
        specialization,
        phone,
        email,
      });
      setMsg({ type: 'success', text: res.message });
      setIsRegisterOpen(false);
      setFirstName('');
      setLastName('');
      setQualification('');
      setPhone('');
      setEmail('');
      fetchTeachers();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
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
            መምህራንን ይመዝግቡ፤ የመንፈሳዊ ማዕረግና የትምህርት ዘርፍ ይመድቡ፤ የተሰጧቸውን የኮርስ ምደባዎች ይከታተሉ
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

      {/* Teachers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teachers.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 hover:border-emerald-400 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                  {t.teacherCode}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">
                  <span className="text-gold-600 text-sm mr-1 font-semibold">{t.spiritualTitle}</span>
                  {t.user.firstName} {t.user.lastName}
                </h3>
                <span className="inline-block text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded mt-1">
                  ዘርፍ፡ {t.specialization || 'አጠቃላይ'}
                </span>
              </div>
              <div>
                {t.user.isActive ? (
                  <Badge variant="approved">ንቁ</Badge>
                ) : (
                  <Badge variant="rejected">የታገደ</Badge>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                <Phone className="w-3.5 h-3.5" />
                <span>{t.user.phone || 'ስልክ አልተመዘገበም'}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">@{t.user.username}</div>
            </div>

            {/* Course Assignments List */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">የተመደቡባቸው ኮርሶች:</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
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
        ))}
      </div>

      {/* Modal: Register Teacher */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">አዲስ መምህር መመዝገቢያ</h3>
              <p className="text-xs text-slate-500">የመምህሩን ማዕረግ፣ የግል መረጃ እና የትምህርት ዘርፍ ያስገቡ</p>
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
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
