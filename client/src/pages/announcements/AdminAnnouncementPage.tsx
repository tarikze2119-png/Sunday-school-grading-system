import React, { useState, useEffect } from 'react';
import announcementService, { AdminAnnouncementFilterParams } from '../../services/announcementService';
import academicService from '../../services/academicService';
import studentService from '../../services/studentService';
import teacherService from '../../services/teacherService';
import { 
  AnnouncementItem, 
  DetailedRecipientStats, 
  AnnouncementTargetAudience, 
  AnnouncementPriority, 
  AnnouncementStatus 
} from '../../types/announcement.types';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { 
  Megaphone, 
  Plus, 
  Filter, 
  RefreshCw, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Edit3, 
  Archive, 
  Send, 
  Users, 
  X, 
  Loader2, 
  BarChart3,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { toEthiopianDateString } from '../../utils/ethiopianCalendar';

export const AdminAnnouncementPage: React.FC = () => {
  // Announcements State
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | 'ALL'>('ALL');
  const [audienceFilter, setAudienceFilter] = useState<AnnouncementTargetAudience | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<AnnouncementPriority | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown Catalogs for form
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [statsData, setStatsData] = useState<DetailedRecipientStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsSearch, setStatsSearch] = useState('');

  // Form Fields State
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAudience, setFormAudience] = useState<AnnouncementTargetAudience>('ALL_USERS');
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('NORMAL');
  const [formPublishOption, setFormPublishOption] = useState<'NOW' | 'SCHEDULED' | 'DRAFT'>('NOW');
  const [formBatchId, setFormBatchId] = useState('');
  const [formStudentId, setFormStudentId] = useState('');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formPublishAt, setFormPublishAt] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirmPublishOpen, setIsConfirmPublishOpen] = useState(false);

  // Load Catalogs
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [bts, stus, tchs] = await Promise.all([
          academicService.getBatches().catch(() => []),
          studentService.getStudents().catch(() => []),
          teacherService.getTeachers().catch(() => []),
        ]);
        setBatches(Array.isArray(bts) ? bts : []);
        setStudents(Array.isArray(stus) ? stus : []);
        setTeachers(Array.isArray(tchs) ? tchs : []);
      } catch (err) {
        console.error('Failed to load catalogs:', err);
      }
    };
    loadCatalogs();
  }, []);

  // Fetch Announcements
  const fetchAnnouncements = async (targetPage = page) => {
    try {
      setLoading(true);
      setError(null);
      const params: AdminAnnouncementFilterParams = {
        status: statusFilter,
        targetAudience: audienceFilter,
        priority: priorityFilter,
        search: searchQuery.trim() || undefined,
        page: targetPage,
        limit: 15,
      };

      const res = await announcementService.getAdminAnnouncements(params);
      setAnnouncements(res.items || []);
      setTotalCount(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
      setPage(res.pagination.page);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'ማስታወቂያዎችን መጫን አልተቻለም።');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements(1);
  }, [statusFilter, audienceFilter, priorityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAnnouncements(1);
  };

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setAudienceFilter('ALL');
    setPriorityFilter('ALL');
    setSearchQuery('');
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormAudience('ALL_USERS');
    setFormPriority('NORMAL');
    setFormPublishOption('NOW');
    setFormBatchId('');
    setFormStudentId('');
    setFormTeacherId('');
    setFormPublishAt('');
    setFormExpiresAt('');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (ann: AnnouncementItem) => {
    setEditingId(ann.id);
    setFormTitle(ann.title);
    setFormContent(ann.content);
    setFormAudience(ann.targetAudience);
    setFormPriority(ann.priority);
    setFormPublishOption(ann.status === 'DRAFT' ? 'DRAFT' : ann.status === 'SCHEDULED' ? 'SCHEDULED' : 'NOW');
    setFormBatchId(ann.batch?.id || '');
    setFormStudentId(ann.student?.id || '');
    setFormTeacherId(ann.teacher?.id || '');
    setFormPublishAt(ann.publishAt ? new Date(ann.publishAt).toISOString().slice(0, 16) : '');
    setFormExpiresAt(ann.expiresAt ? new Date(ann.expiresAt).toISOString().slice(0, 16) : '');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Save Announcement (Draft or Direct/Schedule)
  const handleFormSubmit = async () => {
    if (!formTitle.trim()) {
      setFormError('እባክዎ የማስታወቂያ ርዕስ ያስገቡ።');
      return;
    }
    if (!formContent.trim()) {
      setFormError('እባክዎ የማስታወቂያ ዝርዝር መልእክት ያስገቡ።');
      return;
    }

    if (formAudience === 'SPECIFIC_BATCH' && !formBatchId) {
      setFormError('እባክዎ የተማሪዎች ምድብ ይምረጡ።');
      return;
    }
    if (formAudience === 'INDIVIDUAL_STUDENT' && !formStudentId) {
      setFormError('እባክዎ ተማሪ ይምረጡ።');
      return;
    }
    if (formAudience === 'INDIVIDUAL_TEACHER' && !formTeacherId) {
      setFormError('እባክዎ መምህር ይምረጡ።');
      return;
    }

    // If publishing immediately and not editing a draft, show confirmation step
    if (formPublishOption === 'NOW' && !isConfirmPublishOpen) {
      setIsConfirmPublishOpen(true);
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const computedStatus: AnnouncementStatus =
        formPublishOption === 'DRAFT'
          ? 'DRAFT'
          : formPublishOption === 'SCHEDULED'
          ? 'SCHEDULED'
          : 'PUBLISHED';

      const payload = {
        title: formTitle.trim(),
        content: formContent.trim(),
        targetAudience: formAudience,
        priority: formPriority,
        status: computedStatus,
        batchId: formAudience === 'SPECIFIC_BATCH' ? formBatchId : null,
        studentId: formAudience === 'INDIVIDUAL_STUDENT' ? formStudentId : null,
        teacherId: formAudience === 'INDIVIDUAL_TEACHER' ? formTeacherId : null,
        publishAt: formPublishOption === 'SCHEDULED' && formPublishAt ? new Date(formPublishAt).toISOString() : new Date().toISOString(),
        expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
      };

      if (editingId) {
        await announcementService.updateAnnouncement(editingId, payload);
      } else {
        await announcementService.createAnnouncement(payload);
      }

      setIsConfirmPublishOpen(false);
      setIsFormOpen(false);
      fetchAnnouncements(1);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'ማስታወቂያውን ማስቀመጥ አልተቻለም።');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Publish Draft Action
  const handlePublishNow = async (id: string) => {
    if (!window.confirm('ይህንን ማስታወቂያ አሁን ወደ ሁሉም ተቀባዮች ለመለጠፍ እርግጠኛ ነዎት?')) {
      return;
    }
    try {
      await announcementService.publishAnnouncement(id);
      fetchAnnouncements(page);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'ማስታወቂያውን መለጠፍ አልተቻለም።');
    }
  };

  // Archive Action
  const handleArchive = async (id: string) => {
    if (!window.confirm('ይህንን ማስታወቂያ ወደ ማህደር (Archive) ለማዛወር እርግጠኛ ነዎት? ወደ ማህደር የተዛወረ ማስታወቂያ ለተቀባዮች አይታይም።')) {
      return;
    }
    try {
      await announcementService.archiveAnnouncement(id);
      fetchAnnouncements(page);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'ማስታወቂያውን ወደ ማህደር ማዛወር አልተቻለም።');
    }
  };

  // View Recipient Delivery & Read Stats
  const handleViewStats = async (id: string) => {
    try {
      setIsStatsOpen(true);
      setStatsLoading(true);
      setStatsSearch('');
      const data = await announcementService.getDetailedRecipientStats(id);
      setStatsData(data);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'የማስታወቂያውን ስታቲስቲክስ መጫን አልተቻለም።');
      setIsStatsOpen(false);
    } finally {
      setStatsLoading(false);
    }
  };

  // Helper labels
  const getAudienceLabel = (aud: AnnouncementTargetAudience, ann?: AnnouncementItem) => {
    switch (aud) {
      case 'ALL_USERS':
        return 'ለሁሉም ተጠቃሚዎች';
      case 'ALL_STUDENTS':
        return 'ለሁሉም ተማሪዎች';
      case 'SPECIFIC_BATCH':
        return ann?.batch ? `ምድብ፦ ${ann.batch.name}` : 'ለተመረጠ ምድብ';
      case 'INDIVIDUAL_STUDENT':
        return ann?.student?.user ? `ተማሪ፦ ${ann.student.user.firstName} ${ann.student.user.lastName}` : 'ለአንድ ተማሪ';
      case 'ALL_TEACHERS':
        return 'ለሁሉም መምህራን';
      case 'INDIVIDUAL_TEACHER':
        return ann?.teacher?.user ? `መምህር፦ ${ann.teacher.user.firstName} ${ann.teacher.user.lastName}` : 'ለአንድ መምህር';
      default:
        return aud;
    }
  };

  const getStatusBadge = (status: AnnouncementStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="success">የታተመ / የተለጠፈ</Badge>;
      case 'SCHEDULED':
        return <Badge variant="info">ቀጠሮ የተያዘለት</Badge>;
      case 'DRAFT':
        return <Badge variant="neutral">ረቂቅ (Draft)</Badge>;
      case 'EXPIRED':
        return <Badge variant="warning">ቀኑ ያለፈበት</Badge>;
      case 'ARCHIVED':
        return <Badge variant="danger">በማህደር የተቀመጠ</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const filteredStatsRecipients = statsData?.recipients.filter((r) => {
    if (!statsSearch.trim()) return true;
    const q = statsSearch.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(q) ||
      r.identifier.toLowerCase().includes(q) ||
      (r.batchName && r.batchName.toLowerCase().includes(q))
    );
  }) || [];

  return (
    <div className="space-y-6 font-ethiopic">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-brand-950 via-slate-900 to-brand-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-gold-400 bg-gold-400/20 px-3 py-1 rounded-full border border-gold-400/30">
            ሐይመተ አብርሃም ሰንበት ትምህርት ቤት
          </span>
          <h1 className="text-xl sm:text-2xl font-black mt-2">የማስታወቂያዎችና መልእክቶች አስተዳደር ማዕከል</h1>
          <p className="text-xs text-brand-100 mt-1 max-w-xl">
            ለሁሉም ተጠቃሚዎች፣ ለተማሪዎች፣ ለተመረጡ ምድቦች ወይም ለአንድ መምህር/ተማሪ ይፋዊ ማስታወቂያዎችን ይለጥፉ፤ የርክክብ እና የማንበብ ሁኔታን ይከታተሉ።
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl text-xs flex items-center gap-2 transition shadow-lg shadow-brand-500/25 shrink-0 self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> አዲስ ማስታወቂያ ፍጠር
        </button>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-brand-600" /> የማስታወቂያ ማጣሪያዎች (Filters)
          </span>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-[11px] text-slate-500 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> ማጣሪያዎችን አጽዳ
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Status Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">ሁኔታ (Status)</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium"
            >
              <option value="ALL">ሁሉም ሁኔታዎች</option>
              <option value="PUBLISHED">የታተመ (Published)</option>
              <option value="SCHEDULED">ቀጠሮ የተያዘለት (Scheduled)</option>
              <option value="DRAFT">ረቂቅ (Draft)</option>
              <option value="EXPIRED">ቀኑ ያለፈበት (Expired)</option>
              <option value="ARCHIVED">በማህደር የተቀመጠ (Archived)</option>
            </select>
          </div>

          {/* Audience Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">ተቀባይ ታዳሚ (Audience)</label>
            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium"
            >
              <option value="ALL">ሁሉም ተቀባዮች</option>
              <option value="ALL_USERS">ለሁሉም ተጠቃሚዎች</option>
              <option value="ALL_STUDENTS">ለሁሉም ተማሪዎች</option>
              <option value="SPECIFIC_BATCH">ለተመረጠ ምድብ</option>
              <option value="INDIVIDUAL_STUDENT">ለአንድ ተማሪ</option>
              <option value="ALL_TEACHERS">ለሁሉም መምህራን</option>
              <option value="INDIVIDUAL_TEACHER">ለአንድ መምህር</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">ደረጃ (Priority)</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium"
            >
              <option value="ALL">ሁሉም ደረጃዎች</option>
              <option value="NORMAL">መደበኛ (Normal)</option>
              <option value="IMPORTANT">አስፈላጊ / አስቸኳይ (Important)</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">በርዕስ / ይዘት ፈልግ</label>
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ርዕስ ወይም ቃል ይፈልጉ..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium"
              />
              <button
                type="submit"
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 3. Announcements Data Table */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchAnnouncements(page)}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg font-bold text-red-800 transition text-[11px]"
          >
            እንደገና ሞክር
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">
            ጠቅላላ ማስታወቂያዎች፦ <strong className="text-slate-900">{totalCount}</strong>
          </span>
          <span className="text-slate-500">ገጽ {page} ከ {totalPages || 1}</span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-xs text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            <span>ማስታወቂያዎች እየተጫኑ ነው...</span>
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
            <p>ምንም ማስታወቂያ አልተገኘም።</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                  <th className="py-3 px-4">ርዕስ</th>
                  <th className="py-3 px-4">ተቀባይ ታዳሚ</th>
                  <th className="py-3 px-4 text-center">ደረጃ</th>
                  <th className="py-3 px-4 text-center">ሁኔታ</th>
                  <th className="py-3 px-4 text-center">የሚለጠፍበት ቀን</th>
                  <th className="py-3 px-4 text-center">የርክክብ / የማንበብ ምጣኔ</th>
                  <th className="py-3 px-4 text-center">ተግባራት</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {announcements.map((ann) => {
                  const publishDate = ann.publishAt ? toEthiopianDateString(new Date(ann.publishAt)) : '-';
                  const isImportant = ann.priority === 'IMPORTANT';
                  const stats = ann.stats || { totalRecipients: 0, readCount: 0, readPercentage: 0 };

                  return (
                    <tr key={ann.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 max-w-xs">
                        <strong className="text-slate-900 block font-bold text-xs truncate">
                          {ann.title}
                        </strong>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {ann.content}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {getAudienceLabel(ann.targetAudience, ann)}
                        </span>
                        {ann.batch && (
                          <span className="text-[10px] text-brand-600 block">
                            {ann.batch.academicYear?.name} ({ann.batch.stageLevel})
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isImportant ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-warmOrange-50 text-warmOrange-700 border border-warmOrange-200">
                            <AlertTriangle className="w-3 h-3 text-warmOrange-600" /> አስቸኳይ
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">መደበኛ</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(ann.status)}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-600">
                        {publishDate}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-700 font-mono">
                            {stats.readCount} / {stats.totalRecipients} ({stats.readPercentage}%)
                          </span>
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(100, stats.readPercentage)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewStats(ann.id)}
                            title="የማንበብ ስታቲስቲክስ"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-brand-700 hover:bg-brand-50 transition cursor-pointer"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>

                          {ann.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => handlePublishNow(ann.id)}
                              title="አሁን አትም / ልቀቅ"
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition cursor-pointer"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {!ann.isArchived && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(ann)}
                              title="አስተካክል"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {!ann.isArchived && (
                            <button
                              type="button"
                              onClick={() => handleArchive(ann.id)}
                              title="ወደ ማህደር አዛውር"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                            >
                              <Archive className="w-4 h-4" />
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
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => fetchAnnouncements(page - 1)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              &larr; ያለፈው
            </button>
            <span className="text-slate-500 font-medium">ገጽ {page} ከ {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => fetchAnnouncements(page + 1)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              ቀጣይ &rarr;
            </button>
          </div>
        )}
      </div>

      {/* 4. Create / Edit Announcement Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-ethiopic">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gold-400/20 text-gold-400 border border-gold-400/30 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {editingId ? 'ማስታወቂያውን ማስተካከያ' : 'አዲስ ይፋዊ ማስታወቂያ ማዘጋጃ'}
                  </h3>
                  <p className="text-[11px] text-slate-300">ሐይመተ አብርሃም ሰንበት ትምህርት ቤት</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setIsConfirmPublishOpen(false);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  የማስታወቂያው ርዕስ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="ለምሳሌ፡ የመንፈቀ ትምህርት ምዝገባ ማስታወቂያ..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              {/* Content */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  የማስታወቂያው ሙሉ ዝርዝር መልእክት <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="የማስታወቂያውን ሙሉ መልእክት እዚህ ይጻፉ..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium leading-relaxed"
                />
              </div>

              {/* Audience and Priority in 2-cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Target Audience */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    ተቀባይ ታዳሚ (Target Audience) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formAudience}
                    onChange={(e) => setFormAudience(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium"
                  >
                    <option value="ALL_USERS">1. ለሁሉም ተጠቃሚዎች (All Users)</option>
                    <option value="ALL_STUDENTS">2. ለሁሉም ተማሪዎች (All Students)</option>
                    <option value="SPECIFIC_BATCH">3. ለተመረጠ ምድብ (Specific Batch)</option>
                    <option value="INDIVIDUAL_STUDENT">4. ለአንድ ተማሪ (Individual Student)</option>
                    <option value="ALL_TEACHERS">5. ለሁሉም መምህራን (All Teachers)</option>
                    <option value="INDIVIDUAL_TEACHER">6. ለአንድ መምህር (Individual Teacher)</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">የማስታወቂያው ደረጃ (Priority)</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 font-medium"
                  >
                    <option value="NORMAL">መደበኛ (Normal)</option>
                    <option value="IMPORTANT">አስፈላጊ / አስቸኳይ (Important - ይደምቃል)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Target Selection */}
              {formAudience === 'SPECIFIC_BATCH' && (
                <div className="p-3 bg-brand-50/70 border border-brand-200 rounded-2xl space-y-1">
                  <label className="font-bold text-brand-900 block mb-1">
                    የተማሪዎች ምድብ ይምረጡ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formBatchId}
                    onChange={(e) => setFormBatchId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-brand-500 font-medium"
                  >
                    <option value="">-- ምድብ ይምረጡ --</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.stageLevel}) • {b.academicYear?.name || ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formAudience === 'INDIVIDUAL_STUDENT' && (
                <div className="p-3 bg-brand-50/70 border border-brand-200 rounded-2xl space-y-1">
                  <label className="font-bold text-brand-900 block mb-1">
                    ተማሪ ይምረጡ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-brand-500 font-medium"
                  >
                    <option value="">-- ተማሪ ይምረጡ --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.user?.firstName} {s.user?.lastName} ({s.admissionNumber}) • {s.batch?.name || ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formAudience === 'INDIVIDUAL_TEACHER' && (
                <div className="p-3 bg-brand-50/70 border border-brand-200 rounded-2xl space-y-1">
                  <label className="font-bold text-brand-900 block mb-1">
                    መምህር ይምረጡ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formTeacherId}
                    onChange={(e) => setFormTeacherId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-brand-500 font-medium"
                  >
                    <option value="">-- መምህር ይምረጡ --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.spiritualTitle || ''} {t.user?.firstName} {t.user?.lastName} ({t.teacherCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Publication Option */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="font-bold text-slate-800 block">የማስታወቂያው የመለጠፊያ አማራጭ</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormPublishOption('NOW')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition cursor-pointer ${
                      formPublishOption === 'NOW'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    1. አሁን ልቀቅ (Publish Now)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormPublishOption('SCHEDULED')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition cursor-pointer ${
                      formPublishOption === 'SCHEDULED'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    2. ቀጠሮ ያዝ (Schedule)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormPublishOption('DRAFT')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition cursor-pointer ${
                      formPublishOption === 'DRAFT'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    3. ረቂቅ አስቀምጥ (Save Draft)
                  </button>
                </div>

                {/* Scheduled Date picker */}
                {formPublishOption === 'SCHEDULED' && (
                  <div className="pt-2">
                    <label className="font-bold text-slate-700 block mb-1">የሚለጠፍበት ቀን እና ሰዓት</label>
                    <input
                      type="datetime-local"
                      value={formPublishAt}
                      onChange={(e) => setFormPublishAt(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Expiration Date picker */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  የማስታወቂያው ማብቂያ ቀን እና ሰዓት (አማራጭ)
                </label>
                <input
                  type="datetime-local"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  ከተወሰነው ቀን በኋላ ማስታወቂያው ለተጠቃሚዎች አይታይም፤ ነገር ግን በአስተዳዳሪው ማህደር ውስጥ ይቀመጣል።
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setIsConfirmPublishOpen(false);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold transition text-xs cursor-pointer"
              >
                ተመለስ
              </button>
              <button
                type="button"
                disabled={formSubmitting}
                onClick={handleFormSubmit}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl font-bold transition text-xs flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{editingId ? 'ለውጦችን አጽድቅ' : formPublishOption === 'NOW' ? 'ቀጥል &rarr;' : 'አስቀምጥ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Confirmation Step before Immediate Publishing */}
      {isConfirmPublishOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-xs flex items-center justify-center p-4 font-ethiopic">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">ማስታወቂያውን መለጠፍ ያረጋግጡ</h3>
              <p className="text-xs text-slate-500">
                ማስታወቂያው ወዲያውኑ ወደ ተመረጡት ተቀባዮች ዳሽቦርድ ይላካል፤ በሲስተሙ ውስጥም መልእክት (In-app Notification) ይደርሳቸዋል።
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div>
                <span className="text-slate-400 block text-[10px]">ርዕስ፦</span>
                <strong className="text-slate-900">{formTitle}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">ተቀባይ፦</span>
                <strong className="text-brand-800">{getAudienceLabel(formAudience)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">ደረጃ፦</span>
                <strong>{formPriority === 'IMPORTANT' ? 'አስፈላጊ / አስቸኳይ' : 'መደበኛ'}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmPublishOpen(false)}
                className="w-1/2 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                አይ፣ ተመለስ
              </button>
              <button
                type="button"
                disabled={formSubmitting}
                onClick={handleFormSubmit}
                className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>አረጋግጥና ልቀቅ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Recipient Delivery & Read Statistics Modal */}
      {isStatsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-ethiopic">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gold-400/20 text-gold-400 border border-gold-400/30 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">የማስታወቂያ ርክክብ እና የማንበብ ስታቲስቲክስ</h3>
                  <p className="text-[11px] text-slate-300 truncate max-w-md">{statsData?.title || ''}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStatsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {statsLoading ? (
                <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                  <span>ስታቲስቲክሱ እየተጫነ ነው...</span>
                </div>
              ) : statsData ? (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">ጠቅላላ ተቀባዮች</span>
                      <strong className="text-xl font-black text-slate-900">{statsData.summary.totalRecipients}</strong>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 font-bold block">ያነበቡ</span>
                      <strong className="text-xl font-black text-emerald-800">{statsData.summary.readCount}</strong>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                      <span className="text-[10px] text-amber-700 font-bold block">ያላነበቡ</span>
                      <strong className="text-xl font-black text-amber-800">{statsData.summary.unreadCount}</strong>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900 text-white">
                      <span className="text-[10px] text-gold-400 font-bold block">የማንበብ ምጣኔ</span>
                      <strong className="text-xl font-black text-gold-400">{statsData.summary.readPercentage}%</strong>
                    </div>
                  </div>

                  {/* Search inside recipients */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={statsSearch}
                        onChange={(e) => setStatsSearch(e.target.value)}
                        placeholder="በተቀባይ ስም ወይም መለያ ይፈልጉ..."
                        className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 whitespace-nowrap">
                      {filteredStatsRecipients.length} ተቀባዮች ተገኝተዋል
                    </span>
                  </div>

                  {/* Recipients List Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                          <th className="py-2.5 px-3">የተቀባይ ስም</th>
                          <th className="py-2.5 px-3">ሚና (Role)</th>
                          <th className="py-2.5 px-3">መለያ ቁጥር</th>
                          <th className="py-2.5 px-3 text-center">ሁኔታ</th>
                          <th className="py-2.5 px-3 text-center">የተነበበበት ቀን</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStatsRecipients.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400">ምንም ተቀባይ አልተገኘም</td>
                          </tr>
                        ) : (
                          filteredStatsRecipients.map((rec) => (
                            <tr key={rec.recipientId} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-bold text-slate-900">{rec.fullName}</td>
                              <td className="py-2 px-3 text-slate-600">
                                {rec.role === 'STUDENT'
                                  ? 'ተማሪ'
                                  : rec.role === 'TEACHER'
                                  ? 'መምህር'
                                  : rec.role === 'MANAGEMENT'
                                  ? 'አመራር'
                                  : rec.role === 'ADMIN'
                                  ? 'አስተዳዳሪ'
                                  : 'ዋና አስተዳዳሪ'}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-600">{rec.identifier}</td>
                              <td className="py-2 px-3 text-center">
                                {rec.isRead ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    ተነቧል
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                    አልተነበበም
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-500">
                                {rec.readAt ? toEthiopianDateString(new Date(rec.readAt)) : '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncementPage;
