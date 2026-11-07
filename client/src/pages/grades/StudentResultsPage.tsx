import React, { useState, useEffect } from 'react';
import { 
  StudentPublishedResultsResponse, 
  StudentTranscript 
} from '../../types/grade.types';
import { StudentMultiYearHistoryResponse } from '../../types/report.types';
import gradeService from '../../services/gradeService';
import reportService from '../../services/reportService';
import ReportCardModal from '../../components/grades/ReportCardModal';
import MultiYearTranscriptModal from '../../components/grades/MultiYearTranscriptModal';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { toEthiopianDateString } from '../../utils/ethiopianCalendar';
import { 
  Award, 
  BookOpen, 
  CheckCircle2, 
  Printer, 
  Clock, 
  Calendar, 
  Layers, 
  AlertCircle, 
  GraduationCap, 
  User, 
  FileText,
  History,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

export const StudentResultsPage: React.FC = () => {
  const [data, setData] = useState<StudentPublishedResultsResponse | null>(null);
  const [transcriptData, setTranscriptData] = useState<StudentTranscript | null>(null);
  const [multiYearData, setMultiYearData] = useState<StudentMultiYearHistoryResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  const [isMultiYearModalOpen, setIsMultiYearModalOpen] = useState(false);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pubRes, histRes] = await Promise.all([
        gradeService.getStudentPublishedResults().catch(() => null),
        reportService.getStudentAcademicHistory('me').catch(() => null),
      ]);

      setData(pubRes);
      setMultiYearData(histRes);

      if (pubRes?.student?.id) {
        const trans = await gradeService.getStudentTranscript(pubRes.student.id).catch(() => null);
        setTranscriptData(trans);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'የውጤት ዝርዝርዎን መጫን አልተቻለም።');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const latestTerm = transcriptData?.academicTerms[transcriptData.academicTerms.length - 1];

  return (
    <div className="space-y-6 font-ethiopic">
      {/* 1. Student Profile Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-indigo-900/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gold-600/20 border-2 border-gold-500 flex items-center justify-center text-gold-400 font-bold text-2xl shrink-0">
            {data?.student.fullName?.[0] || multiYearData?.student.fullName?.[0] || 'ተ'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold rounded-full">
                የተማሪ መገለጫ እና የውጤት ማዕከል
              </span>
              <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                {data?.student.admissionNumber || multiYearData?.student.admissionNumber}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white">
              {data?.student.fullName || multiYearData?.student.fullName}
              {(data?.student.baptismalName || multiYearData?.student.baptismalName) && (
                <span className="text-gold-400 font-bold text-base ml-2">
                  ({data?.student.baptismalName || multiYearData?.student.baptismalName})
                </span>
              )}
            </h1>

            <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gold-400" />
                የትምህርት ዘመን፦ <strong>{latestTerm?.academicYearName || '2016 ዓ.ም.'}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-gold-400" />
                የአሁኑ ምድብ፦ <strong>{latestTerm?.batchName || 'ምድብ 2 (ወጣቶች)'}</strong>
              </span>
              {(transcriptData?.student.guardianName || multiYearData?.student.guardianName) && (
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  አሳዳጊ፦ {transcriptData?.student.guardianName || multiYearData?.student.guardianName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons: Official Documents */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 self-start md:self-auto shrink-0">
          {multiYearData && multiYearData.historyTerms.length > 0 && (
            <button
              onClick={() => setIsMultiYearModalOpen(true)}
              className="px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              <History className="w-4 h-4 text-gold-400" /> ይፋዊ የትምህርት ታሪክ (Transcript)
            </button>
          )}

          {data && data.results.length > 0 && (
            <button
              onClick={() => setIsReportCardOpen(true)}
              className="px-4 py-2.5 bg-gold-600 hover:bg-gold-700 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> ይፋዊ የውጤት ካርድ (Report Card)
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Tab Navigation: Current Term vs Multi-Year Academic History */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('current')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'current'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award className="w-4 h-4 text-gold-400" />
          <span>የአሁኑ የትምህርት ዘመን ውጤቶች</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4 text-emerald-400" />
          <span>ያለፉ የትምህርት ዘመናት ታሪክ (Academic History)</span>
          {multiYearData && (
            <span className="bg-slate-200 text-slate-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {multiYearData.historyTerms.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">የውጤት መረጃዎች እየተጫኑ ነው...</div>
      ) : activeTab === 'history' ? (
        /* ==================================================== */
        /* TAB 2: Multi-Year Academic History (Timeline View)   */
        /* ==================================================== */
        <div className="space-y-6">
          {/* Historical Summary Box */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 text-white rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-gold-400 block">የተማሪው አጠቃላይ የተጠራቀመ የትምህርት ታሪክ</span>
              <h3 className="text-lg font-black mt-1">የተማሩባቸው የትምህርት ዘመናት እና ምድቦች</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                ተማሪው ወደ አዲስ የትምህርት ዘመን ወይም ምድብ ሲዛወር የቀደመ የውጤት መዝገቡ ሳይለወጥ ተጠብቆ ይቆያል።
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold block">ጠቅላላ ክሬዲት</span>
                <strong className="text-base font-bold text-white font-mono">
                  {multiYearData?.summary.cumulativeCredits || 0}
                </strong>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold block">አማካይ ውጤት (GPA)</span>
                <strong className="text-xl font-black text-gold-400 font-mono">
                  {multiYearData?.summary.cumulativeGpa.toFixed(2) || '0.00'}
                </strong>
              </div>
            </div>
          </div>

          {/* Academic Years History Progression */}
          {(!multiYearData || multiYearData.historyTerms.length === 0) ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-2">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">ምንም የቀደመ የትምህርት ዘመን ታሪክ አልተገኘም</h4>
              <p className="text-xs text-slate-500">ተማሪው አዲስ ተመዝጋቢ በመሆኑ ያለፉ ዓመታት መረጃ የለም።</p>
            </div>
          ) : (
            <div className="space-y-5">
              {multiYearData.historyTerms.map((term, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6"
                >
                  {/* Term Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-slate-900">{term.academicYearName}</h4>
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {term.batchName} ({term.stageLevel})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          የተመዘገበበት ቀን፦ {toEthiopianDateString(new Date(term.registeredAt))}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {term.registrationStatus === 'PROMOTED' ? 'ተዛውሯል / አልፏል' : 'ንቁ / በመማር ላይ'}
                      </span>
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        የመንፈቁ GPA፦ {term.termGpa.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Courses in this Term */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                          <th className="py-2.5 px-3">የኮርስ ኮድ</th>
                          <th className="py-2.5 px-3">የትምህርት ስም</th>
                          <th className="py-2.5 px-3 text-center">ክሬዲት</th>
                          <th className="py-2.5 px-3 text-center">ውጤት</th>
                          <th className="py-2.5 px-3 text-center">ደረጃ (Grade)</th>
                          <th className="py-2.5 px-3">ማዕረግ</th>
                          <th className="py-2.5 px-3 text-center">ሁኔታ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {term.courses.map((c, cIdx) => (
                          <tr key={cIdx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-500">{c.courseCode}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{c.courseName}</td>
                            <td className="py-2.5 px-3 text-center font-mono">{c.creditHours}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900 font-mono">
                              {c.totalScore !== null ? `${c.totalScore}%` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-black text-slate-900 font-mono text-sm">
                              {c.letterGrade}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px]">{c.amharicLabel}</td>
                            <td className="py-2.5 px-3 text-center">
                              {c.isPassed === true ? (
                                <span className="text-emerald-700 font-bold">ያለፈ/ች</span>
                              ) : c.isPassed === false ? (
                                <span className="text-red-600 font-bold">ያላለፈ/ች</span>
                              ) : (
                                <span className="text-slate-400">በሂደት ላይ</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ==================================================== */
        /* TAB 1: Current Term Published Results & Summary      */
        /* ==================================================== */
        <div className="space-y-6">
          {/* Performance Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">የተጠናቀቁ ኮርሶች</span>
                <strong className="text-xl font-bold text-slate-900">
                  {data?.summary.totalCoursesTaken || 0} ኮርሶች
                </strong>
                <p className="text-[10px] text-slate-400 mt-0.5">በይፋ ውጤት የወጣላቸው</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-700">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">የተገኙ ክሬዲቶች</span>
                <strong className="text-xl font-bold text-slate-900">
                  {data?.summary.totalCreditHours || 0} ክሬዲት
                </strong>
                <p className="text-[10px] text-slate-400 mt-0.5">ጠቅላላ የክሬዲት ሰዓት</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between bg-emerald-50/20">
              <div>
                <span className="text-xs text-emerald-700 font-bold block">
                  አጠቃላይ አማካይ ነጥብ (Cumulative GPA)
                </span>
                <strong className="text-2xl font-black text-emerald-800">
                  {data?.summary.gpa || '0.00'} / 4.00
                </strong>
                <p className="text-[11px] font-bold text-emerald-600 mt-0.5">
                  {(data?.summary.gpa || 0) >= 3.75
                    ? 'ከፍተኛ ማዕረግ (Great Distinction)'
                    : (data?.summary.gpa || 0) >= 3.5
                    ? 'በማዕረግ (Distinction)'
                    : 'አጥጋቢ (Satisfactory)'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Registered Courses List */}
          {latestTerm && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-brand-700" /> የተመዘገቡባቸው ኮርሶች (Registered Courses)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    በዚህ የትምህርት ዘመን እና ምድብ ሥር የሚሰጡ የሰንበት ት/ቤት ትምህርቶች
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-600">
                  ጠቅላላ፦ {latestTerm.courses.length} ኮርሶች
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {latestTerm.courses.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono text-[10px] text-slate-400 font-bold block">
                        {c.courseCode} ({c.creditHours} ክሬዲት)
                      </span>
                      <strong className="text-xs text-slate-900 block">{c.courseName}</strong>
                    </div>
                    {c.score !== null ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {c.letterGrade} ({c.score}%)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-600">
                        በመማር ላይ
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Published Grades Cards */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-700" /> በይፋ የታተሙ ውጤቶች (Published Grades)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  በአስተዳዳሪው ተመርምረው የጸደቁ እና ለተማሪዎች ይፋ የሆኑ የፈተና ውጤቶች
                </p>
              </div>
            </div>

            {!data || data.results.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
                <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">እስካሁን በይፋ የታተመ ውጤት የለም</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  የተመዘገቡባቸው ኮርሶች ውጤት በመምህራን እና በአስተዳዳሪው ተመርምሮ ሲጸድቅ እዚህ ገጽ ላይ በይፋ ይታተማል።
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {data.results.map((res) => {
                  const pubDate = res.publishedAt ? new Date(res.publishedAt) : null;
                  const ethiopianPubDate = pubDate ? toEthiopianDateString(pubDate) : '-';

                  return (
                    <div
                      key={res.enrollmentId}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-5 space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[11px] rounded font-bold">
                              {res.courseCode} • {res.creditHours} ክሬዲት
                            </span>
                            <h3 className="text-base font-bold text-slate-900 mt-1">
                              {res.courseName}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {res.batchName} • {res.academicYearName}
                            </p>
                          </div>

                          <div className="text-right">
                            <span
                              className={`inline-block px-3 py-1 rounded-xl text-xs font-bold ${
                                res.letterGrade.startsWith('A')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : res.letterGrade === 'B'
                                  ? 'bg-blue-100 text-blue-800'
                                  : res.letterGrade === 'C'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {res.letterGrade} ({res.totalScore}%)
                            </span>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {res.gradeAmharicLabel}
                            </p>
                          </div>
                        </div>

                        {/* Assessment Breakdown Table */}
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 border-b border-slate-200/60 pb-1">
                            <span>የምዘና መስፈርት</span>
                            <div className="flex items-center gap-4">
                              <span>ውጤት / ከፍተኛ</span>
                              <span className="w-10 text-right">ክብደት</span>
                              <span className="w-14 text-right text-brand-800">የተሰላ ነጥብ</span>
                            </div>
                          </div>
                          <div className="space-y-1.5 divide-y divide-slate-200/60 text-xs">
                            {res.assessmentBreakdown.map((item, idx) => {
                              const calcWeighted =
                                item.weightedScore !== undefined
                                  ? item.weightedScore
                                  : item.maxScore > 0
                                  ? Math.round(
                                      ((item.scoreObtained / item.maxScore) * item.weightPercentage) *
                                        100
                                    ) / 100
                                  : 0;

                              return (
                                <div key={idx} className="pt-1.5 flex items-center justify-between">
                                  <span className="text-slate-700 font-medium truncate max-w-[160px]">
                                    {item.assessmentName}
                                  </span>
                                  <div className="flex items-center gap-4 text-slate-800">
                                    <span className="font-mono">
                                      {item.scoreObtained} / {item.maxScore}
                                    </span>
                                    <span className="font-mono text-slate-500 w-10 text-right">
                                      {item.weightPercentage}%
                                    </span>
                                    <span className="font-mono font-bold text-brand-800 w-14 text-right">
                                      {calcWeighted}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {res.appliedSchemeName && (
                            <div className="pt-2 border-t border-slate-200 text-[10px] text-indigo-700 font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>የተመደበ መመዘኛ፦ {res.appliedSchemeName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Meta */}
                      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {res.isPassed ? 'ያለፈ/ች' : 'ያላለፈ/ች'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          የታተመበት ቀን፦ {ethiopianPubDate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Official Report Card Modal */}
      {isReportCardOpen && transcriptData && (
        <ReportCardModal
          transcript={transcriptData}
          onClose={() => setIsReportCardOpen(false)}
        />
      )}

      {/* Official Multi-Year Transcript Modal */}
      {isMultiYearModalOpen && multiYearData && (
        <MultiYearTranscriptModal
          data={multiYearData}
          onClose={() => setIsMultiYearModalOpen(false)}
        />
      )}
    </div>
  );
};

export default StudentResultsPage;
