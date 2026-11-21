'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, CheckCircle2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { saveSession } from '@/lib/auth-store';

export default function OnboardSchoolPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    schoolName: '',
    slug: '',
    schoolEmail: '',
    phone: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleSchoolNameChange(name: string) {
    const autoSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setForm({ ...form, schoolName: name, slug: autoSlug });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/onboard-school', form);
      saveSession(data.accessToken, {
        id: data.user.id,
        firstName: form.ownerFirstName,
        lastName: form.ownerLastName,
        email: data.user.email,
        role: data.user.role,
        tenantId: data.school.id,
        schoolName: data.school.name,
      });
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not onboard school. Check your inputs.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-5">
        {/* Left Value Proposition Panel */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-700 to-slate-900 text-white p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2.5">
              <div className="p-2.5 bg-white/10 rounded-xl">
                <GraduationCap className="w-6 h-6 text-blue-300" />
              </div>
              <span className="font-bold text-lg">EduJav Cloud</span>
            </div>

            <h1 className="text-2xl font-extrabold leading-snug">
              Launch your school&apos;s digital portal in 60 seconds.
            </h1>

            <ul className="space-y-3 text-sm text-blue-100">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Automated broadsheets & QR-verified PDF report cards</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Direct Paystack fee settlement into your school bank</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Bulk CSV student import & instant parent absence alerts</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-blue-200/80 pt-8">
            Isolated multi-tenant cloud database • Default A–F grading scale pre-configured.
          </p>
        </div>

        {/* Right Registration Form */}
        <div className="lg:col-span-3 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" /> Create School Workspace
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Set up your institution details and Proprietor / Principal login.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {Array.isArray(error) ? error.join(', ') : error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                School Official Name
              </label>
              <input
                required
                placeholder="e.g. Greensprings International College"
                value={form.schoolName}
                onChange={(e) => handleSchoolNameChange(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Portal Slug (Unique ID)
                </label>
                <input
                  required
                  placeholder="greensprings-college"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs text-blue-700 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  School Official Email
                </label>
                <input
                  required
                  type="email"
                  placeholder="admin@greensprings.edu.ng"
                  value={form.schoolEmail}
                  onChange={(e) => setForm({ ...form, schoolEmail: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Proprietor / Principal First Name
                </label>
                <input
                  required
                  placeholder="Adebayo"
                  value={form.ownerFirstName}
                  onChange={(e) => setForm({ ...form, ownerFirstName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Last Name
                </label>
                <input
                  required
                  placeholder="Adeyemi"
                  value={form.ownerLastName}
                  onChange={(e) => setForm({ ...form, ownerLastName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Owner Login Email
                </label>
                <input
                  required
                  type="email"
                  placeholder="principal@greensprings.edu.ng"
                  value={form.ownerEmail}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Admin Password (Min 8 chars)
                </label>
                <input
                  required
                  type="password"
                  minLength={8}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
            >
              {loading ? 'Provisioning School Workspace...' : 'Launch School Portal Now'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            Already registered your school?{' '}
            <Link href="/login" className="text-blue-600 font-semibold hover:underline">
              Sign in to your portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
