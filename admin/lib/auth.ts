export interface AuthUser {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  aprobado: boolean;
}

const TOKEN_KEY = 'terrana_admin_token';
const USER_KEY  = 'terrana_admin_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, usuario: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Solo Admin y Operador pueden entrar al panel
export function hasAdminAccess(user: AuthUser | null): boolean {
  if (!user) return false;
  return ['Admin', 'Operador'].includes(user.rol);
}
