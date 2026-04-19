/**
 * authService.ts
 *
 * Capa de servicio para autenticación.
 * Persiste la sesión en localStorage para que sobreviva recargas.
 *
 * Claves de localStorage:
 *   auth_token → JWT del backend
 *   auth_user  → JSON del objeto User
 */

import { apiFetch } from './apiClient';

const TOKEN_KEY = 'auth_token';
const USER_KEY  = 'auth_user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// ─── Helpers JWT ─────────────────────────────────────────────────────

interface JwtPayload {
  user_id: string;
  nombre: string;
  roles: string[];
  exp: number;
}

function parseJwt(token: string): JwtPayload {
  const base64Url = token.split('.')[1];
  const base64    = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const json      = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  );
  return JSON.parse(json) as JwtPayload;
}

// ─── Persistencia ───────────────────────────────────────────────────

/** Lee la sesión guardada en localStorage. Retorna null si no existe o está corrupta. */
export function readPersistedSession(): { user: User; token: string } | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw   = localStorage.getItem(USER_KEY);
    if (!token || !raw) return null;
    const user = JSON.parse(raw) as User;
    return { user, token };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function persistSession(user: User, token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ─── API pública ────────────────────────────────────────────────────

/**
 * Autentica al usuario contra POST /api/auth/login.
 * El backend espera { correo_electronico, contrasena } y retorna { token }.
 * Se decodifica el JWT para extraer user_id y roles.
 */
export const login = async (email: string, password: string): Promise<User> => {
  const { token } = await apiFetch<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ correo_electronico: email, contrasena: password }),
  });

  const payload = parseJwt(token);
  const user: User = {
    id:    payload.user_id,
    email: email.trim().toLowerCase(),
    name:  payload.nombre || email.split('@')[0],
    role:  payload.roles?.[0] ?? 'user',
  };

  persistSession(user, token);
  return user;
};

/**
 * Cierra sesión y limpia el localStorage.
 */
export const logout = async (): Promise<void> => {
  clearSession();
};

/**
 * Verifica si el JWT almacenado sigue siendo válido
 * comparando su campo `exp` con el tiempo actual.
 * No realiza llamada al servidor (validación local).
 */
export const verifyToken = async (token: string): Promise<boolean> => {
  if (!token) return false;
  try {
    const payload = parseJwt(token);
    return payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};
