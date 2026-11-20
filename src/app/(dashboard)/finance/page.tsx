'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  PlusCircle,
  FileText,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';

const NIGERIAN_BANKS = [
  { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'Access Bank', code: '044' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'Moniepoint MFB', code: '50515' },
  { name: 'OPay', code: '999992' },
];

export default function FinancePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [summary, setSummary] = useState<any | null>(null);

  // Bank Subaccount Form
  const [bankForm, setBankForm] = useState({
    bankCode: '058',
    accountNumber: '',
    platformFeePercentage: 1.5,
  });

  // Fee Line Item Form
  const [feeForm, setFeeForm] = useState({
    title: 'Tuition Fee',
    amount: 85000,
  });

  // Manual Payment Modal State
  const [manualModalInvoice, setManualModalInvoice] = useState<any | null>(null);
  const [manualPayment, setManualPayment] = useState({
    amount: 0,
    method: 'BANK_TRANSFER',
    reference: '',
  });

  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: overview } = await api.get('/academics/overview');
      setClasses(overview.classes || []);
      const allTerms = (overview.sessions || []).flatMap((s: any) =>
        (s.terms || []).map((t: any) => ({ ...t, sessionName: s.name })),
      );
      setTerms(allTerms);

      if (overview.classes?.length) setSelectedClass(overview.classes[0].id);
      if (allTerms.length) {
        setSelectedTerm(allTerms[0].id);
        await loadSummary(allTerms[0].id);
      }
    }
    init();
  }, []);

  async function loadSummary(termId: string) {
    if (!termId) return;
    try {
      const { data } = await api.get(`/finance/summary?termId=${termId}`);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load financial summary:', err);
    }
  }

  async function handleConfigureBank(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setBanner(null);
    try {
      const { data } = await api.post('/finance/bank-account', bankForm);
      setBanner({
        type: 'ok',
        text: `${data.message} (Subaccount: ${data.subaccountCode})`,
      });
    } catch (err: any) {
      setBanner({
        type: 'err',
        text: err.response?.data?.message || 'Could not verify bank account with Paystack',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddFeeItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClass || !selectedTerm) return;
    setLoading(true);
    setBanner(null);
    try {
      await api.post('/finance/fee-items', {
        classRoomId: selectedClass,
        termId: selectedTerm,
        title: feeForm.title,
        amount: Number(feeForm.amount),
      });
      setBanner({ type: 'ok', text: `Added "${feeForm.title}" to class fee schedule.` });
      setFeeForm({ title: '', amount: 0 });
    } catch (err: any) {
      setBanner({
        type: 'err',
        text: err.response?.data?.message || 'Error adding fee item',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateClassInvoices() {
    if (!selectedClass || !selectedTerm) return;
    setLoading(true);
    setBanner(null);
    try {
      const { data } = await api.post('/finance/invoices/generate-class', {
        classRoomId: selectedClass,
        termId: selectedTerm,
      });
      setBanner({ type: 'ok', text: data.message });
      await loadSummary(selectedTerm);
    } catch (err: any) {
      setBanner({
        type: 'err',
        text: err.response?.data?.message || 'Failed to generate class invoices',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handlePaystackCheckout(invoice: any) {
    setBanner(null);
    try {
      const { data } = await api.post('/finance/paystack/initialize', {
        invoiceId: invoice.id,
        amount: invoice.balance,
        payerEmail: 'parent.demo@edupulse.ng',
      });
      window.open(data.authorizationUrl, '_blank');
    } catch (err: any) {
      setBanner({
        type: 'err',
        text: err.response?.data?.message || 'Unable to launch Paystack checkout',
      });
    }
  }

  async function handleRecordManualPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!manualModalInvoice) return;
    setLoading(true);
    try {
      const { data } = await api.post('/finance/payments/manual', {
        invoiceId: manualModalInvoice.id,
        amount: Number(manualPayment.amount),
        method: manualPayment.method,
        reference: manualPayment.reference || undefined,
      });
      setBanner({
        type: 'ok',
        text: `${data.message} • Official Receipt: ${data.receipt.receiptNumber}`,
      });
      setManualModalInvoice(null);
      await loadSummary(selectedTerm);
    } catch (err: any) {
      setBanner({
        type: 'err',
        text: err.response?.data?.message || 'Error recording payment',
      });
    } finally {
      setLoading(false);
    }
  }

  const formatNaira = (val: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(val);

      return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            School Fees, Split Settlement & Debtor Ledger
          </h1>
          <p className="text-sm text-slate-500">
            Route parent fee payments directly to the school&apos;s bank account via Paystack Subaccounts.
          </p>
        </div>

        {/* Term Selector */}
        <select
          value={selectedTerm}
          onChange={(e) => {
            setSelectedTerm(e.target.value);
            loadSummary(e.target.value);
          }}
          className="px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 shadow-sm"
        >
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.sessionName} • {t.name}
            </option>
          ))}
        </select>
      </div>

      {banner && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2 border ${
            banner.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {banner.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          {banner.text}
        </div>
      )}

      {/* Top Row: Bank Account Setup + Class Fee Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Direct School Bank Settlement */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">School Settlement Bank Account</h2>
              <p className="text-xs text-slate-500">
                Paystack settles tuition straight to this account automatically
              </p>
            </div>
          </div>

          <form onSubmit={handleConfigureBank} className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Settlement Bank
              </label>
              <select
                value={bankForm.bankCode}
                onChange={(e) => setBankForm({ ...bankForm, bankCode: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
              >
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  10-Digit Account Number
                </label>
                <input
                  required
                  maxLength={10}
                  placeholder="0123456789"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  SaaS Split Fee (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={10}
                  value={bankForm.platformFeePercentage}
                  onChange={(e) =>
                    setBankForm({
                      ...bankForm,
                      platformFeePercentage: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
            >
              Verify & Link School Bank Account
            </button>
          </form>
        </div>

        {/* Card 2: Class Fee Builder & One-Click Billing */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Class Fee Schedule & Billing</h2>
                <p className="text-xs text-slate-500">
                  Define fee items and bill an entire class in one click
                </p>
              </div>
            </div>

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="p-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.arm || ''}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleAddFeeItem} className="grid grid-cols-3 gap-3 text-sm">
            <input
              required
              placeholder="Fee Title (e.g. Tuition)"
              value={feeForm.title}
              onChange={(e) => setFeeForm({ ...feeForm, title: e.target.value })}
              className="col-span-2 p-2.5 border border-slate-300 rounded-xl text-slate-900"
            />
            <input
              required
              type="number"
              min={100}
              placeholder="Amount (₦)"
              value={feeForm.amount || ''}
              onChange={(e) => setFeeForm({ ...feeForm, amount: Number(e.target.value) })}
              className="p-2.5 border border-slate-300 rounded-xl text-slate-900"
            />
            <button
              type="submit"
              disabled={loading}
              className="col-span-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
            >
              + Add Fee Item to Class
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleGenerateClassInvoices}
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition"
            >
              <FileText className="w-4 h-4" />
              Generate Invoices for All Students in Class
            </button>
          </div>
        </div>
      </div>

      {/* Debtors & Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900">
              Outstanding Invoices & Fee Recovery ({summary?.debtorsCount ?? 0} Debtors)
            </h2>
            <p className="text-xs text-slate-500">
              Collection Rate: <span className="font-bold text-blue-600">{summary?.collectionRate || '0%'}</span> • Outstanding: <span className="font-bold text-amber-600">{formatNaira(summary?.outstandingDebt ?? 0)}</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-4">Invoice #</th>
                <th className="p-4">Student</th>
                <th className="p-4">Class</th>
                <th className="p-4">Total Fee</th>
                <th className="p-4">Paid</th>
                <th className="p-4">Balance</th>
                <th className="p-4 text-right">Payment Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!summary?.debtors?.length ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No unpaid or partial invoices for this term yet.
                  </td>
                </tr>
              ) : (
                summary.debtors.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono text-xs text-slate-600">{inv.invoiceNumber}</td>
                    <td className="p-4 font-medium text-slate-900">
                      {inv.student.user.firstName} {inv.student.user.lastName}
                    </td>
                    <td className="p-4 text-slate-600">
                      {inv.student.classRoom?.name} {inv.student.classRoom?.arm || ''}
                    </td>
                    <td className="p-4 text-slate-700">{formatNaira(inv.totalAmount)}</td>
                    <td className="p-4 text-emerald-600 font-medium">
                      {formatNaira(inv.amountPaid)}
                    </td>
                    <td className="p-4 text-amber-600 font-medium">
                      {formatNaira(inv.balance)}
                    </td>
                    <td className="p-4 font-bold text-rose-600">{formatNaira(inv.balance)}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handlePaystackCheckout(inv)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Paystack
                      </button>
                      <button
                        onClick={() => {
                          setManualModalInvoice(inv);
                          setManualPayment({
                            amount: inv.balance,
                            method: 'BANK_TRANSFER',
                            reference: '',
                          });
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
                      >
                        <Banknote className="w-3.5 h-3.5" /> Log Cash/Transfer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bursar Manual Payment Modal */}
      {manualModalInvoice && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              Record Offline Payment ({manualModalInvoice.invoiceNumber})
            </h3>
            <form onSubmit={handleRecordManualPayment} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Amount Paid (₦)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={manualModalInvoice.balance}
                  value={manualPayment.amount}
                  onChange={(e) =>
                    setManualPayment({ ...manualPayment, amount: Number(e.target.value) })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Payment Method
                </label>
                <select
                  value={manualPayment.method}
                  onChange={(e) =>
                    setManualPayment({ ...manualPayment, method: e.target.value })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
                >
                  <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                  <option value="CASH">Cash at Bursary</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Bank Teller / Transfer Ref (Optional)
                </label>
                <input
                  placeholder="e.g. GTB-TRF-90213"
                  value={manualPayment.reference}
                  onChange={(e) =>
                    setManualPayment({ ...manualPayment, reference: e.target.value })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManualModalInvoice(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700"
                >
                  Issue Official Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
