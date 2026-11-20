'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileSpreadsheet,
  Wallet,
  CalendarCheck,
  LogOut,
  GraduationCap,
  ShieldCheck,
  KeyRound,
  Menu,
  X,
  Sparkles,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { clearSession, getSessionUser, SessionUser } from '@/lib/auth-store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Change Password Modal State
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

useEffect(() => {
  const session = getSessionUser();
  if (!session) {
    router.push('/login');
    return;
  }
  setUser(session);

  const parentStudentAllowed = ['/portal', '/cbt', '/timetable'];
  const teacherAllowed = ['/attendance', '/results', '/cbt', '/timetable'];

  if (
    (session.role === 'PARENT' || session.role === 'STUDENT') &&
    !parentStudentAllowed.includes(pathname)
  ) {
    router.replace('/portal');
  } else if (
    session.role === 'TEACHER' &&
    !teacherAllowed.includes(pathname)
  ) {
    router.replace('/attendance');
  }
}, [pathname, router]);


  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPwd(true);
    setPwdMsg(null);
    try {
      const { data } = await api.patch('/auth/change-password', pwdForm);
      setPwdMsg({ type: 'ok', text: data.message });
      setPwdForm({ currentPassword: '', newPassword: '' });
      setTimeout(() => {
        setShowPwdModal(false);
        setPwdMsg(null);
      }, 1500);
    } catch (err: any) {
      setPwdMsg({
        type: 'err',
        text: err.response?.data?.message || 'Failed to update password',
      });
    } finally {
      setSavingPwd(false);
    }
  }

  if (!user) return null;

  const navItems = [
    {
      label: 'My Family & Student Portal',
      href: '/portal',
      icon: GraduationCap,
      roles: ['PARENT', 'STUDENT'],
    },
    {
      label: 'Executive Overview',
      href: '/',
      icon: LayoutDashboard,
      roles: ['SCHOOL_OWNER', 'ADMIN', 'BURSAR'],
    },
    {
      label: 'Academics & Classes',
      href: '/academics',
      icon: BookOpen,
      roles: ['SCHOOL_OWNER', 'ADMIN'],
    },
    {
      label: 'Students & Staff',
      href: '/students',
      icon: Users,
      roles: ['SCHOOL_OWNER', 'ADMIN'],
    },
    {
      label: 'Smart Attendance',
      href: '/attendance',
      icon: CalendarCheck,
      roles: ['SCHOOL_OWNER', 'ADMIN', 'TEACHER'],
    },
    {
      label: 'Results & Broadsheets',
      href: '/results',
      icon: FileSpreadsheet,
      roles: ['SCHOOL_OWNER', 'ADMIN', 'TEACHER'],
    },
    {
      label: 'Fees & Paystack Billing',
      href: '/finance',
      icon: Wallet,
      roles: ['SCHOOL_OWNER', 'ADMIN', 'BURSAR'],
    },

        {
      label: 'AI CBT Practice Lab',
      href: '/cbt',
      icon: Sparkles, // Import Sparkles from 'lucide-react'
      roles: ['SCHOOL_OWNER', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT'],
    },

        {
      label: 'Smart Timetable',
      href: '/timetable',
      icon: Clock, // Import Clock from 'lucide-react'
      roles: ['SCHOOL_OWNER', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT'],
    },


  ].filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-dvh bg-slate-50 flex">
      <header className="fixed inset-x-0 top-0 z-10 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileNavOpen}
          aria-controls="dashboard-navigation"
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
        >
          {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{user.schoolName}</p>
          <p className="text-xs text-slate-500">School Portal</p>
        </div>
      </header>

      {isMobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 z-20 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        id="dashboard-navigation"
        className={`fixed inset-y-0 left-0 z-30 flex w-68 flex-col justify-between overflow-y-auto bg-slate-900 text-slate-100 print:hidden transition-transform lg:z-20 lg:translate-x-0 ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-bold text-white truncate">{user.schoolName}</h2>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Multi-Tenant Portal
              </span>
            </div>
          </div>

          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800 space-y-1">
          <div className="mb-2 px-3">
            <p className="text-sm font-semibold text-white truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              {user.role.replace('_', ' ')}
            </p>
          </div>
          <button
            onClick={() => setShowPwdModal(true)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-xl transition"
          >
            <KeyRound className="w-4 h-4 text-blue-400" />
            Change Password
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-400 hover:bg-slate-800 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 p-4 pt-20 sm:p-6 sm:pt-22 lg:ml-68 lg:p-8 print:ml-0 print:p-0">
        {children}
      </main>

      {/* Change Password Modal */}
      {showPwdModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Change Account Password</h3>

            {pwdMsg && (
              <div
                className={`p-3 rounded-xl text-xs border ${
                  pwdMsg.type === 'ok'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {pwdMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 text-sm">
              <input
                type="password"
                required
                placeholder="Current Password (e.g. Parent@123)"
                value={pwdForm.currentPassword}
                onChange={(e) =>
                  setPwdForm({ ...pwdForm, currentPassword: e.target.value })
                }
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="New Password (min 6 characters)"
                value={pwdForm.newPassword}
                onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPwdModal(false);
                    setPwdMsg(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPwd}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700"
                >
                  {savingPwd ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
