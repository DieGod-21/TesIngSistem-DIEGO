/**
 * authService.ts
 *
 * El API Control de Notas no expone /auth/login con JWT.
 * La autenticación se realiza mediante el header `X-Usuario-Id` (entero).
 *
 * Flujo:
 *   1. El usuario ingresa su ID de evaluador o admin (proporcionado por el coordinador).
 *   2. Persistimos el ID en localStorage.
 *   3. apiClient adjunta el header automáticamente en cada request.
 *   4. `verifyUser` valida el ID llamando a /api/usuarios/yo.
 */

import { apiData, USER_ID_KEY } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import { isDevBypass, DEV_BYPASS_USER_ID, DEV_MOCK_USER } from '../config/devBypass';

const USER_KEY = 'auth_user';

export interface User {
    id: string;
    /** ID numérico tal como lo espera la API (X-Usuario-Id). */
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

/** Adapta la respuesta del backend al modelo interno User. */
function adaptUsuario(dto: UsuarioDTO | { usuario?: UsuarioDTO }): User {
    const raw = ('usuario' in dto && dto.usuario ? dto.usuario : dto) as UsuarioDTO;
    const id = raw.id ?? raw.usuario_id;
    if (id == null) {
        throw new Error('Respuesta de usuario inválida (sin id).');
    }
    const role = (raw.rol ?? raw.role ?? 'evaluador') as 'admin' | 'evaluador';
    return {
        id:        String(id),
        usuarioId: Number(id),
        nombre:    String(raw.nombre ?? '—'),
        email:     String(raw.email ?? raw.correo ?? ''),
        role,
        fotoUrl:   (raw.foto_url ?? null) as string | null,
    };
}

// ─── Persistencia ─────────────────────────────────────────────────────────

export function readPersistedSession(): { user: User; usuarioId: number } | null {
    if (isDevBypass()) {
        return { user: DEV_MOCK_USER, usuarioId: DEV_BYPASS_USER_ID };
    }

    try {
        const id = localStorage.getItem(USER_ID_KEY);
        const raw = localStorage.getItem(USER_KEY);
        if (!id || !raw) return null;
        const user = JSON.parse(raw) as User;
        return { user, usuarioId: Number(id) };
    } catch {
        localStorage.removeItem(USER_ID_KEY);
        localStorage.removeItem(USER_KEY);
        return null;
    }
}

function persistSession(user: User): void {
    localStorage.setItem(USER_ID_KEY, String(user.usuarioId));
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession(): void {
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_KEY);
}

// ─── API pública ──────────────────────────────────────────────────────────

/**
 * Autentica al usuario por su ID. Como el API no provee /auth/login,
 * persistimos primero el ID y luego validamos con /api/usuarios/yo.
 * Si el ID no existe o devuelve 401, limpiamos y lanzamos error.
 */
export const loginByUserId = async (usuarioId: number): Promise<User> => {
    if (isDevBypass()) return DEV_MOCK_USER;

    if (!Number.isFinite(usuarioId) || usuarioId <= 0) {
        throw new Error('ID de usuario inválido. Debe ser un número entero positivo.');
    }

    // Persistimos temporalmente para que apiClient adjunte el header
    localStorage.setItem(USER_ID_KEY, String(usuarioId));
    try {
        const dto = await apiData<UsuarioDTO | { usuario: UsuarioDTO }>(API_PATHS.usuarios.me);
        const user = adaptUsuario(dto);
        persistSession(user);
        return user;
    } catch (err) {
        clearSession();
        throw err;
    }
};

/**
 * Mantiene la firma legacy (email/password) para no romper LoginForm.
 * Si el "email" parece un número, lo trata como ID; si no, lanza error.
 */
export const login = async (emailOrId: string, _password: string): Promise<User> => {
    const trimmed = emailOrId.trim();
    const numericId = Number(trimmed);
    if (Number.isFinite(numericId) && numericId > 0) {
        return loginByUserId(numericId);
    }
    throw new Error(
        'Este sistema autentica por ID de usuario. Ingresa el ID numérico que te proporcionó tu coordinador.',
    );
};

export const logout = async (): Promise<void> => {
    clearSession();
};

/**
 * Verifica que el ID persistido siga siendo válido contra el backend.
 * Devuelve el usuario actualizado o null si la sesión es inválida.
 */
export const verifySession = async (): Promise<User | null> => {
    if (isDevBypass()) return DEV_MOCK_USER;
    try {
        const dto = await apiData<UsuarioDTO | { usuario: UsuarioDTO }>(API_PATHS.usuarios.me);
        const user = adaptUsuario(dto);
        persistSession(user);
        return user;
    } catch {
        return null;
    }
};

/** Compatibilidad con código legado que llama verifyToken. */
export const verifyToken = async (_token?: string): Promise<boolean> => {
    const user = await verifySession();
    return user !== null;
};
