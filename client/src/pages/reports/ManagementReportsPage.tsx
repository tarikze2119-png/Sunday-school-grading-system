import React, { useState, useEffect } from 'react';
import reportService, { ReportFilterParams } from '../../services/reportService';
import academicService from '../../services/academicService';
import courseService from '../../services/courseService';
import teacherService from '../../services/teacherService';
import MultiYearTranscriptModal from '../../components/grades/MultiYearTranscriptModal';
import { StudentMultiYearHistoryResponse } from '../../types/report.types';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { 
  FileSpreadsheet, 
  Printer, 
  Filter, 
  RefreshCw, 
  Calendar, 
  Layers, 
  BookOpen, 
  Users, 
  TrendingUp, 
  Award, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { toEthiopianDateString } from '../../utils/ethiopianCalendar';

export const ManagementReportsPage: React.FC = () => {
  // Filter Options State
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Selected Filters
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    | 'students-by-year'
    | 'students-by-batch'
    | 'students-by-course'
    | 'teacher-assignments'
    | 'course-performance'
    | 'batch-performance'
    | 'student-performance'
    | 'submission-progress'
    | 'approvals-log'
  >('course-performance');

  // Report Data States
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transcript Modal State
  const [selectedStudentTranscript, setSelectedStudentTranscript] = useState<StudentMultiYearHistoryResponse | null>(null);

  // Load Filter Options
  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const [yrs, bts, crs, tchs] = await Promise.all([
          academicService.getAcademicYears().catch(() => []),
          academicService.getBatches().catch(() => []),
          courseService.getCourses().catch(() => []),
          teacherService.getTeachers().catch(() => []),
        ]);
        setAcademicYears(yrs);
        setBatches(bts);
        setCourses(crs);
        setTeachers(tchs);

        // Default to active year if available
        const currentYear = yrs.find((y: any) => y.isCurrent);
        if (currentYear) {
          setSelectedYear(currentYear.id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadFiltersData();
  }, []);

  // Fetch Report Data whenever Tab or Filters change
  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: ReportFilterParams = {
        academicYearId: selectedYear || undefined,
        batchId: selectedBatch || undefined,
        courseId: selectedCourse || undefined,
        teacherId: selectedTeacher || undefined,
        search: searchQuery || undefined,
      };

      let result: any;
      switch (activeTab) {
        case 'students-by-year':
          result = await reportService.getStudentsByAcademicYear(params);
          break;
        case 'students-by-batch':
          result = await reportService.getStudentsByBatch(params);
          break;
        case 'students-by-course':
          result = await reportService.getStudentsByCourse(params);
          break;
        case 'teacher-assignments':
          result = await reportService.getTeacherAssignments(params);
          break;
        case 'course-performance':
          result = await reportService.getCoursePerformance(params);
          break;
        case 'batch-performance':
          result = await reportService.getBatchPerformance(params);
          break;
        case 'student-performance':
          result = await reportService.getStudentPerformance(params);
          break;
        case 'submission-progress':
          result = await reportService.getSubmissionProgress(params);
          break;
        case 'approvals-log':
          result = await reportService.getApprovedAndRejectedGrades(params);
          break;
      }
      setReportData(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'ሪፖርቱን መጫን አልተቻለም።');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, selectedYear, selectedBatch, selectedCourse, selectedTeacher]);

  const handleExportCsv = async () => {
    try {
      const params: ReportFilterParams = {
        academicYearId: selectedYear || undefined,
        batchId: selectedBatch || undefined,
        courseId: selectedCourse || undefined,
        teacherId: selectedTeacher || undefined,
        search: searchQuery || undefined,
      };
      await reportService.downloadCsvReport(activeTab, params);
    } catch (err: any) {
      alert(err.message || 'ሪፖርቱን ወደ Excel ማውረድ አልተቻለም።');
    }
  };

  const handleViewStudentTranscript = async (studentId: string) => {
    try {
      const history = await reportService.getStudentAcademicHistory(studentId);
      setSelectedStudentTranscript(history);
    } catch (err: any) {
      alert(err.message || 'የተማሪውን የትምህርት ታሪክ መጫን አልተቻለም።');
    }
  };

  const tabs = [
    { key: 'course-performance', label: 'የኮርሶች አፈጻጸም', icon: TrendingUp },
    { key: 'batch-performance', label: 'የምድቦች አፈጻጸም', icon: Layers },
    { key: 'student-performance', label: 'የተማሪዎች ውጤት', icon: Award },
    { key: 'submission-progress', label: 'የውጤት ማስረከብ ሂደት', icon: Clock },
    { key: 'approvals-log', label: 'የጸደቁና ውድቅ የተደረጉ', icon: CheckCircle2 },
    { key: 'students-by-year', label: 'ተማሪዎች በትምህርት ዘመን', icon: Calendar },
    { key: 'students-by-batch', label: 'ተማሪዎች በምድብ', icon: Users },
    { key: 'students-by-course', label: 'ተማሪዎች በኮርስ', icon: BookOpen },
    { key: 'teacher-assignments', label: 'የመምህራን ምደባ', icon: FileText },
  ];

  const filteredBatches = selectedYear
    ? batches.filter((b) => b.academicYearId === selectedYear)
    : batches;

  return (
    <div className="space-y-6 font-ethiopic">
      {/* 1. Header & Quick Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-gold-300 bg-gold-500/20 px-3 py-1 rounded-full border border-gold-400/30">
            የአካዳሚክ ሪፖርቶች እና ስታቲስቲክስ ማዕከል
          </span>
          <h1 className="text-xl sm:text-2xl font-black mt-2">የሰንበት ትምህርት ቤት የውጤት እና አፈጻጸም ሪፖርቶች</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            የተማሪዎች ውጤት፣ የምድቦችና ኮርሶች አፈጻጸም፣ የመምህራን ምደባ እና የውጤት ማጽደቅ የስራ ሂደት ማጠቃለያ ሪፖርቶች።
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4" /> በExcel አውርድ (CSV)
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 border border-slate-700 transition"
          >
            <Printer className="w-4 h-4" /> አትም (Print)
          </button>
        </div>
      </div>

      {/* 2. Multi-Dimensional Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-brand-600" /> የሪፖርት ማጣሪያዎች (Filters)
          </span>
          <button
            onClick={() => {
              setSelectedYear('');
              setSelectedBatch('');
              setSelectedCourse('');
              setSelectedTeacher('');
              setSearchQuery('');
            }}
            className="text-[11px] text-slate-500 hover:text-brand-700 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> ማጣሪያዎችን አጽዳ
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Year Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">የትምህርት ዘመን</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelectedBatch('');
              }}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium"
            >
              <option value="">ሁሉም የትምህርት ዘመናት</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.isCurrent ? '(ዋና)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">የተማሪዎች ምድብ</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium"
            >
              <option value="">ሁሉም ምድቦች</option>
              {filteredBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.stageLevel})
                </option>
              ))}
            </select>
          </div>

          {/* Course Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">ኮርስ</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium"
            >
              <option value="">ሁሉም ኮርሶች</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.amharicTitle || c.title} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Teacher Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">መምህር</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium"
            >
              <option value="">ሁሉም መምህራን</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.spiritualTitle || ''} {t.user?.firstName} {t.user?.lastName} ({t.teacherCode})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Report View Tabs (Horizontal Scrollable) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-gold-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Active Report Content Section */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">ሪፖርቱ እየተጫነ ነው...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* TAB 1: Course-Wise Performance */}
          {activeTab === 'course-performance' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="py-3 px-4">የኮርስ ስም</th>
                    <th className="py-3 px-4">የትምህርት ዘመን / ምድብ</th>
                    <th className="py-3 px-4 text-center">የተመዘገቡ</th>
                    <th className="py-3 px-4 text-center">አማካይ ውጤት</th>
                    <th className="py-3 px-4 text-center">ከፍተኛ / ዝቅተኛ</th>
                    <th className="py-3 px-4 text-center">የማለፍ ምጣኔ</th>
                    <th className="py-3 px-4 text-center">ሁኔታ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!reportData || reportData.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">ምንም መረጃ አልተገኘም</td>
                    </tr>
                  ) : (
                    reportData.map((row: any) => (
                      <tr key={row.offeringId} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 block">{row.courseName}</strong>
                          <span className="font-mono text-[10px] text-slate-400">{row.courseCode}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {row.academicYearName} • {row.batchName}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {row.totalGraded} / {row.totalEnrolled}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-brand-700 font-mono">
                          {row.averageScore}%
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-600">
                          {row.highestScore}% / {row.lowestScore}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                            {row.passRate}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={row.submissionStatus === 'PUBLISHED' ? 'success' : 'neutral'}>
                            {row.submissionStatus === 'PUBLISHED' ? 'የታተመ' : row.submissionStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Batch-Wise Performance */}
          {activeTab === 'batch-performance' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="py-3 px-4">የምድብ ስም</th>
                    <th className="py-3 px-4">የትምህርት ዘመን</th>
                    <th className="py-3 px-4 text-center">የተማሪ ብዛት</th>
                    <th className="py-3 px-4 text-center">የኮርስ ብዛት</th>
                    <th className="py-3 px-4 text-center">አማካይ ውጤት</th>
                    <th className="py-3 px-4 text-center">የማለፍ ምጣኔ</th>
                    <th className="py-3 px-4">ከፍተኛ ውጤት ያስመዘገቡ ተማሪዎች</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!reportData || reportData.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">ምንም መረጃ አልተገኘም</td>
                    </tr>
                  ) : (
                    reportData.map((row: any) => (
                      <tr key={row.batchId} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 block">{row.batchName}</strong>
                          <span className="text-[10px] text-slate-400">{row.stageLevel}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{row.academicYearName}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">{row.totalStudents}</td>
                        <td className="py-3 px-4 text-center text-slate-700">{row.totalCourses}</td>
                        <td className="py-3 px-4 text-center font-bold text-brand-700 font-mono">{row.averageScore}%</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                            {row.passRate}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {row.topStudents?.map((s: any, idx: number) => (
                              <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-700 font-medium">
                                #{idx + 1} {s.fullName} ({s.average}%)
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: Student Performance & Multi-Year Transcript Action */}
          {activeTab === 'student-performance' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="py-3 px-4">መለያ</th>
                    <th className="py-3 px-4">የተማሪ ስም</th>
                    <th className="py-3 px-4">የትምህርት ዘመን / ምድብ</th>
                    <th className="py-3 px-4 text-center">የተጠናቀቁ ኮርሶች</th>
                    <th className="py-3 px-4 text-center">ክሬዲት</th>
                    <th className="py-3 px-4 text-center">GPA</th>
                    <th className="py-3 px-4">ማዕረግ</th>
                    <th className="py-3 px-4 text-center">ይፋዊ ታሪክ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!reportData || reportData.length === 0) ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">ምንም መረጃ አልተገኘም</td>
                    </tr>
                  ) : (
                    reportData.map((row: any) => (
                      <tr key={row.studentId} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-mono font-bold text-slate-600">{row.admissionNumber}</td>
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 block">{row.fullName}</strong>
                          {row.baptismalName && <span className="text-[10px] text-gold-600">({row.baptismalName})</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {row.academicYearName} • {row.batchName}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {row.completedCoursesCount} / {row.totalEnrolledCourses}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">{row.totalEarnedCredits}</td>
                        <td className="py-3 px-4 text-center font-black text-emerald-700 font-mono text-sm">
                          {row.gpa.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-slate-700 text-[11px] font-medium">{row.distinction}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleViewStudentTranscript(row.studentId)}
                            className="px-3 py-1 bg-gold-600 hover:bg-gold-700 text-slate-950 font-bold rounded-lg text-[11px] transition shadow-sm inline-flex items-center gap-1"
                          >
                            <Award className="w-3.5 h-3.5" /> ትራንስክሪፕት
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: Grade Submission Progress */}
          {activeTab === 'submission-progress' && reportData && (
            <div className="p-6 space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold block">ጠቅላላ ኮርሶች</span>
                  <strong className="text-xl font-black text-slate-900">{reportData.summary.TOTAL}</strong>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 font-bold block">የጸደቁ / የታተሙ</span>
                  <strong className="text-xl font-black text-emerald-900">
                    {reportData.summary.APPROVED + reportData.summary.PUBLISHED}
                  </strong>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[10px] text-blue-700 font-bold block">ለማጽደቅ የቀረቡ</span>
                  <strong className="text-xl font-black text-blue-900">{reportData.summary.SUBMITTED}</strong>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] text-amber-700 font-bold block">ረቂቅ (Draft)</span>
                  <strong className="text-xl font-black text-amber-900">{reportData.summary.DRAFT}</strong>
                </div>
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <span className="text-[10px] text-red-700 font-bold block">ውድቅ የተደረጉ</span>
                  <strong className="text-xl font-black text-red-900">{reportData.summary.REJECTED}</strong>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 text-white">
                  <span className="text-[10px] text-gold-400 font-bold block">የማጠናቀቂያ ምጣኔ</span>
                  <strong className="text-xl font-black text-white">{reportData.summary.completionRate}</strong>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                      <th className="py-2.5 px-3">የኮርስ ስም</th>
                      <th className="py-2.5 px-3">የትምህርት ዘመን / ምድብ</th>
                      <th className="py-2.5 px-3">መምህራን</th>
                      <th className="py-2.5 px-3 text-center">ሁኔታ</th>
                      <th className="py-2.5 px-3 text-center">ቀነ-ገደብ</th>
                      <th className="py-2.5 px-3 text-center">ወቅታዊነት</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.items.map((row: any) => (
                      <tr key={row.offeringId} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3">
                          <strong className="text-slate-900 block">{row.courseName}</strong>
                          <span className="font-mono text-[10px] text-slate-400">{row.courseCode}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {row.academicYear} • {row.batchName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{row.teachers.join(', ') || 'አልተመደበም'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant={row.submissionStatus === 'PUBLISHED' || row.submissionStatus === 'APPROVED' ? 'success' : 'neutral'}>
                            {row.submissionStatus}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                          {row.gradeDeadline ? toEthiopianDateString(new Date(row.gradeDeadline)) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {row.isOverdue ? (
                            <span className="text-red-600 font-bold">ቀኑ አልፏል (Overdue)</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">በወቅቱ</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: Approved and Rejected Grades Log */}
          {activeTab === 'approvals-log' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="py-3 px-4">የኮርስ ስም</th>
                    <th className="py-3 px-4">የትምህርት ዘመን / ምድብ</th>
                    <th className="py-3 px-4">ያቀረበው መምህር</th>
                    <th className="py-3 px-4">የመረመረው አስተዳዳሪ</th>
                    <th className="py-3 px-4 text-center">ውሳኔ</th>
                    <th className="py-3 px-4">ምክንያት / ማስታወሻ</th>
                    <th className="py-3 px-4 text-center">ቀን</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!reportData || reportData.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">ምንም መዝገብ አልተገኘም</td>
                    </tr>
                  ) : (
                    reportData.map((row: any) => (
                      <tr key={row.approvalId} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 block">{row.courseName}</strong>
                          <span className="font-mono text-[10px] text-slate-400">{row.courseCode}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {row.academicYearName} • {row.batchName}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-bold">{row.submittedBy}</td>
                        <td className="py-3 px-4 text-slate-700">{row.decidedBy}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={row.decision === 'APPROVED' ? 'success' : 'danger'}>
                            {row.decision === 'APPROVED' ? 'የጸደቀ' : 'ውድቅ የተደረገ'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                          {row.rejectionReason || row.comments || '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500 text-[11px]">
                          {toEthiopianDateString(new Date(row.decidedAt))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: Students by Year */}
          {activeTab === 'students-by-year' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="py-3 px-4">የትምህርት ዘመን</th>
                    <th className="py-3 px-4">ኮድ</th>
                    <th className="py-3 px-4 text-center">የምድቦች ብዛት</th>
                    <th className="py-3 px-4 text-center">ጠቅላላ ተማሪዎች</th>
                    <th className="py-3 px-4 text-center">ወንድ</th>
                    <th className="py-3 px-4 text-center">ሴት</th>
                    <th className="py-3 px-4 text-center">ሁኔታ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!reportData || reportData.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">ምንም መረጃ አልተገኘም</td>
                    </tr>
                  ) : (
                    reportData.map((row: any) => (
                      <tr key={row.academicYearId} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-bold text-slate-900">{row.academicYearName}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{row.code}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">{row.totalBatches}</td>
                        <td className="py-3 px-4 text-center font-black text-brand-700 text-sm">{row.totalStudents}</td>
                        <td className="py-3 px-4 text-center text-slate-700">{row.maleStudents}</td>
                        <td className="py-3 px-4 text-center text-slate-700">{row.femaleStudents}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={row.isCurrent ? 'success' : 'neutral'}>
                            {row.isCurrent ? 'ዋና (ንቁ)' : row.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 7: Students by Batch */}
          {activeTab === 'students-by-batch' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="py-3 px-4">የምድብ ስም</th>
                    <th className="py-3 px-4">ደረጃ</th>
                    <th className="py-3 px-4">የትምህርት ዘመን</th>
                    <th className="py-3 px-4 text-center">የኮርስ ብዛት</th>
                    <th className="py-3 px-4 text-center">ጠቅላላ ተማሪዎች</th>
                    <th className="py-3 px-4 text-center">ወንድ</th>
                    <th className="py-3 px-4 text-center">ሴት</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!reportData || reportData.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">ምንም መረጃ አልተገኘም</td>
                    </tr>
                  ) : (
                    reportData.map((row: any) => (
                      <tr key={row.batchId} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-bold text-slate-900">{row.batchName}</td>
                        <td className="py-3 px-4 text-slate-600">{row.stageLevel}</td>
                        <td className="py-3 px-4 text-slate-600">{row.academicYearName}</td>
                        <td className="py-3 px-4 text-center text-slate-700">{row.totalCourses}</td>
                        <td className="py-3 px-4 text-center font-black text-brand-700 text-sm">{row.totalStudents}</td>
                        <td className="py-3 px-4 text-center text-slate-700">{row.maleStudents}</td>
                        <td className="py-3 px-4 text-center text-slate-700">{row.femaleStudents}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 8: Students by Course */}
          {activeTab === 'students-by-course' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="py-3 px-4">የኮርስ ስም</th>
                    <th className="py-3 px-4">የትምህርት ዘመን / ምድብ</th>
                    <th className="py-3 px-4">መምህራን</th>
                    <th className="py-3 px-4 text-center">ክሬዲት</th>
                    <th className="py-3 px-4 text-center">የተመዘገቡ</th>
                    <th className="py-3 px-4 text-center">ያለፉ</th>
                    <th className="py-3 px-4 text-center">ያላለፉ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!reportData || reportData.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">ምንም መረጃ አልተገኘም</td>
                    </tr>
                  ) : (
                    reportData.map((row: any) => (
                      <tr key={row.offeringId} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 block">{row.courseTitle}</strong>
                          <span className="font-mono text-[10px] text-slate-400">{row.courseCode}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {row.academicYearName} • {row.batchName}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{row.teachers.join(', ') || '-'}</td>
                        <td className="py-3 px-4 text-center font-mono">{row.creditHours}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900">{row.totalEnrolled}</td>
                        <td className="py-3 px-4 text-center text-emerald-700 font-bold">{row.passedCount}</td>
                        <td className="py-3 px-4 text-center text-red-600 font-bold">{row.failedCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 9: Teacher Assignments */}
          {activeTab === 'teacher-assignments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="py-3 px-4">መምህር</th>
                    <th className="py-3 px-4">የትምህርት ደረጃ / ሙያ</th>
                    <th className="py-3 px-4 text-center">የተመደቡ ኮርሶች</th>
                    <th className="py-3 px-4 text-center">የተማሪዎች ብዛት</th>
                    <th className="py-3 px-4">የተመደቡባቸው የኮርስ ክፍሎች</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!reportData || reportData.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">ምንም መረጃ አልተገኘም</td>
                    </tr>
                  ) : (
                    reportData.map((row: any) => (
                      <tr key={row.teacherId} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 block">{row.fullName}</strong>
                          <span className="font-mono text-[10px] text-slate-400">{row.teacherCode}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {row.qualification} • {row.specialization}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900">{row.totalAssignedCourses}</td>
                        <td className="py-3 px-4 text-center font-bold text-brand-700">{row.totalStudentsTaught}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {row.assignments?.map((a: any, idx: number) => (
                              <span key={idx} className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] text-slate-700 font-medium">
                                {a.courseName} ({a.batchName})
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. Printable Multi-Year Transcript Modal */}
      {selectedStudentTranscript && (
        <MultiYearTranscriptModal
          data={selectedStudentTranscript}
          onClose={() => setSelectedStudentTranscript(null)}
        />
      )}
    </div>
  );
};

export default ManagementReportsPage;
