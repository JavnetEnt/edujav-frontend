'use client';

import { useEffect, useState } from 'react';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  BookOpen,
  Send,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getSessionUser } from '@/lib/auth-store';

export default function CbtPracticePage() {
  const user = getSessionUser();
  const isTeacher = user?.role === 'TEACHER';
  const isStudent = user?.role === 'STUDENT';

  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  // Teacher Topic Generator Form
  const [form, setForm] = useState({
    title: '',
    topicsCovered: '',
    questionCount: 10,
    durationMinutes: 15,
  });
  const [generating, setGenerating] = useState(false);
  const [banner, setBanner] = useState('');

  // Quizzes & Active Exam Runner State
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resultReport, setResultReport] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const { data: overview } = await api.get('/academics/overview');
        const allTerms = (overview.sessions || []).flatMap((s: any) =>
          (s.terms || []).map((t: any) => ({ ...t, sessionName: s.name })),
        );
        setTerms(allTerms);
        const defaultTermId = allTerms[0]?.id || '';
        setSelectedTerm(defaultTermId);

        if (user?.role === 'TEACHER') {
          const { data: myAssignments } = await api.get('/academics/my-assignments');
          setAssignments(myAssignments || []);
          const uniqueClasses = Array.from(
            new Map((myAssignments || []).map((a: any) => [a.classRoom.id, a.classRoom])).values(),
          );
          setClasses(uniqueClasses);

          if (uniqueClasses.length > 0) {
            const firstClassId = (uniqueClasses[0] as any).id;
            setSelectedClass(firstClassId);
            const classSubjects = (myAssignments || [])
              .filter((a: any) => a.classRoomId === firstClassId)
              .map((a: any) => a.subject);
            setSubjects(classSubjects);
            if (classSubjects.length > 0) setSelectedSubject(classSubjects[0].id);
            if (defaultTermId) await loadQuizzes(firstClassId, defaultTermId);
          }
        } else if (user?.role === 'STUDENT' || user?.role === 'PARENT') {
          const { data: portal } = await api.get('/users/my-portal');
          const studentClasses = (portal.children || []).map((c: any) => c.classRoom);
          setClasses(studentClasses);
          if (studentClasses.length > 0) {
            setSelectedClass(studentClasses[0].id);
            if (defaultTermId) await loadQuizzes(studentClasses[0].id, defaultTermId);
          }
        } else {
          const loadedClasses = overview.classes || [];
          setClasses(loadedClasses);
          if (loadedClasses.length > 0) {
            setSelectedClass(loadedClasses[0].id);
            if (defaultTermId) await loadQuizzes(loadedClasses[0].id, defaultTermId);
          }
        }
      } catch (err) {
        console.error('Failed to initialize CBT lab:', err);
      }
    }
    init();
  }, [user?.role]);

  async function loadQuizzes(classId: string, termId: string) {
    if (!classId || !termId) return;
    const { data } = await api.get(`/cbt/quizzes?classRoomId=${classId}&termId=${termId}`);
    setQuizzes(data || []);
  }

  // Countdown Timer Effect
  useEffect(() => {
    if (!activeQuiz || resultReport) return;
    if (secondsLeft <= 0) {
      handleSubmitExam();
      return;
    }
    const timer = setInterval(() => setSecondsLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [activeQuiz, secondsLeft, resultReport]);

  async function handleGenerateCbt(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClass || !selectedSubject || !selectedTerm) return;
    setGenerating(true);
    setBanner('');
    try {
      await api.post('/cbt/generate', {
        classRoomId: selectedClass,
        subjectId: selectedSubject,
        termId: selectedTerm,
        ...form,
      });
      setBanner('AI CBT Practice Quiz generated and published to students!');
      setForm({ title: '', topicsCovered: '', questionCount: 10, durationMinutes: 15 });
      await loadQuizzes(selectedClass, selectedTerm);
    } catch (err: any) {
      setBanner(err.response?.data?.message || 'Failed to generate CBT quiz');
    } finally {
      setGenerating(false);
    }
  }

  function startQuiz(quiz: any) {
    setActiveQuiz(quiz);
    setAnswers(new Array(quiz.questions.length).fill(-1));
    setSecondsLeft((quiz.durationMinutes || 15) * 60);
    setResultReport(null);
  }

  async function handleSubmitExam() {
    if (!activeQuiz || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/cbt/quizzes/${activeQuiz.id}/submit`, {
        answers,
      });
      setResultReport(data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error submitting CBT attempt');
    } finally {
      setSubmitting(false);
    }
  }
  const formatTimer = (secs: number) => {
    const mins = Math.floor(Math.max(0, secs) / 60);
    const rem = Math.max(0, secs) % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // --- VIEW 1: ACTIVE TIMED CBT EXAM RUNNER ---
  if (activeQuiz) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Sticky Exam Header with Live Countdown */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between sticky top-4 z-10 shadow-xl">
          <div>
            <span className="text-xs text-blue-400 font-semibold uppercase">
              {activeQuiz.subject?.name} • CBT Practice
            </span>
            <h1 className="text-lg font-bold">{activeQuiz.title}</h1>
          </div>

          <div className="flex items-center gap-4">
            {!resultReport && (
              <div
                className={`px-4 py-2 rounded-xl font-mono text-base font-bold flex items-center gap-2 ${
                  secondsLeft < 60
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-800 text-emerald-400'
                }`}
              >
                <Clock className="w-4 h-4" />
                {formatTimer(secondsLeft)}
              </div>
            )}
            <button
              onClick={() => {
                setActiveQuiz(null);
                setResultReport(null);
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl"
            >
              Exit Exam
            </button>
          </div>
        </div>

        {/* Instant Auto-Graded Score & Corrections Report */}
        {resultReport ? (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Practice Exam Completed
              </p>
              <h2 className="text-4xl font-extrabold text-slate-900">
                {resultReport.attempt.score} / {resultReport.attempt.totalQuestions} (
                {resultReport.attempt.percentage}%)
              </h2>
              <p className="text-sm text-slate-500">
                Review your step-by-step corrections below to master every topic.
              </p>
            </div>

            <div className="space-y-4">
              {resultReport.corrections.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border bg-white space-y-2 ${
                    item.isCorrect ? 'border-emerald-200' : 'border-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900 text-sm">
                      {idx + 1}. {item.question}
                    </p>
                    {item.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                  </div>

                  <p className="text-xs text-slate-600">
                    Your Answer:{' '}
                    <strong
                      className={item.isCorrect ? 'text-emerald-700' : 'text-rose-700'}
                    >
                      {item.selectedOption}
                    </strong>
                  </p>
                  {!item.isCorrect && (
                    <p className="text-xs text-emerald-700">
                      Correct Answer: <strong>{item.correctOption}</strong>
                    </p>
                  )}
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <strong>Explanation:</strong> {item.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Interactive Multiple-Choice Questions List */
          <div className="space-y-5">
            {activeQuiz.questions.map((q: any, qIdx: number) => (
              <div
                key={qIdx}
                className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm"
              >
                <p className="font-semibold text-slate-900 text-sm">
                  <span className="text-blue-600 font-bold mr-2">Q{qIdx + 1}.</span>
                  {q.question}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt: string, optIdx: number) => {
                    const selected = answers[qIdx] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => {
                          const updated = [...answers];
                          updated[qIdx] = optIdx;
                          setAnswers(updated);
                        }}
                        className={`p-3 rounded-xl text-left text-xs font-medium border transition flex items-center gap-2.5 ${
                          selected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            selected
                              ? 'bg-white text-blue-600'
                              : 'bg-white border border-slate-300 text-slate-600'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {isStudent ? (
              <button
                onClick={handleSubmitExam}
                disabled={submitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Grading Answers...' : 'Submit CBT Practice & View Score'}
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center">
                Preview Mode: Only logged-in students can submit graded attempts.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- VIEW 2: TEACHER TOPIC GENERATOR + QUIZ LIBRARY ---
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-600" />
          AI CBT Practice Lab
        </h1>
        <p className="text-sm text-slate-500">
          Teachers paste topics taught during the term to auto-generate WAEC/BECE-standard CBT practice questions for students.
        </p>
      </div>

      {banner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {banner}
        </div>
      )}

      {/* Teacher AI Topic Input Box */}
      {isTeacher && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900">
            Generate Term Revision CBT from Taught Topics
          </h2>

          <form onSubmit={handleGenerateCbt} className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                required
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
              >
                <option value="">Select Term</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.sessionName} • {t.name}
                  </option>
                ))}
              </select>

              <select
                required
                value={selectedClass}
                onChange={(e) => {
                  const cid = e.target.value;
                  setSelectedClass(cid);
                  const subs = assignments
                    .filter((a) => a.classRoomId === cid)
                    .map((a) => a.subject);
                  setSubjects(subs);
                  setSelectedSubject(subs[0]?.id || '');
                  loadQuizzes(cid, selectedTerm);
                }}
                className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
              >
                <option value="">Select Assigned Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.arm || ''}
                  </option>
                ))}
              </select>

              <select
                required
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
              >
                <option value="">Select Assigned Subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>

              <input
                required
                placeholder="CBT Title (e.g. 1st Term Mathematics Revision)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="md:col-span-1 p-2.5 border border-slate-300 rounded-xl text-slate-900"
              />
              <select
                value={form.questionCount}
                onChange={(e) =>
                  setForm({ ...form, questionCount: Number(e.target.value) })
                }
                className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
              >
                <option value={5}>5 Questions (Quick Drill)</option>
                <option value={10}>10 Questions (Standard)</option>
                <option value={20}>20 Questions (Full Revision)</option>
              </select>

              <select
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({ ...form, durationMinutes: Number(e.target.value) })
                }
                className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
              >
                <option value={10}>10 Minutes Timer</option>
                <option value={15}>15 Minutes Timer</option>
                <option value={30}>30 Minutes Timer</option>
              </select>
            </div>

            <label className="block space-y-2">
              <span>Topics Taught This Term (Paste lesson topics or syllabus notes)</span>
              <textarea
                required
                rows={3}
                placeholder="e.g. Quadratic Equations, Factorization, Simultaneous Linear Equations, Indices and Logarithms..."
                value={form.topicsCovered}
                onChange={(e) => setForm({ ...form, topicsCovered: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-xl text-slate-900"
              />
            </label>
            <button
              type="submit"
              disabled={generating}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl"
            >
              {generating
                ? 'AI Generating Questions from Topics...'
                : 'Generate & Publish Practice CBT'}
            </button>
          </form>
        </div>
      )}

      {/* Published CBT Quizzes Grid */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-slate-900">
            Available Term Practice Tests ({quizzes.length})
          </h2>
          {!isTeacher && (
            <div className="flex gap-2">
              <select
                value={selectedTerm}
                onChange={(e) => {
                  setSelectedTerm(e.target.value);
                  loadQuizzes(selectedClass, e.target.value);
                }}
                className="p-2 border border-slate-300 rounded-xl bg-white text-slate-900"
              >
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.sessionName} • {t.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  loadQuizzes(e.target.value, selectedTerm);
                }}
                className="p-2 border border-slate-300 rounded-xl bg-white text-slate-900"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.arm || ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!quizzes.length ? (
          <p className="text-sm text-slate-500">
            No CBT practice quizzes published for this class and term yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <article
                key={quiz.id}
                className="p-5 rounded-xl border border-slate-200 space-y-2"
              >
                <p className="text-xs font-semibold text-blue-600">
                  {quiz.subject?.name}
                </p>
                <h3 className="font-bold text-slate-900">{quiz.title}</h3>
                <p className="text-sm text-slate-600">Topics: {quiz.topicsCovered}</p>
                <p className="text-xs text-slate-500">
                  {Array.isArray(quiz.questions) ? quiz.questions.length : 0} Qs •{' '}
                  {quiz.durationMinutes} mins
                </p>
                <button
                  onClick={() => startQuiz(quiz)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
                >
                  {isStudent ? 'Start Practice' : 'Preview Test'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}