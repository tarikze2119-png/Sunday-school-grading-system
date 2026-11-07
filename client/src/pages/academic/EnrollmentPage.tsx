import React, { useState, useEffect } from 'react';
import enrollmentService, { EnrolledStudentData } from '../../services/enrollmentService';
import courseService, { CourseOfferingData } from '../../services/courseService';
import academicService, { AcademicYearData, BatchData } from '../../services/academicService';
import studentService, { StudentListItem } from '../../services/studentService';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { 
  UserCheck, 
  Users, 
  Plus, 
  Trash2, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  Sparkles,
  Layers
} from 'lucide-react';

export const EnrollmentPage: React.FC = () => {
  const [years, setYears] = useState<AcademicYearData[]>([]);
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [offerings, setOfferings] = useState<CourseOfferingData[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudentData[]>([]);
  const [availableStudents, setAvailableStudents] = useState<StudentListItem[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isIndividualOpen, setIsIndividualOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState('');
  const [selectedEnrollmentForTransfer, setSelectedEnrollmentForTransfer] = useState<EnrolledStudentData | null>(null);
  const [targetOfferingId, setTargetOfferingId] = useState('');

  const initData = async () => {
    try {
      setLoading(true);
      const allYears = await academicService.getYears();
      setYears(allYears);
      const curr = allYears.find((y) => y.isCurrent) || allYears[0];
      const activeYear = curr?.id || '';
      setSelectedYearId(activeYear);

      if (activeYear) {
        const batchList = await academicService.getBatches(activeYear);
        setBatches(batchList);
        const activeBatch = batchList[0]?.id || '';
        setSelectedBatchId(activeBatch);

        if (activeBatch) {
          const offList = await courseService.listOfferings({
            academicYearId: activeYear,
            batchId: activeBatch,
          });
          setOfferings(offList);
          if (offList.length > 0) {
            setSelectedOfferingId(offList[0].id);
            await fetchEnrolled(offList[0].id);
          }
        }
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'መረጃዎችን መጫን አልተቻለም' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrolled = async (offeringId: string) => {
    try {
      const students = await enrollmentService.getOfferingStudents(offeringId);
      setEnrolledStudents(students);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  useEffect(() => {
    initData();
  }, []);

  const handleYearChange = async (yearId: string) => {
    setSelectedYearId(yearId);
    const bList = await academicService.getBatches(yearId);
    setBatches(bList);
    const firstB = bList[0]?.id || '';
    setSelectedBatchId(firstB);
    if (firstB) {
      const offList = await courseService.listOfferings({ academicYearId: yearId, batchId: firstB });
      setOfferings(offList);
      if (offList.length > 0) {
        setSelectedOfferingId(offList[0].id);
        fetchEnrolled(offList[0].id);
      } else {
        setSelectedOfferingId('');
        setEnrolledStudents([]);
      }
    }
  };

  const handleBatchChange = async (batchId: string) => {
    setSelectedBatchId(batchId);
    const offList = await courseService.listOfferings({ academicYearId: selectedYearId, batchId });
    setOfferings(offList);
    if (offList.length > 0) {
      setSelectedOfferingId(offList[0].id);
      fetchEnrolled(offList[0].id);
    } else {
      setSelectedOfferingId('');
      setEnrolledStudents([]);
    }
  };

  const handleOfferingChange = (offId: string) => {
    setSelectedOfferingId(offId);
    fetchEnrolled(offId);
  };

  const handleBulkEnroll = async () => {
    if (!selectedOfferingId) return;
    setBulkLoading(true);
    setMsg(null);
    try {
      const res = await enrollmentService.bulkEnrollBatch(selectedOfferingId);
      setMsg({ type: 'success', text: res.message });
      fetchEnrolled(selectedOfferingId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'በጅምላ መመዝገብ አልተቻለም' });
    } finally {
      setBulkLoading(false);
    }
  };

  const openIndividualModal = async () => {
    if (!selectedBatchId) return;
    try {
      const data = await studentService.list({ batchId: selectedBatchId, limit: 100 });
      const enrolledIds = new Set(enrolledStudents.map((e) => e.studentId));
      const notEnrolled = data.students.filter((s) => !enrolledIds.has(s.id));
      setAvailableStudents(notEnrolled);
      setSelectedStudentToEnroll(notEnrolled[0]?.id || '');
      setIsIndividualOpen(true);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleIndividualEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentToEnroll || !selectedOfferingId) return;
    try {
      const res = await enrollmentService.enrollIndividual(selectedOfferingId, selectedStudentToEnroll);
      setMsg({ type: 'success', text: res.message });
      setIsIndividualOpen(false);
      fetchEnrolled(selectedOfferingId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const openTransferModal = (enrollment: EnrolledStudentData) => {
    setSelectedEnrollmentForTransfer(enrollment);
    const otherOfferings = offerings.filter((o) => o.id !== selectedOfferingId);
    setTargetOfferingId(otherOfferings[0]?.id || '');
    setIsTransferOpen(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollmentForTransfer || !targetOfferingId) return;
    try {
      const res = await enrollmentService.transfer(
        selectedEnrollmentForTransfer.studentId,
        selectedOfferingId,
        targetOfferingId
      );
      setMsg({ type: 'success', text: res.message });
      setIsTransferOpen(false);
      fetchEnrolled(selectedOfferingId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleUnenroll = async (enrollmentId: string, studentName: string) => {
    if (!window.confirm(`እርግጠኛ ነዎት የተማሪ '${studentName}' ምዝገባ ከዚህ ኮርስ እንዲሰረዝ ይፈልጋሉ?`)) return;
    try {
      const res = await enrollmentService.unenroll(enrollmentId);
      setMsg({ type: 'success', text: res.message });
      fetchEnrolled(selectedOfferingId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const currentOffering = offerings.find((o) => o.id === selectedOfferingId);

  return (
    <div className="space-y-6 font-ethiopic">
      {/* Header Banner */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md w-fit">
            <UserCheck className="w-3.5 h-3.5" />
            <span>የተማሪዎች ኮርስ ምዝገባ</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">ተማሪዎችን በኮርሶች የመመዝገቢያ ማዕከል</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ተማሪዎችን በግል ወይም የምድቡን አባላት በሙሉ በጅምላ ይመዝግቡ፤ ድርብ ምዝገባን ይከላከሉ፤ ተማሪዎችን ያዛውሩ
          </p>
        </div>

        {selectedOfferingId && (
          <div className="flex items-center gap-2">
            <Button
              variant="gold"
              size="md"
              onClick={handleBulkEnroll}
              isLoading={bulkLoading}
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              የምድቡን ተማሪዎች በጅምላ መዝግብ (Bulk Enroll)
            </Button>

            <Button variant="primary" size="md" onClick={openIndividualModal}>
              <Plus className="w-4 h-4 mr-1.5" />
              ተማሪ በግል መዝግብ
            </Button>
          </div>
        )}
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

      {/* Filter Triad: Year -> Batch -> Course Offering */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">1. የትምህርት ዘመን (Academic Year)</label>
          <select
            value={selectedYearId}
            onChange={(e) => handleYearChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white"
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name} {y.isCurrent ? '(ዋና)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">2. የተማሪዎች ምድብ (Batch)</label>
          <select
            value={selectedBatchId}
            onChange={(e) => handleBatchChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.stageLevel})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">3. የሚመዘገብበት ኮርስ (Course Offering)</label>
          <select
            value={selectedOfferingId}
            onChange={(e) => handleOfferingChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-brand-800 bg-white"
          >
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.course.amharicTitle} ({o.termSemester}ኛ መንፈቅ)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Course Enrollment Roster Card */}
      {currentOffering ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <span className="text-[11px] font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                {currentOffering.course.code}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                የተመዘገቡ ተማሪዎች ዝርዝር ➔ {currentOffering.course.amharicTitle}
              </h3>
              <p className="text-xs text-slate-500">
                ምድብ፡ <strong>{currentOffering.batch.name}</strong> | መንፈቅ፡ <strong>{currentOffering.termSemester}ኛ</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">የተመዘገቡ ተማሪዎች ብዛት፡</span>
              <span className="text-base font-extrabold text-brand-700 bg-brand-50 px-3 py-1 rounded-xl border border-brand-200">
                {enrolledStudents.length} ተማሪዎች
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">ተ.ቁ</th>
                  <th className="px-4 py-3">የተማሪ መለያ (ID)</th>
                  <th className="px-4 py-3">ሙሉ ስም</th>
                  <th className="px-4 py-3">የክርስትና ስም</th>
                  <th className="px-4 py-3">ስልክ</th>
                  <th className="px-4 py-3">የተመዘገበበት ቀን</th>
                  <th className="px-4 py-3 text-right">ተግባራት</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrolledStudents.map((e, index) => (
                  <tr key={e.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-400 font-mono">{index + 1}</td>
                    <td className="px-4 py-3 font-mono font-bold text-brand-700">
                      {e.student.admissionNumber}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {e.student.user.firstName} {e.student.user.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{e.student.baptismalName || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">{e.student.user.phone || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {new Date(e.enrolledAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openTransferModal(e)}
                        className="text-xs"
                      >
                        <ArrowRightLeft className="w-3 h-3 mr-1" />
                        አዛውር
                      </Button>

                      <button
                        onClick={() =>
                          handleUnenroll(
                            e.id,
                            `${e.student.user.firstName} ${e.student.user.lastName}`
                          )
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="ምዝገባ ሰርዝ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {enrolledStudents.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      በዚህ ኮርስ ውስጥ የተመዘገበ ተማሪ የለም። የምድቡን ተማሪዎች በሙሉ ለመመዝገብ ከላይ ያለውን{' '}
                      <strong>"የምድቡን ተማሪዎች በጅምላ መዝግብ"</strong> አዝራር ይጠቀሙ።
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
          እባክዎ መጀመሪያ ኮርስ ይምረጡ
        </div>
      )}

      {/* Modal: Enroll Individual Student */}
      {isIndividualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">ተማሪ በግል መመዝገቢያ</h3>
              <p className="text-xs text-slate-500">
                ኮርስ፡ <strong>{currentOffering?.course.amharicTitle}</strong>
              </p>
            </div>

            <form onSubmit={handleIndividualEnroll} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  የሚመዘገበው ተማሪ ({availableStudents.length} ተማሪዎች ይገኛሉ) *
                </label>
                <select
                  required
                  value={selectedStudentToEnroll}
                  onChange={(e) => setSelectedStudentToEnroll(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                >
                  {availableStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user.firstName} {s.user.lastName} ({s.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsIndividualOpen(false)}>
                  ሰርዝ
                </Button>
                <Button type="submit" variant="primary" size="md">
                  መዝግብ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transfer Student */}
      {isTransferOpen && selectedEnrollmentForTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">ተማሪን ወደ ሌላ ኮርስ ማዛወሪያ</h3>
              <p className="text-xs text-slate-500">
                ተማሪ፡ <strong>{selectedEnrollmentForTransfer.student.user.firstName} {selectedEnrollmentForTransfer.student.user.lastName}</strong>
              </p>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">የሚዛወርበት አዲስ ኮርስ *</label>
                <select
                  required
                  value={targetOfferingId}
                  onChange={(e) => setTargetOfferingId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                >
                  {offerings
                    .filter((o) => o.id !== selectedOfferingId)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.course.amharicTitle} ({o.batch.name})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsTransferOpen(false)}>
                  ሰርዝ
                </Button>
                <Button type="submit" variant="gold" size="md">
                  አዛውር
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrollmentPage;
