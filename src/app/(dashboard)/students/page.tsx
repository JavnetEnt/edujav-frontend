'use client';

import { useEffect, useState } from 'react';
import {
  Upload,
  UserPlus,
  Users,
  Download,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Pencil,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';

export default function StudentsAndStaffPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'STAFF'>('STUDENT');

  // Bulk CSV State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvResult, setCsvResult] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);

  // Single Student Form
  const [studentForm, setStudentForm] = useState({
    firstName: '',
    lastName: '',
    classRoomId: '',
    gender: 'Male',
    parentFirstName: '',
    parentLastName: '',
    parentEmail: '',
    parentPhone: '',
  });

  // Single Staff Form
  const [staffForm, setStaffForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'TEACHER',
  });

  const [banner, setBanner] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [{ data: allUsers }, { data: overview }] = await Promise.all([
        api.get('/users'),
        api.get('/academics/overview'),
      ]);
      setUsers(allUsers || []);
      setClasses(overview.classes || []);
      if (overview.classes?.length && !studentForm.classRoomId) {
        setStudentForm((prev) => ({ ...prev, classRoomId: overview.classes[0].id }));
      }
    } catch (err) {
      console.error('Failed to load school directory:', err);
    }
  }

  function downloadSampleCsv() {
    const sample = [
      'firstName,lastName,className,arm,gender,parentFirstName,parentLastName,parentEmail,parentPhone',
      'Chinedu,Okafor,JSS 1,A,Male,Ngozi,Okafor,ngozi.okafor@gmail.com,+2348022223333',
      'Amaka,Okafor,JSS 2,B,Female,Ngozi,Okafor,ngozi.okafor@gmail.com,+2348022223333',
      'Tunde,Bakare,SS 1,Science,Male,Femi,Bakare,femi.bakare@yahoo.com,+2348034445555',
    ].join('\n');

    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'student_bulk_onboarding_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleCsvUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!csvFile) return;
    setUploading(true);
    setCsvResult(null);
    setBanner('');

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const { data } = await api.post('/users/students/bulk-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCsvResult(data);
      setCsvFile(null);
      await loadData();
    } catch (err: any) {
      setBanner(err.response?.data?.message || 'Bulk CSV upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSingleStudentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner('');
    try {
      const { data } = await api.post('/users/students', studentForm);
      setBanner(
        `Enrolled ${data.student.name} (${data.admissionNumber})! Default password: Student@123`,
      );
      setStudentForm({
        ...studentForm,
        firstName: '',
        lastName: '',
        parentFirstName: '',
        parentLastName: '',
        parentEmail: '',
        parentPhone: '',
      });
      await loadData();
    } catch (err: any) {
      setBanner(err.response?.data?.message || 'Error enrolling student');
    }
  }

  async function handleStaffSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner('');
    try {
      const { data } = await api.post('/users/staff', staffForm);
      setBanner(
        `Created ${data.staff.role} account for ${data.staff.firstName} ${data.staff.lastName} (Default password: ${data.defaultPassword})`,
      );
      setStaffForm({ firstName: '', lastName: '', email: '', phone: '', role: 'TEACHER' });
      await loadData();
    } catch (err: any) {
      setBanner(err.response?.data?.message || 'Error creating staff');
    }
  }

  const [editingUser, setEditingUser] = useState<any | null>(null);
const [editForm, setEditForm] = useState({
  firstName: '',
  lastName: '',
  phone: '',
  classRoomId: '',
});

function openEditModal(u: any) {
  setEditingUser(u);
  setEditForm({
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone || '',
    classRoomId: u.studentProfile?.classRoomId || '',
  });
}

async function handleUpdateUser(e: React.FormEvent) {
  e.preventDefault();
  if (!editingUser) return;
  try {
    await api.patch(`/users/${editingUser.id}`, {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      phone: editForm.phone,
      ...(editingUser.role === 'STUDENT' && editForm.classRoomId
        ? { classRoomId: editForm.classRoomId }
        : {}),
    });
    setBanner('Member details updated.');
    setEditingUser(null);
    await loadData();
  } catch (err: any) {
    setBanner(err.response?.data?.message || 'Failed to update record');
  }
}

async function handleDeleteUser(u: any) {
  if (!confirm(`Remove ${u.firstName} ${u.lastName} from this school?`)) return;
  try {
    const { data } = await api.delete(`/users/${u.id}`);
    setBanner(data.message);
    await loadData();
  } catch (err: any) {
    setBanner(err.response?.data?.message || 'Failed to delete record');
  }
}


  const displayedUsers = users.filter((u) =>
    activeTab === 'STUDENT'
      ? u.role === 'STUDENT'
      : ['TEACHER', 'BURSAR', 'ADMIN'].includes(u.role),
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Student & Staff Onboarding Center
          </h1>
          <p className="text-sm text-slate-500">
            Bulk-import students via CSV with automatic admission numbers & parent linking, or onboard staff.
          </p>
        </div>

        <button
          onClick={downloadSampleCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 shadow-sm"
        >
          <Download className="w-4 h-4 text-blue-600" />
          Download CSV Template
        </button>
      </div>

      {banner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {banner}
        </div>
      )}

      {/* Top Grid: Bulk CSV Upload + Quick Single Enroll */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A: One-Click Bulk CSV Upload */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Bulk CSV Student Import</h2>
              <p className="text-xs text-slate-500">
                Auto-generates admission IDs & links siblings to one parent login
              </p>
            </div>
          </div>

          <form onSubmit={handleCsvUpload} className="space-y-4">
            <label className="block border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition bg-slate-50/50">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">
                {csvFile ? csvFile.name : 'Click to select your school student .CSV file'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Required columns: firstName, lastName, className, arm, parentEmail
              </p>
            </label>

            <button
              type="submit"
              disabled={!csvFile || uploading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition disabled:opacity-50"
            >
              {uploading ? 'Processing & Generating Accounts...' : 'Upload & Enroll Students'}
            </button>
          </form>

          {csvResult && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <p className="font-bold text-slate-900">
                Import Summary: {csvResult.summary.successfullyEnrolled} enrolled /{' '}
                {csvResult.summary.failedRows} failed
              </p>
              {csvResult.errors?.length > 0 && (
                <div className="text-amber-700 space-y-1">
                  {csvResult.errors.map((e: any, idx: number) => (
                    <p key={idx} className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Row {e.row}: {e.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card B: Quick Single Student OR Staff Enrollment */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              {activeTab === 'STUDENT' ? (
                <UserPlus className="w-5 h-5 text-blue-600" />
              ) : (
                <Briefcase className="w-5 h-5 text-blue-600" />
              )}
              <h2 className="font-bold text-slate-900">
                {activeTab === 'STUDENT' ? 'Single Student Admission' : 'Onboard Staff Member'}
              </h2>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('STUDENT')}
                className={`px-3 py-1 rounded-md transition ${
                  activeTab === 'STUDENT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('STAFF')}
                className={`px-3 py-1 rounded-md transition ${
                  activeTab === 'STAFF' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Staff
              </button>
            </div>
          </div>
          {activeTab === 'STUDENT' ? (
            <form onSubmit={handleSingleStudentSubmit} className="grid grid-cols-2 gap-3 text-sm">
              <input
                required
                placeholder="Student First Name"
                value={studentForm.firstName}
                onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
              />
              <input
                required
                placeholder="Student Last Name"
                value={studentForm.lastName}
                onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
              />
              <select
                required
                value={studentForm.classRoomId}
                onChange={(e) => setStudentForm({ ...studentForm, classRoomId: e.target.value })}
                className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.arm || ''}
                  </option>
                ))}
              </select>
              <select
                value={studentForm.gender}
                onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <input
                placeholder="Parent First Name"
                value={studentForm.parentFirstName}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, parentFirstName: e.target.value })
                }
                className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
              />
              <input
                type="email"
                placeholder="Parent Email (Links Siblings)"
                value={studentForm.parentEmail}
                onChange={(e) => setStudentForm({ ...studentForm, parentEmail: e.target.value })}
                className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
              />
              <button
                type="submit"
                className="col-span-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
              >
                Admit Student & Generate ID
              </button>
            </form>
          ) : (
            <form onSubmit={handleStaffSubmit} className="grid grid-cols-2 gap-3 text-sm">
              <input
                required
                placeholder="Staff First Name"
                value={staffForm.firstName}
                onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
              />
              <input
                required
                placeholder="Staff Last Name"
                value={staffForm.lastName}
                onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
              />
              <input
                required
                type="email"
                placeholder="Staff Email"
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
              />
              <select
                value={staffForm.role}
                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
              >
                <option value="TEACHER">Teacher</option>
                <option value="BURSAR">Bursar / Accountant</option>
                <option value="ADMIN">Principal / Vice Principal</option>
              </select>
              <button
                type="submit"
                className="col-span-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
              >
                Create Staff Account
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-900">
            {activeTab === 'STUDENT'
              ? `Enrolled Students (${displayedUsers.length})`
              : `School Staff Directory (${displayedUsers.length})`}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">
                  {activeTab === 'STUDENT' ? 'Admission Number' : 'Role'}
                </th>
                <th className="p-4">{activeTab === 'STUDENT' ? 'Class' : 'Email'}</th>
                <th className="p-4">Portal Login Email</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-900">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="p-4 font-mono text-xs text-blue-700 font-semibold">
                    {activeTab === 'STUDENT' ? u.studentProfile?.admissionNumber : u.role}
                  </td>
                  <td className="p-4 text-slate-700">
                    {activeTab === 'STUDENT'
                      ? `${u.studentProfile?.classRoom?.name || ''} ${
                          u.studentProfile?.classRoom?.arm || ''
                        }`
                      : u.email}
                  </td>
                  <td className="p-4 text-slate-500 text-xs">{u.email}</td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(u)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {editingUser && (
  <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
      <h3 className="text-lg font-bold text-slate-900">
        Edit {editingUser.role === 'STUDENT' ? 'Student' : 'Staff'} Details
      </h3>
      <form onSubmit={handleUpdateUser} className="space-y-3 text-sm">
        <input
          required
          placeholder="First Name"
          value={editForm.firstName}
          onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
          className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
        />
        <input
          required
          placeholder="Last Name"
          value={editForm.lastName}
          onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
          className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
        />
        {editingUser.role === 'STUDENT' && (
          <select
            value={editForm.classRoomId}
            onChange={(e) => setEditForm({ ...editForm, classRoomId: e.target.value })}
            className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.arm || ''}
              </option>
            ))}
          </select>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setEditingUser(null)}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    </div>
  );
}
