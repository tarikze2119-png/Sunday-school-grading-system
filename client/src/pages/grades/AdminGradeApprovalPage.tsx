import React, { useState, useEffect } from 'react';
import { 
  SubmissionReviewItem, 
  DeadlineOverviewItem, 
  CourseOfferingGradeSheet,
  GradeSubmissionStatus 
} from '../../types/grade.types';
import gradeService from '../../services/gradeService';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { toEthiopianDateString } from '../../utils/ethiopianCalendar';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  Sliders, 
  AlertCircle, 
  Calendar, 
  Users, 
  Globe, 
  RotateCcw, 
  FileText,
  ShieldCheck,
  Search,
  Filter
} from 'lucide-react';

export const AdminGradeApprovalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'submissions' | 'deadlines'>('submissions');
  const [submissions, setSubmissions] = useState<SubmissionReviewItem[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineOverviewItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('SUBMITTED');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Review Sheet Modal State
  const [inspectOfferingId, setInspectOfferingId] = useState<string | null>(null);
  const [inspectSheet, setInspectSheet] = useState<CourseOfferingGradeSheet | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Rejection Dialog State
  const [rejectionSubmissionId, setRejectionSubmissionId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Reopen Dialog State
  const [reopenSubmissionId, setReopenSubmissionId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  // Deadline Edit Modal State
  const [editingDeadlineOffering, setEditingDeadlineOffering] = useState<DeadlineOverviewItem | null>(null);
  const [newDeadline, setNewDeadline] = useState('');
  const [newIsOpen, setNewIsOpen] = useState(true);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gradeService.getSubmissionsForReview({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setSubmissions(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'የውጤት ሰነዶችን መጫን አልተቻለም።');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeadlines = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gradeService.getDeadlinesOverview();
      setDeadlines(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'የማስረከቢያ ቀናትን መጫን አልተቻለም።');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchSubmissions();
    } else {
      fetchDeadlines();
    }
  }, [activeTab, statusFilter]);

  const handleInspectSheet = async (offeringId: string) => {
    try {
      setInspectLoading(true);
      setInspectOfferingId(offeringId);
      const data = await gradeService.getOfferingGradeSheet(offeringId);
      setInspectSheet(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'የውጤት ሰነዱን መጫን አልተቻለም።');
    } finally {
      setInspectLoading(false);
    }
  };

  const handleApprove = async (submissionId: string) => {
    if (!window.confirm('ይህንን የውጤት ሰነድ ለማጽደቅ እርግጠኛ ነዎት? የጸደቁ ውጤቶች ወደ ተማሪዎች መዝገብ ይገባሉ።')) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const res = await gradeService.approveSubmission(submissionId);
      setSuccess(res.message);
      setTimeout(() => setSuccess(null), 3000);
      setInspectOfferingId(null);
      await fetchSubmissions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'ውጤቱን ማጽደቅ አልተቻለም።');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionSubmissionId || !rejectionReason.trim()) {
      setError('እባክዎ የተሟላ ውድቅ የማድረጊያ ምክንያት ያስገቡ።');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const res = await gradeService.rejectSubmission(rejectionSubmissionId, rejectionReason.trim());
      setSuccess(res.message);
      setTimeout(() => setSuccess(null), 3000);
      setRejectionSubmissionId(null);
      setRejectionReason('');
      setInspectOfferingId(null);
      await fetchSubmissions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'ውጤቱን ውድቅ ማድረግ አልተቻለም።');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async (submissionId: string) => {
    if (!window.confirm('ይህንን የጸደቀ ውጤት ለተማሪዎች ይፋ ለማድረግ (Publish) እርግጠኛ ነዎት?')) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const res = await gradeService.publishSubmission(submissionId);
      setSuccess(res.message);
      setTimeout(() => setSuccess(null), 3000);
      await fetchSubmissions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'ውጤቱን ይፋ ማድረግ አልተቻለም።');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenSubmissionId || !reopenReason.trim()) {
      setError('እባክዎ ዳግም የመክፈቻውን ምክንያት ያስገቡ።');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const res = await gradeService.reopenSubmission(reopenSubmissionId, reopenReason.trim());
      setSuccess(res.message);
      setTimeout(() => setSuccess(null), 3000);
      setReopenSubmissionId(null);
      setReopenReason('');
      await fetchSubmissions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'ውጤቱን ዳግም መክፈት አልተቻለም።');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeadlineOffering) return;

    try {
      setActionLoading(true);
      setError(null);
      await gradeService.setOfferingDeadline(editingDeadlineOffering.id, {
        gradeDeadline: newDeadline ? new Date(newDeadline).toISOString() : null,
        isSubmissionOpen: newIsOpen,
      });

      setSuccess('የማስረከቢያ ጊዜው በተሳካ ሁኔታ ተስተካክሏል።');
      setTimeout(() => setSuccess(null), 3000);
      setEditingDeadlineOffering(null);
      await fetchDeadlines();
    } catch (err: any) {
      setError(err.response?.data?.message || 'የማስረከቢያ ጊዜውን ማስተካከል አልተቻለም።');
    } finally {
      setActionLoading(false);
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
        return <Badge variant="danger">ውድቅ የተደረገ</Badge>;
      case 'DRAFT':
        return <Badge variant="warning">ረቂቅ</Badge>;
      default:
        return <Badge variant="neutral">ያልተጀመረ</Badge>;
    }
  };

  return (
    <div className="space-y-6 font-ethiopic">
      {/* Top Navigation Tabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">የውጤት ማጽደቅ እና የማስረከቢያ ጊዜ አስተዳደር</h1>
          <p className="text-xs text-slate-500 mt-1">
            በመምህራን የቀረቡ የውጤት ሰነዶችን ይገምግሙ፣ ያጽድቁ፣ ውድቅ ያድርጉ፣ ይፋ ያድርጉ እና ቀነ ገደብ ያስተዳድሩ።
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'submissions'
                ? 'bg-brand-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> የውጤት ማጽደቂያ
          </button>
          <button
            onClick={() => setActiveTab('deadlines')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'deadlines'
                ? 'bg-brand-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" /> የማስረከቢያ ጊዜ አስተዳደር
          </button>
        </div>
      </div>

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

      {/* ==================================================== */}
      {/* TAB 1: SUBMISSIONS REVIEW (Pending / Approved / etc) */}
      {/* ==================================================== */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {/* Status Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 pl-2">ሁኔታ፦</span>
            {[
              { key: 'SUBMITTED', label: 'ለማጽደቅ የቀረቡ' },
              { key: 'APPROVED', label: 'የጸደቁ' },
              { key: 'PUBLISHED', label: 'የታተሙ (ይፋ)' },
              { key: 'REJECTED', label: 'ውድቅ የተደረጉ' },
              { key: 'DRAFT', label: 'ረቂቆች' },
              { key: 'ALL', label: 'ሁሉም' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === f.key
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">የውጤት ሰነዶች እየተጫኑ ነው...</div>
          ) : submissions.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-2">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">ምንም የቀረበ የውጤት ሰነድ የለም</h3>
              <p className="text-xs text-slate-500">በተመረጠው ሁኔታ የተመዘገበ የውጤት ሰነድ አልተገኘም።</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">ኮርስ እና ምድብ</th>
                      <th className="p-3">የተመደበ መመዘኛ</th>
                      <th className="p-3">ያቀረበው መምህር</th>
                      <th className="p-3">የቀረበበት ቀን</th>
                      <th className="p-3 text-center">የተማሪዎች ብዛት</th>
                      <th className="p-3 text-center">ሁኔታ</th>
                      <th className="p-3 text-right">ተግባራት</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.map((sub, idx) => {
                      const offering = sub.courseOffering;
                      const subDate = sub.submissionDate ? new Date(sub.submissionDate) : null;

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">
                              {offering.course.amharicTitle || offering.course.title}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {offering.course.code} • {offering.batch.name} ({offering.academicYear.name})
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                              {offering.appliedScheme?.name || 'መደበኛ ምዘና'}{' '}
                              {offering.appliedScheme?.versionNumber
                                ? `(ቅጂ ${offering.appliedScheme.versionNumber})`
                                : ''}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">
                              {sub.submittedBy.firstName} {sub.submittedBy.lastName}
                            </div>
                            <div className="text-[11px] text-slate-500">{sub.submittedBy.phone || '-'}</div>
                          </td>
                          <td className="p-3 text-slate-600">
                            {subDate ? toEthiopianDateString(subDate) : '-'}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-800">
                            {offering._count.enrollments} ተማሪዎች
                          </td>
                          <td className="p-3 text-center">{getStatusBadge(sub.status)}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Inspect Sheet */}
                              <button
                                onClick={() => handleInspectSheet(sub.courseOfferingId)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> መርምር
                              </button>

                              {/* Approve Button */}
                              {sub.status === 'SUBMITTED' && (
                                <button
                                  onClick={() => handleApprove(sub.id)}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> አጽድቅ
                                </button>
                              )}

                              {/* Reject Button */}
                              {sub.status === 'SUBMITTED' && (
                                <button
                                  onClick={() => setRejectionSubmissionId(sub.id)}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> ውድቅ አድርግ
                                </button>
                              )}

                              {/* Publish Button */}
                              {sub.status === 'APPROVED' && (
                                <button
                                  onClick={() => handlePublish(sub.id)}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1.5 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                                >
                                  <Globe className="w-3.5 h-3.5" /> ይፋ አድርግ
                                </button>
                              )}

                              {/* Reopen Button */}
                              {(sub.status === 'APPROVED' || sub.status === 'PUBLISHED') && (
                                <button
                                  onClick={() => setReopenSubmissionId(sub.id)}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                  title="ውጤቱን ዳግም ክፈት"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> ዳግም ክፈት
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: DEADLINE MANAGEMENT */}
      {/* ==================================================== */}
      {activeTab === 'deadlines' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">ኮርስ እና ምድብ</th>
                    <th className="p-3">የተመደቡ መምህራን</th>
                    <th className="p-3">የማስረከቢያ ቀን</th>
                    <th className="p-3 text-center">ሁኔታ</th>
                    <th className="p-3 text-center">መግቢያ ሁኔታ</th>
                    <th className="p-3 text-right">ተግባር</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deadlines.map((dl, idx) => {
                    const dlDate = dl.gradeDeadline ? new Date(dl.gradeDeadline) : null;

                    return (
                      <tr key={dl.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{dl.courseName}</div>
                          <div className="text-[11px] text-slate-500">
                            {dl.courseCode} • {dl.batchName} ({dl.academicYearName})
                          </div>
                        </td>
                        <td className="p-3 text-slate-700 font-medium">
                          {(Array.isArray(dl.teachers) ? dl.teachers.join('፣ ') : '') || 'መምህር አልተመደበም'}
                        </td>
                        <td className="p-3">
                          <div
                            className={`font-bold ${
                              dl.isOverdue ? 'text-red-600' : 'text-slate-800'
                            }`}
                          >
                            {dlDate ? toEthiopianDateString(dlDate) : 'አልተወሰነም'}
                          </div>
                          {dl.daysRemaining !== null && (
                            <div className="text-[10px] text-slate-500">
                              {dl.daysRemaining > 0
                                ? `${dl.daysRemaining} ቀናት ይቀራሉ`
                                : `${Math.abs(dl.daysRemaining)} ቀናት አልፈዋል`}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">{getStatusBadge(dl.submissionStatus)}</td>
                        <td className="p-3 text-center">
                          {dl.isSubmissionOpen ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                              ክፍት ነው
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[11px]">
                              ተዘግቷል
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setEditingDeadlineOffering(dl);
                              setNewDeadline(
                                dl.gradeDeadline
                                  ? new Date(dl.gradeDeadline).toISOString().slice(0, 16)
                                  : ''
                              );
                              setNewIsOpen(dl.isSubmissionOpen);
                            }}
                            className="px-3 py-1.5 bg-brand-50 text-brand-800 hover:bg-brand-100 rounded-lg text-xs font-bold transition-colors"
                          >
                            ቀነ ገደብ አዘጋጅ
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: Full Grade Sheet Inspection                   */}
      {/* ==================================================== */}
      {inspectOfferingId && inspectSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-ethiopic">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-brand-100 text-brand-800 text-xs font-bold rounded">
                    {inspectSheet.offering.courseCode}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    {inspectSheet.offering.courseName}
                  </h2>
                  {inspectSheet.appliedScheme && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                      የተመደበ መመዘኛ፦ {inspectSheet.appliedScheme.name} (ቅጂ {inspectSheet.appliedScheme.versionNumber})
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {inspectSheet.offering.academicYearName} • {inspectSheet.offering.batchName} • መምህራን፦{' '}
                  {(Array.isArray(inspectSheet.offering.teachers) ? inspectSheet.offering.teachers.join(', ') : '') || 'አልተገለጸም'} • {inspectSheet.students.length} ተማሪዎች • የቀረበበት ቀን፦{' '}
                  {inspectSheet.latestSubmission?.submissionDate
                    ? toEthiopianDateString(new Date(inspectSheet.latestSubmission.submissionDate))
                    : 'አልተመዘገበም'}
                </p>
              </div>
              <button
                onClick={() => setInspectOfferingId(null)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700"
              >
                ዝጋ
              </button>
            </div>

            {/* Sheet Table */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5">መለያ ቁጥር</th>
                      <th className="p-2.5">ሙሉ ስም</th>
                      <th className="p-2.5">ክርስትና ስም</th>
                      {inspectSheet.assessments.map((a) => (
                        <th key={a.id} className="p-2.5 text-center bg-brand-50/40">
                          <div>{a.name}</div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            /{a.maxScore} ({a.weightPercentage}%)
                          </div>
                        </th>
                      ))}
                      <th className="p-2.5 text-center bg-slate-100">አጠቃላይ (100)</th>
                      <th className="p-2.5 text-center bg-slate-100">ደረጃ (Grade)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspectSheet.students.map((student, idx) => (
                      <tr key={student.enrollmentId} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-700">
                          {student.admissionNumber}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">{student.fullName}</td>
                        <td className="p-2.5 text-slate-600">{student.baptismalName || '-'}</td>
                        {inspectSheet.assessments.map((a) => {
                          const grade = student.grades[a.id];
                          return (
                            <td key={a.id} className="p-2.5 text-center font-bold text-slate-800">
                              {grade ? grade.scoreObtained : '-'}
                            </td>
                          );
                        })}
                        <td className="p-2.5 text-center font-extrabold text-slate-900 bg-slate-50/60">
                          {student.totalScore}
                        </td>
                        <td className="p-2.5 text-center bg-slate-50/60">
                          <span className="px-2 py-0.5 rounded font-bold text-xs bg-brand-100 text-brand-800">
                            {student.letterGrade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                የምዘና ክብደት ድምር፦ {inspectSheet.totalWeight}%
              </span>
              <div className="flex items-center gap-2">
                {inspectSheet.latestSubmission?.id &&
                  inspectSheet.latestSubmission.status === 'SUBMITTED' && (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() =>
                          setRejectionSubmissionId(inspectSheet.latestSubmission!.id)
                        }
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> ውድቅ አድርግ
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApprove(inspectSheet.latestSubmission!.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> አጽድቅ
                      </Button>
                    </>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: Rejection Reason (Mandatory Amharic Reason)  */}
      {/* ==================================================== */}
      {rejectionSubmissionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-ethiopic">
          <form
            onSubmit={handleReject}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4"
          >
            <div className="flex items-center gap-2.5 text-red-600">
              <XCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">የውጤት ሰነድን ውድቅ ማድረግ</h3>
            </div>
            <p className="text-xs text-slate-600">
              የውጤት ሰነዱ ውድቅ የሚደረግበትን ዝርዝር ምክንያት በአማርኛ ያስገቡ። መምህሩ ምክንያቱን ተመልክቶ ማስተካከያ አድርጎ በድጋሚ ያቀርባል።
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ውድቅ የተደረገበት ምክንያት (የግዴታ) *
              </label>
              <textarea
                required
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="ምሳሌ፦ የተማሪ ዮሐንስ ተስፋዬ የማጠቃለያ ፈተና ውጤት በስህተት ተመዝግቧል። እባክዎ አረጋግጠው ያስተካክሉ።"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setRejectionSubmissionId(null)}
              >
                ይቅር
              </Button>
              <Button type="submit" variant="danger" size="sm" loading={actionLoading}>
                ውድቅ አድርግ እና መልስ
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: Reopen Submission Reason                      */}
      {/* ==================================================== */}
      {reopenSubmissionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-ethiopic">
          <form
            onSubmit={handleReopen}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4"
          >
            <div className="flex items-center gap-2.5 text-amber-600">
              <RotateCcw className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">የውጤት ሰነድን ዳግም መክፈት</h3>
            </div>
            <p className="text-xs text-slate-600">
              የጸደቀ ወይም የታተመ ውጤትን ዳግም መክፈት ከፍተኛ ጥንቃቄ የሚያስፈልገው ሲሆን ድርጊቱ በAuditLog ውስጥ በዝርዝር ይመዘገባል።
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ዳግም የተከፈተበት ምክንያት *
              </label>
              <textarea
                required
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="ምሳሌ፦ በኮሚቴው ውሳኔ መሠረት ውጤት እንደገና እንዲታይ ስለታዘዘ..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setReopenSubmissionId(null)}
              >
                ይቅር
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={actionLoading}>
                ዳግም ክፈት
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: Edit Grade Deadline                           */}
      {/* ==================================================== */}
      {editingDeadlineOffering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-ethiopic">
          <form
            onSubmit={handleSaveDeadline}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-brand-700">
              <Clock className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">የማስረከቢያ ጊዜ ማስተካከያ</h3>
            </div>
            <p className="text-xs text-slate-500">
              {editingDeadlineOffering.courseName} ({editingDeadlineOffering.batchName})
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                የማስረከቢያ የመጨረሻ ቀን እና ሰዓት
              </label>
              <input
                type="datetime-local"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="isOpenToggle"
                checked={newIsOpen}
                onChange={(e) => setNewIsOpen(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <label htmlFor="isOpenToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                ውጤት ማስገቢያው ለመምህራን ክፍት ይሁን
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditingDeadlineOffering(null)}
              >
                ይቅር
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={actionLoading}>
                አስቀምጥ
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminGradeApprovalPage;
