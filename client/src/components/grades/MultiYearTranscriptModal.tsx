import React from 'react';
import { StudentMultiYearHistoryResponse } from '../../types/report.types';
import { 
  Printer, 
  X, 
  GraduationCap, 
  Layers
} from 'lucide-react';
import { toEthiopianDateString } from '../../utils/ethiopianCalendar';

interface Props {
  data: StudentMultiYearHistoryResponse;
  onClose: () => void;
}

export const MultiYearTranscriptModal: React.FC<Props> = ({ data, onClose }) => {
  const currentDate = toEthiopianDateString(new Date());

  const handlePrint = () => {
    window.print();
  };

  const student = data?.student || {
    fullName: 'ያልተገለጸ ተማሪ',
    baptismalName: '',
    admissionNumber: '-',
    gender: '-',
  };

  const summary = data?.summary || {
    totalTerms: 0,
    cumulativeCredits: 0,
    cumulativeGpa: 0,
    distinction: 'አጥጋቢ',
  };

  const historyTerms = Array.isArray(data?.historyTerms) ? data.historyTerms : [];
  const cumulativeGpaNum = typeof summary.cumulativeGpa === 'number' 
    ? summary.cumulativeGpa 
    : Number(summary.cumulativeGpa) || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-ethiopic">
      {/* Container */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-gold-400" />
            <span className="font-bold text-sm">ይፋዊ የተማሪ የትምህርት ታሪክ ማስረጃ (Official Academic Transcript)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" /> በPDF አትም (Print / Save PDF)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 print:p-0 print:m-0 print:overflow-visible">
          {/* 1. Header Banner & Church Insignia */}
          <div className="text-center border-b-2 border-slate-900 pb-6 space-y-2">
            <div className="flex items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full border border-slate-200 flex items-center justify-center bg-white shadow-sm overflow-hidden p-1 shrink-0">
                <img
                  src="/assets/haimote-abraham-logo.png"
                  alt="ሐይመተ አብርሃም ሰንበት ትምህርት ቤት ሎጎ"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-left">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተክርስቲያን
                </h1>
                <h2 className="text-sm sm:text-base font-bold text-brand-900">
                  ሐይመተ አብርሃም ሰንበት ትምህርት ቤት የተማሪዎች የትምህርት ማስረጃ (Official Transcript)
                </h2>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              የትምህርት እና ሥነ-ምግባር ክፍል • የውጤት አስተዳደር ማዕከል
            </p>
          </div>

          {/* 2. Student Profile Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">የተማሪው ሙሉ ስም</span>
              <strong className="text-slate-900">{student.fullName}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">የክርስትና ስም</span>
              <strong className="text-slate-900">{student.baptismalName || '-'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">የመለያ ቁጥር</span>
              <strong className="font-mono text-slate-900">{student.admissionNumber}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">ጾታ</span>
              <strong className="text-slate-900">{student.gender}</strong>
            </div>
          </div>

          {/* 3. Multi-Year Academic Terms Progression */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-700" />
              የትምህርት ዘመናት እና የውጤት ዝርዝር (Academic Terms Progression)
            </h3>

            {historyTerms.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">እስካሁን የተመዘገበ የትምህርት ዘመን ውጤት የለም።</p>
            ) : (
              historyTerms.map((term, tIdx) => {
                const termGpaNum = typeof term.termGpa === 'number' 
                  ? term.termGpa 
                  : Number(term.termGpa) || 0;
                const courses = Array.isArray(term.courses) ? term.courses : [];

                return (
                  <div key={tIdx} className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                    {/* Term Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                      <div>
                        <span className="text-xs font-black text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200 mr-2">
                          {term.academicYearName}
                        </span>
                        <strong className="text-xs text-slate-900">{term.batchName} ({term.stageLevel})</strong>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-600">
                          ሁኔታ፦ <strong className="text-slate-900">{term.registrationStatus === 'PROMOTED' ? 'ተዛውሯል / አልፏል' : 'በመማር ላይ'}</strong>
                        </span>
                        <span className="text-slate-600">
                          የመንፈቁ GPA፦ <strong className="text-emerald-700 font-mono">{termGpaNum.toFixed(2)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Course Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                            <th className="py-2 px-3">የኮርስ ኮድ</th>
                            <th className="py-2 px-3">የትምህርት ስም</th>
                            <th className="py-2 px-3 text-center">ክሬዲት</th>
                            <th className="py-2 px-3 text-center">ጠቅላላ ውጤት</th>
                            <th className="py-2 px-3 text-center">ደረጃ (Grade)</th>
                            <th className="py-2 px-3 text-center">ማዕረግ</th>
                            <th className="py-2 px-3 text-center">ሁኔታ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {courses.map((c, cIdx) => (
                            <tr key={cIdx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-mono text-slate-500">{c.courseCode}</td>
                              <td className="py-2 px-3 font-bold text-slate-800">{c.courseName}</td>
                              <td className="py-2 px-3 text-center font-mono">{c.creditHours}</td>
                              <td className="py-2 px-3 text-center font-bold text-slate-900 font-mono">
                                {c.totalScore !== null && c.totalScore !== undefined ? `${c.totalScore}%` : '-'}
                              </td>
                              <td className="py-2 px-3 text-center font-black text-slate-900 font-mono">
                                {c.letterGrade || '-'}
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600 text-[11px]">
                                {c.amharicLabel || '-'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {c.isPassed === true ? (
                                  <span className="text-emerald-700 font-bold">አልፏል</span>
                                ) : c.isPassed === false ? (
                                  <span className="text-red-600 font-bold">አላለፈም</span>
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
                );
              })
            )}
          </div>

          {/* 4. Cumulative Performance Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-gold-400 font-bold block">አጠቃላይ የተጠራቀመ የትምህርት አፈጻጸም (Cumulative Performance)</span>
              <div className="flex items-center gap-4 mt-1 text-xs">
                <span>የተጠናቀቁ ዘመናት፦ <strong>{summary.totalTerms ?? 0}</strong></span>
                <span>ጠቅላላ ክሬዲት፦ <strong>{summary.cumulativeCredits ?? 0}</strong></span>
                <span>ማዕረግ፦ <strong>{summary.distinction || 'አጥጋቢ'}</strong></span>
              </div>
            </div>

            <div className="text-center sm:text-right bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-bold">ጠቅላላ አማካይ ውጤት (Cumulative GPA)</span>
              <strong className="text-2xl font-black text-gold-400">{cumulativeGpaNum.toFixed(2)}</strong>
              <span className="text-[10px] text-slate-400 block">ከ 4.00</span>
            </div>
          </div>

          {/* 5. Official Endorsement & Signatures */}
          <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-4">
              <p className="text-slate-500 font-bold">የመዝጋቢ አስተዳዳሪ ፊርማ</p>
              <div className="border-b border-slate-400 w-32 mx-auto pt-4" />
              <p className="text-[10px] text-slate-400">ቀን፦ {currentDate}</p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full border-2 border-slate-300 mx-auto flex items-center justify-center text-[10px] text-slate-400 uppercase tracking-widest">
                ማህተም
              </div>
              <p className="text-[10px] text-slate-500 font-bold">የሰንበት ት/ቤት ማህተም</p>
            </div>

            <div className="space-y-4">
              <p className="text-slate-500 font-bold">የትምህርት ክፍል ኃላፊ ፊርማ</p>
              <div className="border-b border-slate-400 w-32 mx-auto pt-4" />
              <p className="text-[10px] text-slate-400">ቀን፦ {currentDate}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiYearTranscriptModal;
