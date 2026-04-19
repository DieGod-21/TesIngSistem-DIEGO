/**
 * authService.ts
 *
 * Autenticación desacoplada del schema del API.
 * Los field names del request/response viven en apiConfig.ts — no aquí.
 */

import { apiFetch } from './apiClient';
import { AUTH_REQUEST_FIELDS, JWT_CLAIMS, AUTH_TOKEN_RESPONSE_FIELD, API_PATHS } from '../config/apiConfig';
// DEV ONLY — no produce este import cuando import.meta.env.DEV = false (tree-shaken)
import { isDevBypass, DEV_BYPASS_TOKEN, DEV_MOCK_USER } from '../config/devBypass';

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

// ─── JWT ──────────────────────────────────────────────────────────────────

function parseJwt(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Formato de token no reconocido. Contacta al administrador.');
  }
  const base64Url = parts[1];
  const base64    = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const json      = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  );
  return JSON.parse(json) as Record<string, unknown>;
}

function extractUser(email: string, payload: Record<string, unknown>): User {
  const userId = payload[JWT_CLAIMS.userId];
  const name   = payload[JWT_CLAIMS.name];
  const roles  = payload[JWT_CLAIMS.roles];

  return {
    id:    typeof userId === 'string' ? userId : String(userId ?? ''),
    email: email.trim().toLowerCase(),
    name:  typeof name === 'string' && name ? name : email.split('@')[0],
    role:  Array.isArray(roles) ? (roles[0] ?? 'user') : (typeof roles === 'string' ? roles : 'user'),
  };
}

// ─── Persistencia ─────────────────────────────────────────────────────────

export function readPersistedSession(): { user: User; token: string } | null {
  // DEV ONLY: bypass de autenticación para desarrollo sin backend
  if (isDevBypass()) {
    return { user: DEV_MOCK_USER, token: DEV_BYPASS_TOKEN };
  }

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

// ─── API pública ──────────────────────────────────────────────────────────

export const login = async (email: string, password: string): Promise<User> => {
  // DEV ONLY: omitir llamada al API cuando bypass está activo
  if (isDevBypass()) {
    return DEV_MOCK_USER;
  }

  const body: Record<string, string> = {
    [AUTH_REQUEST_FIELDS.email]:    email,
    [AUTH_REQUEST_FIELDS.password]: password,
  };

  const response = await apiFetch<Record<string, unknown>>(API_PATHS.auth.login, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const token = response[AUTH_TOKEN_RESPONSE_FIELD];
  if (typeof token !== 'string' || !token) {
    throw new Error('Respuesta de autenticación inválida. Contacta al administrador.');
  }

  const payload = parseJwt(token);
  const user    = extractUser(email, payload);

  persistSession(user, token);
  return user;
};

export const logout = async (): Promise<void> => {
  clearSession();
};

export const verifyToken = async (token: string): Promise<boolean> => {
  if (!token) return false;
  // DEV ONLY: el token de bypass siempre es válido
  if (isDevBypass() && token === DEV_BYPASS_TOKEN) return true;
  try {
    const payload = parseJwt(token);
    const exp     = payload[JWT_CLAIMS.exp];
    return typeof exp === 'number' && exp > Date.now() / 1000;
  } catch {
    return false;
  }
};
