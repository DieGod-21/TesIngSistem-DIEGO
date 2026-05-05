/**
 * authService.ts
 *
 * Autenticación JWT.
 * Tokens almacenados en sessionStorage (se limpian al cerrar pestaña).
 *
 * Flujo:
 *   login(email, password) → POST /api/auth/login → guarda accessToken + refreshToken
 *   logout()               → POST /api/auth/logout (envía refreshToken) → limpia sesión
 *   verifySession()        → GET  /api/usuarios/yo  → refresca perfil del usuario
 */

import { apiFetch, apiData, type ApiEnvelope } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import { isDevBypass, DEV_MOCK_USER } from '../config/devBypass';

// Claves de sessionStorage — deben coincidir con apiClient.ts
const ACCESS_TOKEN_KEY  = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const EXPIRES_AT_KEY    = 'auth_expires_at';
const USER_KEY          = 'auth_user';

export interface User {
    id: string;
    /** Numérico para compatibilidad con componentes existentes. */
    usuarioId: number;
    nombre: string;
    email: string;
    role: 'admin' | 'evaluador';
    fotoUrl?: string | null;
}

interface UsuarioDTO {
    id?: number;
    usuario_id?: number;
    nombre?: string;
    email?: string;
    correo?: string;
    rol?: string;
    role?: string;
    foto_url?: string | null;
    [key: string]: unknown;
}

interface LoginResponseData {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    usuario: UsuarioDTO;
}

function adaptUsuario(dto: UsuarioDTO | { usuario?: UsuarioDTO }): User {
    const raw = ('usuario' in dto && dto.usuario ? dto.usuario : dto) as UsuarioDTO;
    const id = raw.id ?? raw.usuario_id;
    if (id == null) throw new Error('Respuesta de usuario inválida (sin id).');
    return {
        id:        String(id),
        usuarioId: Number(id),
        nombre:    String(raw.nombre ?? '—'),
        email:     String(raw.email ?? raw.correo ?? ''),
        role:      (raw.rol ?? raw.role ?? 'evaluador') as 'admin' | 'evaluador',
        fotoUrl:   (raw.foto_url ?? null) as string | null,
    };
}

// ─── Persistencia ─────────────────────────────────────────────────────────

function persistSession(
    user: User,
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
): void {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    sessionStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(EXPIRES_AT_KEY);
    sessionStorage.removeItem(USER_KEY);
}

export function readPersistedSession(): { user: User } | null {
    if (isDevBypass()) return { user: DEV_MOCK_USER };
    try {
        const raw = sessionStorage.getItem(USER_KEY);
        if (!raw) return null;
        return { user: JSON.parse(raw) as User };
    } catch {
        clearSession();
        return null;
    }
}

// ─── API pública ──────────────────────────────────────────────────────────

export const login = async (email: string, password: string): Promise<User> => {
    if (isDevBypass()) return DEV_MOCK_USER;

    if (!email.trim()) throw new Error('El correo electrónico es requerido.');
    if (!password)     throw new Error('La contraseña es requerida.');

    const raw = await apiFetch<ApiEnvelope<LoginResponseData> | LoginResponseData>(
        API_PATHS.auth.login,
        { method: 'POST', body: { email: email.trim(), password }, requireAuth: false, skipRefresh: true },
    );

    const data = (raw && typeof raw === 'object' && 'data' in raw)
        ? (raw as ApiEnvelope<LoginResponseData>).data
        : raw as LoginResponseData;

    const user = adaptUsuario(data.usuario);
    persistSession(user, data.accessToken, data.refreshToken, Date.now() + data.expiresIn * 1000);
    return user;
};

export const logout = async (): Promise<void> => {
    if (isDevBypass()) return;
    const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    try {
        if (refreshToken) {
            await apiFetch(API_PATHS.auth.logout, {
                method: 'POST',
                body: { refreshToken },
                requireAuth: false,
                skipRefresh: true,
            });
        }
    } catch {
        // Ignorar errores de red — la sesión local se limpia de todas formas
    } finally {
        clearSession();
    }
};

/**
 * Verifica que el token vigente sea válido llamando a /api/usuarios/yo.
 * Actualiza el perfil persistido si tiene éxito.
 */
export const verifySession = async (): Promise<User | null> => {
    if (isDevBypass()) return DEV_MOCK_USER;
    try {
        const dto = await apiData<UsuarioDTO | { usuario: UsuarioDTO }>(API_PATHS.usuarios.me);
        const user = adaptUsuario(dto);
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
        return user;
    } catch {
        return null;
    }
};

/** @deprecated — compatibilidad legacy. */
export const verifyToken = async (_token?: string): Promise<boolean> =>
    (await verifySession()) !== null;
