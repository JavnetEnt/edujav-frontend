'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  Wallet,
  AlertCircle,
  ArrowUpRight,
  Upload,
  FileSpreadsheet,
  BellRing,
  Building,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getSessionUser, SessionUser } from '@/lib/auth-store';

interface ExecutiveStats {
  studentsCount: number;
  teachersCount: number;
  todayAttendanceRate: string;
  finance: {
    totalExpected: number;
    totalCollected: number;
    outstanding: number;
  };
  recentActivity: {
    id: string;
    action: string;
    details: string;
    createdAt: string;
  }[];
}

export default function ExecutiveDashboardPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [stats, setStats] = useState<ExecutiveStats | null>(null);
  const [currentTermLabel, setCurrentTermLabel] = useState('Setup Term Required');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getSessionUser());
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const { data: overview } = await api.get('/academics/overview');
      const currentSession = overview.sessions?.find((s: any) => s.isCurrent) || overview.sessions?.[0];
      const currentTerm =
        currentSession?.terms?.find((t: any) => t.isCurrent) || currentSession?.terms?.[0];

      if (currentSession && currentTerm) {
        setCurrentTermLabel(`${currentSession.name} • ${currentTerm.name}`);
        const { data: summary } = await api.get(
          `/attendance/executive-summary?termId=${currentTerm.id}`,
        );
        setStats(summary);
      } else {
        setStats({
          studentsCount: 0,
          teachersCount: 0,
          todayAttendanceRate: 'No roll call yet',
          finance: { totalExpected: 0, totalCollected: 0, outstanding: 0 },
          recentActivity: [],
        });
      }
    } catch (error) {
      console.error('Failed to load executive dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatNaira = (amount: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);

  const collectionPercent =
    stats && stats.finance.totalExpected > 0
      ? Math.round((stats.finance.totalCollected / stats.finance.totalExpected) * 100)
      : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Top Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 mb-2">
            {currentTermLabel}
          </span>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-slate-500 mt-1">
            Real-time financial, academic, and attendance intelligence for {user?.schoolName}.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/students"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            Bulk CSV Enroll
          </Link>
          <Link
            href="/results"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Generate Broadsheet
          </Link>
        </div>
      </div>

            {/* 4 Key Executive Metric Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-36 bg-white rounded-2xl border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Collected Revenue */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500">Term Fees Collected</span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatNaira(stats?.finance.totalCollected ?? 0)}
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {collectionPercent}% of {formatNaira(stats?.finance.totalExpected ?? 0)} expected
            </p>
          </div>

          {/* Card 2: Outstanding Fees */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500">Outstanding Balance</span>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatNaira(stats?.finance.outstanding ?? 0)}
            </p>
            <Link
              href="/finance"
              className="text-xs text-blue-600 font-semibold mt-2 inline-block hover:underline"
            >
              View debtor list & send reminders →
            </Link>
          </div>

          {/* Card 3: Total Students */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500">Enrolled Students</span>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.studentsCount ?? 0}</p>
            <p className="text-xs text-slate-500 mt-2">
              Across {stats?.teachersCount ?? 0} active teaching staff
            </p>
          </div>

          {/* Card 4: Today's Attendance */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500">Today&apos;s Roll Call</span>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {stats?.todayAttendanceRate ?? 'No roll call yet'}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Instant parent SMS/email alerts active
            </p>
          </div>
        </div>
      )}

      {/* Bottom Grid: Collection Progress & Real-Time Audit / Parent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Fee Recovery Visual Bar & Bank Setup Banner */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Term Revenue Collection</h2>
              <p className="text-sm text-slate-500">
                Direct Paystack subaccount settlement & bursar cash reconciliation
              </p>
            </div>
            <span className="text-lg font-bold text-blue-600">{collectionPercent}%</span>
          </div>

          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
              style={{ width: `${collectionPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500">Expected Tuition</p>
              <p className="text-base font-bold text-slate-900 mt-1">
                {formatNaira(stats?.finance.totalExpected ?? 0)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <p className="text-xs text-emerald-700">Settled to School Bank</p>
              <p className="text-base font-bold text-emerald-800 mt-1">
                {formatNaira(stats?.finance.totalCollected ?? 0)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100">
              <p className="text-xs text-amber-700">Unpaid Invoices</p>
              <p className="text-base font-bold text-amber-800 mt-1">
                {formatNaira(stats?.finance.outstanding ?? 0)}
              </p>
            </div>
          </div>

          {/* Setup Checklist Banner */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-950">
                  Direct School Bank Settlement
                </p>
                <p className="text-xs text-blue-700">
                  Link your school&apos;s bank account so Paystack routes parent payments straight to you.
                </p>
              </div>
            </div>
            <Link
              href="/finance"
              className="px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 shrink-0"
            >
              Configure Bank
            </Link>
          </div>
        </div>

        {/* Right Column: Live Parent Alerts & Audit Feed */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BellRing className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Live Alerts & Audit Log</h2>
          </div>

          {!stats?.recentActivity?.length ? (
            <div className="text-center py-10 text-sm text-slate-400">
              No activity recorded yet. Mark attendance or generate invoices to see live logs.
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">{log.details}</p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
