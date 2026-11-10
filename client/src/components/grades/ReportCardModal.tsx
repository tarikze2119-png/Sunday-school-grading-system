import React from 'react';
import { StudentTranscript } from '../../types/grade.types';
import { Printer, X, Award, CheckCircle } from 'lucide-react';

interface Props {
  transcript: StudentTranscript;
  onClose: () => void;
}

export const ReportCardModal: React.FC<Props> = ({ transcript, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const { student, academicTerms, cumulativeGpa, totalCreditsEarned } = transcript;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto font-ethiopic print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden print:border-none print:shadow-none print:max-w-full">
        {/* Screen Controls Header (Hidden in Print) */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-brand-700">
            <Award className="w-5 h-5" />
            <h2 className="text-base font-bold text-slate-900">የሰንበት ት/ቤት ይፋዊ የውጤት ካርድ</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> አትም (Print / PDF)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PRINTABLE OFFICIAL REPORT CARD DOCUMENT                   */}
        {/* ========================================================= */}
        <div className="p-8 sm:p-12 space-y-6 print:p-8" id="printable-report-card">
          {/* Church Header */}
          <div className="text-center space-y-2 border-b-2 border-brand-900 pb-5">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-full border border-slate-200 flex items-center justify-center bg-white shadow-sm overflow-hidden p-1 shrink-0">
                <img
                  src="/assets/haimote-abraham-logo.png"
                  alt="ሐይመተ አብርሃም ሰንበት ትምህርት ቤት ሎጎ"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-left">
                <div className="inline-block px-3 py-0.5 bg-brand-50 text-brand-900 rounded-full text-[10px] font-bold tracking-wide uppercase">
                  በስመ አብ ወወልድ ወመንፈስ ቅዱስ አሐዱ አምላክ አሜን
                </div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተክርስቲያን
                </h1>
                <h2 className="text-sm sm:text-base font-bold text-brand-800">
                  ሐይመተ አብርሃም ሰንበት ትምህርት ቤት የተማሪ የውጤት ካርድ
                </h2>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              ይፋዊ የአካዳሚክ እና የስነ-ምግባር ውጤት ማረጋገጫ ሰነድ
            </p>
          </div>

          {/* Student Profile Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">የተማሪው ሙሉ ስም፦</span>
              <strong className="text-slate-900 text-sm">{student.fullName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">የክርስትና ስም፦</span>
              <strong className="text-brand-900 text-sm">{student.baptismalName || '-'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">የመለያ ቁጥር (ID)፦</span>
              <strong className="font-mono text-slate-900">{student.admissionNumber}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">ጾታ፦</span>
              <strong className="text-slate-900">{student.gender}</strong>
            </div>
          </div>

          {/* Academic Terms & Courses */}
          {academicTerms.map((term, tIdx) => (
            <div key={tIdx} className="space-y-3">
              <div className="flex items-center justify-between bg-slate-100/80 px-4 py-2 rounded-xl text-xs font-bold text-slate-800">
                <span>
                  የትምህርት ዘመን፦ {term.academicYearName} • {term.batchName} ({term.termSemester})
                </span>
                <span>የመንፈቀ ዓመቱ አማካይ (Term GPA)፦ {term.termGpa}</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5 w-28">የኮርስ ኮድ</th>
                      <th className="p-2.5">የኮርስ ስም (Course Title)</th>
                      <th className="p-2.5 text-center w-20">ክሬዲት</th>
                      <th className="p-2.5 text-center w-24">ውጤት (100)</th>
                      <th className="p-2.5 text-center w-20">ፊደል (Grade)</th>
                      <th className="p-2.5 text-center w-20">ነጥብ (GP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {term.courses.map((c, cIdx) => (
                      <tr key={cIdx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-center text-slate-400 font-bold">{cIdx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-700">{c.courseCode}</td>
                        <td className="p-2.5 font-bold text-slate-900">{c.courseName}</td>
                        <td className="p-2.5 text-center text-slate-700">{c.creditHours}</td>
                        <td className="p-2.5 text-center font-extrabold text-slate-900">
                          {c.score !== null ? c.score : '-'}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-900">
                            {c.letterGrade}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-700">{c.gradePoint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Cumulative Summary Box */}
          <div className="p-5 rounded-2xl bg-brand-50/50 border-2 border-brand-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-600 block">አጠቃላይ የተጠናቀቁ ክሬዲቶች (Total Credits):</span>
              <strong className="text-base text-slate-900 font-bold">{totalCreditsEarned} ክሬዲት ሰዓት</strong>
            </div>
            <div className="text-center sm:text-right space-y-1">
              <span className="text-slate-600 block">አጠቃላይ ድምር አማካይ ነጥብ (Cumulative GPA):</span>
              <div className="text-2xl font-black text-brand-800">{cumulativeGpa} / 4.00</div>
              <span className="text-xs font-bold text-emerald-700">
                {cumulativeGpa >= 3.75
                  ? 'ከፍተኛ ማዕረግ (Great Distinction)'
                  : cumulativeGpa >= 3.5
                  ? 'በማዕረግ (Distinction)'
                  : cumulativeGpa >= 2.0
                  ? 'አጥጋቢ (Satisfactory)'
                  : 'የሚሻሻል (Academic Warning)'}
              </span>
            </div>
          </div>

          {/* Conduct & Remarks */}
          <div className="p-4 rounded-xl border border-slate-200 text-xs space-y-1 bg-slate-50/30">
            <strong className="text-slate-800 block">የስነ-ምግባር እና የመንፈሳዊ ተሳትፎ ውጤት፦</strong>
            <p className="text-slate-600">
              ተማሪው በሰንበት ት/ቤቱ ቆይታው በመደበኛ ክትትል፣ በአክብሮትና በስነ-ምግባር የታነጸ ክርስቲያናዊ ምግባር አሳይቷል።
            </p>
          </div>

          {/* Signatures & Seal Section */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-10">
              <div className="border-b border-slate-400 w-3/4 mx-auto pb-1" />
              <p className="font-bold text-slate-800">የክፍሉ መምህር ፊርማ</p>
            </div>
            <div className="space-y-2">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 mx-auto flex items-center justify-center text-[10px] text-slate-400 font-bold">
                የማህተም ቦታ
              </div>
              <p className="font-bold text-slate-800">የሰንበት ት/ቤት ማህተም</p>
            </div>
            <div className="space-y-10">
              <div className="border-b border-slate-400 w-3/4 mx-auto pb-1" />
              <p className="font-bold text-slate-800">የትምህርት ክፍል ኃላፊ ፊርማ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportCardModal;
