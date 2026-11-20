'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Lock, Mail, Building2 } from 'lucide-react';
import { api } from '@/lib/api';
import { saveSession } from '@/lib/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    schoolSlug: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
saveSession(data.accessToken, data.user);
if (data.user.role === 'PARENT' || data.user.role === 'STUDENT') {
  router.push('/portal');
} else if (data.user.role === 'TEACHER') {
  router.push('/attendance');
} else {
  router.push('/');
}


    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid school portal or credentials');
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-600 rounded-xl text-white">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">EduPulse Cloud</h1>
            <p className="text-sm text-slate-500">Multi-School Operating System</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              School Portal Slug
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                value={form.schoolSlug}
                onChange={(e) => setForm({ ...form, schoolSlug: e.target.value })}
                placeholder="e.g. royal-crown"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Access School Portal'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Registering a new school?{' '}
          <Link href="/onboard" className="text-blue-600 font-semibold hover:underline">
            Onboard your school in 60s
          </Link>
        </p>
      </div>
    </div>
  );
}
