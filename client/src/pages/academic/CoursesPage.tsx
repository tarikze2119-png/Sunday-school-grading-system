import React, { useState, useEffect } from 'react';
import courseService, { CourseData, CourseOfferingData } from '../../services/courseService';
import academicService, { AcademicYearData, BatchData } from '../../services/academicService';
import teacherService, { TeacherListItem } from '../../services/teacherService';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { 
  BookOpen, 
  Plus, 
  Layers, 
  UserCheck, 
  Users, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  BookmarkPlus
} from 'lucide-react';

export const CoursesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'offerings' | 'catalog'>('offerings');
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [offerings, setOfferings] = useState<CourseOfferingData[]>([]);
  const [years, setYears] = useState<AcademicYearData[]>([]);
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isAddOfferingOpen, setIsAddOfferingOpen] = useState(false);
  const [isAssignTeacherOpen, setIsAssignTeacherOpen] = useState(false);
  const [selectedOfferingForTeacher, setSelectedOfferingForTeacher] = useState<CourseOfferingData | null>(null);

  // Create Course Form
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newAmharicTitle, setNewAmharicTitle] = useState('');
  const [newCreditHours, setNewCreditHours] = useState(2);
  const [newDescription, setNewDescription] = useState('');

  // Create Offering Form
  const [offeringCourseId, setOfferingCourseId] = useState('');
  const [offeringBatchId, setOfferingBatchId] = useState('');
  const [offeringTeacherId, setOfferingTeacherId] = useState('');
  const [termSemester, setTermSemester] = useState('1');

  // Assign Teacher Form
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [isPrimaryTeacher, setIsPrimaryTeacher] = useState(true);

  const initData = async () => {
    try {
      setLoading(true);
      const [allCourses, allYears, allTeachers] = await Promise.all([
        courseService.listCourses(),
        academicService.getYears(),
        teacherService.list({ limit: 100 }),
      ]);

      setCourses(allCourses);
      setYears(allYears);
      setTeachers(allTeachers.teachers);

      const currentYear = allYears.find((y) => y.isCurrent) || allYears[0];
      const activeYear = currentYear?.id || '';
      setSelectedYearId(activeYear);

      if (activeYear) {
        const batchList = await academicService.getBatches(activeYear);
        setBatches(batchList);
      }

      await fetchOfferings(activeYear, '');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'መረጃዎችን መጫን አልተቻለም' });
    } finally {
      setLoading(false);
    }
  };

  const fetchOfferings = async (yearId?: string, batchId?: string) => {
    try {
      const data = await courseService.listOfferings({
        academicYearId: yearId || undefined,
        batchId: batchId || undefined,
      });
      setOfferings(data);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  useEffect(() => {
    initData();
  }, []);

  const handleYearChange = async (yearId: string) => {
    setSelectedYearId(yearId);
    setSelectedBatchId('');
    const batchList = await academicService.getBatches(yearId);
    setBatches(batchList);
    fetchOfferings(yearId, '');
  };

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    fetchOfferings(selectedYearId, batchId);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await courseService.createCourse({
        code: newCode,
        title: newTitle,
        amharicTitle: newAmharicTitle,
        creditHours: newCreditHours,
        description: newDescription,
      });
      setMsg({ type: 'success', text: res.message });
      setIsAddCourseOpen(false);
      setNewCode('');
      setNewTitle('');
      setNewAmharicTitle('');
      setNewDescription('');
      const updated = await courseService.listCourses();
      setCourses(updated);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleCreateOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await courseService.createOffering({
        courseId: offeringCourseId,
        academicYearId: selectedYearId,
        batchId: offeringBatchId,
        termSemester,
        primaryTeacherId: offeringTeacherId || undefined,
      });
      setMsg({ type: 'success', text: res.message });
      setIsAddOfferingOpen(false);
      fetchOfferings(selectedYearId, selectedBatchId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfferingForTeacher || !selectedTeacherId) return;
    try {
      const res = await courseService.assignTeacher(
        selectedOfferingForTeacher.id,
        selectedTeacherId,
        isPrimaryTeacher
      );
      setMsg({ type: 'success', text: res.message });
      setIsAssignTeacherOpen(false);
      fetchOfferings(selectedYearId, selectedBatchId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!window.confirm('እርግጠኛ ነዎት መምህሩ ከዚህ ኮርስ እንዲነሳ ይፈልጋሉ?')) return;
    try {
      const res = await courseService.removeTeacherAssignment(assignmentId);
      setMsg({ type: 'success', text: res.message });
      fetchOfferings(selectedYearId, selectedBatchId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6 font-ethiopic">
      {/* Header Banner */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md w-fit">
            <BookOpen className="w-3.5 h-3.5" />
            <span>የትምህርት ዓይነቶች እና የኮርስ ምደባዎች</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">የኮርሶች ካታሎግ እና የምድብ ክፍፍል</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            የሰንበት ትምህርት ቤቱን ኮርሶች ይመዝግቡ፤ በምድብ እና በትምህርት ዘመን መድበው መምህራንን ይመድቡ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'offerings' ? 'primary' : 'outline'}
            size="md"
            onClick={() => setActiveTab('offerings')}
          >
            <Layers className="w-4 h-4 mr-1.5" />
            የኮርስ ምደባዎች ({offerings.length})
          </Button>

          <Button
            variant={activeTab === 'catalog' ? 'primary' : 'outline'}
            size="md"
            onClick={() => setActiveTab('catalog')}
          >
            <BookOpen className="w-4 h-4 mr-1.5" />
            የኮርሶች ካታሎግ ({courses.length})
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

      {/* Tab 1: Course Offerings View */}
      {activeTab === 'offerings' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-xs">
                <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">የትምህርት ዘመን</label>
                <select
                  value={selectedYearId}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white"
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.isCurrent ? '(ዋና)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs">
                <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">የተማሪዎች ምድብ</label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => handleBatchChange(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white"
                >
                  <option value="">-- ሁሉም ምድቦች ({batches.length}) --</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                setOfferingBatchId(selectedBatchId || batches[0]?.id || '');
                setOfferingCourseId(courses[0]?.id || '');
                setIsAddOfferingOpen(true);
              }}
            >
              <BookmarkPlus className="w-4 h-4 mr-1.5" />
              አዲስ የኮርስ ምደባ ፍጠር
            </Button>
          </div>

          {/* Offerings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {offerings.map((o) => (
              <div
                key={o.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 hover:border-brand-500 transition-colors"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono text-brand-800 bg-brand-50 px-2 py-0.5 rounded font-bold">
                      {o.course.code}
                    </span>
                    <Badge variant="approved">{o.termSemester}ኛ መንፈቅ</Badge>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-2">{o.course.amharicTitle}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {o.batch.name} ({o.academicYear.name})
                  </p>
                </div>

                {/* Assigned Teachers */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">የተመደቡ መምህራን:</span>
                    <button
                      onClick={() => {
                        setSelectedOfferingForTeacher(o);
                        setSelectedTeacherId(teachers[0]?.id || '');
                        setIsAssignTeacherOpen(true);
                      }}
                      className="text-[11px] text-brand-700 hover:text-brand-900 font-bold flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      መምህር መድብ
                    </button>
                  </div>

                  <div className="space-y-1">
                    {o.teacherAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-200/60"
                      >
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {a.teacher.spiritualTitle || 'መምህር'} {a.teacher.user.firstName} {a.teacher.user.lastName}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveAssignment(a.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                          title="ከኮርሱ አንሳ"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {o.teacherAssignments.length === 0 && (
                      <p className="text-slate-400 italic text-[11px]">መምህር አልተመደበም</p>
                    )}
                  </div>
                </div>

                {/* Enrolled Students Metric */}
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>የተመዘገቡ ተማሪዎች፡</span>
                  </div>
                  <span className="font-bold text-slate-900 text-sm">
                    {o._count?.enrollments || 0} ተማሪዎች
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Course Catalog View */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-800 text-base">አጠቃላይ የኮርሶች ካታሎግ</h3>
              <p className="text-xs text-slate-500">በሰንበት ትምህርት ቤቱ የሚሰጡ ሁሉንም የትምህርት ዓይነቶች ያካትታል</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsAddCourseOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              አዲስ ኮርስ ጨምር
            </Button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">መለያ ኮድ</th>
                  <th className="px-4 py-3">የኮርስ መጠሪያ (በአማርኛ)</th>
                  <th className="px-4 py-3">የእንግሊዝኛ መጠሪያ</th>
                  <th className="px-4 py-3">ክሬዲት ሰዓት</th>
                  <th className="px-4 py-3">የምደባዎች ብዛት</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-bold text-brand-700">{c.code}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{c.amharicTitle}</td>
                    <td className="px-4 py-3 text-slate-600">{c.title}</td>
                    <td className="px-4 py-3 text-slate-700">{c.creditHours} ሰዓት</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                        {c._count?.offerings || 0} ክፍለ-ጊዜያት
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Catalog Course */}
      {isAddCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">አዲስ የትምህርት ዓይነት ወደ ካታሎግ ማካተቻ</h3>
              <p className="text-xs text-slate-500">የኮርሱን የአማርኛ እና የእንግሊዝኛ ስም፣ ኮድ እና ክሬዲት ያስገቡ</p>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">የአማርኛ መጠሪያ (Amharic Title) *</label>
                <input
                  type="text"
                  required
                  placeholder="ለምሳሌ፡ ነገረ ሃይማኖት ፩"
                  value={newAmharicTitle}
                  onChange={(e) => setNewAmharicTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">የእንግሊዝኛ መጠሪያ (English Title) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Christian Dogmatics 1"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የኮርስ መለያ ኮድ (Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="CRS-DOGMA-101"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ክሬዲት ሰዓት (Credit Hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={newCreditHours}
                    onChange={(e) => setNewCreditHours(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ማብራሪያ (Description)</label>
                <textarea
                  rows={2}
                  placeholder="የኮርሱ ዝርዝር ማብራሪያ..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCourseOpen(false)}>
                  ሰርዝ
                </Button>
                <Button type="submit" variant="primary" size="md">
                  ኮርሱን መዝግብ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Course Offering */}
      {isAddOfferingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">አዲስ የኮርስ ምደባ (Course Offering)</h3>
              <p className="text-xs text-slate-500">
                የትምህርት ዘመን፡ <strong>{years.find((y) => y.id === selectedYearId)?.name}</strong>
              </p>
            </div>

            <form onSubmit={handleCreateOffering} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">የትምህርት ዓይነት (Course) *</label>
                <select
                  required
                  value={offeringCourseId}
                  onChange={(e) => setOfferingCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold text-slate-800"
                >
                  <option value="">-- ኮርስ ይምረጡ --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.amharicTitle} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">የተማሪዎች ምድብ (Batch) *</label>
                <select
                  required
                  value={offeringBatchId}
                  onChange={(e) => setOfferingBatchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
                >
                  <option value="">-- ምድብ ይምረጡ --</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.stageLevel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">መንፈቅ (Term/Semester)</label>
                  <select
                    value={termSemester}
                    onChange={(e) => setTermSemester(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold"
                  >
                    <option value="1">1ኛ መንፈቅ (Term 1)</option>
                    <option value="2">2ኛ መንፈቅ (Term 2)</option>
                    <option value="ዓመታዊ">ዓመታዊ (Full Year)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ዋና መምህር (አማራጭ)</label>
                  <select
                    value={offeringTeacherId}
                    onChange={(e) => setOfferingTeacherId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">-- መምህር ይምረጡ --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.spiritualTitle} {t.user.firstName} {t.user.lastName} ({t.specialization})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOfferingOpen(false)}>
                  ሰርዝ
                </Button>
                <Button type="submit" variant="primary" size="md">
                  ምደባውን ፍጠር
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Teacher to Offering */}
      {isAssignTeacherOpen && selectedOfferingForTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">መምህር ለኮርስ መድብ</h3>
              <p className="text-xs text-slate-500">
                ኮርስ፡ <strong>{selectedOfferingForTeacher.course.amharicTitle}</strong> | ምድብ፡ <strong>{selectedOfferingForTeacher.batch.name}</strong>
              </p>
            </div>

            <form onSubmit={handleAssignTeacher} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">መምህር ይምረጡ *</label>
                <select
                  required
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                >
                  <option value="">-- መምህር ይምረጡ --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.spiritualTitle} {t.user.firstName} {t.user.lastName} ({t.teacherCode} - {t.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="primaryCheck"
                  checked={isPrimaryTeacher}
                  onChange={(e) => setIsPrimaryTeacher(e.target.checked)}
                  className="rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                />
                <label htmlFor="primaryCheck" className="font-semibold text-slate-700 cursor-pointer">
                  ዋና ኃላፊ መምህር (Primary Instructor)
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignTeacherOpen(false)}>
                  ሰርዝ
                </Button>
                <Button type="submit" variant="primary" size="md">
                  መድብ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;
