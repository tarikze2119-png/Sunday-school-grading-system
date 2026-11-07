import React, { useState, useEffect } from 'react';
import { AssessmentItem, AssessmentType } from '../../types/grade.types';
import gradeService from '../../services/gradeService';
import Button from '../common/Button';
import { 
  X, 
  Plus, 
  Trash2, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Sliders,
  HelpCircle
} from 'lucide-react';

interface Props {
  offeringId: string;
  courseTitle: string;
  onClose: () => void;
  onSaved?: () => void;
}

export const AssessmentConfigModal: React.FC<Props> = ({
  offeringId,
  courseTitle,
  onClose,
  onSaved,
}) => {
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State for new assessment
  const [name, setName] = useState('');
  const [type, setType] = useState<AssessmentType>('HOMEWORK_ASSIGNMENT');
  const [maxScore, setMaxScore] = useState<number>(20);
  const [weightPercentage, setWeightPercentage] = useState<number>(20);
  const [description, setDescription] = useState('');

  const assessmentTypes: { value: AssessmentType; label: string }[] = [
    { value: 'ATTENDANCE_DISCIPLINE', label: 'ክትትል እና ስነ-ምግባር' },
    { value: 'HOMEWORK_ASSIGNMENT', label: 'የቤት ስራ እና የክፍል ተሳትፎ' },
    { value: 'QUIZ', label: 'ፈጣን ፈተና (Quiz)' },
    { value: 'MIDTERM_EXAM', label: 'አጋማሽ ፈተና (Midterm)' },
    { value: 'FINAL_EXAM', label: 'የማጠቃለያ ፈተና (Final Exam)' },
    { value: 'PROJECT', label: 'ጥናት እና ምርምር (Project)' },
    { value: 'PRACTICAL_LITURGY', label: 'ተግባራዊ ዜማ እና ሥርዓተ ቤተክርስቲያን' },
  ];

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gradeService.getAssessments(offeringId);
      setAssessments(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'የምዘና መስፈርቶችን መጫን አልተቻለም።');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [offeringId]);

  const totalWeight = assessments.reduce(
    (sum, a) => sum + Number(a.weightPercentage),
    0
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('እባክዎ የምዘናውን ስም ያስገቡ።');
      return;
    }

    if (totalWeight + Number(weightPercentage) > 100) {
      setError(`የምዘናዎች ድምር ከ100% መብለጥ አይችልም። ሊጨመር የሚችለው ከፍተኛው መጠን ${100 - totalWeight}% ነው።`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await gradeService.createAssessment(offeringId, {
        name: name.trim(),
        type,
        maxScore: Number(maxScore),
        weightPercentage: Number(weightPercentage),
        description: description.trim() || undefined,
      });

      setName('');
      setDescription('');
      setSuccess('የምዘና መስፈርቱ በተሳካ ሁኔታ ተጨምሯል።');
      setTimeout(() => setSuccess(null), 3000);
      await fetchAssessments();
      if (onSaved) onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message || 'የምዘና መስፈርቱን መፍጠር አልተቻለም።');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    if (!window.confirm(`እርግጠኛ ነዎት '${itemTitle}' የሚለውን የምዘና መስፈርት መሰረዝ ይፈልጋሉ?`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await gradeService.deleteAssessment(id);
      setSuccess('የምዘና መስፈርቱ ተሰርዟል።');
      setTimeout(() => setSuccess(null), 3000);
      await fetchAssessments();
      if (onSaved) onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message || 'የምዘና መስፈርቱን መሰረዝ አልተቻለም።');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = async () => {
    if (
      assessments.length > 0 &&
      !window.confirm(
        'ነባር መስፈርቶችን በማስወገድ መደበኛውን የሰንበት ት/ቤት የምዘና መዋቅር (10/10/20/20/40) መተግበር ይፈልጋሉ?'
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await gradeService.applyStandardTemplate(offeringId);
      setSuccess('መደበኛ የምዘና መዋቅር (100%) በተሳካ ሁኔታ ተተግብሯል።');
      setTimeout(() => setSuccess(null), 3000);
      await fetchAssessments();
      if (onSaved) onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message || 'መደበኛውን መዋቅር መተግበር አልተቻለም።');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-ethiopic">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">የምዘና መስፈርቶች ማስተካከያ</h2>
              <p className="text-xs text-slate-500">{courseTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Weight Balance Progress Banner */}
        <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="flex items-center gap-1.5 text-slate-700">
              የክብደት ድምር (Total Weight):
              <span
                className={`text-sm px-2 py-0.5 rounded-md ${
                  totalWeight === 100
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {totalWeight}% / 100%
              </span>
            </span>
            {totalWeight === 100 ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> ሙሉ ሆኗል (ትክክል)
              </span>
            ) : (
              <span className="text-amber-700 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {100 - totalWeight}% ይቀራል
              </span>
            )}
          </div>
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                totalWeight === 100
                  ? 'bg-emerald-600'
                  : totalWeight > 100
                  ? 'bg-red-600'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(totalWeight, 100)}%` }}
            />
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* Quick Preset Action */}
          <div className="bg-brand-50/60 p-4 rounded-xl border border-brand-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-brand-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-600" />
                መደበኛ የሰንበት ት/ቤት የምዘና መዋቅር (Standard 5-Component)
              </h4>
              <p className="text-[11px] text-brand-700 mt-0.5">
                ክትትል (10%) + የቤት ሥራ (10%) + ፈጣን ፈተና (20%) + አጋማሽ (20%) + ማጠቃለያ (40%) = 100%
              </p>
            </div>
            <button
              type="button"
              onClick={handleApplyPreset}
              disabled={saving}
              className="px-3.5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-sm disabled:opacity-50"
            >
              ይህን ቅንብር ተግብር
            </button>
          </div>

          {/* Existing Assessments List */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              የተዋቀሩ የምዘና መስፈርቶች ({assessments.length})
            </h3>
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">እየተጫነ ነው...</div>
            ) : assessments.length === 0 ? (
              <div className="p-6 rounded-xl border-2 border-dashed border-slate-200 text-center text-xs text-slate-500">
                እስካሁን የተዋቀረ የምዘና መስፈርት የለም። ከላይ ያለውን መደበኛ ቅንብር ይተግብሩ ወይም አዲስ ይጨምሩ።
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {assessments.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{item.name}</p>
                        <p className="text-[11px] text-slate-500">
                          ከፍተኛ ውጤት፦ <strong className="text-slate-800">{item.maxScore}</strong> • የክብደት መጠን፦{' '}
                          <strong className="text-brand-700">{item.weightPercentage}%</strong>
                          {item.description && ` • ${item.description}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      disabled={saving}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="ሰርዝ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Assessment Form */}
          {totalWeight < 100 && (
            <form onSubmit={handleCreate} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-brand-600" /> አዲስ የምዘና መስፈርት ጨምር
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    የምዘናው መጠሪያ ስም *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ምሳሌ፦ የቃል ፈተና 1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    የምዘናው ዓይነት *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AssessmentType)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    {assessmentTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    የፈተናው ከፍተኛ ውጤት (Max Score) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    የክብደት መጠን ከመቶ (Weight %) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={100 - totalWeight}
                    required
                    value={weightPercentage}
                    onChange={(e) => setWeightPercentage(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    ሊጨመር የሚችለው ከፍተኛ መጠን፦ {100 - totalWeight}%
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  አጭር ማብራሪያ (አማራጭ)
                </label>
                <input
                  type="text"
                  placeholder="ተጨማሪ ማብራሪያ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button type="submit" variant="primary" size="sm" loading={saving}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> መዝግብ
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            ዝጋ
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentConfigModal;
