import React, { useState, useEffect } from 'react';
import academicService, { AcademicYearData, BatchData } from '../../services/academicService';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { 
  Layers, 
  Plus, 
  CheckCircle2, 
  Trash2, 
  AlertCircle, 
  Users, 
  BookOpen, 
  Power,
  Edit2,
  Eye,
  X,
  GraduationCap,
  Calendar,
  Lock
} from 'lucide-react';

interface BatchStudentItem {
  id: string;
  admissionNumber: string;
  baptismalName?: string;
  gender: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    isActive: boolean;
  };
  status: string;
}

interface BatchOfferingItem {
  id: string;
  termSemester: string;
  status: string;
  course: {
    id: string;
    code: string;
    title: string;
    amharicTitle: string;
    creditHours: number;
  };
  teacherAssignments: Array<{
    id: string;
    isPrimary: boolean;
    teacher: {
      teacherCode: string;
      spiritualTitle?: string;
      user: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
}

interface BatchDetailData {
  batch: BatchData & {
    academicYear: {
      id: string;
      name: string;
      status: string;
    };
    courseOfferings: BatchOfferingItem[];
  };
  students: BatchStudentItem[];
}

export const BatchesPage: React.FC = () => {
  const [years, setYears] = useState<AcademicYearData[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [stageLevel, setStageLevel] = useState('ደረጃ 1 (ሕፃናት)');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string>('');
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editStageLevel, setEditStageLevel] = useState('ደረጃ 1 (ሕፃናት)');
  const [editDescription, setEditDescription] = useState('');
  const [updating, setUpdating] = useState(false);

  // Details Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<BatchDetailData | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'students' | 'courses'>('students');

  const selectedYear = years.find((y) => y.id === selectedYearId);
  const isYearClosed = selectedYear?.status === 'COMPLETED';

  const fetchYearsAndBatches = async () => {
    try {
      setLoading(true);
      const allYears = await academicService.getYears();
      setYears(allYears);

      const currentYear = allYears.find((y) => y.isCurrent) || allYears[0];
      const activeYearId = selectedYearId || currentYear?.id || '';
      setSelectedYearId(activeYearId);

      if (activeYearId) {
        const batchList = await academicService.getBatches(activeYearId);
        setBatches(batchList);
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'መረጃዎችን መጫን አልተቻለም' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYearsAndBatches();
  }, []);

  const handleYearChange = async (yearId: string) => {
    setSelectedYearId(yearId);
    setLoading(true);
    try {
      const batchList = await academicService.getBatches(yearId);
      setBatches(batchList);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isYearClosed) {
      setMsg({ type: 'error', text: 'የተዘጋ የትምህርት ዘመን ላይ አዲስ ምድብ መፍጠር አይቻልም' });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await academicService.createBatch({
        academicYearId: selectedYearId,
        name,
        code,
        stageLevel,
        description,
      });
      setMsg({ type: 'success', text: res.message });
      setIsModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      handleYearChange(selectedYearId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || err.message || 'ምድቡን መፍጠር አልተቻለም' });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (b: BatchData) => {
    setEditingBatchId(b.id);
    setEditName(b.name);
    setEditCode(b.code);
    setEditStageLevel(b.stageLevel);
    setEditDescription(b.description || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isYearClosed) {
      setMsg({ type: 'error', text: 'የተዘጋ የትምህርት ዘመን ላይ ያለ ምድብ ማሻሻል አይቻልም' });
      return;
    }
    setUpdating(true);
    setMsg(null);
    try {
      const res = await academicService.updateBatch(editingBatchId, {
        name: editName,
        code: editCode,
        stageLevel: editStageLevel,
        description: editDescription,
      });
      setMsg({ type: 'success', text: res.message });
      setIsEditModalOpen(false);
      handleYearChange(selectedYearId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || err.message || 'ምድቡን ማሻሻል አልተቻለም' });
    } finally {
      setUpdating(false);
    }
  };

  const openDetailsModal = async (batchId: string) => {
    setIsDetailsModalOpen(true);
    setLoadingDetails(true);
    try {
      const data = await academicService.getBatchStudents(batchId);
      setSelectedBatchDetails(data);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'የምድቡን ዝርዝር መረጃ መጫን አልተቻለም' });
      setIsDetailsModalOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleToggleStatus = async (id: string, currentActive: boolean) => {
    if (isYearClosed) {
      setMsg({ type: 'error', text: 'የትምህርት ዘመኑ ስለተዘጋ የምድብ ሁኔታ መቀየር አይቻልም' });
      return;
    }
    try {
      const res = await academicService.toggleBatch(id, !currentActive);
      setMsg({ type: 'success', text: res.message });
      handleYearChange(selectedYearId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || err.message });
    }
  };

  const handleDelete = async (id: string, batchName: string) => {
    if (isYearClosed) {
      setMsg({ type: 'error', text: 'የተዘጋ የትምህርት ዘመን ምድብ መሰረዝ አይቻልም' });
      return;
    }
    if (!window.confirm(`እርግጠኛ ነዎት ምድብ '${batchName}' እንዲሰረዝ ይፈልጋሉ?`)) return;
    try {
      const res = await academicService.deleteBatch(id);
      setMsg({ type: 'success', text: res.message });
      handleYearChange(selectedYearId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || err.message });
    }
  };

  return (
    <div className="space-y-6 font-ethiopic">
      {/* Header Banner */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md w-fit">
            <Layers className="w-3.5 h-3.5" />
            <span>የተማሪዎች ምድቦች</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">የክፍሎችና ምድቦች አስተዳደር</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            እያንዳንዱ ምድብ የአንድ የትምህርት ዘመን ንዑስ ክፍል ሆኖ ተማሪዎችን እና ኮርሶችን ያሰባስባል
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Academic Year Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">የትምህርት ዘመን፡</span>
            <select
              value={selectedYearId}
              onChange={(e) => handleYearChange(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold text-brand-800 bg-white"
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.isCurrent ? '(ዋና)' : ''} {y.status === 'COMPLETED' ? '(የተዘጋ)' : ''}
                </option>
              ))}
            </select>
          </div>

          <Button 
            variant="primary" 
            size="md" 
            onClick={() => setIsModalOpen(true)}
            disabled={isYearClosed}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            አዲስ ምድብ ፍጠር
          </Button>
        </div>
      </div>

      {/* Closed Year Alert Banner */}
      {isYearClosed && (
        <div className="p-4 rounded-xl text-xs flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200">
          <Lock className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            ይህ የትምህርት ዘመን <strong>የተዘጋ (Completed)</strong> በመሆኑ በዚህ ስር ያሉ ምድቦችን ማሻሻል ወይም አዲስ መመዝገብ አይቻልም።
          </span>
        </div>
      )}

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Grid of Batches */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {batches.map((b) => (
          <div
            key={b.id}
            className={`bg-white rounded-2xl p-6 border shadow-sm space-y-4 transition-all ${
              b.isActive ? 'border-slate-200' : 'border-slate-200 opacity-75 bg-slate-50/50'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {b.code}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">{b.name}</h3>
                <span className="inline-block text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1">
                  {b.stageLevel}
                </span>
              </div>
              <div>
                {b.isActive ? (
                  <Badge variant="approved">ንቁ (Active)</Badge>
                ) : (
                  <Badge variant="rejected">የተዘጋ (Inactive)</Badge>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500 line-clamp-2">
              {b.description || 'የምድቡ አጠቃላይ መግለጫ እና ዕድሜ ደረጃ'}
            </p>

            {/* Counts */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveDetailTab('students');
                  openDetailsModal(b.id);
                }}
                className="bg-slate-50 hover:bg-slate-100 p-3 rounded-xl border border-slate-100 transition-colors text-left"
              >
                <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[11px] mb-1">
                  <Users className="w-3.5 h-3.5 text-brand-600" />
                  <span>የተመዘገቡ ተማሪዎች</span>
                </div>
                <div className="text-xl font-bold text-slate-800 text-center">{b._count?.students || 0}</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveDetailTab('courses');
                  openDetailsModal(b.id);
                }}
                className="bg-slate-50 hover:bg-slate-100 p-3 rounded-xl border border-slate-100 transition-colors text-left"
              >
                <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[11px] mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>የኮርስ ምደባዎች</span>
                </div>
                <div className="text-xl font-bold text-slate-800 text-center">{b._count?.courseOfferings || 0}</div>
              </button>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDetailsModal(b.id)}
                  className="text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  ዝርዝር
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openEditModal(b)}
                  className="text-xs"
                  disabled={isYearClosed}
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  አስተካክል
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant={b.isActive ? 'outline' : 'secondary'}
                  size="sm"
                  onClick={() => handleToggleStatus(b.id, b.isActive)}
                  className="text-xs"
                  disabled={isYearClosed}
                >
                  <Power className="w-3.5 h-3.5 mr-1" />
                  {b.isActive ? 'አቦዝን' : 'አንቃ'}
                </Button>

                <button
                  onClick={() => handleDelete(b.id, b.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-30"
                  title="አስወግድ"
                  disabled={isYearClosed}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {batches.length === 0 && !loading && (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300 space-y-3">
            <Layers className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="font-bold text-slate-800">በዚህ የትምህርት ዘመን ውስጥ የተመዘገበ ምድብ የለም</h4>
            <p className="text-xs text-slate-500">ተማሪዎችን ከመመዝገብዎ በፊት ቢያንስ አንድ ምድብ (ክፍል) ይፍጠሩ</p>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setIsModalOpen(true)}
              disabled={isYearClosed}
            >
              አዲስ ምድብ ፍጠር
            </Button>
          </div>
        )}
      </div>

      {/* Modal: Create Batch */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">አዲስ የተማሪዎች ምድብ መመዝገቢያ</h3>
                <p className="text-xs text-slate-500">
                  የትምህርት ዘመን፡ <strong>{years.find((y) => y.id === selectedYearId)?.name}</strong>
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">የምድብ ስም (Batch Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="ለምሳሌ፡ ምድብ 1 - የሕፃናት ክፍል"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">መለያ ኮድ (Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="ለምሳሌ፡ B-2016-CHI"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">በአንድ የትምህርት ዘመን ውስጥ ተመሳሳይ ኮድ መጠቀም አይቻልም</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">የደረጃ እርከን (Stage Level) *</label>
                <select
                  value={stageLevel}
                  onChange={(e) => setStageLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
                >
                  <option value="ደረጃ 1 (ሕፃናት)">ደረጃ 1 (ሕፃናት - 7 እስከ 12 ዓመት)</option>
                  <option value="ደረጃ 2 (ወጣቶች)">ደረጃ 2 (ወጣቶች - 13 እስከ 25 ዓመት)</option>
                  <option value="ደረጃ 3 (አበው እና እማት)">ደረጃ 3 (አበው እና እማት - አዋቂዎች)</option>
                  <option value="ልዩ ክፍል (መሰረተ ሃይማኖት)">ልዩ ክፍል (መሰረተ ሃይማኖት)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ማብራሪያ (Description)</label>
                <textarea
                  rows={2}
                  placeholder="ስለ ምድቡ ተጨማሪ ማብራሪያ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  ሰርዝ
                </Button>
                <Button type="submit" variant="primary" size="md" isLoading={submitting}>
                  ምድቡን መዝግብ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Batch */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">የተማሪዎች ምድብ ማሻሻያ</h3>
                <p className="text-xs text-slate-500">የምድቡን ስም፣ መለያ ኮድ እና ደረጃ ያስተካክሉ</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBatch} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">የምድብ ስም (Batch Name) *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">መለያ ኮድ (Code) *</label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">የደረጃ እርከን (Stage Level) *</label>
                <select
                  value={editStageLevel}
                  onChange={(e) => setEditStageLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
                >
                  <option value="ደረጃ 1 (ሕፃናት)">ደረጃ 1 (ሕፃናት - 7 እስከ 12 ዓመት)</option>
                  <option value="ደረጃ 2 (ወጣቶች)">ደረጃ 2 (ወጣቶች - 13 እስከ 25 ዓመት)</option>
                  <option value="ደረጃ 3 (አበው እና እማት)">ደረጃ 3 (አበው እና እማት - አዋቂዎች)</option>
                  <option value="ልዩ ክፍል (መሰረተ ሃይማኖት)">ልዩ ክፍል (መሰረተ ሃይማኖት)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ማብራሪያ (Description)</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                  ሰርዝ
                </Button>
                <Button type="submit" variant="primary" size="md" isLoading={updating}>
                  ለውጦችን መዝግብ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Batch Details */}
      {isDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                    {selectedBatchDetails?.batch?.code || '...'}
                  </span>
                  <Badge variant={selectedBatchDetails?.batch?.isActive ? 'approved' : 'rejected'}>
                    {selectedBatchDetails?.batch?.isActive ? 'ንቁ (Active)' : 'የተዘጋ (Inactive)'}
                  </Badge>
                </div>
                <h3 className="font-bold text-slate-900 text-xl mt-1">
                  {selectedBatchDetails?.batch?.name || 'የምድብ ዝርዝር'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  የትምህርት ዘመን፡ <strong>{selectedBatchDetails?.batch?.academicYear?.name}</strong> | ደረጃ፡ <strong>{selectedBatchDetails?.batch?.stageLevel}</strong>
                </p>
              </div>
              <button 
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 pt-3 flex gap-2 border-b border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setActiveDetailTab('students')}
                className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
                  activeDetailTab === 'students'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>የተመዘገቡ ተማሪዎች ({selectedBatchDetails?.students?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailTab('courses')}
                className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
                  activeDetailTab === 'courses'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>የተመደቡ ኮርሶች ({selectedBatchDetails?.batch?.courseOfferings?.length || 0})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingDetails ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  መረጃ በመጫን ላይ ነው...
                </div>
              ) : activeDetailTab === 'students' ? (
                <div>
                  {selectedBatchDetails?.students && selectedBatchDetails.students.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                          <tr>
                            <th className="px-4 py-2.5">መለያ ቁጥር</th>
                            <th className="px-4 py-2.5">ሙሉ ስም</th>
                            <th className="px-4 py-2.5">የክርስትና ስም</th>
                            <th className="px-4 py-2.5">ፆታ</th>
                            <th className="px-4 py-2.5">ስልክ</th>
                            <th className="px-4 py-2.5">ሁኔታ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedBatchDetails.students.map((st) => (
                            <tr key={st.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 font-mono font-bold text-brand-700">
                                {st.admissionNumber}
                              </td>
                              <td className="px-4 py-2.5 font-bold text-slate-900">
                                {st.user.firstName} {st.user.lastName}
                              </td>
                              <td className="px-4 py-2.5 text-slate-600">
                                {st.baptismalName || '-'}
                              </td>
                              <td className="px-4 py-2.5 text-slate-700">
                                {st.gender === 'MALE' ? 'ወንድ' : st.gender === 'FEMALE' ? 'ሴት' : st.gender}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-slate-600">
                                {st.user.phone || '-'}
                              </td>
                              <td className="px-4 py-2.5">
                                <Badge variant={st.user.isActive ? 'approved' : 'rejected'}>
                                  {st.user.isActive ? 'ንቁ' : 'ቦዝኗል'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      በዚህ ምድብ ውስጥ የተመዘገበ ተማሪ እስካሁን የለም።
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {selectedBatchDetails?.batch?.courseOfferings && selectedBatchDetails.batch.courseOfferings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedBatchDetails.batch.courseOfferings.map((co) => (
                        <div key={co.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                          <div className="flex justify-between items-start">
                            <span className="font-mono font-bold text-brand-800 bg-brand-100/60 px-2 py-0.5 rounded text-[11px]">
                              {co.course.code}
                            </span>
                            <span className="font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {co.termSemester}ኛ መንፈቅ
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm">{co.course.amharicTitle}</h4>
                          <p className="text-[11px] text-slate-500">{co.course.title} ({co.course.creditHours} ክሬዲት)</p>
                          <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5 text-slate-700">
                            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              {co.teacherAssignments && co.teacherAssignments.length > 0
                                ? co.teacherAssignments.map((a) => `${a.teacher.spiritualTitle || 'መምህር'} ${a.teacher.user.firstName} ${a.teacher.user.lastName}`).join(', ')
                                : 'መምህር አልተመደበም'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      በዚህ ምድብ ውስጥ የተመደበ ኮርስ እስካሁን የለም።
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end shrink-0">
              <Button variant="outline" size="sm" onClick={() => setIsDetailsModalOpen(false)}>
                ዝጋ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchesPage;
