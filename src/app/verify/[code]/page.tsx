'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, XCircle, ShieldCheck, GraduationCap } from 'lucide-react';
import { api } from '@/lib/api';

function VerifyResultContent() {
  const params = useParams<{ code: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verify() {
      try {
        const res = await api.get(`/results/verify/${params.code}`);
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invalid or forged result QR code.');
      } finally {
        setLoading(false);
      }
    }
    if (params.code) verify();
  }, [params.code]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-slate-900 text-white p-6 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
          <div>
            <h1 className="text-lg font-bold">Academic Result Verification</h1>
            <p className="text-xs text-slate-400">Official Tamper-Proof Registry</p>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <p className="text-center text-slate-500 py-8">Verifying cryptographic code...</p>
          ) : error ? (
            <div className="text-center py-6 space-y-3">
              <XCircle className="w-14 h-14 text-rose-500 mx-auto" />
              <h2 className="text-xl font-bold text-rose-700">Verification Failed</h2>
              <p className="text-sm text-slate-600">{error}</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-emerald-900">Authentic Result Verified</p>
                  <p className="text-xs text-emerald-700">Issued by {data.school}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm border-t border-b border-slate-100 py-4">
                <div>
                  <span className="text-slate-400 block text-xs">Student Name</span>
                  <span className="font-semibold text-slate-900">{data.studentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Admission No.</span>
                  <span className="font-semibold text-slate-900">{data.admissionNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Class</span>
                  <span className="font-semibold text-slate-900">{data.class}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Session & Term</span>
                  <span className="font-semibold text-slate-900">
                    {data.session} ({data.term})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Term Average</span>
                  <span className="font-bold text-blue-600 text-base">{data.averageScore}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Class Position</span>
                  <span className="font-bold text-slate-900 text-base">{data.position}</span>
                </div>
              </div>

              <p className="text-xs text-center text-slate-400 flex items-center justify-center gap-1.5">
                <GraduationCap className="w-4 h-4" /> Verified via EduPulse Cloud Registry
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <p className="text-center text-slate-500">Loading verification...</p>
        </div>
      }
    >
      <VerifyResultContent />
    </Suspense>
  );
}
