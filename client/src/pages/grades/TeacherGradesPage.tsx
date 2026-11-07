import React, { useState, useEffect } from 'react';
import { 
  TeacherCourseCard, 
  CourseOfferingGradeSheet, 
  GradeSubmissionStatus 
} from '../../types/grade.types';
import gradeService from '../../services/gradeService';
import AssessmentConfigModal from '../../components/grades/AssessmentConfigModal';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { toEthiopianDateString } from '../../utils/ethiopianCalendar';
import { 
  BookOpen, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Send, 
  ArrowLeft, 
  Sliders, 
  FileSpreadsheet, 
  Info,
  Smartphone,
  LayoutGrid,
  ShieldCheck
} from 'lucide-react';

export const TeacherGradesPage: React.FC = () => {
  const [courses, setCourses] = useState<TeacherCourseCard[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<CourseOfferingGradeSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Assessment Config Modal
  const [configOffering, setConfigOffering] = useState<{ id: string; title: string } | null>(null);

  // View mode on grade sheet (matrix vs mobile card)
  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('matrix');

  // Local draft scores state: Map of enrollmentId -> { [assessmentId]: score }
  const [draftScores, setDraftScores] = useState<
    Record<string, Record<string, { score: number; exempt: boolean; feedback?: string }>>
  >({});

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gradeService.getTeacherAssignedCourses();
      setCourses(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'የመምህሩን የኮርስ ዝርዝር መጫን አልተቻለም።');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const loadGradeSheet = async (offeringId: string) => {
    try {
      setSheetLoading(true);
      setError(null);
      setSelectedOfferingId(offeringId);
      const data = await gradeService.getOfferingGradeSheet(offeringId);
      setSheet(data);

      // Initialize draft scores map from loaded data
      const scoresMap: Record<
        string,
        Record<string, { score: number; exempt: boolean; feedback?: string }>
      > = {};

      for (const student of data.students) {
        scoresMap[student.enrollmentId] = {};
        for (const [assessmentId, grade] of Object.entries(student.grades)) {
          scoresMap[student.enrollmentId][assessmentId] = {
            score: grade.scoreObtained,
            exempt: grade.isExempt,
            feedback: grade.feedback,
          };
        }
      }
      setDraftScores(scoresMap);
    } catch (err: any) {
      setError(err.response?.data?.message || 'የውጤት ሰነዱን መጫን አልተቻለም።');
    } finally {
      setSheetLoading(false);
    }
  };

  const handleScoreChange = (
    enrollmentId: string,
    assessmentId: string,
    valStr: string,
    maxScore: number
  ) => {
    const val = parseFloat(valStr);
    const score = isNaN(val) ? 0 : val;

    if (score < 0 || score > maxScore) {
      return; // prevent out of bound entry
    }

    setDraftScores((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...(prev[enrollmentId] || {}),
        [assessmentId]: {
          score,
          exempt: false,
          feedback: prev[enrollmentId]?.[assessmentId]?.feedback,
        },
      },
    }));
  };

  const calculateStudentTotal = (
    enrollmentId: string,
    assessments: CourseOfferingGradeSheet['assessments']
  ): { total: number; letter: string; amharicLabel: string } => {
    const studentGrades = draftScores[enrollmentId] || {};
    let weightedSum = 0;

    for (const a of assessments) {
      const g = studentGrades[a.id];
      if (g && !g.exempt && a.maxScore > 0) {
        weightedSum += (g.score / a.maxScore) * a.weightPercentage;
      }
    }

    const total = Math.round(weightedSum * 100) / 100;
    const scales = sheet?.gradingScales || [];
    const matched =
      scales.find((s) => total >= Number(s.minScore) && total <= Number(s.maxScore)) ||
      scales[scales.length - 1];

    return {
      total,
      letter: matched?.letterGrade || 'F',
      amharicLabel: matched?.amharicLabel || 'የሚሻሻል',
    };
  };

  const handleSaveDraft = async () => {
    if (!selectedOfferingId || !sheet) return;

    try {
      setSaving(true);
      setError(null);

      const items: Array<{
        enrollmentId: string;
        assessmentId: string;
        scoreObtained: number;
        feedback?: string;
        isExempt?: boolean;
      }> = [];

      for (const [enrollmentId, assessmentsMap] of Object.entries(draftScores)) {
        for (const [assessmentId, grade] of Object.entries(assessmentsMap)) {
          items.push({
            enrollmentId,
            assessmentId,
            scoreObtained: grade.score,
            isExempt: grade.exempt,
            feedback: grade.feedback,
          });
        }
      }

      const res = await gradeService.saveDraftGrades(selectedOfferingId, items);
      setSuccess(res.message);
      setTimeout(() => setSuccess(null), 3000);
      await loadGradeSheet(selectedOfferingId);
      await fetchCourses();
    } catch (err: any) {
      setError(err.response?.data?.message || 'ረቂቅ ውጤቱን ማስቀመጥ አልተቻለም።');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!selectedOfferingId || !sheet) return;

    if (Math.round(sheet.totalWeight) !== 100) {
      setError(
        `ውጤት ለማጽደቅ ከማቅረብዎ በፊት የምዘና መስፈርቶች ድምር 100% መሆን አለበት። የአሁኑ ድምር ${sheet.totalWeight}% ነው።`
      );
      return;
    }

    if (
      !window.confirm(
        'የተማሪዎችን ውጤት ለማጽደቅ ለአስተዳዳሪው ማቅረብ ይፈልጋሉ? ከቀረበ በኋላ አስተዳዳሪው እስኪመረምረው ድረስ ውጤት መቀየር አይቻልም።'
      )
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      // Auto-save any current draft first
      await handleSaveDraft();

      const res = await gradeService.submitGradesForApproval(selectedOfferingId);
      setSuccess(res.message);
      setTimeout(() => setSuccess(null), 4000);
      await loadGradeSheet(selectedOfferingId);
      await fetchCourses();
    } catch (err: any) {
      setError(err.response?.data?.message || 'ውጤቱን ለማጽደቅ ማቅረብ አልተቻለም።');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: GradeSubmissionStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="success">የታተመ (ይፋ የሆነ)</Badge>;
      case 'APPROVED':
        return <Badge variant="success">የጸደቀ</Badge>;
      case 'SUBMITTED':
        return <Badge variant="info">ለማጽደቅ የቀረበ</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">ውድቅ የተደረገ (ማስተካከያ)</Badge>;
      case 'DRAFT':
        return <Badge variant="warning">ረቂቅ</Badge>;
      default:
        return <Badge variant="neutral">ያልተጀመረ</Badge>;
    }
  };

  // ====================================================
  // VIEW 1: Teacher Course Offerings Dashboard (Card Grid)
  // ====================================================
  if (!selectedOfferingId) {
    const assignedCoursesCount = courses.length;
    const assignedBatchesCount = new Set(courses.map((c) => c.batchId)).size;
    const totalStudentsCount = courses.reduce((sum, c) => sum + c.enrolledStudentsCount, 0);
    const pendingEntryCount = courses.filter(
      (c) =>
        c.submissionStatus === 'DRAFT' ||
        c.submissionStatus === 'NOT_STARTED' ||
        c.submissionStatus === 'REJECTED'
    ).length;
    const upcomingDeadlinesCount = courses.filter((c) => !c.isOverdue && c.gradeDeadline).length;
    const approvedCount = courses.filter(
      (c) => c.submissionStatus === 'APPROVED' || c.submissionStatus === 'PUBLISHED'
    ).length;

    return (
      <div className="space-y-6 font-ethiopic">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-md border border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-400/30">
              የመምህራን ማዕከል
            </span>
            <h1 className="text-xl sm:text-2xl font-black mt-2">የተመደቡ ኮርሶች እና የተማሪዎች ውጤት መዝገብ</h1>
            <p className="text-xs text-emerald-200 mt-1">
              የሚያስተምሯቸውን ኮርሶች ይምረጡ፣ የምዘና ነጥቦችን ይመዝግቡ፣ ረቂቅ ያስቀምጡ እና ለማጽደቅ ለአስተዳዳሪ ያቅርቡ።
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" /> የተመደቡ ኮርሶች፦ {assignedCoursesCount}
            </span>
          </div>
        </div>

        {/* 6 Teacher Dashboard Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 block">የተመደቡ ኮርሶች</span>
            <div className="text-xl font-black text-slate-900">{assignedCoursesCount}</div>
            <p className="text-[10px] text-slate-400">በኃላፊነት የተያዙ</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 block">የተመደቡ ምድቦች</span>
            <div className="text-xl font-black text-brand-700">{assignedBatchesCount}</div>
            <p className="text-[10px] text-slate-400">የትምህርት ክፍሎች</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 block">የተማሪዎች ብዛት</span>
            <div className="text-xl font-black text-slate-900">{totalStudentsCount}</div>
            <p className="text-[10px] text-slate-400">በኮርሶቹ የተመዘገቡ</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm space-y-1 bg-amber-50/20">
            <span className="text-[11px] font-bold text-amber-700 block">ያልተሞሉ ውጤቶች</span>
            <div className="text-xl font-black text-amber-900">{pendingEntryCount}</div>
            <p className="text-[10px] text-amber-600">ውጤት የሚጠብቁ</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 block">ቀነ ገደቦች</span>
            <div className="text-xl font-black text-blue-700">{upcomingDeadlinesCount}</div>
            <p className="text-[10px] text-slate-400">ክፍት ቀኖች</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm space-y-1 bg-emerald-50/20">
            <span className="text-[11px] font-bold text-emerald-700 block">የጸደቁ / የታተሙ</span>
            <div className="text-xl font-black text-emerald-900">{approvedCount}</div>
            <p className="text-[10px] text-emerald-600">የተጠናቀቁ ኮርሶች</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">ኮርሶች እየተጫኑ ነው...</div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">እስካሁን የተመደበልዎት ኮርስ የለም</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              ለእርስዎ የተመደበ የኮርስ ማስተማሪያ ምደባ አልተገኘም። እባክዎ የሰንበት ት/ቤቱን አካዳሚክ አስተዳዳሪ ያነጋግሩ።
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course) => {
              const deadlineDate = course.gradeDeadline ? new Date(course.gradeDeadline) : null;
              const ethiopianDeadline = deadlineDate ? toEthiopianDateString(deadlineDate) : 'አልተወሰነም';

              return (
                <div
                  key={course.offeringId}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-5 space-y-4">
                    {/* Top Status & Code */}
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-mono text-[11px] rounded-lg font-bold">
                        {course.courseCode}
                      </span>
                      {getStatusBadge(course.submissionStatus)}
                    </div>

                    {/* Course Title & Batch */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                        {course.courseName}
                      </h3>
                      <p className="text-xs text-brand-700 font-medium mt-0.5">
                        {course.batchName} ({course.stageLevel})
                      </p>
                    </div>

                    {/* Meta Details */}
                    <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> የትምህርት ዘመን፦
                        </span>
                        <strong className="text-slate-800">{course.academicYearName}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" /> የተመዘገቡ ተማሪዎች፦
                        </span>
                        <strong className="text-slate-800">{course.enrolledStudentsCount} ተማሪዎች</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-slate-400" /> የተመደበ መመዘኛ፦
                        </span>
                        <span className="font-bold text-brand-800 truncate max-w-[170px]">
                          {course.appliedScheme?.name || 'መደበኛ ምዘና'}{' '}
                          {course.appliedScheme?.versionNumber
                            ? `(ቅጂ ${course.appliedScheme.versionNumber})`
                            : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400" /> የምዘና ክፍሎች፦
                        </span>
                        <span
                          className={`font-bold ${
                            course.totalWeight === 100 ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {course.assessmentsCount} መስፈርቶች ({course.totalWeight}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> የማስረከቢያ ቀን፦
                        </span>
                        <span
                          className={`font-bold ${
                            course.isOverdue ? 'text-red-600' : 'text-slate-700'
                          }`}
                        >
                          {ethiopianDeadline}
                        </span>
                      </div>
                    </div>

                    {/* Rejection Alert if rejected */}
                    {course.submissionStatus === 'REJECTED' && course.rejectionReason && (
                      <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px]">
                        <strong>የተጠየቀ ማስተካከያ፦</strong> {course.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() =>
                        setConfigOffering({ id: course.offeringId, title: course.courseName })
                      }
                      className="px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5" /> መስፈርቶች
                    </button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => loadGradeSheet(course.offeringId)}
                    >
                      ውጤት መዝግብ &rarr;
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Assessment Config Modal */}
        {configOffering && (
          <AssessmentConfigModal
            offeringId={configOffering.id}
            courseTitle={configOffering.title}
            onClose={() => setConfigOffering(null)}
            onSaved={fetchCourses}
          />
        )}
      </div>
    );
  }

  // ====================================================
  // VIEW 2: Grade Entry Sheet (Matrix / Mobile Cards)
  // ====================================================
  const offering = sheet?.offering;
  const assessments = sheet?.assessments || [];
  const students = sheet?.students || [];
  const latestSub = sheet?.latestSubmission;
  const isReadOnly =
    latestSub?.status === 'SUBMITTED' ||
    latestSub?.status === 'APPROVED' ||
    latestSub?.status === 'PUBLISHED' ||
    offering?.isLocked;

  return (
    <div className="space-y-6 font-ethiopic">
      {/* Top Navigation & Status Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedOfferingId(null);
              setSheet(null);
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="ወደ ኮርሶች ዝርዝር ተመለስ"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-brand-50 text-brand-800 text-xs font-bold rounded">
                {offering?.courseCode}
              </span>
              <h1 className="text-lg font-bold text-slate-900">{offering?.courseName}</h1>
              {latestSub && getStatusBadge(latestSub.status)}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {offering?.academicYearName} • {offering?.batchName} • {students.length} ተማሪዎች • የመጨረሻ ቀን፦{' '}
              {offering?.gradeDeadline
                ? toEthiopianDateString(new Date(offering.gradeDeadline))
                : 'አልተወሰነም'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle (Matrix vs Mobile Cards) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'matrix' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> ሰንጠረዥ (Matrix)
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> የካርድ እይታ
            </button>
          </div>

          {sheet?.appliedScheme && (
            <span className="hidden sm:flex px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-900 items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {sheet.appliedScheme.name} (ቅጂ {sheet.appliedScheme.versionNumber})
              </span>
            </span>
          )}

          {!isReadOnly && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveDraft}
                loading={saving}
              >
                <Save className="w-3.5 h-3.5 mr-1" /> ረቂቅ አስቀምጥ
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitForApproval}
                loading={submitting}
              >
                <Send className="w-3.5 h-3.5 mr-1" /> ለማጽደቅ አቅርብ
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Applied Grading Scheme Header Banner */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-indigo-700 shrink-0" />
          <div>
            <h4 className="font-bold text-sm text-indigo-950">
              የተመደበ መመዘኛ፦ {sheet?.appliedScheme?.name || 'መደበኛ ምዘና'}{' '}
              {sheet?.appliedScheme?.versionNumber ? `(ቅጂ ${sheet.appliedScheme.versionNumber})` : ''}
            </h4>
            <p className="text-[11px] text-indigo-700 mt-0.5">
              የዚህ ኮርስ የምዘና መስፈርቶችና የክብደት መጠኖች በአስተዳዳሪው በተመደበው መመዘኛ የተወሰኑ ናቸው።
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 self-start sm:self-auto">
          {assessments.map((a) => (
            <span
              key={a.id}
              className="bg-white px-2.5 py-1 rounded-xl border border-indigo-200 text-indigo-950 font-bold text-[11px] shadow-sm"
            >
              {a.name}፦ <strong>{a.weightPercentage}%</strong>{' '}
              <span className="text-indigo-400 font-normal">/ {a.maxScore}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Alerts & Banners */}
      {latestSub?.status === 'REJECTED' && latestSub.rejectionReason && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">ውጤቱ ውድቅ ተደርጎ ማስተካከያ ተጠይቋል</h4>
            <p className="mt-1">
              <strong>የአስተዳዳሪው ምክንያት፦</strong> {latestSub.rejectionReason}
            </p>
            <p className="text-[11px] text-red-600 mt-1">
              እባክዎ የተጠየቀውን ማስተካከያ ካደረጉ በኋላ 'ለማጽደቅ አቅርብ' የሚለውን በመጫን በድጋሚ ያስረክቡ።
            </p>
          </div>
        </div>
      )}

      {latestSub?.status === 'SUBMITTED' && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">የውጤት ሰነዱ ለማጽደቅ ቀርቧል</h4>
            <p className="mt-1">
              ውጤቱ በአስተዳዳሪው እየተገመገመ ነው። አስተዳዳሪው እስኪያጸድቀው ወይም ማስተካከያ እስኪጠይቅ ድረስ የውጤት ለውጥ ማድረግ አይቻልም።
            </p>
          </div>
        </div>
      )}

      {(latestSub?.status === 'APPROVED' || latestSub?.status === 'PUBLISHED') && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">
              {latestSub.status === 'PUBLISHED' ? 'ውጤቱ በይፋ ታትሟል' : 'ውጤቱ ጸድቋል'}
            </h4>
            <p className="mt-1">
              ይህ የውጤት ሰነድ በይፋ የጸደቀ ስለሆነ የተማሪዎች ውጤት የተጠበቀ ነው። ለውጥ ለማድረግ የአስተዳዳሪ ልዩ ዳግም መክፈቻ ያስፈልጋል።
            </p>
          </div>
        </div>
      )}

      {offering?.isLocked && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">የማስረከቢያ ጊዜው አልቋል (ውጤት ማስገቢያ ተዘግቷል)</h4>
            <p className="mt-1">
              የውጤት ማስረከቢያ የመጨረሻ ቀን በማለፉ ምክንያት አዲስ ውጤት ማስገባት አይቻልም። ጊዜው እንዲራዘም እባክዎ አስተዳዳሪውን ያነጋግሩ።
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {sheetLoading ? (
        <div className="py-16 text-center text-xs text-slate-400">የውጤት ሰነዱ እየተጫነ ነው...</div>
      ) : assessments.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
          <Sliders className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">የምዘና መስፈርቶች አልተዋቀሩም</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            ውጤት ከመመዝገብዎ በፊት ለዚህ ኮርስ የምዘና መስፈርቶችን (ክብደትና ከፍተኛ ውጤት) ማዋቀር አለብዎት።
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              setConfigOffering({ id: selectedOfferingId, title: offering?.courseName || '' })
            }
          >
            የምዘና መስፈርቶችን አዋቅር &rarr;
          </Button>
        </div>
      ) : viewMode === 'matrix' ? (
        /* SPREADSHEET MATRIX VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3 w-32">የመለያ ቁጥር</th>
                  <th className="p-3 min-w-[180px]">ሙሉ ስም</th>
                  <th className="p-3 min-w-[120px]">የክርስትና ስም</th>

                  {/* Assessment Columns */}
                  {assessments.map((a) => (
                    <th key={a.id} className="p-3 text-center min-w-[120px] bg-brand-50/40">
                      <div>{a.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        ከ {a.maxScore} ({a.weightPercentage}%)
                      </div>
                    </th>
                  ))}

                  <th className="p-3 text-center w-24 bg-slate-100">አጠቃላይ (100%)</th>
                  <th className="p-3 text-center w-24 bg-slate-100">ደረጃ (Grade)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student, idx) => {
                  const calculated = calculateStudentTotal(student.enrollmentId, assessments);

                  return (
                    <tr
                      key={student.enrollmentId}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-slate-700">
                        {student.admissionNumber}
                      </td>
                      <td className="p-3 font-bold text-slate-900">{student.fullName}</td>
                      <td className="p-3 text-slate-600">{student.baptismalName || '-'}</td>

                      {/* Assessment Inputs */}
                      {assessments.map((a) => {
                        const gradeData = draftScores[student.enrollmentId]?.[a.id];
                        const scoreVal = gradeData?.score !== undefined ? gradeData.score : '';

                        return (
                          <td key={a.id} className="p-2 text-center bg-brand-50/10">
                            <input
                              type="number"
                              min="0"
                              max={a.maxScore}
                              step="0.5"
                              disabled={isReadOnly}
                              value={scoreVal}
                              onChange={(e) =>
                                handleScoreChange(
                                  student.enrollmentId,
                                  a.id,
                                  e.target.value,
                                  a.maxScore
                                )
                              }
                              className={`w-20 px-2 py-1.5 text-center text-xs font-bold rounded-lg border focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all ${
                                isReadOnly
                                  ? 'bg-slate-100 text-slate-500 border-slate-200'
                                  : 'bg-white border-slate-300 text-slate-900 shadow-sm'
                              }`}
                              placeholder={`0 - ${a.maxScore}`}
                            />
                          </td>
                        );
                      })}

                      {/* Total Score */}
                      <td className="p-3 text-center font-bold text-slate-900 bg-slate-50/60 text-sm">
                        {calculated.total}
                      </td>

                      {/* Letter Grade */}
                      <td className="p-3 text-center bg-slate-50/60">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                            calculated.letter.startsWith('A')
                              ? 'bg-emerald-100 text-emerald-800'
                              : calculated.letter === 'B'
                              ? 'bg-blue-100 text-blue-800'
                              : calculated.letter === 'C'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {calculated.letter}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MOBILE TOUCH CARDS VIEW */
        <div className="space-y-4">
          {students.map((student, idx) => {
            const calculated = calculateStudentTotal(student.enrollmentId, assessments);

            return (
              <div
                key={student.enrollmentId}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 font-bold">
                      #{idx + 1} • {student.admissionNumber}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{student.fullName}</h3>
                    {student.baptismalName && (
                      <p className="text-xs text-brand-700">ክርስትና፦ {student.baptismalName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-slate-900">
                      {calculated.total} / 100
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        calculated.letter.startsWith('A')
                          ? 'bg-emerald-100 text-emerald-800'
                          : calculated.letter === 'B'
                          ? 'bg-blue-100 text-blue-800'
                          : calculated.letter === 'C'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {calculated.letter} ({calculated.amharicLabel})
                    </span>
                  </div>
                </div>

                {/* Score Input Row for Each Assessment */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                  {assessments.map((a) => {
                    const gradeData = draftScores[student.enrollmentId]?.[a.id];
                    const scoreVal = gradeData?.score !== undefined ? gradeData.score : '';

                    return (
                      <div key={a.id} className="bg-slate-50 p-2.5 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700 truncate">{a.name}</span>
                          <span className="text-slate-400">/{a.maxScore}</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={a.maxScore}
                          step="0.5"
                          disabled={isReadOnly}
                          value={scoreVal}
                          onChange={(e) =>
                            handleScoreChange(
                              student.enrollmentId,
                              a.id,
                              e.target.value,
                              a.maxScore
                            )
                          }
                          className={`w-full px-2 py-1.5 text-center text-xs font-bold rounded-lg border focus:ring-2 focus:ring-brand-500 focus:outline-none ${
                            isReadOnly
                              ? 'bg-slate-100 text-slate-500 border-slate-200'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assessment Config Modal */}
      {configOffering && (
        <AssessmentConfigModal
          offeringId={configOffering.id}
          courseTitle={configOffering.title}
          onClose={() => setConfigOffering(null)}
          onSaved={() => loadGradeSheet(selectedOfferingId)}
        />
      )}
    </div>
  );
};

export default TeacherGradesPage;
