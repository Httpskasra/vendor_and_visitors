export function getUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}
export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}
export function setAuth(token: string, user: any) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
export function isAdmin() { return getUser()?.role === 'ADMIN'; }
export function isBuyer() { return getUser()?.role === 'BUYER'; }
