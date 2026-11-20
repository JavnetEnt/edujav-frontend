'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import {
  CreditCard,
  Award,
  CalendarCheck,
  ExternalLink,
  Printer,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getSessionUser, SessionUser } from '@/lib/auth-store';

interface ReportCardPreview {
  verificationCode: string;
  generatedAt: string;
  averageScore: number;
  positionInClass: number;
  totalStudents: number;
  teacherComment: string | null;
  principalComment: string | null;
  tenant: { name: string; address: string | null; phone: string | null };
  term: { name: string; session: { name: string } };
  classRoom: { name: string; arm: string | null };
  student: {
    admissionNumber: string;
    user: { firstName: string; lastName: string };
    scores: {
      id: string;
      ca1: number;
      ca2: number;
      exam: number;
      total: number;
      grade: string | null;
      remark: string | null;
      subject: { name: string };
    }[];
  };
}

export default function FamilyStudentPortalPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [paymentLoadingId, setPaymentLoadingId] = useState<string | null>(null);
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});
  const [activeReportCard, setActiveReportCard] = useState<ReportCardPreview | null>(null);
  const [reportCardLoadingId, setReportCardLoadingId] = useState<string | null>(null);
  const [reportCardError, setReportCardError] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');

  useEffect(() => {
    const session = getSessionUser();
    setUser(session);
    loadPortal();

    let refreshTimer: number | undefined;
    const refreshOnReturn = () => {
      if (document.visibilityState !== 'visible') return;

      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        loadPortal();
      }, 1500);
    };

    window.addEventListener('focus', refreshOnReturn);
    document.addEventListener('visibilitychange', refreshOnReturn);

    return () => {
      window.removeEventListener('focus', refreshOnReturn);
      document.removeEventListener('visibilitychange', refreshOnReturn);
      window.clearTimeout(refreshTimer);
    };
  }, []);

  async function loadPortal() {
    try {
      const { data } = await api.get('/users/my-portal');
      setChildren(data.children || []);
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePayFee(invoice: any, amountInput: string) {
    const minimumAmount =
      Math.ceil(Math.max(100, invoice.balance * 0.4) * 100) / 100;
    const amountToPay = Number(amountInput);

    if (
      !Number.isFinite(amountToPay) ||
      amountToPay < minimumAmount ||
      amountToPay > invoice.balance
    ) {
      setPaymentErrors((current) => ({
        ...current,
        [invoice.id]: `Enter an amount between ${formatNaira(minimumAmount)} and ${formatNaira(invoice.balance)}.`,
      }));
      return;
    }

    const paymentWindow = window.open('about:blank', '_blank');
    if (!paymentWindow) {
      setPaymentErrors((current) => ({
        ...current,
        [invoice.id]: 'Please allow pop-ups to continue to Paystack checkout.',
      }));
      return;
    }

    setPaymentErrors((current) => ({ ...current, [invoice.id]: '' }));
    setPaymentLoadingId(invoice.id);
    try {
      const { data } = await api.post('/finance/paystack/initialize', {
        invoiceId: invoice.id,
        amount: amountToPay,
        payerEmail: user?.email || 'parent@edupulse.ng',
      });
      paymentWindow.location.href = data.authorizationUrl;
    } catch (err: unknown) {
      paymentWindow.close();
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      setPaymentErrors((current) => ({
        ...current,
        [invoice.id]:
          typeof message === 'string'
            ? message
            : 'Unable to launch Paystack payment.',
      }));
    } finally {
      setPaymentLoadingId(null);
    }
  }

  async function openReportCard(studentProfileId: string, termId: string) {
    const reportCardKey = `${studentProfileId}:${termId}`;
    setReportCardLoadingId(reportCardKey);
    setReportCardError('');

    try {
      const { data } = await api.get<ReportCardPreview>(
        `/results/report-card/${studentProfileId}?termId=${encodeURIComponent(termId)}`,
      );
      setActiveReportCard(data);
      setVerificationUrl(
        `${window.location.origin}/verify/${data.verificationCode}`,
      );
    } catch (err: unknown) {
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      setReportCardError(
        typeof message === 'string'
          ? message
          : 'Could not load the full report card',
      );
    } finally {
      setReportCardLoadingId(null);
    }
  }

  const formatNaira = (val: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(val);

  if (loading) {
    return <div className="p-8 text-slate-500">Loading your academic & fee portal...</div>;
  }

  const activeChild = children[selectedIdx];

  return (
    <>
    <div className="max-w-6xl mx-auto space-y-8 print:hidden">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {user?.role === 'PARENT' ? 'Parent Self-Service Portal' : 'Student Academic Portal'}
        </h1>
        <p className="text-sm text-slate-500">
          View published report cards, track daily attendance, and pay school fees online.
        </p>
      </div>

      {/* Sibling Switcher Tabs (Visible when Parent has multiple children) */}
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((child, idx) => (
            <button
              key={child.id}
              onClick={() => setSelectedIdx(idx)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${
                selectedIdx === idx
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {child.user.firstName} {child.user.lastName} ({child.classRoom?.name}{' '}
              {child.classRoom?.arm || ''})
            </button>
          ))}
        </div>
      )}

      {!activeChild ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
          No student profile linked to this account yet.
        </div>
      ) : (
        <>
          {/* Student Identity Banner */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <UserCheck className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {activeChild.user.firstName} {activeChild.user.lastName}
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  Admission ID: {activeChild.admissionNumber} • Class:{' '}
                  {activeChild.classRoom?.name} {activeChild.classRoom?.arm || ''}
                </p>
              </div>
            </div>
          </div>

          {/* Grid: Term Fee Invoices & Published Report Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Term Fee Invoices */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">School Fee Invoices</h3>
              </div>

              {!activeChild.invoices?.length ? (
                <p className="text-sm text-slate-400 py-4">No invoices generated yet.</p>
              ) : (
                <div className="space-y-3">
                  {activeChild.invoices.map((inv: any) => {
                    const minimumPayment =
                      Math.ceil(Math.max(100, inv.balance * 0.4) * 100) / 100;
                    const amountInput = paymentAmounts[inv.id] ?? String(inv.balance);
                    const amountToPay = Number(amountInput);
                    const isAmountValid =
                      Number.isFinite(amountToPay) &&
                      amountToPay >= minimumPayment &&
                      amountToPay <= inv.balance;

                    return (
                      <div
                        key={inv.id}
                        className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {inv.term.session.name} • {inv.term.name}
                          </p>
                          <p className="font-mono text-xs text-slate-500">
                            {inv.invoiceNumber}
                          </p>
                          <p className="mt-1 text-xs">
                            Total: <strong>{formatNaira(inv.totalAmount)}</strong> • Balance:{' '}
                            <strong className="text-rose-600">
                              {formatNaira(inv.balance)}
                            </strong>
                          </p>
                        </div>

                        {inv.balance > 0 ? (
                          <form
                            className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void handlePayFee(inv, amountInput);
                            }}
                          >
                            <div>
                              <label
                                htmlFor={`payment-amount-${inv.id}`}
                                className="mb-1 block text-xs font-semibold text-slate-700"
                              >
                                Amount to pay (₦)
                              </label>
                              <input
                                id={`payment-amount-${inv.id}`}
                                type="number"
                                min={minimumPayment}
                                max={inv.balance}
                                step="0.01"
                                required
                                value={amountInput}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setPaymentAmounts((current) => ({
                                    ...current,
                                    [inv.id]: value,
                                  }));
                                  setPaymentErrors((current) => ({
                                    ...current,
                                    [inv.id]: '',
                                  }));
                                }}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              />
                              <p className="mt-1 text-xs text-slate-500">
                                {minimumPayment > inv.balance
                                  ? "This balance is below Paystack's ₦100 minimum."
                                  : `Minimum payment (40% of the balance, at least ₦100): ${formatNaira(minimumPayment)}`}
                              </p>
                              {paymentErrors[inv.id] && (
                                <p className="mt-1 text-xs text-rose-600" role="alert">
                                  {paymentErrors[inv.id]}
                                </p>
                              )}
                            </div>
                            <button
                              type="submit"
                              disabled={
                                !isAmountValid ||
                                paymentLoadingId === inv.id ||
                                minimumPayment > inv.balance
                              }
                              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {paymentLoadingId === inv.id ? 'Opening Paystack...' : 'Pay Now'}
                            </button>
                          </form>
                        ) : (
                          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            PAID IN FULL
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Published Report Cards */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">Published Term Report Cards</h3>
              </div>

              {!activeChild.reportCards?.length ? (
                <p className="text-sm text-slate-400 py-4">
                  No published report cards yet for this student.
                </p>
              ) : (
                <div className="space-y-3">
                  {reportCardError && (
                    <p className="text-sm text-rose-600" role="alert">
                      {reportCardError}
                    </p>
                  )}
                  {activeChild.reportCards.map((rc: any) => (
                    <div
                      key={rc.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {rc.term.session.name} • {rc.term.name}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Average: <strong className="text-blue-600">{rc.averageScore}%</strong> •
                          Position:{' '}
                          <strong>
                            {rc.positionInClass} of {rc.totalStudents}
                          </strong>
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={
                          reportCardLoadingId === `${activeChild.id}:${rc.termId}`
                        }
                        onClick={() => openReportCard(activeChild.id, rc.termId)}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold rounded-xl"
                      >
                        {reportCardLoadingId === `${activeChild.id}:${rc.termId}`
                          ? 'Loading...'
                          : 'View / Print'}
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Attendance Log */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Recent Daily Attendance</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {!activeChild.attendanceRecords?.length ? (
                <p className="text-sm text-slate-400">No attendance records logged yet.</p>
              ) : (
                activeChild.attendanceRecords.map((att: any) => (
                  <div
                    key={att.id}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs flex items-center gap-2"
                  >
                    <span className="font-medium text-slate-700">
                      {new Date(att.date).toLocaleDateString()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold ${
                        att.status === 'PRESENT'
                          ? 'bg-emerald-100 text-emerald-700'
                          : att.status === 'ABSENT'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {att.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
    {activeReportCard && (
      <div className="report-card-overlay fixed inset-0 z-[60] overflow-y-auto bg-slate-950/70 p-4">
        <article className="report-card-print mx-auto my-4 w-full max-w-4xl space-y-6 rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          <div className="report-card-actions flex items-center justify-between border-b pb-4">
            <span className="text-sm font-semibold text-slate-500">
              Official Student Report Card Preview
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveReportCard(null);
                  setVerificationUrl('');
                }}
                aria-label="Close report card preview"
                className="rounded-lg p-2 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-6">
            <div>
              <h2 className="text-2xl font-extrabold uppercase tracking-tight text-slate-900">
                {activeReportCard.tenant.name}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {activeReportCard.tenant.address || 'Excellence in Character & Learning'}
              </p>
              {activeReportCard.tenant.phone && (
                <p className="mt-1 text-xs text-slate-500">
                  {activeReportCard.tenant.phone}
                </p>
              )}
              <p className="mt-3 inline-block rounded bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                {activeReportCard.term.session.name} • {activeReportCard.term.name} Report Sheet
              </p>
            </div>

            <div className="shrink-0 text-center">
              <div className="inline-block rounded-xl border border-slate-200 bg-white p-2">
                <QRCodeSVG value={verificationUrl} size={96} />
              </div>
              <p className="mt-1 flex items-center justify-center gap-1 text-[10px] text-slate-500">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                Scan to Verify
              </p>
              <Link
                href={`/verify/${activeReportCard.verificationCode}`}
                target="_blank"
                className="report-card-actions mt-1 inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
              >
                Open verification
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <span className="block text-xs text-slate-400">Student Name</span>
              <span className="font-bold text-slate-900">
                {activeReportCard.student.user.firstName}{' '}
                {activeReportCard.student.user.lastName}
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">Admission No.</span>
              <span className="font-mono font-semibold text-slate-800">
                {activeReportCard.student.admissionNumber}
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">Class</span>
              <span className="font-semibold text-slate-800">
                {activeReportCard.classRoom.name}
                {activeReportCard.classRoom.arm
                  ? ` ${activeReportCard.classRoom.arm}`
                  : ''}
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">Term Average</span>
              <span className="text-base font-bold text-blue-700">
                {activeReportCard.averageScore}%
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">Class Position</span>
              <span className="text-base font-bold text-slate-900">
                {activeReportCard.positionInClass} of {activeReportCard.totalStudents}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
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
                {activeReportCard.student.scores.map((score) => (
                  <tr key={score.id} className="odd:bg-slate-50">
                    <td className="p-3 font-medium">{score.subject.name}</td>
                    <td className="p-3 text-center font-semibold tabular-nums">{score.ca1}</td>
                    <td className="p-3 text-center font-semibold tabular-nums">{score.ca2}</td>
                    <td className="p-3 text-center font-semibold tabular-nums">{score.exam}</td>
                    <td className="bg-blue-50 p-3 text-center text-lg font-extrabold text-blue-950 tabular-nums">
                      {score.total}
                    </td>
                    <td className="p-3 text-center font-bold text-blue-800">
                      {score.grade || '—'}
                    </td>
                    <td className="p-3 text-slate-700">{score.remark || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(activeReportCard.teacherComment || activeReportCard.principalComment) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeReportCard.teacherComment && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="text-xs font-bold uppercase text-slate-500">
                    Class Teacher&apos;s Comment
                  </h3>
                  <p className="mt-2 text-sm text-slate-800">
                    {activeReportCard.teacherComment}
                  </p>
                </div>
              )}
              {activeReportCard.principalComment && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="text-xs font-bold uppercase text-slate-500">
                    Principal&apos;s Comment
                  </h3>
                  <p className="mt-2 text-sm text-slate-800">
                    {activeReportCard.principalComment}
                  </p>
                </div>
              )}
            </div>
          )}

          <p className="text-right text-xs text-slate-400">
            Issued {new Date(activeReportCard.generatedAt).toLocaleDateString()}
          </p>
        </article>
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            .report-card-overlay,
            .report-card-overlay * {
              visibility: visible !important;
            }
            .report-card-overlay {
              position: static !important;
              display: block !important;
              overflow: visible !important;
              background: white !important;
              padding: 0 !important;
            }
            .report-card-print {
              position: static !important;
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              border-radius: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
            }
            .report-card-actions {
              display: none !important;
            }
          }
        `}</style>
      </div>
    )}
    </>
  );
}
