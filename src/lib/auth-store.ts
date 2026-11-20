export interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'SCHOOL_OWNER' | 'ADMIN' | 'BURSAR' | 'TEACHER' | 'PARENT' | 'STUDENT';
  tenantId: string;
  schoolName: string;
}

export function saveSession(token: string, user: SessionUser) {
  localStorage.setItem('sms_token', token);
  localStorage.setItem('sms_user', JSON.stringify(user));
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('sms_user');
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem('sms_token');
  localStorage.removeItem('sms_user');
}
