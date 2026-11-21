'use client';

import { useEffect, useState } from 'react';
import { Clock, Sparkles, CheckCircle2, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { getSessionUser } from '@/lib/auth-store';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

export default function SmartTimetablePage() {
  const user = getSessionUser();
  const isAdminOrOwner = user?.role === 'SCHOOL_OWNER' || user?.role === 'ADMIN';

  const [terms, setTerms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Generator Options
  const [duration, setDuration] = useState<40 | 45 | 60>(40);
  const [startTime, setStartTime] = useState('08:00');
  const [slots, setSlots] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [banner, setBanner] = useState('');

  useEffect(() => {
    async function init() {
      try {
        const { data: overview } = await api.get('/academics/overview');
        const allTerms = (overview.sessions || []).flatMap((s: any) =>
          (s.terms || []).map((t: any) => ({ ...t, sessionName: s.name })),
        );
        setTerms(allTerms);
        const defaultTerm = allTerms[0]?.id || '';
        setSelectedTerm(defaultTerm);

        if (user?.role === 'STUDENT' || user?.role === 'PARENT') {
          const { data: portal } = await api.get('/users/my-portal');
          const studentClasses = (portal.children || []).map((c: any) => c.classRoom);
          setClasses(studentClasses);
          if (studentClasses.length > 0) {
            setSelectedClass(studentClasses[0].id);
            if (defaultTerm) await fetchTimetable(defaultTerm, studentClasses[0].id);
          }
        } else {
          const loadedClasses = overview.classes || [];
          setClasses(loadedClasses);
          if (loadedClasses.length > 0) {
            setSelectedClass(loadedClasses[0].id);
            if (defaultTerm) await fetchTimetable(defaultTerm, loadedClasses[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load timetable data:', err);
      }
    }
    init();
  }, [user?.role]);

  async function fetchTimetable(termId: string, classRoomId: string) {
    if (!termId || !classRoomId) return;
    const { data } = await api.get(
      `/academics/timetable?termId=${termId}&classRoomId=${classRoomId}`,
    );
    setSlots(data || []);
  }

  async function handleGenerateTimetable(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTerm) return;
    setGenerating(true);
    setBanner('');
    try {
      const { data } = await api.post('/academics/timetable/generate', {
        termId: selectedTerm,
        periodDurationMinutes: duration,
        startTime,
      });
      setBanner(data.message);
      if (selectedClass) await fetchTimetable(selectedTerm, selectedClass);
    } catch (err: any) {
      setBanner(err.response?.data?.message || 'Failed to generate timetable');
    } finally {
      setGenerating(false);
    }
  }

  const handleDeleteTimetable = async (deleteAllForTerm = false) => {
    if (!selectedTerm) return;
    const confirmMsg = deleteAllForTerm
      ? 'Delete the entire timetable for all classes in this term?'
      : 'Delete the timetable for this selected class?';
    if (!window.confirm(confirmMsg)) return;

    try {
      const params = new URLSearchParams({ termId: selectedTerm });
      if (!deleteAllForTerm && selectedClass) {
        params.append('classRoomId', selectedClass);
      }

      const { data } = await api.delete(`/academics/timetable?${params.toString()}`);
      setBanner(data.message || 'Timetable deleted');
      if (selectedClass) await fetchTimetable(selectedTerm, selectedClass);
    } catch (err: any) {
      setBanner(err.response?.data?.message || 'Failed to delete timetable');
    }
  };


  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            Smart 3-Term School Timetable
          </h1>
          <p className="text-sm text-slate-500">
            Clash-free Monday–Friday class schedules with automated Nigerian school break periods.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 shadow-sm"
        >
          <Printer className="w-4 h-4 text-blue-600" /> Print Timetable
        </button>

        {(user?.role === 'SCHOOL_OWNER' || user?.role === 'ADMIN') && (
  <div className="flex items-center gap-2">
    {selectedClass && (
      <button
        type="button"
        onClick={() => handleDeleteTimetable(false)}
        className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-medium hover:bg-rose-100"
      >
        Delete Class Timetable
      </button>
    )}
    <button
      type="button"
      onClick={() => handleDeleteTimetable(true)}
      className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700"
    >
      Clear Term Timetable
    </button>
  </div>
)}

      </div>

      {banner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {banner}
        </div>
      )}

      {/* Admin Smart Generator Controls */}
      {isAdminOrOwner && (
        <form
          onSubmit={handleGenerateTimetable}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-sm print:hidden"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Target Term (1st, 2nd, or 3rd)
            </label>
            <select
              required
              value={selectedTerm}
              onChange={(e) => {
                setSelectedTerm(e.target.value);
                fetchTimetable(e.target.value, selectedClass);
              }}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.sessionName} • {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Period Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) as 40 | 45 | 60)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
            >
              <option value={40}>40 Minutes (Standard)</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes (1 Hour Block)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              First Period Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={generating}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {generating ? 'Generating...' : 'Auto-Generate Timetable'}
          </button>
        </form>
      )}

      {/* Class Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <span className="text-sm font-bold text-slate-800">Viewing Class Schedule:</span>
        <div className="flex gap-3 text-sm">
          {!isAdminOrOwner && (
            <select
              value={selectedTerm}
              onChange={(e) => {
                setSelectedTerm(e.target.value);
                fetchTimetable(e.target.value, selectedClass);
              }}
              className="p-2 border border-slate-300 rounded-xl text-slate-900"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.sessionName} • {t.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              fetchTimetable(selectedTerm, e.target.value);
            }}
            className="p-2 border border-slate-300 rounded-xl font-semibold text-slate-900"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.arm || ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Monday–Friday Timetable Grid */}
      {!slots.length ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-sm text-slate-400">
          No timetable generated for this term and class yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {DAYS.map((day) => {
            const daySlots = slots.filter((s) => s.day === day);
            return (
              <div
                key={day}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
              >
                <div className="bg-slate-900 text-white p-3 text-center text-xs font-bold tracking-wider">
                  {day}
                </div>
                <div className="p-3 space-y-2.5">
                  {daySlots.map((slot) => {
                    const isBreak = !slot.subjectId;
                    return (
                      <div
                        key={slot.id}
                        className={`p-3 rounded-xl border text-xs ${
                          isBreak
                            ? 'bg-amber-50 border-amber-200 text-amber-900 text-center font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <p className="font-mono text-[11px] text-slate-500">
                          {slot.startTime} – {slot.endTime}
                        </p>
                        <p className="font-bold text-sm mt-0.5">{slot.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
