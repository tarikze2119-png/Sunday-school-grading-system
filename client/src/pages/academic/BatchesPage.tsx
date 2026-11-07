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
  RefreshCw, 
  Users, 
  BookOpen, 
  Power 
} from 'lucide-react';

export const BatchesPage: React.FC = () => {
  const [years, setYears] = useState<AcademicYearData[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [stageLevel, setStageLevel] = useState('ደረጃ 1 (ሕፃናት)');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      setMsg({ type: 'error', text: err.message || 'ምድቡን መፍጠር አልተቻለም' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentActive: boolean) => {
    try {
      const res = await academicService.toggleBatch(id, !currentActive);
      setMsg({ type: 'success', text: res.message });
      handleYearChange(selectedYearId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id: string, batchName: string) => {
    if (!window.confirm(`እርግጠኛ ነዎት ምድብ '${batchName}' እንዲሰረዝ ይፈልጋሉ?`)) return;
    try {
      const res = await academicService.deleteBatch(id);
      setMsg({ type: 'success', text: res.message });
      handleYearChange(selectedYearId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
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
                  {y.name} {y.isCurrent ? '(ዋና)' : ''}
                </option>
              ))}
            </select>
          </div>

          <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            አዲስ ምድብ ፍጠር
          </Button>
        </div>
      </div>

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
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[11px] mb-1">
                  <Users className="w-3.5 h-3.5 text-brand-600" />
                  <span>የተመዘገቡ ተማሪዎች</span>
                </div>
                <span className="text-xl font-bold text-slate-800">{b._count?.students || 0}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[11px] mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>የኮርስ ምደባዎች</span>
                </div>
                <span className="text-xl font-bold text-slate-800">{b._count?.courseOfferings || 0}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
              <Button
                variant={b.isActive ? 'outline' : 'secondary'}
                size="sm"
                onClick={() => handleToggleStatus(b.id, b.isActive)}
                className="text-xs"
              >
                <Power className="w-3.5 h-3.5 mr-1" />
                {b.isActive ? 'አቦዝን (Deactivate)' : 'አንቃ (Activate)'}
              </Button>

              <button
                onClick={() => handleDelete(b.id, b.name)}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                title="አስወግድ"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {batches.length === 0 && !loading && (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300 space-y-3">
            <Layers className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="font-bold text-slate-800">በዚህ የትምህርት ዘመን ውስጥ የተመዘገበ ምድብ የለም</h4>
            <p className="text-xs text-slate-500">ተማሪዎችን ከመመዝገብዎ በፊት ቢያንስ አንድ ምድብ (ክፍል) ይፍጠሩ</p>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              አዲስ ምድብ ፍጠር
            </Button>
          </div>
        )}
      </div>

      {/* Modal: Create Batch */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">አዲስ የተማሪዎች ምድብ መመዝገቢያ</h3>
              <p className="text-xs text-slate-500">
                የትምህርት ዘመን፡ <strong>{years.find((y) => y.id === selectedYearId)?.name}</strong>
              </p>
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
    </div>
  );
};

export default BatchesPage;
