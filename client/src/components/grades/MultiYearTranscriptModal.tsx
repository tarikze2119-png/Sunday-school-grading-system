import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import transcriptService, { OfficialTranscriptDocument } from '../../services/transcriptService';
import { 
  Printer, 
  X, 
  GraduationCap, 
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  History,
  Trash2,
  ChevronDown,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { toEthiopianDateString } from '../../utils/ethiopianCalendar';

interface Props {
  data: any;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export const MultiYearTranscriptModal: React.FC<Props> = ({ data, onClose, onStatusUpdated }) => {
  const { user } = useAuth();
  const isAdminOrSuperAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const currentDate = toEthiopianDateString(new Date());

  const [doc, setDoc] = useState<any>(data);
  const [loadingAction, setLoadingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [currentViewMode, setCurrentViewMode] = useState<'LATEST' | 'DRAFT' | 'VERSION'>('LATEST');

  // Load initial data
  useEffect(() => {
    if (data?.student?.id && !data.publication) {
      setLoadingAction(true);
      transcriptService
        .getOfficialTranscript(data.student.id)
        .then((fresh) => {
          setDoc(fresh);
        })
        .catch(() => {
          // Keep current data
        })
        .finally(() => setLoadingAction(false));
    } else {
      setDoc(data);
    }
  }, [data]);

  const studentId = doc?.student?.id;

  const handlePrint = () => {
    if (!isAdminOrSuperAdmin) {
      alert('ይፋዊ የትምህርት ማስረጃ የማተም ወይም የማውረድ ፈቃድ ለአስተዳዳሪዎች ብቻ የተፈቀደ ነው።');
      return;
    }
    window.print();
  };

  const handleLoadLatest = async () => {
    if (!studentId) return;
    try {
      setLoadingAction(true);
      setStatusMessage(null);
      const latest = await transcriptService.getOfficialTranscript(studentId);
      setDoc(latest);
      setCurrentViewMode('LATEST');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'ይፋዊ ሰነዱን መጫን አልተቻለም።');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleLoadDraft = async () => {
    if (!studentId) return;
    try {
      setLoadingAction(true);
      setStatusMessage(null);
      const draft = await transcriptService.getTranscriptDraft(studentId);
      setDoc(draft);
      setCurrentViewMode('DRAFT');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'ረቂቅ ሰነዱን መጫን አልተቻለም።');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleLoadVersion = async (vNum: number) => {
    if (!studentId) return;
    try {
      setLoadingAction(true);
      setStatusMessage(null);
      const ver = await transcriptService.getTranscriptVersion(studentId, vNum);
      setDoc(ver);
      setCurrentViewMode('VERSION');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || `ቅጽ ${vNum} መጫን አልተቻለም።`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handlePrepare = async () => {
    if (!studentId) return;
    try {
      setLoadingAction(true);
      setStatusMessage(null);
      const updated = await transcriptService.prepareOfficialTranscript(
        studentId,
        'ይፋዊ የትምህርት ማስረጃ በአስተዳዳሪው ተዘጋጅቶ ለግምገማ ቀርቧል።'
      );
      setDoc(updated);
      setCurrentViewMode('DRAFT');
      setStatusMessage('አዲስ ረቂቅ ሰነድ ተዘጋጅቷል! እባክዎ መረጃውን ገምግመው ያጽድቁ።');
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'ማስረጃውን ማዘጋጀት አልተቻለም።');
    } finally {
      setLoadingAction(false);
    }
  };

  const handlePublish = async () => {
    if (!studentId) return;
    try {
      setLoadingAction(true);
      setStatusMessage(null);
      const updated = await transcriptService.publishOfficialTranscript(
        studentId,
        'ይፋዊ የትምህርት ማስረጃ በይፋ ጸድቆ ታትሟል።'
      );
      setDoc(updated);
      setCurrentViewMode('LATEST');
      setStatusMessage(`ይፋዊ ማስረጃው በቅጽ ${updated.publication?.versionNumber || ''} በይፋ ጸድቆ ታትሟል!`);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'ማስረጃውን ማጽደቅ አልተቻለም።');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!studentId) return;
    const confirm = window.confirm('እርግጠኛ ነዎት ይህንን ረቂቅ ሰነድ መሰረዝ ይፈልጋሉ? ይህ እርምጃ የቀደሙትን ይፋዊ ሰነዶች አይነካም።');
    if (!confirm) return;

    try {
      setLoadingAction(true);
      setStatusMessage(null);
      const latest = await transcriptService.discardTranscriptDraft(
        studentId,
        'ረቂቁ በአስተዳዳሪው ተሰርዟል።'
      );
      setDoc(latest);
      setCurrentViewMode('LATEST');
      setStatusMessage('ረቂቅ ሰነዱ በተሳካ ሁኔታ ተሰርዟል። ወደ ቅርብ ጊዜ ይፋዊ ሰነድ ተመልሰዋል።');
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'ረቂቁን መሰረዝ አልተቻለም።');
    } finally {
      setLoadingAction(false);
    }
  };

  const student = doc?.student || {
    fullName: 'ያልተገለጸ ተማሪ',
    baptismalName: '',
    admissionNumber: '-',
    gender: '-',
  };

  const summary = doc?.summary || {
    totalTerms: 0,
    cumulativeCredits: 0,
    cumulativeGpa: 0,
    distinction: 'አጥጋቢ',
  };

  const historyTerms = Array.isArray(doc?.historyTerms)
    ? doc.historyTerms
    : Array.isArray(doc?.academicTerms)
    ? doc.academicTerms
    : [];

  const cumulativeGpaNum = typeof summary.cumulativeGpa === 'number'
    ? summary.cumulativeGpa
    : Number(summary.cumulativeGpa) || 0;

  const publication = doc?.publication || {
    status: 'NOT_PREPARED',
    versionNumber: null,
    targetVersionNumber: null,
    isDraft: false,
    isHistorical: false,
    preparedAt: null,
    preparedByName: null,
    publishedAt: null,
    publishedByName: null,
    notes: null,
  };

  const isPublished = publication.status === 'PUBLISHED';
  const isDraftView = publication.status === 'PREPARED' || publication.isDraft;
  const isHistorical = publication.isHistorical;
  const activeDraft = doc?.activeDraft;
  const availableVersions = doc?.availableVersions || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-ethiopic">
      {/* Container */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">

        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-gold-400" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm block">ይፋዊ የተማሪ የትምህርት ታሪክ ማስረጃ</span>
                {publication.versionNumber && (
                  <span className="px-2 py-0.5 rounded-md bg-gold-500/20 text-gold-300 font-mono text-xs font-bold border border-gold-500/40">
                    ቅጽ {publication.versionNumber} (v{publication.versionNumber})
                  </span>
                )}
                {isDraftView && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono text-xs font-bold border border-blue-500/40">
                    ረቂቅ (Draft {publication.targetVersionNumber ? `v${publication.targetVersionNumber}` : ''})
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">
                የተማሪ መለያ፦ <strong className="text-white font-mono">{student.admissionNumber}</strong> • {student.fullName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Version Switcher if multiple versions or draft exist */}
            {(availableVersions.length > 1 || activeDraft) && (
              <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl text-xs">
                {currentViewMode !== 'LATEST' && isPublished && (
                  <button
                    type="button"
                    onClick={handleLoadLatest}
                    disabled={loadingAction}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium text-[11px]"
                    title="ወደ ቅርብ ጊዜ ይፋዊ ሰነድ ተመለስ"
                  >
                    የቅርብ ጊዜ
                  </button>
                )}

                {availableVersions.length > 1 && (
                  <select
                    value={publication.versionNumber || ''}
                    onChange={(e) => handleLoadVersion(Number(e.target.value))}
                    disabled={loadingAction}
                    aria-label="የተማሪ የትምህርት ታሪክ ቅጽ ይምረጡ"
                    className="bg-slate-900 text-slate-200 text-xs rounded-lg px-2 py-1 border border-slate-700 focus:outline-none focus:border-gold-500"
                  >
                    <option value="" disabled>የቀደሙ ቅጾች...</option>
                    {availableVersions.map((v: any) => (
                      <option key={v.versionNumber} value={v.versionNumber}>
                        ቅጽ {v.versionNumber} ({toEthiopianDateString(new Date(v.publishedAt))})
                      </option>
                    ))}
                  </select>
                )}

                {activeDraft && currentViewMode !== 'DRAFT' && (
                  <button
                    type="button"
                    onClick={handleLoadDraft}
                    disabled={loadingAction}
                    className="px-2.5 py-1 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition font-bold text-[11px] flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3" /> ረቂቅ (v{activeDraft.targetVersionNumber})
                  </button>
                )}
              </div>
            )}

            {/* Action Buttons for Admin/Super Admin */}
            {isAdminOrSuperAdmin && (
              <>
                {/* Prepare Draft Button (when not in draft mode and no active draft) */}
                {!isDraftView && !activeDraft && (
                  <button
                    type="button"
                    onClick={handlePrepare}
                    disabled={loadingAction}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>{loadingAction ? 'በማዘጋጀት ላይ...' : isPublished ? 'አዲስ ረቂቅ አዘጋጅ' : 'ሰነዱን አዘጋጅ'}</span>
                  </button>
                )}

                {/* Publish Button (when viewing a draft) */}
                {isDraftView && (
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={loadingAction}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{loadingAction ? 'በማጽደቅ ላይ...' : `በይፋ አጽድቅና አትም (${publication.targetVersionNumber ? `ቅጽ ${publication.targetVersionNumber}` : 'Publish'})`}</span>
                  </button>
                )}

                {/* Discard Draft Button (when in draft mode) */}
                {isDraftView && (
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    disabled={loadingAction}
                    className="px-2.5 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-bold text-xs rounded-xl flex items-center gap-1 transition shadow-sm cursor-pointer disabled:opacity-50"
                    title="ረቂቅ ሰነዱን ሰርዝ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ረቂቁን ሰርዝ</span>
                  </button>
                )}
              </>
            )}

            {/* Print Button (Available ONLY to Admin and Super Admin) */}
            {isAdminOrSuperAdmin && (
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 bg-gold-600 hover:bg-gold-700 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" /> በPDF አትም (Print / Save PDF)
              </button>
            )}

            {/* Publication History Toggle */}
            {doc?.publicationHistory && doc.publicationHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                title="የሰነዱን ታሪክ ይመልከቱ"
              >
                <History className="w-4 h-4" />
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informative Status Notification / Banner */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs print:hidden gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-600">የሰነዱ ሁኔታ፦</span>
            {isPublished && !isHistorical && (
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> በይፋ የጸደቀ - ቅጽ {publication.versionNumber || '1'} (Latest Published)
              </span>
            )}
            {isPublished && isHistorical && (
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1 text-[11px]">
                <Clock className="w-3.5 h-3.5" /> የቀደመ ይፋዊ ሰነድ - ቅጽ {publication.versionNumber} (Historical Sealed Snapshot)
              </span>
            )}
            {isDraftView && (
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 text-[11px]">
                <Clock className="w-3.5 h-3.5" /> ረቂቅ ሰነድ - በመገምገም ላይ (Working Draft)
              </span>
            )}
            {!isPublished && !isDraftView && (
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" /> አልተዘጋጀም (Not Prepared)
              </span>
            )}

            {publication.publishedByName && (
              <span className="text-slate-500 text-[11px] ml-2 hidden md:inline">
                ያጸደቀው፦ <strong>{publication.publishedByName}</strong> (
                {publication.publishedAt ? toEthiopianDateString(new Date(publication.publishedAt)) : ''})
              </span>
            )}

            {isHistorical && (
              <button
                type="button"
                onClick={handleLoadLatest}
                className="ml-2 text-brand-700 underline font-bold hover:text-brand-900 cursor-pointer"
              >
                ወደ ቅርብ ጊዜ ይፋዊ ሰነድ ተመለስ
              </button>
            )}
          </div>

          {/* Active Draft Alert when viewing published document */}
          {!isDraftView && activeDraft && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl text-blue-800 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>ንቁ ረቂቅ ሰነድ ለቅጽ {activeDraft.targetVersionNumber} አለ።</span>
              <button
                type="button"
                onClick={handleLoadDraft}
                className="font-bold underline text-blue-900 hover:text-blue-950 cursor-pointer"
              >
                ረቂቁን ገምግም
              </button>
              {isAdminOrSuperAdmin && (
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="font-bold text-rose-700 hover:text-rose-900 ml-1 cursor-pointer"
                >
                  ሰርዝ
                </button>
              )}
            </div>
          )}

          {statusMessage && (
            <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {statusMessage}
            </span>
          )}
        </div>

        {/* Publication History Drawer (Optional) */}
        {showHistory && doc?.publicationHistory && (
          <div className="bg-slate-50 p-4 border-b border-slate-200 text-xs print:hidden space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <History className="w-4 h-4 text-brand-700" /> የይፋዊ ሰነድ ዝግጅት፣ ህትመት እና ረቂቅ ታሪክ (Publication & Workflow Trail)
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {doc.publicationHistory.map((h: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-[11px]">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-800">
                      {h.actionLabel || (h.action === 'PUBLISH_OFFICIAL_TRANSCRIPT' ? `በይፋ ጸድቆ ታትሟል - ቅጽ ${h.versionNumber || ''}` : 'ለግምገማ ተዘጋጅቷል')}
                    </strong>
                    <span className="text-slate-500">በ {h.adminName}</span>
                    {h.notes && <span className="text-slate-400">({h.notes})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {h.action === 'PUBLISH_OFFICIAL_TRANSCRIPT' && h.versionNumber && (
                      <button
                        type="button"
                        onClick={() => handleLoadVersion(h.versionNumber)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-brand-800 rounded text-[10px] font-bold border border-slate-300 cursor-pointer"
                      >
                        ቅጽ {h.versionNumber} ተመልከት
                      </button>
                    )}
                    <span className="text-slate-400 font-mono">
                      {toEthiopianDateString(new Date(h.createdAt))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable Printable Document Body */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 print:p-0 print:m-0 print:overflow-visible relative" id="printable-transcript-doc">

          {/* Watermark */}
          {isDraftView && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 print:opacity-10 z-0">
              <span className="text-8xl sm:text-9xl font-black text-slate-900 -rotate-45 uppercase select-none">
                ረቂቅ / DRAFT
              </span>
            </div>
          )}
          {isHistorical && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 print:opacity-10 z-0">
              <span className="text-7xl sm:text-8xl font-black text-slate-900 -rotate-45 uppercase select-none">
                የቀደመ ቅጽ {publication.versionNumber} / ARCHIVED
              </span>
            </div>
          )}

          {/* 1. Header Banner & Church Insignia */}
          <div className="text-center border-b-2 border-slate-900 pb-6 space-y-2 relative z-10">
            <div className="flex items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full border border-slate-200 flex items-center justify-center bg-white shadow-sm overflow-hidden p-1 shrink-0">
                <img
                  src="/assets/haimote-abraham-logo.png"
                  alt="ሐይመተ አብርሃም ሰንበት ትምህርት ቤት ሎጎ"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-bold text-slate-600 tracking-wide uppercase">
                  በስመ አብ ወወልድ ወመንፈስ ቅዱስ አሐዱ አምላክ አሜን
                </div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተክርስቲያን
                </h1>
                <h2 className="text-sm sm:text-base font-bold text-brand-900">
                  ሐይመተ አብርሃም ሰንበት ትምህርት ቤት የተማሪዎች የትምህርት ማስረጃ (Official Academic Transcript)
                </h2>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500">
              <span>የትምህርት እና ሥነ-ምግባር ክፍል • የውጤት አስተዳደር ማዕከል</span>
              {publication.versionNumber && (
                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                  ቅጽ፦ {publication.versionNumber} (Version {publication.versionNumber})
                </span>
              )}
            </div>
          </div>

          {/* 2. Student Profile Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs relative z-10">
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
          <div className="space-y-6 relative z-10">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-700" />
              የትምህርት ዘመናት እና የውጤት ዝርዝር (Academic Terms Progression)
            </h3>

            {historyTerms.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">እስካሁን የተመዘገበ የትምህርት ዘመን ውጤት የለም።</p>
            ) : (
              historyTerms.map((term: any, tIdx: number) => {
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
                          {courses.map((c: any, cIdx: number) => (
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
          <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
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
          <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-3 gap-6 text-center text-xs relative z-10">
            <div className="space-y-3">
              <p className="text-slate-500 font-bold">የመዝጋቢ አስተዳዳሪ ፊርማ</p>
              <div className="border-b border-slate-400 w-32 mx-auto pt-4" />
              <p className="text-[10px] text-slate-400">ቀን፦ {currentDate}</p>
              {publication.publishedByName && (
                <p className="text-[10px] text-slate-600 font-mono">({publication.publishedByName})</p>
              )}
            </div>

            <div className="space-y-3">
              <div className={`w-16 h-16 rounded-full border-2 mx-auto flex items-center justify-center text-[10px] uppercase tracking-widest ${
                isPublished ? 'border-emerald-600 text-emerald-800 font-bold bg-emerald-50' : 'border-slate-300 text-slate-400'
              }`}>
                {isPublished ? `ቅጽ ${publication.versionNumber || '1'}` : 'ማህተም'}
              </div>
              <p className="text-[10px] text-slate-500 font-bold">የሰንበት ት/ቤት ማህተም</p>
            </div>

            <div className="space-y-3">
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
