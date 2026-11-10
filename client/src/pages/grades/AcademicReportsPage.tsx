import React, { useState, useEffect } from 'react';
import gradeService from '../../services/gradeService';
import courseService from '../../services/courseService';
import academicService from '../../services/academicService';
import studentService from '../../services/studentService';
import ReportCardModal from '../../components/grades/ReportCardModal';
import { CourseOfferingItem, BatchItem, AcademicYearItem, StudentListItem } from '../../types/academic.types';
import { StudentTranscript } from '../../types/grade.types';
import Button from '../../components/common/Button';
import { 
  FileSpreadsheet, 
  Printer, 
  BarChart3, 
  BookOpen, 
  Layers, 
  GraduationCap, 
  Clock, 
  Award, 
  Download,
  AlertCircle,
  Users
} from 'lucide-react';

export const AcademicReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<
    'course' | 'batch' | 'submissions' | 'transcripts'
  >('course');

  // Catalogs
  const [years, setYears] = useState<AcademicYearItem[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [offerings, setOfferings] = useState<CourseOfferingItem[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);

  // Selections
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Report Data
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transcript Modal
  const [activeTranscript, setActiveTranscript] = useState<StudentTranscript | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const [yList, offList] = await Promise.all([
          academicService.getAcademicYears(),
          courseService.getCourseOfferings(),
        ]);
        setYears(yList);
        setOfferings(offList);
        if (offList.length > 0) {
          setSelectedOfferingId(offList[0].id);
        }
      } catch (err: any) {
        console.error(err);
      }
    };
    initData();
  }, []);

  // When report type or selection changes, fetch report
  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setReportData(null);

      if (reportType === 'course') {
        if (!selectedOfferingId) return;
        const res = await gradeService.getCourseReport(selectedOfferingId);
        setReportData(res);
      } else if (reportType === 'batch') {
        if (!selectedBatchId) return;
        const res = await gradeService.getBatchReport(selectedBatchId);
        setReportData(res);
      } else if (reportType === 'submissions') {
        const res = await gradeService.getDeadlinesOverview();
        setReportData(res);
      } else if (reportType === 'transcripts') {
        if (!selectedStudentId) return;
        const res = await gradeService.getStudentTranscript(selectedStudentId);
        setActiveTranscript(res);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'ሪፖርቱን ማመንጨት አልተቻለም።');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportType === 'batch' && batches.length === 0) {
      academicService.getBatches().then((b) => {
        setBatches(b);
        if (b.length > 0) setSelectedBatchId(b[0].id);
      });
    } else if (reportType === 'transcripts' && students.length === 0) {
      studentService.getStudents().then((s) => {
        setStudents(s);
        if (s.length > 0) setSelectedStudentId(s[0].id);
      });
    }
  }, [reportType]);

  useEffect(() => {
    if (reportType !== 'transcripts') {
      generateReport();
    }
  }, [reportType, selectedOfferingId, selectedBatchId]);

  // Export report data to UTF-8 CSV with BOM for Amharic in Excel
  const exportToExcelCSV = () => {
    if (!reportData) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM
    let fileName = 'SundaySchool_Report.csv';

    if (reportType === 'course') {
      fileName = `Course_Report_${reportData.courseCode}.csv`;
      csvContent += `የኮርስ ውጤት ሪፖርት\n`;
      csvContent += `ኮርስ,${reportData.courseName} (${reportData.courseCode})\n`;
      csvContent += `የትምህርት ዘመን,${reportData.academicYear}\n`;
      csvContent += `ምድብ,${reportData.batch}\n`;
      csvContent += `አማካይ ውጤት,${reportData.metrics.averageScore}\n`;
      csvContent += `የማለፍ ምጣኔ,${reportData.metrics.passRate}%\n\n`;
      csvContent += `ተ.ቁ,የመለያ ቁጥር,ሙሉ ስም,የክርስትና ስም,ውጤት (100),ደረጃ (Grade),ሁኔታ\n`;

      reportData.students.forEach((s: any, idx: number) => {
        csvContent += `${idx + 1},"${s.admissionNumber}","${s.fullName}","${s.baptismalName || ''}",${s.score},${s.letterGrade},${s.isPassed ? 'አልፏል' : 'አላለፈም'}\n`;
      });
    } else if (reportType === 'batch') {
      fileName = `Batch_Report_${reportData.batchName}.csv`;
      csvContent += `የምድብ ውጤት ሪፖርት\n`;
      csvContent += `ምድብ,${reportData.batchName}\n`;
      csvContent += `የትምህርት ዘመን,${reportData.academicYearName}\n`;
      csvContent += `የተማሪዎች ብዛት,${reportData.totalStudents}\n\n`;
      csvContent += `ተ.ቁ,የመለያ ቁጥር,ሙሉ ስም,የክርስትና ስም,የወሰዷቸው ኮርሶች,አማካይ ውጤት\n`;

      reportData.students.forEach((s: any, idx: number) => {
        csvContent += `${idx + 1},"${s.admissionNumber}","${s.fullName}","${s.baptismalName || ''}",${s.coursesTaken},${s.averageScore}\n`;
      });
    } else if (reportType === 'submissions') {
      fileName = `Teacher_Submissions_Report.csv`;
      csvContent += `የመምህራን ውጤት ርክክብ ማጠቃለያ ሪፖርት\n\n`;
      csvContent += `ተ.ቁ,የኮርስ ስም,ኮድ,ምድብ,መምህራን,የተመዘገቡ ተማሪዎች,የማስረከቢያ ቀን,የውጤት ሁኔታ\n`;

      reportData.forEach((d: any, idx: number) => {
        const teacherNames = Array.isArray(d.teachers) ? d.teachers.join(', ') : '';
        csvContent += `${idx + 1},"${d.courseName}","${d.courseCode}","${d.batchName}","${teacherNames}",${d.enrolledCount},"${d.gradeDeadline || 'አልተወሰነም'}",${d.submissionStatus}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  return (
    <div className="space-y-6 font-ethiopic">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">የአካዳሚክ ሪፖርቶች እና ሰነዶች</h1>
          <p className="text-xs text-slate-500 mt-1">
            የኮርስ ውጤቶችን፣ የምድብ ማጠቃለያዎችን፣ የመምህራን ርክክብን እና የተማሪዎች የውጤት ካርድን ያመንጩ።
          </p>
        </div>

        {reportData && (
          <button
            onClick={exportToExcelCSV}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <Download className="w-4 h-4" /> በExcel አውርድ (CSV)
          </button>
        )}
      </div>

      {/* Report Type Selector Pills */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto">
        {[
          { key: 'course', label: 'የኮርስ ውጤት ሪፖርት', icon: BookOpen },
          { key: 'batch', label: 'የምድብ ውጤት ማጠቃለያ', icon: Layers },
          { key: 'submissions', label: 'የመምህራን ርክክብ ሪፖርት', icon: Clock },
          { key: 'transcripts', label: 'የተማሪ የውጤት ካርድ (Transcript)', icon: GraduationCap },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = reportType === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setReportType(item.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-brand-700 text-white shadow-md shadow-brand-700/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Selector depending on Report Type */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        {reportType === 'course' && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">ኮርስ ምረጥ፦</label>
            <select
              value={selectedOfferingId}
              onChange={(e) => setSelectedOfferingId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-80"
            >
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.course.amharicTitle || o.course.title} ({o.batch.name})
                </option>
              ))}
            </select>
          </div>
        )}

        {reportType === 'batch' && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">ምድብ ምረጥ፦</label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-80"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.academicYear.name})
                </option>
              ))}
            </select>
          </div>
        )}

        {reportType === 'transcripts' && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">ተማሪ ምረጥ፦</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-80"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user.firstName} {s.user.lastName} ({s.admissionNumber})
                </option>
              ))}
            </select>
            <Button variant="primary" size="sm" onClick={generateReport} loading={loading}>
              የውጤት ካርድ አዘጋጅ &rarr;
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">ሪፖርቱ እየተዘጋጀ ነው...</div>
      ) : reportType === 'course' && reportData ? (
        /* COURSE REPORT VIEW */
        <div className="space-y-6">
          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] text-slate-500 block">የተማሪዎች ብዛት</span>
              <strong className="text-lg font-bold text-slate-900">
                {reportData.metrics.totalStudents} ተማሪዎች
              </strong>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] text-slate-500 block">አማካይ ውጤት</span>
              <strong className="text-lg font-bold text-brand-700">
                {reportData.metrics.averageScore} / 100
              </strong>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] text-slate-500 block">የማለፍ ምጣኔ</span>
              <strong className="text-lg font-bold text-emerald-700">
                {reportData.metrics.passRate}%
              </strong>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] text-slate-500 block">ከፍተኛ ውጤት</span>
              <strong className="text-lg font-bold text-blue-700">
                {reportData.metrics.highestScore}
              </strong>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>የተማሪዎች ውጤት ደረጃ (Ranked by Score)</span>
              <span>መምህራን፦ {(Array.isArray(reportData.teachers) ? reportData.teachers.join('፣ ') : '') || 'አልተመደቡም'}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-3 w-12 text-center">ደረጃ</th>
                    <th className="p-3">የመለያ ቁጥር</th>
                    <th className="p-3">ሙሉ ስም</th>
                    <th className="p-3">የክርስትና ስም</th>
                    <th className="p-3 text-center">ውጤት (100)</th>
                    <th className="p-3 text-center">ፊደል (Grade)</th>
                    <th className="p-3 text-center">ሁኔታ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.students.map((s: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-bold text-brand-700">#{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-slate-700">
                        {s.admissionNumber}
                      </td>
                      <td className="p-3 font-bold text-slate-900">{s.fullName}</td>
                      <td className="p-3 text-slate-600">{s.baptismalName || '-'}</td>
                      <td className="p-3 text-center font-extrabold text-slate-900 text-sm">
                        {s.score}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded font-bold bg-brand-50 text-brand-900">
                          {s.letterGrade}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {s.isPassed ? (
                          <span className="text-emerald-700 font-bold">አልፏል</span>
                        ) : (
                          <span className="text-red-700 font-bold">አላለፈም</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : reportType === 'batch' && reportData ? (
        /* BATCH REPORT VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
            <span>
              {reportData.batchName} ({reportData.stageLevel}) • {reportData.academicYearName}
            </span>
            <span>
              {reportData.totalStudents} ተማሪዎች • {reportData.totalCourses} ኮርሶች
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="p-3 w-12 text-center">ደረጃ</th>
                  <th className="p-3">የመለያ ቁጥር</th>
                  <th className="p-3">ሙሉ ስም</th>
                  <th className="p-3">የክርስትና ስም</th>
                  <th className="p-3 text-center">የወሰዷቸው ኮርሶች</th>
                  <th className="p-3 text-center">የምድብ አማካይ ውጤት</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.students.map((s: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 text-center font-bold text-brand-700">#{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-slate-700">{s.admissionNumber}</td>
                    <td className="p-3 font-bold text-slate-900">{s.fullName}</td>
                    <td className="p-3 text-slate-600">{s.baptismalName || '-'}</td>
                    <td className="p-3 text-center text-slate-700">{s.coursesTaken}</td>
                    <td className="p-3 text-center font-extrabold text-brand-800 text-sm">
                      {s.averageScore}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : reportType === 'submissions' && reportData ? (
        /* TEACHER SUBMISSIONS OVERVIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">ኮርስ እና ምድብ</th>
                  <th className="p-3">የተመደቡ መምህራን</th>
                  <th className="p-3 text-center">ተማሪዎች</th>
                  <th className="p-3">የማስረከቢያ ቀን</th>
                  <th className="p-3 text-center">ሁኔታ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((d: any, idx: number) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{d.courseName}</div>
                      <div className="text-[11px] text-slate-500">{d.batchName}</div>
                    </td>
                    <td className="p-3 text-slate-700">{(Array.isArray(d.teachers) ? d.teachers.join('፣ ') : '') || 'አልተመደቡም'}</td>
                    <td className="p-3 text-center font-bold text-slate-800">{d.enrolledCount}</td>
                    <td className="p-3 text-slate-600 font-medium">
                      {d.gradeDeadline ? new Date(d.gradeDeadline).toLocaleDateString() : 'አልተወሰነም'}
                    </td>
                    <td className="p-3 text-center font-bold">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {d.submissionStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Transcript Modal */}
      {activeTranscript && (
        <ReportCardModal
          transcript={activeTranscript}
          onClose={() => setActiveTranscript(null)}
        />
      )}
    </div>
  );
};

export default AcademicReportsPage;
