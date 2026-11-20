'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Award, CheckCircle, Printer, Save, ShieldCheck, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api';
import { getSessionUser } from '@/lib/auth-store';

export default function ResultsBroadsheetPage() {
    const user = getSessionUser();
    const isTeacher = user?.role === 'TEACHER';
    const isAdminorOwner = user?.role === 'ADMIN' || user?.role === 'SCHOOL_OWNER';
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  // Score inputs keyed by studentProfileId
  const [scoreInputs, setScoreInputs] = useState<
    Record<string, { ca1: number; ca2: number; exam: number }>
  >({});

  const [broadsheet, setBroadsheet] = useState<any[]>([]);
  const [activeReportCard, setActiveReportCard] = useState<any | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);

    useEffect(() => {
    async function init() {
      try {
        const [{ data: overview }, { data: allUsers }] = await Promise.all([
          api.get('/academics/overview'),
          api.get('/users?role=STUDENT'),
        ]);

        const loadedClasses = overview.classes || [];
        const loadedSubjects = overview.subjects || [];
        const allTerms = (overview.sessions || []).flatMap((s: any) =>
          (s.terms || []).map((t: any) => ({ ...t, sessionName: s.name })),
        );

        setClasses(loadedClasses);
        setSubjects(loadedSubjects);
        setTerms(allTerms);
        setStudents(allUsers || []);

        if (loadedClasses.length > 0) setSelectedClass(loadedClasses[0].id);
        if (loadedSubjects.length > 0) setSelectedSubject(loadedSubjects[0].id);
        if (allTerms.length > 0) setSelectedTerm(allTerms[0].id);
      } catch (err) {
        console.error('Failed to initialize results page:', err);
      }
    }
    init();
  }, []);

  const availableSubjects = teacherAssignments.length
    ? subjects.filter((subject) =>
        teacherAssignments.some(
          (assignment) =>
            assignment.classRoomId === selectedClass &&
            assignment.subjectId === subject.id,
        ),
      )
    : subjects;

  const classStudents = students.filter(
    (u) => u.studentProfile?.classRoomId === selectedClass,
  );

  function updateScore(profileId: string, field: 'ca1' | 'ca2' | 'exam', val: string) {
    const num = Math.max(0, Number(val) || 0);
    setScoreInputs((prev) => ({
      ...prev,
      [profileId]: {
        ca1: prev[profileId]?.ca1 ?? 0,
        ca2: prev[profileId]?.ca2 ?? 0,
        exam: prev[profileId]?.exam ?? 0,
        [field]: num,
      },
    }));
  }
  async function handleSaveScores() {
    if (!selectedClass || !selectedSubject || !selectedTerm) {
      setStatusMsg('Select a term, class, and subject before saving scores.');
      return;
    }
    if (!classStudents.length) {
      setStatusMsg('No students found for the selected class.');
      return;
    }
    setLoading(true);
    setStatusMsg('');
    try {
      const payload = {
        classRoomId: selectedClass,
        subjectId: selectedSubject,
        termId: selectedTerm,
        scores: classStudents.map((s) => ({
          studentId: s.studentProfile.id,
          ca1: scoreInputs[s.studentProfile.id]?.ca1 ?? 0,
          ca2: scoreInputs[s.studentProfile.id]?.ca2 ?? 0,
          exam: scoreInputs[s.studentProfile.id]?.exam ?? 0,
        })),
      };
      const { data } = await api.post('/results/scores', payload);
      setStatusMsg(data.message);
    } catch (err: any) {
      setStatusMsg(err.response?.data?.message || 'Error saving scores');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateBroadsheet() {
    if (!selectedClass || !selectedTerm) {
      setStatusMsg('Select a term and class before computing the broadsheet.');
      return;
    }
    if (!classStudents.length) {
      setStatusMsg('No students found for the selected class.');
      return;
    }
    setLoading(true);
    setStatusMsg('');
    try {
      const { data } = await api.post('/results/broadsheet/generate', {
        classRoomId: selectedClass,
        termId: selectedTerm,
        publish: true,
      });
      setBroadsheet(data.broadsheet || []);
      setStatusMsg('Broadsheet computed, ranked, and published!');
    } catch (err: any) {
      setStatusMsg(err.response?.data?.message || 'Failed to generate broadsheet');
    } finally {
      setLoading(false);
    }
  }

  async function openReportCard(studentProfileId: string) {
    try {
      const { data } = await api.get(
        `/results/report-card/${studentProfileId}?termId=${selectedTerm}`,
      );
      setActiveReportCard(data);
    } catch (err: any) {
      setStatusMsg(err.response?.data?.message || 'Could not load report card');
    }
  }

  const verifyUrl =
    typeof window !== 'undefined' && activeReportCard
      ? `${window.location.origin}/verify/${activeReportCard.verificationCode}`
      : '';

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Score Entry, Broadsheet & QR Report Cards
          </h1>
          <p className="text-sm text-slate-500">
            Enter CA & Exam scores once—auto-calculate grades, rankings, and tamper-proof PDF cards.
          </p>
        </div>

        <button
          onClick={handleGenerateBroadsheet}
          disabled={loading || !selectedClass || !selectedTerm || !classStudents.length}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition"
        >
          <Sparkles className="w-4 h-4" />
          Compute & Publish Broadsheet
        </button>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm flex items-center gap-2 print:hidden">
          <CheckCircle className="w-4 h-4 text-blue-600" />
          {statusMsg}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
            Term / Session
          </label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.sessionName} - {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
            Class & Arm
          </label>
          <select
            value={selectedClass}
            onChange={(e) => {
              const classRoomId = e.target.value;
              setSelectedClass(classRoomId);
              if (teacherAssignments.length) {
                const assignment = teacherAssignments.find(
                  (item) => item.classRoomId === classRoomId,
                );
                setSelectedSubject(assignment?.subjectId || '');
              }
            }}
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
            Subject (For Score Entry)
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
          >
            {availableSubjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} {sub.code ? `(${sub.code})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Teacher Score Entry Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden print:hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">
            Subject Score Sheet ({classStudents.length} Students)
          </h2>
          <button
            onClick={handleSaveScores}
            disabled={
              loading ||
              !selectedClass ||
              !selectedSubject ||
              !selectedTerm ||
              !classStudents.length
            }
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
          >
            <Save className="w-4 h-4" />
            Save & Auto-Grade Scores
          </button>
        </div>

        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-4">Admission No.</th>
                <th className="p-4">Student Name</th>
                <th className="p-4 w-28">CA 1 (20)</th>
                <th className="p-4 w-28">CA 2 (20)</th>
                <th className="p-4 w-28">Exam (60)</th>
                <th className="p-4 w-24">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!classStudents.length ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No students are available for this class.
                  </td>
                </tr>
              ) : classStudents.map((s) => {
                const pid = s.studentProfile.id;
                const entry = scoreInputs[pid] || { ca1: 0, ca2: 0, exam: 0 };
                const total = entry.ca1 + entry.ca2 + entry.exam;
                return (
                  <tr key={pid} className="hover:bg-slate-50/60">
                    <td className="p-4 font-mono text-xs text-slate-600">
                      {s.studentProfile.admissionNumber}
                    </td>
                    <td className="p-4 font-medium text-slate-900">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={entry.ca1}
                        onChange={(e) => updateScore(pid, 'ca1', e.target.value)}
                        className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={entry.ca2}
                                                onChange={(e) => updateScore(pid, 'ca2', e.target.value)}
                        className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={entry.exam}
                        onChange={(e) => updateScore(pid, 'exam', e.target.value)}
                        className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900"
                      />
                    </td>
                    <td className="p-4 font-bold text-blue-600">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


      {/* Ranked Class Broadsheet */}
      {broadsheet.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden print:hidden">
          <div className="p-5 border-b border-slate-200 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-slate-900">Ranked Class Broadsheet</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-4">Position</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Admission No.</th>
                  <th className="p-4">Total Score</th>
                  <th className="p-4">Average</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {broadsheet.map((row) => (
                  <tr key={row.studentId} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">#{row.positionInClass}</td>
                    <td className="p-4 font-medium text-slate-900">{row.fullName}</td>
                    <td className="p-4 font-mono text-xs text-slate-500">
                      {row.admissionNumber}
                    </td>
                    <td className="p-4 text-slate-700">{row.totalScore}</td>
                    <td className="p-4 font-bold text-emerald-600">{row.averageScore}%</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openReportCard(row.studentId)}
                        className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
                      >
                        View QR Report Card
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Report Card Modal */}
      {activeReportCard && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-8 space-y-6 print:shadow-none print:max-w-full">
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <span className="text-sm font-semibold text-slate-500">
                Official Student Report Card Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setActiveReportCard(null)}
                  className="p-2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* School Letterhead + QR Code */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight">
                  {activeReportCard.tenant.name}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {activeReportCard.tenant.address || 'Excellence in Character & Learning'}
                </p>
                <p className="mt-3 inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded">
                  {activeReportCard.term.session.name} • {activeReportCard.term.name} Report Sheet
                </p>
              </div>

              {/* Scannable Verification QR Code */}
              <div className="text-center">
                <div className="p-2 border border-slate-200 rounded-xl inline-block bg-white">
                  <QRCodeSVG value={verifyUrl} size={84} />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Scan to Verify
                </p>
              </div>
            </div>

            {/* Student Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">Student Name</span>
                <span className="font-bold text-slate-900">
                  {activeReportCard.student.user.firstName}{' '}
                  {activeReportCard.student.user.lastName}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Admission No.</span>
                <span className="font-mono font-semibold text-slate-800">
                  {activeReportCard.student.admissionNumber}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Term Average</span>
                <span className="font-bold text-blue-700 text-base">
                  {activeReportCard.averageScore}%
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Class Position</span>
                <span className="font-bold text-slate-900 text-base">
                  {activeReportCard.positionInClass} of {activeReportCard.totalStudents}
                </span>
              </div>
            </div>

            {/* Subject Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse border border-slate-300 text-left text-base">
                <thead className="bg-slate-900 text-xs uppercase text-white">
                  <tr>
                    <th className="p-3">Subject</th>
                    <th className="p-3 text-center">CA 1</th>
                    <th className="p-3 text-center">CA 2</th>
                    <th className="p-3 text-center">Exam</th>
                    <th className="p-3 text-center">Total</th>
                    <th className="p-3 text-center">Grade</th>
                    <th className="p-3">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900">
                  {activeReportCard.student.scores.map((sc: any) => (
                    <tr key={sc.id} className="odd:bg-slate-50">
                      <td className="p-3 font-medium">{sc.subject.name}</td>
                      <td className="p-3 text-center font-semibold tabular-nums">{sc.ca1}</td>
                      <td className="p-3 text-center font-semibold tabular-nums">{sc.ca2}</td>
                      <td className="p-3 text-center font-semibold tabular-nums">{sc.exam}</td>
                      <td className="bg-blue-50 p-3 text-center text-lg font-extrabold text-blue-950 tabular-nums">
                        {sc.total}
                      </td>
                      <td className="p-3 text-center font-bold text-blue-800">{sc.grade}</td>
                      <td className="p-3 text-slate-700">{sc.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {isAdminorOwner && (
                <>
                  <button
                    onClick={handleGenerateBroadsheet}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    Compute &amp; Publish Broadsheet
                  </button>

                  {!isTeacher ? (
                    <div className="mt-4 p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm print:hidden">
                      <strong>Academic Integrity Lock:</strong> Subject scores can only be entered or modified
                      by the assigned subject teacher. Select a Term and Class above, then click{' '}
                      <strong>Compute &amp; Publish Broadsheet</strong> to compile all teacher submissions.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

