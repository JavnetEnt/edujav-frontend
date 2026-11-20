'use client';

import { useEffect, useState } from 'react';
import {
  CalendarCheck,
  BellRing,
  CheckCircle2,
  UserCheck,
  UserX,
  Clock,
  FileCheck,
} from 'lucide-react';
import { api } from '@/lib/api';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export default function SmartAttendancePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0],
  );

  // Keyed by studentProfile.id -> status
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [resultBanner, setResultBanner] = useState<{
    message: string;
    alertsCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      const [{ data: overview }, { data: allUsers }] = await Promise.all([
        api.get('/academics/overview'),
        api.get('/users?role=STUDENT'),
      ]);

      setClasses(overview.classes || []);
      const allTerms = (overview.sessions || []).flatMap((s: any) =>
        (s.terms || []).map((t: any) => ({ ...t, sessionName: s.name })),
      );
      setTerms(allTerms);
      setStudents(allUsers || []);

      if (overview.classes?.length) setSelectedClass(overview.classes[0].id);
      if (allTerms.length) setSelectedTerm(allTerms[0].id);
    }
    init();
  }, []);

  const classStudents = students.filter(
    (u) => u.studentProfile?.classRoomId === selectedClass,
  );

  function markAllPresent() {
    const updated: Record<string, AttendanceStatus> = {};
    for (const s of classStudents) {
      updated[s.studentProfile.id] = 'PRESENT';
    }
    setStatuses(updated);
  }

  async function handleSubmitAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClass || !selectedTerm || !classStudents.length) return;
    setLoading(true);
    setResultBanner(null);

    try {
      const payload = {
        classRoomId: selectedClass,
        termId: selectedTerm,
        date: selectedDate,
        records: classStudents.map((s) => {
          const pid = s.studentProfile.id;
          return {
            studentId: pid,
            status: statuses[pid] || 'PRESENT',
            remark: remarks[pid] || undefined,
          };
        }),
      };

      const { data } = await api.post('/attendance/mark', payload);
      setResultBanner({
        message: data.message,
        alertsCount: data.parentAlertsTriggered,
      });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit attendance');
    } finally {
      setLoading(false);
    }
  }

  const statusButtons: {
    value: AttendanceStatus;
    label: string;
    icon: any;
    activeClass: string;
  }[] = [
    {
      value: 'PRESENT',
      label: 'Present',
      icon: UserCheck,
      activeClass: 'bg-emerald-600 text-white border-emerald-600',
    },
    {
      value: 'ABSENT',
      label: 'Absent',
      icon: UserX,
      activeClass: 'bg-rose-600 text-white border-rose-600',
    },
    {
      value: 'LATE',
      label: 'Late',
      icon: Clock,
      activeClass: 'bg-amber-500 text-white border-amber-500',
    },
    {
      value: 'EXCUSED',
      label: 'Excused',
      icon: FileCheck,
      activeClass: 'bg-slate-700 text-white border-slate-700',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Smart Roll Call & Instant Parent Alerts
          </h1>
          <p className="text-sm text-slate-500">
            Marking a student Absent or Late automatically queues an alert to their linked parents.
          </p>
        </div>

        <button
          type="button"
          onClick={markAllPresent}
          className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 shadow-sm"
        >
          Mark All Present
        </button>
      </div>

      {resultBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            {resultBanner.message}
          </div>
          {resultBanner.alertsCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
              <BellRing className="w-3.5 h-3.5" />
              {resultBanner.alertsCount} Parent Absence/Late Alert(s) Triggered
            </span>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
            Term
          </label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
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
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
            Classroom
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.arm || ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
            Roll Call Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
          />
        </div>
      </div>

      {/* Roll Call Table */}
      <form
        onSubmit={handleSubmitAttendance}
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
      >
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-900">
              Class Register ({classStudents.length} Students)
            </h2>
          </div>

          <button
            type="submit"
            disabled={loading || !classStudents.length}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Roll Call & Notify Parents'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-4">Admission No.</th>
                <th className="p-4">Student Name</th>
                <th className="p-4">Attendance Status</th>
                <th className="p-4">Note / Reason (Optional)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!classStudents.length ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No students enrolled in this class yet.
                  </td>
                </tr>
              ) : (
                classStudents.map((s) => {
                  const pid = s.studentProfile.id;
                  const currentStatus = statuses[pid] || 'PRESENT';
                  return (
                    <tr key={pid} className="hover:bg-slate-50/60">
                      <td className="p-4 font-mono text-xs text-slate-600">
                        {s.studentProfile.admissionNumber}
                      </td>
                      <td className="p-4 font-medium text-slate-900">
                        {s.firstName} {s.lastName}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {statusButtons.map((btn) => {
                            const Icon = btn.icon;
                            const isSelected = currentStatus === btn.value;
                            return (
                              <button
                                key={btn.value}
                                type="button"
                                onClick={() =>
                                  setStatuses((prev) => ({ ...prev, [pid]: btn.value }))
                                }
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                  isSelected
                                    ? btn.activeClass
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {btn.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          placeholder="Optional note (e.g. Sick leave)"
                          value={remarks[pid] || ''}
                          onChange={(e) =>
                            setRemarks((prev) => ({ ...prev, [pid]: e.target.value }))
                          }
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </form>
    </div>
  );
}