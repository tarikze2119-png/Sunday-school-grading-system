import React, { useState, useEffect } from 'react';
import AcademicYearsPage from '../academic/AcademicYearsPage';
import BatchesPage from '../academic/BatchesPage';
import StudentsPage from '../academic/StudentsPage';
import TeachersPage from '../academic/TeachersPage';
import CoursesPage from '../academic/CoursesPage';
import EnrollmentPage from '../academic/EnrollmentPage';
import AdminGradeApprovalPage from '../grades/AdminGradeApprovalPage';
import ManagementReportsPage from '../reports/ManagementReportsPage';
import GradingSchemeHub from '../gradingScheme/GradingSchemeHub';
import academicService from '../../services/academicService';
import studentService from '../../services/studentService';
import teacherService from '../../services/teacherService';
import courseService from '../../services/courseService';
import gradeService from '../../services/gradeService';
import Button from '../../components/common/Button';
import { 
  LayoutDashboard, 
  Calendar, 
  Layers, 
  Users, 
  Award, 
  BookOpen, 
  UserCheck, 
  ShieldCheck, 
  FileSpreadsheet, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Sliders
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeModule, setActiveModule] = useState<
    | 'overview'
    | 'approvals'
    | 'schemes'
    | 'years'
    | 'batches'
    | 'students'
    | 'teachers'
    | 'courses'
    | 'enrollment'
    | 'reports'
  >('overview');

  // Overview metrics state
  const [stats, setStats] = useState({
    studentsCount: 0,
    teachersCount: 0,
    coursesCount: 0,
    yearsCount: 0,
    batchesCount: 0,
    pendingApprovalsCount: 0,
    upcomingDeadlinesCount: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchOverviewStats = async () => {
    try {
      setLoadingStats(true);
      const [stu, tch, crs, yrs, bts, subs, dls] = await Promise.all([
        studentService.getStudents().catch(() => []),
        teacherService.getTeachers().catch(() => []),
        courseService.getCourses().catch(() => []),
        academicService.getAcademicYears().catch(() => []),
        academicService.getBatches().catch(() => []),
        gradeService.getSubmissionsForReview({ status: 'SUBMITTED' }).catch(() => []),
        gradeService.getDeadlinesOverview().catch(() => []),
      ]);

      const upcomingDls = (dls || []).filter(
        (d: any) => d.daysRemaining !== null && d.daysRemaining >= 0 && d.isSubmissionOpen
      );

      setStats({
        studentsCount: stu.length,
        teachersCount: tch.length,
        coursesCount: crs.length,
        yearsCount: yrs.length,
        batchesCount: bts.length,
        pendingApprovalsCount: subs.length,
        upcomingDeadlinesCount: upcomingDls.length,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  const navItems = [
    { key: 'overview', label: 'ማጠቃለያ ዳሽቦርድ', icon: LayoutDashboard },
    { 
      key: 'approvals', 
      label: 'የውጤት ማጽደቂያ እና ቀነ ገደብ', 
      icon: ShieldCheck, 
      count: stats.pendingApprovalsCount > 0 ? stats.pendingApprovalsCount : undefined 
    },
    { key: 'schemes', label: 'የውጤት መመዘኛ አስተዳደር', icon: Sliders },
    { key: 'reports', label: 'አካዳሚክ ሪፖርቶች', icon: FileSpreadsheet },
    { key: 'years', label: 'የትምህርት ዘመናት', icon: Calendar, count: stats.yearsCount },
    { key: 'batches', label: 'የተማሪዎች ምድቦች', icon: Layers, count: stats.batchesCount },
    { key: 'students', label: 'ተማሪዎች', icon: Users, count: stats.studentsCount },
    { key: 'teachers', label: 'መምህራን', icon: Award, count: stats.teachersCount },
    { key: 'courses', label: 'ኮርሶችና ምደባዎች', icon: BookOpen, count: stats.coursesCount },
    { key: 'enrollment', label: 'የተማሪዎች ምዝገባ', icon: UserCheck },
  ];

  return (
    <div className="space-y-6 font-ethiopic">
      {/* Navigation Pills Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1.5 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveModule(item.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-brand-700 text-white shadow-md shadow-brand-700/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : item.key === 'approvals'
                      ? 'bg-amber-100 text-amber-800 font-extrabold'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* OVERVIEW DASHBOARD VIEW                                   */}
      {/* ========================================================= */}
      {activeModule === 'overview' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-blue-300 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-400/30">
                የአካዳሚክ አስተዳዳሪ ማዕከል
              </span>
              <h1 className="text-xl sm:text-2xl font-black mt-2">
                የሰንበት ትምህርት ቤት አካዳሚክ እና ውጤት አስተዳደር
              </h1>
              <p className="text-xs text-blue-200 mt-1">
                የትምህርት ዘመናትን፣ የተማሪዎች ምድቦችን፣ ኮርሶችን፣ ምዝገባዎችን እና የውጤት ማጽደቂያ ሂደቶችን በአንድ ማዕከል ያስተዳድሩ።
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveModule('approvals')}
              >
                <ShieldCheck className="w-4 h-4 mr-1.5" /> የውጤት ማጽደቂያ ይክፈቱ &rarr;
              </Button>
            </div>
          </div>

          {/* 7 Required Admin Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
            {/* 1. Total Students */}
            <div
              onClick={() => setActiveModule('students')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 hover:border-brand-500 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold text-slate-500">ተማሪዎች</span>
                <Users className="w-4 h-4 text-brand-600" />
              </div>
              <div className="text-xl font-black text-slate-900">{stats.studentsCount}</div>
              <p className="text-[10px] text-slate-400">ጠቅላላ የተመዘገቡ</p>
            </div>

            {/* 2. Total Teachers */}
            <div
              onClick={() => setActiveModule('teachers')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 hover:border-brand-500 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold text-slate-500">መምህራን</span>
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-slate-900">{stats.teachersCount}</div>
              <p className="text-[10px] text-slate-400">የኮርስ አስተማሪዎች</p>
            </div>

            {/* 3. Total Courses */}
            <div
              onClick={() => setActiveModule('courses')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 hover:border-brand-500 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold text-slate-500">ኮርሶች</span>
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-black text-slate-900">{stats.coursesCount}</div>
              <p className="text-[10px] text-slate-400">የካታሎግ ኮርሶች</p>
            </div>

            {/* 4. Academic Years */}
            <div
              onClick={() => setActiveModule('years')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 hover:border-brand-500 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold text-slate-500">የትምህርት ዘመናት</span>
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-xl font-black text-slate-900">{stats.yearsCount}</div>
              <p className="text-[10px] text-slate-400">የተመዘገቡ ዓመታት</p>
            </div>

            {/* 5. Batches */}
            <div
              onClick={() => setActiveModule('batches')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 hover:border-brand-500 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold text-slate-500">ምድቦች</span>
                <Layers className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-black text-slate-900">{stats.batchesCount}</div>
              <p className="text-[10px] text-slate-400">የተማሪዎች ክፍሎች</p>
            </div>

            {/* 6. Pending Grade Approvals */}
            <div
              onClick={() => setActiveModule('approvals')}
              className="bg-amber-50/60 p-4 rounded-2xl border border-amber-300 shadow-sm space-y-1 hover:border-amber-500 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-amber-600">
                <span className="text-[11px] font-bold text-amber-800">ለማጽደቅ የቀረቡ</span>
                <ShieldCheck className="w-4 h-4 text-amber-700" />
              </div>
              <div className="text-xl font-black text-amber-900">{stats.pendingApprovalsCount}</div>
              <p className="text-[10px] text-amber-700">የውጤት ሰነዶች</p>
            </div>

            {/* 7. Upcoming Deadlines */}
            <div
              onClick={() => setActiveModule('approvals')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 hover:border-brand-500 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold text-slate-500">የሚመጡ ቀነ ገደቦች</span>
                <Clock className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-xl font-black text-slate-900">{stats.upcomingDeadlinesCount}</div>
              <p className="text-[10px] text-slate-400">ክፍት ቀነ ገደቦች</p>
            </div>
          </div>

          {/* Quick Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">የውጤት ማጽደቂያ ማዕከል</h3>
              <p className="text-xs text-slate-500">
                በመምህራን የቀረቡ የውጤት ሰነዶችን ይመርምሩ፤ በሙሉ ነጥብ ወይም በፊደል ያጽድቁ፤ ወይም በማስተካከያ ምክንያት ይመልሱ።
              </p>
              <button
                onClick={() => setActiveModule('approvals')}
                className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1 pt-1"
              >
                ወደ ማጽደቂያ ሂድ &rarr;
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">የተማሪዎች ምዝገባና ሽግግር</h3>
              <p className="text-xs text-slate-500">
                ተማሪዎችን በጅምላ ወደ ኮርሶች ያስመዝግቡ፤ ከአንድ ምድብ ወደ ሌላ ያዘዋውሩ፤ ታሪካዊ መረጃ ሳይበርዝ ወደ አዲስ ዓመት ያሸጋግሩ።
              </p>
              <button
                onClick={() => setActiveModule('enrollment')}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 pt-1"
              >
                ወደ ምዝገባ ሂድ &rarr;
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">አካዳሚክ ሪፖርቶችና ሰነዶች</h3>
              <p className="text-xs text-slate-500">
                የኮርስና የምድብ ማጠቃለያዎችን ያመንጩ፤ የተማሪዎች የውጤት ካርድ (Transcript) ያትሙ፤ በExcel (CSV) ያውርዱ።
              </p>
              <button
                onClick={() => setActiveModule('reports')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 pt-1"
              >
                ወደ ሪፖርቶች ሂድ &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* OTHER SUB-MODULES                                         */}
      {/* ========================================================= */}
      <div>
        {activeModule === 'approvals' && <AdminGradeApprovalPage />}
        {activeModule === 'schemes' && <GradingSchemeHub />}
        {activeModule === 'reports' && <ManagementReportsPage />}
        {activeModule === 'years' && <AcademicYearsPage />}
        {activeModule === 'batches' && <BatchesPage />}
        {activeModule === 'students' && <StudentsPage />}
        {activeModule === 'teachers' && <TeachersPage />}
        {activeModule === 'courses' && <CoursesPage />}
        {activeModule === 'enrollment' && <EnrollmentPage />}
      </div>
    </div>
  );
};

export default AdminDashboard;
