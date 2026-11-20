'use client';

import { useEffect, useState } from 'react';
import {
  Calendar,
  Layers,
  BookOpen,
  UserCheck,
  CheckCircle2,
  Plus,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';

export default function AcademicsSetupPage() {
  const [overview, setOverview] = useState<{
    sessions: any[];
    classes: any[];
    subjects: any[];
  }>({ sessions: [], classes: [], subjects: [] });
  const [teachers, setTeachers] = useState<any[]>([]);

  // Forms
  const [sessionForm, setSessionForm] = useState({ name: '2026/2027', isCurrent: true });
  const [termForm, setTermForm] = useState({
    sessionId: '',
    name: 'First Term',
    isCurrent: true,
  });
  const [classForm, setClassForm] = useState({ name: '', arm: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '' });
  const [assignForm, setAssignForm] = useState({
    teacherId: '',
    classRoomId: '',
    subjectId: '',
  });

  const [banner, setBanner] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [{ data: ov }, { data: staff }] = await Promise.all([
        api.get('/academics/overview'),
        api.get('/users?role=TEACHER'),
      ]);
      setOverview(ov);
      setTeachers(staff || []);

      if (ov.sessions?.length && !termForm.sessionId) {
        setTermForm((prev) => ({ ...prev, sessionId: ov.sessions[0].id }));
      }
      if (ov.classes?.length && !assignForm.classRoomId) {
        setAssignForm((prev) => ({ ...prev, classRoomId: ov.classes[0].id }));
      }
      if (ov.subjects?.length && !assignForm.subjectId) {
        setAssignForm((prev) => ({ ...prev, subjectId: ov.subjects[0].id }));
      }
      if (staff?.length && !assignForm.teacherId) {
        setAssignForm((prev) => ({ ...prev, teacherId: staff[0].id }));
      }
    } catch (err) {
      console.error('Failed to load academics overview:', err);
    }
  }

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setBanner('');
    try {
      await api.post('/academics/sessions', sessionForm);
      setBanner(`Academic Session "${sessionForm.name}" created.`);
      setSessionForm({ name: '', isCurrent: true });
      await loadAll();
    } catch (err: any) {
      setBanner(err.response?.data?.message || 'Error creating session');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTerm(e: React.FormEvent) {
    e.preventDefault();
    if (!termForm.sessionId) return;
    setLoading(true);
    setBanner('');
    try {
      await api.post('/academics/terms', termForm);
      setBanner(`Term "${termForm.name}" added and activated.`);
      await loadAll();
    } catch (err: any) {
      setBanner(err.response?.data?.message || 'Error creating term');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setBanner('');
    try {
      await api.post('/academics/classes', classForm);
      setBanner(`Classroom "${classForm.name} ${classForm.arm}" created.`);
      setClassForm({ name: '', arm: '' });
      await loadAll();
    } catch (err: any) {
      setBanner(err.response?.data?.message || 'Error creating classroom');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSubject(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setBanner('');
    try {
      await api.post('/academics/subjects', subjectForm);
      setBanner(`Subject "${subjectForm.name}" added.`);
      setSubjectForm({ name: '', code: '' });
      await loadAll();
    } catch (err: any) {
      setBanner(err.response?.data?.message || 'Error creating subject');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignTeacher(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setBanner('');
    try {
      await api.post('/academics/assign-teacher', assignForm);
      setBanner('Teacher assigned to subject and class successfully.');
    } catch (err: any) {
      setBanner(err.response?.data?.message || 'Error assigning teacher');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteItem(endpoint: string, label: string) {
  setBanner('');
  try {
    await api.delete(endpoint);
    setBanner(`${label} deleted.`);
    await loadAll();
  } catch (err: any) {
    setBanner(err.response?.data?.message || `Cannot delete ${label.toLowerCase()}`);
  }
}

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Academic Structure & Curriculum</h1>
        <p className="text-sm text-slate-500">
          Configure sessions, terms, classrooms, subjects, and assign subject teachers.
        </p>
      </div>

      {banner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {banner}
        </div>
      )}

      {/* Row 1: Academic Sessions & Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Academic Sessions</h2>
              <p className="text-xs text-slate-500">Create and activate school calendar years</p>
            </div>
          </div>

          <form onSubmit={handleCreateSession} className="flex gap-2 text-sm">
            <input
              required
              placeholder="e.g. 2026/2027"
              value={sessionForm.name}
              onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
              className="flex-1 p-2.5 border border-slate-300 rounded-xl text-slate-900"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </button>

          </form>

          <div className="space-y-2 pt-2">
            {overview.sessions.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-sm"
              >
                <span className="font-semibold text-slate-900">{s.name}</span>
                <div className="flex items-center gap-2">
                  {s.isCurrent && (
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                      Active Session
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(`/academics/sessions/${s.id}`, 'Session')}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Term Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Academic Terms</h2>
              <p className="text-xs text-slate-500">Add First, Second, or Third Term to a session</p>
            </div>
          </div>

          <form onSubmit={handleCreateTerm} className="grid grid-cols-3 gap-2 text-sm">
            <select
              required
              value={termForm.sessionId}
              onChange={(e) => setTermForm({ ...termForm, sessionId: e.target.value })}
              className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
            >
              <option value="">Session</option>
              {overview.sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={termForm.name}
              onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
              className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
            >
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Third Term">Third Term</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
            >
              + Activate
            </button>
          </form>

          <div className="space-y-2 pt-2">
            {overview.sessions.flatMap((s) =>
              (s.terms || []).map((t: any) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-sm"
                >
                  <span className="text-slate-800 font-medium">
                    {s.name} • <strong>{t.name}</strong>
                  </span>
                  {t.isCurrent && (
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                      Current Term
                    </span>
                  )}
                </div>
              )),
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Classes/Arms & Subjects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classrooms */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Classrooms & Arms</h2>
              <p className="text-xs text-slate-500">e.g. JSS 1 + A, SS 2 + Science</p>
            </div>
          </div>

          <form onSubmit={handleCreateClass} className="grid grid-cols-3 gap-2 text-sm">
            <input
              required
              placeholder="Class (e.g. JSS 1)"
              value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
              className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
            />
            <input
              placeholder="Arm (e.g. A)"
              value={classForm.arm}
              onChange={(e) => setClassForm({ ...classForm, arm: e.target.value })}
              className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
            />
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl"
            >
              + Add Class
            </button>

          </form>

          <div className="flex flex-wrap gap-2 pt-2">
            {overview.classes.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold"
              >
                {c.name} {c.arm || ''} ({c._count?.students ?? 0} students)
                <button
                  type="button"
                  onClick={() => handleDeleteItem(`/academics/classes/${c.id}`, 'Classroom')}
                  className="ml-1.5 text-slate-400 hover:text-rose-600 transition"
                  aria-label={`Delete ${c.name} ${c.arm || ''}`}
                >
                  <Trash2 className="w-3.5 h-3.5 inline" />
                </button>
              </span>
            ))}
          </div>

        </div>

        {/* Subjects */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">School Subjects</h2>
              <p className="text-xs text-slate-500">Define subjects taught across classes</p>
            </div>
          </div>

          <form onSubmit={handleCreateSubject} className="grid grid-cols-3 gap-2 text-sm">
            <input
              required
              placeholder="Subject (e.g. Mathematics)"
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              className="col-span-2 p-2.5 border border-slate-300 rounded-xl text-slate-900"
            />
            <input
              placeholder="Code (MTH101)"
              value={subjectForm.code}
              onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
              className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
            />
            <button
              type="submit"
              disabled={loading}
              className="col-span-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl"
            >
              + Add Subject
            </button>
          </form>

          <div className="flex flex-wrap gap-2 pt-2">
            {overview.subjects.map((sub) => (
              <span
                key={sub.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold"
              >
                {sub.name} {sub.code ? `(${sub.code})` : ''}
                <button
                  type="button"
                  onClick={() => handleDeleteItem(`/academics/subjects/${sub.id}`, 'Subject')}
                  className="ml-1.5 text-amber-700 hover:text-rose-600 transition"
                  aria-label={`Delete ${sub.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5 inline" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Teacher Subject Assignment */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Assign Teacher to Class & Subject</h2>
            <p className="text-xs text-slate-500">
              Enforces strict score-entry permissions so teachers only grade their assigned subjects
            </p>
          </div>
        </div>

        <form onSubmit={handleAssignTeacher} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                     <select
            required
            value={assignForm.teacherId}
            onChange={(e) => setAssignForm({ ...assignForm, teacherId: e.target.value })}
            className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
          >
            <option value="">Select Teacher</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.firstName} {t.lastName}
              </option>
            ))}
          </select>

          <select
            required
            value={assignForm.classRoomId}
            onChange={(e) => setAssignForm({ ...assignForm, classRoomId: e.target.value })}
            className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
          >
            <option value="">Select Class</option>
            {overview.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.arm || ''}
              </option>
            ))}
          </select>

          <select
            required
            value={assignForm.subjectId}
            onChange={(e) => setAssignForm({ ...assignForm, subjectId: e.target.value })}
            className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
          >
            <option value="">Select Subject</option>
            {overview.subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={loading}
            className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
          >
            Assign Teacher
          </button>
        </form>
      </div>
    </div>
  );
}
