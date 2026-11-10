import React, { useState, useEffect } from 'react';
import { 
  GradingScheme, 
  AssignableCourse, 
  CourseSchemeDetailsResponse,
  GradeCalculationSnapshot 
} from '../../types/gradingScheme.types';
import { AssessmentType } from '../../types/grade.types';
import gradingSchemeService from '../../services/gradingSchemeService';
import academicService from '../../services/academicService';
import teacherService from '../../services/teacherService';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { toEthiopianDateString } from '../../utils/ethiopianCalendar';
import { 
  Sliders, 
  Layers, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  BookOpen, 
  Users, 
  Copy, 
  Sparkles, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  ArrowRight,
  Info,
  Calendar,
  Eye,
  History,
  X
} from 'lucide-react';

export const GradingSchemeHub: React.FC = () => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'catalog' | 'create' | 'assign' | 'applied' | 'history'>('catalog');

  // Shared Data States
  const [schemes, setSchemes] = useState<GradingScheme[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [assignableCourses, setAssignableCourses] = useState<AssignableCourse[]>([]);

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ----------------------------------------------------
  // TAB 2: CREATE SCHEME STATE
  // ----------------------------------------------------
  const [schemeName, setSchemeName] = useState('');
  const [schemeDescription, setSchemeDescription] = useState('');
  const [components, setComponents] = useState<
    Array<{ name: string; percentage: number; defaultMaxScore: number; type: AssessmentType }>
  >([
    { name: 'አጋማሽ ፈተና (Midterm)', percentage: 20, defaultMaxScore: 20, type: 'MIDTERM_EXAM' },
    { name: 'የቤት ሥራ 1 (Assignment 1)', percentage: 20, defaultMaxScore: 20, type: 'HOMEWORK_ASSIGNMENT' },
    { name: 'የቤት ሥራ 2 (Assignment 2)', percentage: 20, defaultMaxScore: 20, type: 'HOMEWORK_ASSIGNMENT' },
    { name: 'የማጠቃለያ ፈተና (Final Exam)', percentage: 40, defaultMaxScore: 40, type: 'FINAL_EXAM' },
  ]);

  // ----------------------------------------------------
  // TAB 3: ASSIGN SCHEME STATE
  // ----------------------------------------------------
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [targetSchemeId, setTargetSchemeId] = useState('');
  const [applicationOption, setApplicationOption] = useState<
    'ALL_SELECTED' | 'BATCH_ALL' | 'ACADEMIC_YEAR_ALL' | 'INDIVIDUAL' | 'MULTIPLE_INDIVIDUAL'
  >('ALL_SELECTED');
  const [selectedOfferingIds, setSelectedOfferingIds] = useState<string[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // ----------------------------------------------------
  // TAB 4 & MODALS: EDIT COURSE SCHEME STATE
  // ----------------------------------------------------
  const [editingOfferingId, setEditingOfferingId] = useState<string | null>(null);
  const [courseDetails, setCourseDetails] = useState<CourseSchemeDetailsResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [courseEditComponents, setCourseEditComponents] = useState<any[]>([]);
  const [courseChangeReason, setCourseChangeReason] = useState('');
  const [confirmRecalculation, setConfirmRecalculation] = useState(false);
  const [savingCourseScheme, setSavingCourseScheme] = useState(false);

  // ----------------------------------------------------
  // TAB 1: NEW VERSION MODAL STATE
  // ----------------------------------------------------
  const [versionModalScheme, setVersionModalScheme] = useState<GradingScheme | null>(null);
  const [newVersionDescription, setNewVersionDescription] = useState('');
  const [newVersionComponents, setNewVersionComponents] = useState<any[]>([]);
  const [savingVersion, setSavingVersion] = useState(false);

  // ----------------------------------------------------
  // TAB 5: HISTORY STATE
  // ----------------------------------------------------
  const [historyOfferingId, setHistoryOfferingId] = useState('');
  const [historyDetails, setHistoryDetails] = useState<CourseSchemeDetailsResponse | null>(null);

  // Load Initial Catalog & Lookup Filters
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [schData, yrs, bts, tchs] = await Promise.all([
        gradingSchemeService.getSchemes().catch(() => []),
        academicService.getAcademicYears().catch(() => []),
        academicService.getBatches().catch(() => []),
        teacherService.getTeachers().catch(() => []),
      ]);
      setSchemes(schData);
      setAcademicYears(yrs);
      setBatches(bts);
      setTeachers(tchs);

      const activeYr = yrs.find((y: any) => y.isCurrent);
      if (activeYr) setSelectedYearId(activeYr.id);
      if (schData.length > 0) setTargetSchemeId(schData[0].id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'መረጃዎችን መጫን አልተቻለም።');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load assignable courses whenever filters change
  const fetchAssignableCourses = async () => {
    try {
      const courses = await gradingSchemeService.getCoursesForAssignment({
        academicYearId: selectedYearId || undefined,
        batchId: selectedBatchId || undefined,
        teacherId: selectedTeacherId || undefined,
        search: searchQuery || undefined,
      });
      setAssignableCourses(courses);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'assign' || activeTab === 'applied') {
      fetchAssignableCourses();
    }
  }, [activeTab, selectedYearId, selectedBatchId, selectedTeacherId, searchQuery]);

  // Total Percentage Calculators
  const calcTotalPercentage = (comps: Array<{ percentage: number }>) => {
    return comps.reduce((sum, c) => sum + (Number(c.percentage) || 0), 0);
  };

  const createTotal = calcTotalPercentage(components);
  const versionTotal = calcTotalPercentage(newVersionComponents);
  const courseEditTotal = calcTotalPercentage(courseEditComponents);

  // Quick Preset Handlers
  const applyPreset = (presetType: 'standard' | 'practical' | 'continuous') => {
    if (presetType === 'standard') {
      setComponents([
        { name: 'አጋማሽ ፈተና (Midterm)', percentage: 20, defaultMaxScore: 20, type: 'MIDTERM_EXAM' },
        { name: 'የቤት ሥራ 1 (Assignment 1)', percentage: 20, defaultMaxScore: 20, type: 'HOMEWORK_ASSIGNMENT' },
        { name: 'የቤት ሥራ 2 (Assignment 2)', percentage: 20, defaultMaxScore: 20, type: 'HOMEWORK_ASSIGNMENT' },
        { name: 'የማጠቃለያ ፈተና (Final Exam)', percentage: 40, defaultMaxScore: 40, type: 'FINAL_EXAM' },
      ]);
    } else if (presetType === 'practical') {
      setComponents([
        { name: 'ተግባራዊ ዜማ እና ሥርዓት (Practical)', percentage: 40, defaultMaxScore: 40, type: 'PRACTICAL_LITURGY' },
        { name: 'የክፍል ተሳትፎ እና ክትትል', percentage: 20, defaultMaxScore: 20, type: 'ATTENDANCE_DISCIPLINE' },
        { name: 'የማጠቃለያ ፈተና (Final Exam)', percentage: 40, defaultMaxScore: 40, type: 'FINAL_EXAM' },
      ]);
    } else {
      setComponents([
        { name: 'ክትትል እና ስነ-ምግባር', percentage: 10, defaultMaxScore: 10, type: 'ATTENDANCE_DISCIPLINE' },
        { name: 'የቤት ስራ እና ተሳትፎ', percentage: 10, defaultMaxScore: 10, type: 'HOMEWORK_ASSIGNMENT' },
        { name: 'ፈጣን ፈተና (Quiz)', percentage: 20, defaultMaxScore: 20, type: 'QUIZ' },
        { name: 'አጋማሽ ፈተና (Midterm)', percentage: 20, defaultMaxScore: 20, type: 'MIDTERM_EXAM' },
        { name: 'የማጠቃለያ ፈተና (Final)', percentage: 40, defaultMaxScore: 40, type: 'FINAL_EXAM' },
      ]);
    }
  };

  // Add Component to Create Form
  const addComponent = () => {
    setComponents([
      ...components,
      { name: `ምዘና ${components.length + 1}`, percentage: 10, defaultMaxScore: 10, type: 'HOMEWORK_ASSIGNMENT' },
    ]);
  };

  const removeComponent = (idx: number) => {
    if (components.length <= 1) return;
    setComponents(components.filter((_, i) => i !== idx));
  };

  // Handle Create Scheme Submit
  const handleCreateScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schemeName.trim()) {
      setError('እባክዎ የመመዘኛውን ስም ያስገቡ።');
      return;
    }
    if (Math.abs(createTotal - 100) > 0.001) {
      setError(`የምዘናዎች የክብደት ድምር በትክክል 100% መሆን አለበት። የአሁኑ ድምር፦ ${createTotal}% ነው።`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await gradingSchemeService.createScheme({
        name: schemeName.trim(),
        description: schemeDescription.trim() || undefined,
        components,
      });
      setSuccess('አዲስ የመመዘኛ ቅጽ በተሳካ ሁኔታ ተፈጥሯል።');
      setSchemeName('');
      setSchemeDescription('');
      await loadInitialData();
      setActiveTab('catalog');
    } catch (err: any) {
      setError(err.response?.data?.message || 'መመዘኛውን መፍጠር አልተቻለም።');
    } finally {
      setLoading(false);
    }
  };

  // Handle Assign Scheme Submit
  const handleConfirmAssignment = async () => {
    if (!targetSchemeId) {
      setError('እባክዎ መመዘኛ ይምረጡ።');
      return;
    }

    try {
      setAssigning(true);
      setError(null);
      const res = await gradingSchemeService.applySchemeToCourses({
        schemeId: targetSchemeId,
        applicationOption,
        academicYearId: selectedYearId || undefined,
        batchId: selectedBatchId || undefined,
        courseOfferingIds:
          applicationOption === 'ALL_SELECTED' || applicationOption === 'MULTIPLE_INDIVIDUAL' || applicationOption === 'INDIVIDUAL'
            ? selectedOfferingIds
            : undefined,
      });

      setIsConfirmModalOpen(false);
      setSuccess(res.message);
      setSelectedOfferingIds([]);
      await fetchAssignableCourses();
      setActiveTab('applied');
    } catch (err: any) {
      setError(err.response?.data?.message || 'መመዘኛውን መመደብ አልተቻለም።');
    } finally {
      setAssigning(false);
    }
  };

  // Open Edit Course Scheme Modal
  const openEditCourseModal = async (offeringId: string) => {
    try {
      setEditingOfferingId(offeringId);
      setDetailsLoading(true);
      setError(null);
      const details = await gradingSchemeService.getCourseSchemeDetails(offeringId);
      setCourseDetails(details);

      if (details.activeScheme?.components) {
        setCourseEditComponents(
          details.activeScheme.components.map((c) => ({
            name: c.name,
            percentage: Number(c.percentage),
            maxScore: Number(c.maxScore),
            type: c.type,
            orderIndex: c.orderIndex,
          }))
        );
      } else {
        setCourseEditComponents([
          { name: 'አጋማሽ ፈተና', percentage: 20, maxScore: 20, type: 'MIDTERM_EXAM' },
          { name: 'የቤት ሥራ', percentage: 20, maxScore: 20, type: 'HOMEWORK_ASSIGNMENT' },
          { name: 'የክፍል ተሳትፎ', percentage: 20, maxScore: 20, type: 'HOMEWORK_ASSIGNMENT' },
          { name: 'የማጠቃለያ ፈተና', percentage: 40, maxScore: 40, type: 'FINAL_EXAM' },
        ]);
      }
      setCourseChangeReason('');
      setConfirmRecalculation(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'የኮርሱን መመዘኛ መጫን አልተቻለም።');
      setEditingOfferingId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Handle Save Course Scheme
  const handleSaveCourseScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOfferingId) return;

    if (Math.abs(courseEditTotal - 100) > 0.001) {
      setError(`የምዘናዎች የክብደት ድምር በትክክል 100% መሆን አለበት። የአሁኑ ድምር፦ ${courseEditTotal}% ነው።`);
      return;
    }

    if (courseDetails?.hasGrades && !confirmRecalculation) {
      setError('ለዚህ ኮርስ የተመዘገቡ ውጤቶች ስላሉ እባክዎ የማረጋገጫ ሳጥኑን ይምረጡ።');
      return;
    }

    try {
      setSavingCourseScheme(true);
      setError(null);
      await gradingSchemeService.updateCourseGradingScheme(editingOfferingId, {
        changeReason: courseChangeReason.trim() || undefined,
        components: courseEditComponents,
        confirmRecalculation,
      });

      setSuccess('የኮርሱ መመዘኛ በተሳካ ሁኔታ ተሻሽሏል! አዲስ ገለልተኛ ቅጂ (Version) ተፈጥሯል።');
      setEditingOfferingId(null);
      await fetchAssignableCourses();
    } catch (err: any) {
      setError(err.response?.data?.message || 'የኮርሱን መመዘኛ ማሻሻል አልተቻለም።');
    } finally {
      setSavingCourseScheme(false);
    }
  };

  // Open New Template Version Modal
  const openNewVersionModal = (scheme: GradingScheme) => {
    setVersionModalScheme(scheme);
    const comps = scheme.latestVersion?.components || [];
    setNewVersionComponents(
      comps.map((c) => ({
        name: c.name,
        percentage: Number(c.percentage),
        defaultMaxScore: Number(c.defaultMaxScore),
        type: c.type,
      }))
    );
    setNewVersionDescription('');
  };

  const handleSaveNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionModalScheme) return;

    if (Math.abs(versionTotal - 100) > 0.001) {
      setError(`የምዘናዎች የክብደት ድምር በትክክል 100% መሆን አለበት። የአሁኑ ድምር፦ ${versionTotal}% ነው።`);
      return;
    }

    try {
      setSavingVersion(true);
      setError(null);
      await gradingSchemeService.createNewVersion(versionModalScheme.id, {
        description: newVersionDescription.trim() || undefined,
        components: newVersionComponents,
      });
      setSuccess(`ለመመዘኛ '${versionModalScheme.name}' አዲስ ቅጂ በተሳካ ሁኔታ ተፈጥሯል።`);
      setVersionModalScheme(null);
      await loadInitialData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'አዲስ ቅጂ መፍጠር አልተቻለም።');
    } finally {
      setSavingVersion(false);
    }
  };

  // Fetch History for Tab 5
  const loadHistoryForOffering = async (offeringId: string) => {
    try {
      setHistoryOfferingId(offeringId);
      const res = await gradingSchemeService.getCourseSchemeDetails(offeringId);
      setHistoryDetails(res);
    } catch (err) {
      console.error(err);
    }
  };

  const targetSchemeObj = schemes.find((s) => s.id === targetSchemeId);

  return (
    <div className="space-y-6 font-ethiopic">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-brand-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-brand-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-gold-300 bg-gold-500/20 px-3 py-1 rounded-full border border-gold-400/30">
            ምዕራፍ 4ሀ • የውጤት መመዘኛ አስተዳደር
          </span>
          <h1 className="text-xl sm:text-2xl font-black mt-2">የሰንበት ትምህርት ቤት የውጤት መመዘኛዎች አስተዳደር</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            ዳግም ጥቅም ላይ ሊውሉ የሚችሉ የመመዘኛ ቅጾችን ይፍጠሩ፣ ለኮርሶች በገለልተኝነት ይመድቡ፣ የቅጂ ታሪክን (Version Control) እና የተማሪዎች ውጤት ስሌት ቅጽበታዊ ምሥልን (Snapshots) ይጠብቁ።
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveTab('create')}
            className="flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" /> አዲስ መመዘኛ ፍጠር
          </Button>
        </div>
      </div>

      {/* 2. Global Feedback Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-slate-200/70 rounded-2xl border border-slate-300/60">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-brand-600" />
          <span>የመመዘኛ ዝርዝር ({schemes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'create'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Plus className="w-4 h-4 text-emerald-600" />
          <span>አዲስ መመዘኛ መፍጠር</span>
        </button>

        <button
          onClick={() => setActiveTab('assign')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'assign'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4 text-indigo-600" />
          <span>መመዘኛ ለትምህርቶች መመደብ</span>
        </button>

        <button
          onClick={() => setActiveTab('applied')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'applied'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-600" />
          <span>የተመደቡ መመዘኛዎች</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4 text-purple-600" />
          <span>የመመዘኛ ታሪክ እና ቅጽበታዊ ምሥል</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: SCHEME CATALOG (የመመዘኛ ዝርዝር) */}
      {/* ==================================================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">
              ዳግም ጥቅም ላይ ሊውሉ የሚችሉ የመመዘኛ ቅጾች (Templates)
            </h2>
            <span className="text-xs text-slate-500">ጠቅላላ፦ {schemes.length} መመዘኛዎች</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">መመዘኛዎች እየተጫኑ ነው...</div>
          ) : schemes.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
              <Layers className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">እስካሁን የተፈጠረ የመመዘኛ ቅጽ የለም</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                አዲስ የመመዘኛ ቅጽ በመፍጠር የምዘና መስፈርቶችን (ክብደትና ከፍተኛ ውጤት) አዋቅረው ለኮርሶች ይመድቡ።
              </p>
              <Button variant="primary" size="sm" onClick={() => setActiveTab('create')}>
                አዲስ መመዘኛ ፍጠር &rarr;
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {schemes.map((s) => {
                const latest = s.latestVersion;
                return (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                            ቅጂ {latest?.versionNumber || 1}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 mt-1">{s.name}</h3>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            s.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {s.status === 'ACTIVE' ? 'ገባሪ' : 'የተዘጋ'}
                        </span>
                      </div>

                      {s.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">{s.description}</p>
                      )}

                      {/* Component Chips */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 block">የምዘና መስፈርቶች (100%)፦</span>
                        <div className="flex flex-wrap gap-1.5">
                          {latest?.components.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 text-[11px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg text-slate-700 font-medium"
                            >
                              <span>{c.name}</span>
                              <strong className="text-brand-700">{c.percentage}%</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        የተመደበባቸው ኮርሶች፦ <strong>{s.appliedCoursesCount}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                          onClick={() => openNewVersionModal(s)}
                        >
                          <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" /> አዲስ ቅጂ
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setTargetSchemeId(s.id);
                            setActiveTab('assign');
                          }}
                        >
                          መድብ &rarr;
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: CREATE NEW SCHEME (አዲስ መመዘኛ መፍጠር) */}
      {/* ==================================================== */}
      {activeTab === 'create' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">አዲስ ዳግም ጥቅም ላይ የሚውል የመመዘኛ ቅጽ መፍጠር</h2>
              <p className="text-xs text-slate-500 mt-1">
                የመመዘኛውን ስም እና የምዘና መስፈርቶች ያዋቅሩ። የሁሉም ምዘናዎች ድምር በትክክል 100% መሆን አለበት።
              </p>
            </div>

            {/* Quick 1-Click Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-bold">ፈጣን ቅንብሮች፦</span>
              <button
                type="button"
                onClick={() => applyPreset('standard')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-50 border border-brand-200 text-brand-800 hover:bg-brand-100"
              >
                መደበኛ (20/20/20/40)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('practical')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100"
              >
                ተግባራዊ (40/20/40)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('continuous')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
              >
                ቀጣይነት ያለው (10/10/20/20/40)
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateScheme} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  የመመዘኛ ስም <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ምሳሌ፦ መደበኛ የነገረ መለኮት ምዘና"
                  value={schemeName}
                  onChange={(e) => setSchemeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">መግለጫ (አማራጭ)</label>
                <input
                  type="text"
                  placeholder="ስለ መመዘኛው አጭር መግለጫ"
                  value={schemeDescription}
                  onChange={(e) => setSchemeDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Assessment Components Builder */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">የምዘና መስፈርቶች እና የክብደት መጠን (%)</h3>
                  <p className="text-xs text-slate-400">እያንዳንዱን የምዘና አካል ስም፣ ዓይነት እና የክብደት ድርሻ ይወስኑ።</p>
                </div>

                {/* Live Percentage Indicator */}
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                      Math.abs(createTotal - 100) < 0.001
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-red-50 text-red-800 border-red-300'
                    }`}
                  >
                    {Math.abs(createTotal - 100) < 0.001 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>የክብደት ድምር፦ 100% (ትክክል ነው)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span>የክብደት ድምር፦ {createTotal}% (100% መሆን አለበት፤ ቀሪ፦ {100 - createTotal}%)</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {components.map((comp, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 items-center"
                  >
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        የምዘና ስም #{idx + 1}
                      </label>
                      <input
                        type="text"
                        required
                        value={comp.name}
                        onChange={(e) => {
                          const updated = [...components];
                          updated[idx].name = e.target.value;
                          setComponents(updated);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">ዓይነት</label>
                      <select
                        value={comp.type}
                        onChange={(e) => {
                          const updated = [...components];
                          updated[idx].type = e.target.value as AssessmentType;
                          setComponents(updated);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none"
                      >
                        <option value="HOMEWORK_ASSIGNMENT">የቤት ስራ / ተሳትፎ</option>
                        <option value="MIDTERM_EXAM">አጋማሽ ፈተና</option>
                        <option value="FINAL_EXAM">የማጠቃለያ ፈተና</option>
                        <option value="QUIZ">ፈጣን ፈተና (Quiz)</option>
                        <option value="ATTENDANCE_DISCIPLINE">ክትትል እና ስነ-ምግባር</option>
                        <option value="PRACTICAL_LITURGY">ተግባራዊ ዜማና ሥርዓት</option>
                        <option value="PROJECT">ጥናትና ምርምር</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">ክብደት (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        required
                        value={comp.percentage}
                        onChange={(e) => {
                          const updated = [...components];
                          updated[idx].percentage = Number(e.target.value);
                          setComponents(updated);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-bold text-brand-700 text-center focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">ከፍተኛ ነጥብ</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={comp.defaultMaxScore}
                        onChange={(e) => {
                          const updated = [...components];
                          updated[idx].defaultMaxScore = Number(e.target.value);
                          setComponents(updated);
                        }}
                        className="w-full px-2 py-2 rounded-lg border border-slate-300 text-xs bg-white text-center focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-center pt-5 sm:pt-0">
                      <button
                        type="button"
                        disabled={components.length <= 1}
                        onClick={() => removeComponent(idx)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={addComponent}>
                  <Plus className="w-4 h-4 mr-1" /> አዲስ መስፈርት ጨምር
                </Button>
                <span className="text-xs text-slate-400">ድምር፦ {createTotal}% / 100%</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => setActiveTab('catalog')}>
                ሰርዝ
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={loading}
                disabled={Math.abs(createTotal - 100) > 0.001}
              >
                መመዘኛውን መዝግብ &rarr;
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: ASSIGN SCHEMES TO COURSES (መመዘኛ ለትምህርቶች መመደብ) */}
      {/* ==================================================== */}
      {activeTab === 'assign' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-700" /> የኮርሶች መምረጫ ማጣሪያ
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">የትምህርት ዘመን</label>
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none"
                >
                  <option value="">ሁሉም የትምህርት ዘመናት</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.isCurrent ? '★ (ገባሪ)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">የተማሪዎች ምድብ (Batch)</label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none"
                >
                  <option value="">ሁሉም ምድቦች</option>
                  {batches
                    .filter((b) => !selectedYearId || b.academicYearId === selectedYearId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">መምህር (አማራጭ ማጣሪያ)</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none"
                >
                  <option value="">ሁሉም መምህራን</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.spiritualTitle ? t.spiritualTitle + ' ' : ''}
                      {t.user?.firstName} {t.user?.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">የኮርስ ፍለጋ</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="በስም ወይም ኮድ ፈልግ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Scheme Selection & Application Options */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-700" /> የሚመደበው የመመዘኛ ቅጽ እና የአመዳደብ ሁኔታ
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  የሚመደበው መመዘኛ <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetSchemeId}
                  onChange={(e) => setTargetSchemeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white font-bold text-slate-800 focus:outline-none"
                >
                  {schemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (ቅጂ {s.latestVersion?.versionNumber || 1})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">የምደባ አማራጭ</label>
                <select
                  value={applicationOption}
                  onChange={(e) => setApplicationOption(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none"
                >
                  <option value="ALL_SELECTED">ለሁሉም ለተመረጡት ኮርሶች (All Selected)</option>
                  <option value="BATCH_ALL">በምድቡ ላሉ ሁሉም ኮርሶች (All in Batch)</option>
                  <option value="ACADEMIC_YEAR_ALL">በትምህርት ዘመኑ ላሉ ሁሉም ኮርሶች (All in Academic Year)</option>
                  <option value="INDIVIDUAL">ለተመረጠ ነጠላ ኮርስ (Individual)</option>
                </select>
              </div>
            </div>

            {/* Selected Scheme Components Preview */}
            {targetSchemeObj?.latestVersion && (
              <div className="p-3.5 rounded-2xl bg-brand-50/50 border border-brand-200 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-brand-900">የመመዘኛ መስፈርቶች፦</span>
                {targetSchemeObj.latestVersion.components.map((c) => (
                  <span
                    key={c.id}
                    className="bg-white px-2.5 py-1 rounded-lg border border-brand-300 text-brand-900 font-bold"
                  >
                    {c.name} ({c.percentage}%)
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Courses Checklist Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  ኮርሶችን ይምረጡ ({assignableCourses.length} ኮርሶች ተገኝተዋል)
                </h3>
                <p className="text-xs text-slate-400">
                  መመዘኛው የሚመደብላቸውን ኮርሶች ምልክት ያድርጉ። እያንዳንዱ ኮርስ ገለልተኛ ቅጂ ይቀበላል።
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (selectedOfferingIds.length === assignableCourses.length) {
                      setSelectedOfferingIds([]);
                    } else {
                      setSelectedOfferingIds(assignableCourses.map((c) => c.offeringId));
                    }
                  }}
                >
                  {selectedOfferingIds.length === assignableCourses.length ? 'ሁሉንም ሰርዝ' : 'ሁሉንም ምረጥ'}
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={
                    applicationOption === 'ALL_SELECTED' && selectedOfferingIds.length === 0
                  }
                  onClick={() => setIsConfirmModalOpen(true)}
                >
                  መመዘኛውን መድብ ({selectedOfferingIds.length}) &rarr;
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          assignableCourses.length > 0 &&
                          selectedOfferingIds.length === assignableCourses.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOfferingIds(assignableCourses.map((c) => c.offeringId));
                          } else {
                            setSelectedOfferingIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="p-3">ኮርስ ስም</th>
                    <th className="p-3">ኮድ</th>
                    <th className="p-3">የትምህርት ዘመን</th>
                    <th className="p-3">ምድብ</th>
                    <th className="p-3">መምህር</th>
                    <th className="p-3">ወቅታዊ መመዘኛ</th>
                    <th className="p-3 text-center">የተማሪዎች ብዛት</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignableCourses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        በተመረጠው ማጣሪያ ምንም ኮርሶች አልተገኙም።
                      </td>
                    </tr>
                  ) : (
                    assignableCourses.map((course) => {
                      const isSelected = selectedOfferingIds.includes(course.offeringId);
                      return (
                        <tr
                          key={course.offeringId}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-brand-50/30' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOfferingIds([...selectedOfferingIds, course.offeringId]);
                                } else {
                                  setSelectedOfferingIds(
                                    selectedOfferingIds.filter((id) => id !== course.offeringId)
                                  );
                                }
                              }}
                            />
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            {course.courseTitle}
                            {course.amharicTitle && (
                              <span className="block text-[11px] text-brand-700 font-normal">
                                {course.amharicTitle}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-500">{course.courseCode}</td>
                          <td className="p-3 text-slate-600">{course.academicYearName}</td>
                          <td className="p-3 text-slate-600">{course.batchName}</td>
                          <td className="p-3 text-slate-600">
                            {(Array.isArray(course.teachers) ? course.teachers.map((t) => t.name).join(', ') : '') || 'አልተመደበም'}
                          </td>
                          <td className="p-3">
                            {course.activeScheme ? (
                              <Badge variant="success">
                                {course.activeScheme.name} (ቅጂ {course.activeScheme.versionNumber})
                              </Badge>
                            ) : (
                              <Badge variant="neutral">ያልተመደበ</Badge>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">
                            {course.enrolledStudentsCount}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: APPLIED SCHEMES (የተመደቡ መመዘኛዎች) */}
      {/* ==================================================== */}
      {activeTab === 'applied' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">የተመደቡ ገለልተኛ የኮርስ መመዘኛዎች</h2>
              <p className="text-xs text-slate-500">
                ለእያንዳንዱ ኮርስ የተመደበውን መመዘኛ ይመርምሩ ወይም ለኮርሱ ብቻ የሚሰራ ማሻሻያ ያድርጉ (ሌሎች ኮርሶችን ሳይነካ)።
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3">ኮርስ ስም</th>
                  <th className="p-3">የትምህርት ዘመን</th>
                  <th className="p-3">ምድብ</th>
                  <th className="p-3">የተመደበው መመዘኛ ስም</th>
                  <th className="p-3">ቅጂ (Version)</th>
                  <th className="p-3">የምዘና መስፈርቶች</th>
                  <th className="p-3">የውጤት ሁኔታ</th>
                  <th className="p-3 text-center">እርምጃ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignableCourses.filter((c) => c.activeScheme).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      እስካሁን ምንም የተመደበ መመዘኛ የለም። እባክዎ 'መመዘኛ መድብ' የሚለውን ትር ይጠቀሙ።
                    </td>
                  </tr>
                ) : (
                  assignableCourses
                    .filter((c) => c.activeScheme)
                    .map((course) => (
                      <tr key={course.offeringId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{course.courseTitle}</td>
                        <td className="p-3 text-slate-600">{course.academicYearName}</td>
                        <td className="p-3 text-slate-600">{course.batchName}</td>
                        <td className="p-3 font-bold text-brand-800">{course.activeScheme?.name}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                            ቅጂ {course.activeScheme?.versionNumber}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {course.activeScheme?.components.map((c) => (
                              <span
                                key={c.id}
                                className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium"
                              >
                                {c.name}: <strong>{c.percentage}%</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              course.latestSubmissionStatus === 'PUBLISHED'
                                ? 'success'
                                : course.latestSubmissionStatus === 'APPROVED'
                                ? 'success'
                                : course.latestSubmissionStatus === 'SUBMITTED'
                                ? 'info'
                                : 'warning'
                            }
                          >
                            {course.latestSubmissionStatus === 'PUBLISHED'
                              ? 'የታተመ'
                              : course.latestSubmissionStatus === 'APPROVED'
                              ? 'የጸደቀ'
                              : course.latestSubmissionStatus === 'SUBMITTED'
                              ? 'ለማጽደቅ የቀረበ'
                              : course.latestSubmissionStatus === 'DRAFT'
                              ? 'ረቂቅ'
                              : 'ያልተጀመረ'}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs"
                            onClick={() => openEditCourseModal(course.offeringId)}
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" /> አስተካክል
                          </Button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: HISTORY & SNAPSHOTS (የመመዘኛ ታሪክ እና ቅጽበታዊ ምሥል) */}
      {/* ==================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800">ኮርስ በመምረጥ የቅጂ ታሪክ እና የውጤት ቅጽበታዊ ምሥሎችን ይመርምሩ</h3>
            <div className="max-w-md">
              <select
                value={historyOfferingId}
                onChange={(e) => loadHistoryForOffering(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white font-bold focus:outline-none"
              >
                <option value="">-- ኮርስ ይምረጡ --</option>
                {assignableCourses.map((c) => (
                  <option key={c.offeringId} value={c.offeringId}>
                    {c.courseTitle} ({c.academicYearName} • {c.batchName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {historyDetails && (
            <div className="space-y-6">
              {/* Version History Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-700" />
                  የኮርሱ የመመዘኛ ቅጂ ታሪክ (Version History)
                </h3>

                <div className="space-y-3">
                  {historyDetails.history.map((ver) => (
                    <div
                      key={ver.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        ver.isActive
                          ? 'bg-emerald-50/30 border-emerald-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                              ቅጂ {ver.versionNumber}
                            </span>
                            {ver.isActive && <Badge variant="success">ወቅታዊ (ገባሪ)</Badge>}
                            <span className="text-xs text-slate-500">{ver.name}</span>
                          </div>
                          {ver.changeReason && (
                            <p className="text-xs text-slate-600 mt-1 font-medium">
                              <strong>የለውጡ ምክንያት፦</strong> {ver.changeReason}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {toEthiopianDateString(new Date(ver.appliedAt))}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-200/60">
                        {ver.components.map((c) => (
                          <span
                            key={c.id}
                            className="bg-white px-2 py-0.5 rounded border border-slate-200 text-xs font-medium text-slate-700"
                          >
                            {c.name}፦ <strong>{c.percentage}%</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculation Snapshots Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  የውጤት ስሌት ቅጽበታዊ ምሥሎች (Grade Calculation Snapshots)
                </h3>
                <p className="text-xs text-slate-500">
                  መመዘኛ ከመቀየሩ በፊት የነበሩ የተማሪዎች ውጤቶች እና የክብደት ስሌቶች ሳይጠፉ የተቀመጡበት ኦፊሴላዊ መዝገብ።
                </p>

                {historyDetails.snapshots.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                    እስካሁን የተወሰደ ቅጽበታዊ ምሥል (Snapshot) የለም።
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyDetails.snapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            ምክንያት፦ {snap.reason} (የተማሪዎች ብዛት፦ {snap.studentCount})
                          </span>
                          <span className="text-slate-400">
                            {toEthiopianDateString(new Date(snap.createdAt))}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          ተመዝጋቢ፦ {snap.createdBy?.firstName} {snap.createdBy?.lastName}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* CONFIRMATION MODAL BEFORE APPLYING SCHEME */}
      {/* ==================================================== */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 text-brand-800">
              <ShieldCheck className="w-7 h-7 text-brand-700" />
              <div>
                <h3 className="text-base font-bold text-slate-900">የመመዘኛ ምደባ ማረጋገጫ</h3>
                <p className="text-xs text-slate-500">እባክዎ የተመረጡትን መረጃዎች መርምረው ያረጋግጡ።</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">የሚመደበው መመዘኛ፦</span>
                <strong className="text-brand-900">{targetSchemeObj?.name}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">የትምህርት ዘመን፦</span>
                <strong>
                  {academicYears.find((y) => y.id === selectedYearId)?.name || 'ሁሉም የትምህርት ዘመናት'}
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">የተማሪዎች ምድብ፦</span>
                <strong>{batches.find((b) => b.id === selectedBatchId)?.name || 'ሁሉም ምድቦች'}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">የተመረጡ ኮርሶች ብዛት፦</span>
                <strong className="text-emerald-700">
                  {applicationOption === 'ALL_SELECTED' || applicationOption === 'MULTIPLE_INDIVIDUAL' || applicationOption === 'INDIVIDUAL'
                    ? selectedOfferingIds.length
                    : 'በምድቡ/ዘመኑ ያሉ ሁሉም ኮርሶች'}
                </strong>
              </div>
            </div>

            {/* Components list */}
            {targetSchemeObj?.latestVersion && (
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-slate-700 block">የሚመደቡ የምዘና ክፍሎች (100%)፦</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {targetSchemeObj.latestVersion.components.map((c) => (
                    <span key={c.id} className="p-2 bg-slate-50 border rounded-lg text-slate-700">
                      {c.name}: <strong>{c.percentage}%</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>አስፈላጊ ሕግ፦</strong> ለእያንዳንዱ ኮርስ ገለልተኛ (Independent) የሆነ የመመዘኛ ቅጂ ይፈጠራል። ወደፊት ዋናው መመዘኛ ቢቀየር እንኳን እነዚህ ኮርሶች አይነኩም።
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>
                ሰርዝ
              </Button>
              <Button variant="primary" loading={assigning} onClick={handleConfirmAssignment}>
                አረጋግጥና መድብ &rarr;
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* EDIT COURSE SCHEME MODAL (ገለልተኛ የኮርስ መመዘኛ ማሻሻያ) */}
      {/* ==================================================== */}
      {editingOfferingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  ገለልተኛ የኮርስ ማሻሻያ (Independent Course Scheme)
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  የኮርስ መመዘኛ ማሻሻያ፦ {courseDetails?.courseTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  ይህ ለውጥ ለዚህ ኮርስ ብቻ የሚሰራ አዲስ ቅጂ (Version) ይፈጥራል። ሌሎች ኮርሶችን ፈጽሞ አይነካም።
                </p>
              </div>
              <button
                onClick={() => setEditingOfferingId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">መረጃው እየተጫነ ነው...</div>
            ) : (
              <form onSubmit={handleSaveCourseScheme} className="space-y-5">
                {/* Warning if course already has grades */}
                {courseDetails?.hasGrades && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold">ማሳሰቢያ፦ አስቀድመው የተመዘገቡ ውጤቶች አሉ!</h4>
                        <p className="text-[11px] mt-0.5 text-amber-800">
                          ለዚህ ኮርስ {courseDetails.totalGradesEntered} የተመዘገቡ ውጤቶች አሉ። የመመዘኛውን የክብደት መጠን መቀየር አጠቃላይ ውጤቶችን ሊቀይር ስለሚችል ቀድሞ የነበረው የውጤት ስሌት ቅጽበታዊ ምሥል (Snapshot) ይቀመጣል።
                        </p>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 pt-2 border-t border-amber-200/60 font-bold text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmRecalculation}
                        onChange={(e) => setConfirmRecalculation(e.target.checked)}
                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                      />
                      <span>ውጤቶቹ እንደተጠበቁ ሆነው አዲሱ የመመዘኛ መዋቅር እንዲተገበር አረጋግጣለሁ።</span>
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    የለውጡ ምክንያት (Change Reason) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ምሳሌ፦ የአጋማሽ ፈተና ክብደትን ወደ 25% ከፍ ለማድረግ"
                    value={courseChangeReason}
                    onChange={(e) => setCourseChangeReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none"
                  />
                </div>

                {/* Editable Components */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">የምዘና መስፈርቶች ዝርዝር</span>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        Math.abs(courseEditTotal - 100) < 0.001
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-red-50 text-red-800 border-red-300'
                      }`}
                    >
                      ድምር፦ {courseEditTotal}% {Math.abs(courseEditTotal - 100) < 0.001 ? '✓' : '(100% መሆን አለበት)'}
                    </span>
                  </div>

                  {courseEditComponents.map((c, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 items-center text-xs"
                    >
                      <div className="col-span-6">
                        <label className="block text-[10px] text-slate-400 mb-0.5">የምዘና ስም</label>
                        <input
                          type="text"
                          required
                          value={c.name}
                          onChange={(e) => {
                            const updated = [...courseEditComponents];
                            updated[idx].name = e.target.value;
                            setCourseEditComponents(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs bg-white focus:outline-none"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[10px] text-slate-400 mb-0.5">ክብደት (%)</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          required
                          value={c.percentage}
                          onChange={(e) => {
                            const updated = [...courseEditComponents];
                            updated[idx].percentage = Number(e.target.value);
                            setCourseEditComponents(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs bg-white text-center font-bold text-brand-700 focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">ከፍተኛ ነጥብ</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={c.maxScore}
                          onChange={(e) => {
                            const updated = [...courseEditComponents];
                            updated[idx].maxScore = Number(e.target.value);
                            setCourseEditComponents(updated);
                          }}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs bg-white text-center focus:outline-none"
                        />
                      </div>

                      <div className="col-span-1 flex justify-center pt-3">
                        <button
                          type="button"
                          disabled={courseEditComponents.length <= 1}
                          onClick={() => {
                            setCourseEditComponents(courseEditComponents.filter((_, i) => i !== idx));
                          }}
                          className="text-red-500 hover:text-red-700 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setCourseEditComponents([
                        ...courseEditComponents,
                        { name: `አዲስ ምዘና ${courseEditComponents.length + 1}`, percentage: 10, maxScore: 10 },
                      ]);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> መስፈርት ጨምር
                  </Button>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button variant="outline" type="button" onClick={() => setEditingOfferingId(null)}>
                    ሰርዝ
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    loading={savingCourseScheme}
                    disabled={
                      Math.abs(courseEditTotal - 100) > 0.001 ||
                      (courseDetails?.hasGrades && !confirmRecalculation)
                    }
                  >
                    አሻሽልና አዲስ ቅጂ ፍጠር &rarr;
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* NEW TEMPLATE VERSION MODAL */}
      {/* ==================================================== */}
      {versionModalScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  አዲስ የመመዘኛ ቅጂ (Version) መፍጠር፦ {versionModalScheme.name}
                </h3>
                <p className="text-xs text-slate-500">
                  አዲስ ቅጂ መፍጠር አስቀድመው የተመደቡ ኮርሶችን አይነካም።
                </p>
              </div>
              <button onClick={() => setVersionModalScheme(null)} className="p-1 rounded text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewVersion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">የቅጂው ማብራሪያ</label>
                <input
                  type="text"
                  placeholder="ምሳሌ፦ ቅጂ 2 - የምዘና ክብደት ማሻሻያ"
                  value={newVersionDescription}
                  onChange={(e) => setNewVersionDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">የምዘና ክፍሎች</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      Math.abs(versionTotal - 100) < 0.001
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-red-50 text-red-800'
                    }`}
                  >
                    ድምር፦ {versionTotal}%
                  </span>
                </div>

                {newVersionComponents.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border text-xs">
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => {
                        const updated = [...newVersionComponents];
                        updated[idx].name = e.target.value;
                        setNewVersionComponents(updated);
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                    />
                    <div className="w-20 flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={c.percentage}
                        onChange={(e) => {
                          const updated = [...newVersionComponents];
                          updated[idx].percentage = Number(e.target.value);
                          setNewVersionComponents(updated);
                        }}
                        className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white text-center font-bold"
                      />
                      <span>%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setVersionModalScheme(null)}>
                  ሰርዝ
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  loading={savingVersion}
                  disabled={Math.abs(versionTotal - 100) > 0.001}
                >
                  አዲሱን ቅጂ መዝግብ &rarr;
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradingSchemeHub;
