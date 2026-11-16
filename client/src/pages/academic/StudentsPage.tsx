import React, { useState, useEffect } from 'react';
import studentService, { StudentListItem } from '../../services/studentService';
import academicService, { AcademicYearData, BatchData } from '../../services/academicService';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { 
  Users, 
  UserPlus, 
  Search, 
  Download, 
  Upload, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  History,
  Edit2,
  Power,
  X,
  Phone,
  ShieldAlert
} from 'lucide-react';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [years, setYears] = useState<AcademicYearData[]>([]);
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedStudentForPromote, setSelectedStudentForPromote] = useState<StudentListItem | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentListItem | null>(null);

  // Register Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [grandfatherName, setGrandfatherName] = useState('');
  const [baptismalName, setBaptismalName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Form State
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editGrandfatherName, setEditGrandfatherName] = useState('');
  const [editBaptismalName, setEditBaptismalName] = useState('');
  const [editGender, setEditGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGuardianName, setEditGuardianName] = useState('');
  const [editGuardianPhone, setEditGuardianPhone] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBatchId, setEditBatchId] = useState('');
  const [updating, setUpdating] = useState(false);

  // Promote Form
  const [targetYearId, setTargetYearId] = useState('');
  const [targetBatchId, setTargetBatchId] = useState('');
  const [targetBatches, setTargetBatches] = useState<BatchData[]>([]);

  // Bulk Import
  const [csvText, setCsvText] = useState('');

  const initData = async () => {
    try {
      setLoading(true);
      const allYears = await academicService.getYears();
      setYears(allYears);
      const curr = allYears.find((y) => y.isCurrent) || allYears[0];
      const activeYear = curr?.id || '';
      setSelectedYearId(activeYear);

      if (activeYear) {
        const batchList = await academicService.getBatches(activeYear);
        setBatches(batchList);
      }

      await fetchStudents(activeYear, '');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'መረጃዎችን መጫን አልተቻለም' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (yearId: string, batchId: string) => {
    try {
      const data = await studentService.list({
        academicYearId: yearId || undefined,
        batchId: batchId || undefined,
        search: searchTerm || undefined,
      });
      setStudents(data.students);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  useEffect(() => {
    initData();
  }, []);

  const handleYearChange = async (yearId: string) => {
    setSelectedYearId(yearId);
    setSelectedBatchId('');
    const batchList = await academicService.getBatches(yearId);
    setBatches(batchList);
    fetchStudents(yearId, '');
  };

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    fetchStudents(selectedYearId, batchId);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents(selectedYearId, selectedBatchId);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await studentService.register({
        academicYearId: selectedYearId,
        batchId: selectedBatchId || batches[0]?.id,
        firstName,
        lastName,
        grandfatherName,
        baptismalName,
        gender,
        dateOfBirth: dateOfBirth || undefined,
        phone,
        email,
        guardianName,
        guardianPhone,
        emergencyContact,
        address,
      });
      setMsg({ type: 'success', text: res.message });
      setIsRegisterOpen(false);
      setFirstName('');
      setLastName('');
      setGrandfatherName('');
      setBaptismalName('');
      setDateOfBirth('');
      setPhone('');
      setEmail('');
      setGuardianName('');
      setGuardianPhone('');
      setEmergencyContact('');
      setAddress('');
      fetchStudents(selectedYearId, selectedBatchId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (student: StudentListItem) => {
    setEditingStudent(student);
    setEditFirstName(student.user.firstName || '');
    setEditLastName(student.user.lastName || '');
    setEditGrandfatherName(student.user.grandfatherName || '');
    setEditBaptismalName(student.baptismalName || '');
    setEditGender(student.gender || 'MALE');
    setEditDateOfBirth(student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '');
    setEditPhone(student.user.phone || '');
    setEditEmail(student.user.email || '');
    setEditGuardianName(student.guardianName || '');
    setEditGuardianPhone(student.guardianPhone || '');
    setEditEmergencyContact(student.emergencyContact || '');
    setEditAddress('');
    setEditBatchId(student.batchId || '');
    setIsEditOpen(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setUpdating(true);
    setMsg(null);
    try {
      const res = await studentService.update(editingStudent.id, {
        firstName: editFirstName,
        lastName: editLastName,
        grandfatherName: editGrandfatherName,
        baptismalName: editBaptismalName,
        gender: editGender,
        dateOfBirth: editDateOfBirth || undefined,
        phone: editPhone || undefined,
        email: editEmail || undefined,
        guardianName: editGuardianName || undefined,
        guardianPhone: editGuardianPhone || undefined,
        emergencyContact: editEmergencyContact || undefined,
        address: editAddress || undefined,
        batchId: editBatchId || undefined,
      });
      setMsg({ type: 'success', text: res.message });
      setIsEditOpen(false);
      fetchStudents(selectedYearId, selectedBatchId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = async (student: StudentListItem) => {
    const nextStatus = !student.user.isActive;
    const actionLabel = nextStatus ? 'ማንቃት' : 'ማገድ';
    if (!window.confirm(`እርግጠኛ ነዎት የተማሪ '${student.user.firstName} ${student.user.lastName}' አካውንት ${actionLabel} ይፈልጋሉ?`)) {
      return;
    }
    try {
      const res = await studentService.toggleStatus(student.id, nextStatus);
      setMsg({ type: 'success', text: res.message });
      fetchStudents(selectedYearId, selectedBatchId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || err.message });
    }
  };

  const openPromoteModal = async (student: StudentListItem) => {
    setSelectedStudentForPromote(student);
    setIsPromoteOpen(true);
    const curr = years.find((y) => y.id !== student.academicYearId) || years[0];
    const nxtYear = curr?.id || '';
    setTargetYearId(nxtYear);
    if (nxtYear) {
      const bList = await academicService.getBatches(nxtYear);
      setTargetBatches(bList);
      setTargetBatchId(bList[0]?.id || '');
    }
  };

  const handleTargetYearChange = async (yId: string) => {
    setTargetYearId(yId);
    const bList = await academicService.getBatches(yId);
    setTargetBatches(bList);
    setTargetBatchId(bList[0]?.id || '');
  };

  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForPromote || !targetYearId || !targetBatchId) return;
    setSubmitting(true);
    try {
      const res = await studentService.promote(
        selectedStudentForPromote.id,
        targetYearId,
        targetBatchId
      );
      setMsg({ type: 'success', text: res.message });
      setIsPromoteOpen(false);
      fetchStudents(selectedYearId, selectedBatchId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const lines = csvText.trim().split('\n');
      const rows = lines.map((line) => {
        const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
        return {
          firstName: parts[0] || '',
          lastName: parts[1] || '',
          baptismalName: parts[2] || undefined,
          gender: parts[3] || 'ወንድ',
          phone: parts[4] || undefined,
          guardianName: parts[5] || undefined,
          guardianPhone: parts[6] || undefined,
        };
      });

      const res = await studentService.importExcel(
        selectedYearId,
        selectedBatchId || batches[0]?.id,
        rows
      );
      setMsg({ type: 'success', text: res.message });
      setIsImportOpen(false);
      setCsvText('');
      fetchStudents(selectedYearId, selectedBatchId);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-ethiopic">
      {/* Header Banner */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md w-fit">
            <Users className="w-3.5 h-3.5" />
            <span>የተማሪዎች አስተዳደር</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">የሰንበት ትምህርት ቤት ተማሪዎች ዝርዝር</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            የተማሪዎችን ሙሉ መረጃ ይመዝግቡ፤ ያስተካክሉ፤ ታሪካዊ የትምህርት መዝገብ ሳይበርዝ ወደ አዲስ ምድብ ያሳልፉ
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={studentService.exportCSVUrl(selectedYearId, selectedBatchId)}
            download="students_list.csv"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-300"
          >
            <Download className="w-3.5 h-3.5" />
            <span>በExcel አውርድ</span>
          </a>

          <Button variant="outline" size="md" onClick={() => setIsImportOpen(true)}>
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            <span>በጅምላ አስገባ</span>
          </Button>

          <Button variant="primary" size="md" onClick={() => setIsRegisterOpen(true)}>
            <UserPlus className="w-4 h-4 mr-1.5" />
            <span>ተማሪ መዝግብ</span>
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

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Year Filter */}
          <div className="text-xs">
            <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">የትምህርት ዘመን</label>
            <select
              value={selectedYearId}
              onChange={(e) => handleYearChange(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white"
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.isCurrent ? '(ዋና)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Filter */}
          <div className="text-xs">
            <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">የተማሪዎች ምድብ</label>
            <select
              value={selectedBatchId}
              onChange={(e) => handleBatchChange(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white"
            >
              <option value="">-- ሁሉም ምድቦች ({batches.length}) --</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.stageLevel})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="በስም፣ በክርስትና ስም ወይም በመ.ቁ ፈልግ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            ፈልግ
          </Button>
        </form>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">የተማሪ መለያ (ID)</th>
                <th className="px-4 py-3">ሙሉ ስም</th>
                <th className="px-4 py-3">የክርስትና ስም</th>
                <th className="px-4 py-3">ጾታ</th>
                <th className="px-4 py-3">የአሁኑ ምድብ</th>
                <th className="px-4 py-3">የወላጅ ስም እና ስልክ</th>
                <th className="px-4 py-3">ሁኔታ</th>
                <th className="px-4 py-3">የምዝገባ ታሪክ</th>
                <th className="px-4 py-3 text-right">ተግባራት</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono font-bold text-brand-700">
                    {s.admissionNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-900 block">
                      {s.user.firstName} {s.user.lastName} {s.user.grandfatherName || ''}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">@{s.user.username}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    {s.baptismalName || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.gender === 'FEMALE' ? 'ሴት' : 'ወንድ'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-semibold text-[11px]">
                      {s.batch?.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{s.academicYear?.name}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{s.guardianName || '-'}</div>
                    <div className="font-mono text-[10px] text-slate-500">{s.guardianPhone || s.user.phone || ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={s.user.isActive ? 'approved' : 'rejected'}>
                      {s.user.isActive ? 'ንቁ (Active)' : 'የታገደ (Inactive)'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <History className="w-3 h-3" />
                      {s.registrations?.length || 1} ዓመታት
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditModal(s)}
                        className="text-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        አስተካክል
                      </Button>

                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => openPromoteModal(s)}
                        className="text-xs"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                        አሳልፍ
                      </Button>

                      <Button
                        variant={s.user.isActive ? 'outline' : 'secondary'}
                        size="sm"
                        onClick={() => handleToggleStatus(s)}
                        className="text-xs"
                      >
                        <Power className="w-3.5 h-3.5 mr-1" />
                        {s.user.isActive ? 'አግድ' : 'አንቃ'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {students.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    ምንም ተማሪ አልተገኘም
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Student Profile */}
      {isEditOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                    {editingStudent.admissionNumber}
                  </span>
                  <Badge variant={editingStudent.user.isActive ? 'approved' : 'rejected'}>
                    {editingStudent.user.isActive ? 'ንቁ' : 'የታገደ'}
                  </Badge>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mt-1">የተማሪ መረጃ ማሻሻያ</h3>
                <p className="text-xs text-slate-500">
                  የትምህርት ዘመን፡ <strong>{editingStudent.academicYear?.name}</strong> (የመለያ ቁጥር አይቀየርም)
                </p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">መጠሪያ ስም *</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የአባት ስም *</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የአያት ስም</label>
                  <input
                    type="text"
                    value={editGrandfatherName}
                    onChange={(e) => setEditGrandfatherName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የክርስትና ስም</label>
                  <input
                    type="text"
                    value={editBaptismalName}
                    onChange={(e) => setEditBaptismalName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ጾታ *</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="MALE">ወንድ</option>
                    <option value="FEMALE">ሴት</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የትውልድ ቀን</label>
                  <input
                    type="date"
                    value={editDateOfBirth}
                    onChange={(e) => setEditDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የተማሪ ስልክ ቁጥር</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ኢሜይል</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የወላጅ / አሳዳጊ ስም</label>
                  <input
                    type="text"
                    value={editGuardianName}
                    onChange={(e) => setEditGuardianName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የወላጅ / አሳዳጊ ስልክ ቁጥር</label>
                  <input
                    type="text"
                    value={editGuardianPhone}
                    onChange={(e) => setEditGuardianPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የአደጋ ጊዜ ተጠሪ ስልክ</label>
                  <input
                    type="text"
                    value={editEmergencyContact}
                    onChange={(e) => setEditEmergencyContact(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የተማሪዎች ምድብ (Batch)</label>
                  <select
                    value={editBatchId}
                    onChange={(e) => setEditBatchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.stageLevel})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
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

      {/* Modal: Register Student */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">አዲስ ተማሪ መመዝገቢያ</h3>
                <p className="text-xs text-slate-500">
                  የትምህርት ዘመን፡ <strong>{years.find((y) => y.id === selectedYearId)?.name}</strong>
                </p>
              </div>
              <button onClick={() => setIsRegisterOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የተማሪዎች ምድብ (Batch) *</label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.stageLevel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ጾታ *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="MALE">ወንድ</option>
                    <option value="FEMALE">ሴት</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">መጠሪያ ስም (First Name) *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የአባት ስም (Father's Name) *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የአያት ስም</label>
                  <input
                    type="text"
                    value={grandfatherName}
                    onChange={(e) => setGrandfatherName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የክርስትና ስም</label>
                  <input
                    type="text"
                    value={baptismalName}
                    onChange={(e) => setBaptismalName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ስልክ ቁጥር</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ኢሜይል</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የወላጅ / አሳዳጊ ስም</label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">የወላጅ ስልክ ቁጥር</label>
                  <input
                    type="text"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsRegisterOpen(false)}>
                  ሰርዝ
                </Button>
                <Button type="submit" variant="primary" size="md" isLoading={submitting}>
                  ተማሪውን መዝግብ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Promote Student */}
      {isPromoteOpen && selectedStudentForPromote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">ተማሪን ወደ አዲስ የትምህርት ዘመን ማሳለፍ</h3>
                <p className="text-xs text-slate-500">
                  ተማሪ፡ <strong>{selectedStudentForPromote.user.firstName} {selectedStudentForPromote.user.lastName}</strong>
                </p>
              </div>
              <button onClick={() => setIsPromoteOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePromoteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">አዲሱ የትምህርት ዘመን *</label>
                <select
                  required
                  value={targetYearId}
                  onChange={(e) => handleTargetYearChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.isCurrent ? '(ዋና)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">አዲሱ የተማሪዎች ምድብ *</label>
                <select
                  required
                  value={targetBatchId}
                  onChange={(e) => setTargetBatchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
                >
                  {targetBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.stageLevel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px]">
                ተማሪው ሲዛወር የቀደመ የትምህርት ዘመን ውጤት፣ ምዝገባ እና ታሪክ ሳይበረዝ ተጠብቆ ይቀመጣል።
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsPromoteOpen(false)}>
                  ሰርዝ
                </Button>
                <Button type="submit" variant="primary" size="md" isLoading={submitting}>
                  ማሳለፍን አረጋግጥ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk Import */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">የተማሪዎች የጅምላ ምዝገባ (CSV Text)</h3>
                <p className="text-xs text-slate-500">
                  ቅርጸት፡ ስም, የአባት ስም, የክርስትና ስም, ጾታ, ስልክ, የወላጅ ስም, የወላጅ ስልክ
                </p>
              </div>
              <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkImport} className="space-y-4 text-xs">
              <textarea
                rows={8}
                required
                placeholder="ዳዊት, አበበ, ወልደ ጊዮርጊስ, ወንድ, 0911000000, አበበ ከበደ, 0922000000&#10;ሳራ, ተስፋዬ, ወለተ ማርያም, ሴት, 0911111111, ተስፋዬ በቀለ, 0933333333"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
              />

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsImportOpen(false)}>
                  ሰርዝ
                </Button>
                <Button type="submit" variant="primary" size="md" isLoading={submitting}>
                  በጅምላ መዝግብ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsPage;
