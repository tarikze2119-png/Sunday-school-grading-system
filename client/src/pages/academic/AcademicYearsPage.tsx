import React, { useState, useEffect } from 'react';
import academicService, { AcademicYearData } from '../../services/academicService';
import { formatEthiopianDate } from '../../utils/ethiopianCalendar';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { 
  Calendar, 
  Plus, 
  CheckCircle2, 
  Archive, 
  Trash2, 
  Star, 
  AlertCircle, 
  RefreshCw,
  Layers,
  BookOpen,
  Users
} from 'lucide-react';

export const AcademicYearsPage: React.FC = () => {
  const [years, setYears] = useState<AcademicYearData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [name, setName] = useState('2019 E.C.');
  const [code, setCode] = useState('AY-2019-EC');
  const [startDate, setStartDate] = useState('2026-09-11');
  const [endDate, setEndDate] = useState('2027-07-07');
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchYears = async () => {
    try {
      setLoading(true);
      const data = await academicService.getYears();
      setYears(data);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'የትምህርት ዘመናትን መጫን አልተቻለም' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await academicService.createYear({
        name,
        code,
        startDate,
        endDate,
        isCurrent,
        description,
      });
      setMsg({ type: 'success', text: res.message });
      setIsModalOpen(false);
      fetchYears();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'የትምህርት ዘመኑን መፍጠር አልተቻለም' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetCurrent = async (id: string) => {
    setMsg(null);
    try {
      const res = await academicService.setCurrentYear(id);
      setMsg({ type: 'success', text: res.message });
      fetchYears();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'ዋና የትምህርት ዘመን ማድረግ አልተቻለም' });
    }
  };

  const handleToggleArchive = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    try {
      await academicService.updateYearStatus(id, nextStatus);
      fetchYears();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id: string, yearName: string) => {
    if (!window.confirm(`እርግጠኛ ነዎት የትምህርት ዘመን '${yearName}' እንዲሰረዝ ይፈልጋሉ?`)) return;
    try {
      const res = await academicService.deleteYear(id);
      setMsg({ type: 'success', text: res.message });
      fetchYears();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6 font-ethiopic">
      {/* Header Banner */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md w-fit">
            <Calendar className="w-3.5 h-3.5" />
            <span>የትምህርት ዘመናት አስተዳደር</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">የትምህርት ዘመናት ዝርዝር እና ሁኔታ</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            የትምህርት ዘመናትን በኢትዮጵያ የቀን አቆጣጠር (ዓ.ም.) ያስተዳድሩ፤ ዋናውን የትምህርት ዘመን ይምረጡ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchYears}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            አዲስ የትምህርት ዘመን ፍጠር
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

      {/* Grid of Academic Years */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {years.map((y) => (
          <div
            key={y.id}
            className={`bg-white rounded-2xl p-6 border shadow-sm space-y-4 transition-all relative ${
              y.isCurrent
                ? 'border-brand-500 ring-2 ring-brand-100'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {y.isCurrent && (
              <span className="absolute top-4 right-4 bg-gold-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <Star className="w-3 h-3 fill-current" />
                ዋና የትምህርት ዘመን
              </span>
            )}

            <div>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {y.code}
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">{y.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{y.description || 'የሰንበት ትምህርት ቤት የትምህርት ዘመን'}</p>
            </div>

            {/* Ethiopic & Gregorian Date Display */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">የመጀመሪያ ቀን፡</span>
                <span>{formatEthiopianDate(y.startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">የማጠቃለያ ቀን፡</span>
                <span>{formatEthiopianDate(y.endDate)}</span>
              </div>
              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 font-mono">
                G.C: {new Date(y.startDate).toISOString().slice(0, 10)} ➔ {new Date(y.endDate).toISOString().slice(0, 10)}
              </div>
            </div>

            {/* Counts */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="font-bold text-slate-800 block text-sm">{y._count?.batches || 0}</span>
                <span className="text-[10px] text-slate-500">ምድቦች</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="font-bold text-slate-800 block text-sm">{y._count?.courseOfferings || 0}</span>
                <span className="text-[10px] text-slate-500">ኮርሶች</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="font-bold text-slate-800 block text-sm">{y._count?.students || 0}</span>
                <span className="text-[10px] text-slate-500">ተማሪዎች</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-2">
              {!y.isCurrent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetCurrent(y.id)}
                  className="text-xs"
                >
                  <Star className="w-3 h-3 mr-1" />
                  ዋና አድርግ
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleToggleArchive(y.id, y.status)}
                className="text-xs"
              >
                <Archive className="w-3 h-3 mr-1" />
                {y.status === 'ARCHIVED' ? 'አንቃ' : 'ወደ ማህደር'}
              </Button>

              <button
                onClick={() => handleDelete(y.id, y.name)}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                title="አስወግድ"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create Academic Year */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">አዲስ የትምህርት ዘመን መመዝገቢያ</h3>
              <p className="text-xs text-slate-500">ስም እና መጀመሪያ/መጨረሻ ቀናትን ይወስኑ (Timezone: Africa/Addis_Ababa)</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">የትምህርት ዘመን ስም (Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="ለምሳሌ፡ 2019 E.C. ወይም 2019 ዓ.ም."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">መለያ ኮድ (Unique Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="ለምሳሌ፡ AY-2019-EC"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">መጀመሪያ ቀን (Start Date) *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                  <span className="text-[10px] text-brand-700 mt-1 block">
                    {startDate && formatEthiopianDate(startDate)}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የማጠቃለያ ቀን (End Date) *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                  <span className="text-[10px] text-brand-700 mt-1 block">
                    {endDate && formatEthiopianDate(endDate)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ማብራሪያ (Description)</label>
                <textarea
                  rows={2}
                  placeholder="ስለ ትምህርት ዘመኑ አጭር ማስታወሻ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isCurrentCheck"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  className="rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                />
                <label htmlFor="isCurrentCheck" className="font-semibold text-slate-700 cursor-pointer">
                  አሁን የሚሰራበት ዋና የትምህርት ዘመን ይሁን (Set as Active Current Year)
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  ሰርዝ
                </Button>
                <Button type="submit" variant="primary" size="md" isLoading={submitting}>
                  መዝግብ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicYearsPage;
