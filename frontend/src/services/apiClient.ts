/**
 * apiClient.ts
 *
 * Cliente HTTP centralizado. Autenticación vía JWT Bearer token.
 * Incluye interceptor 401 con refresh automático y deduplicación
 * para evitar múltiples llamadas simultáneas al endpoint de refresh.
 */

const BASE_URL = import.meta.env.DEV
    ? ''
    : (import.meta.env.VITE_API_URL ?? 'https://notas.digicom.com.gt');

const DEFAULT_TIMEOUT_MS = 30_000;

// Claves de sessionStorage — deben coincidir con authService.ts
const ACCESS_TOKEN_KEY  = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const EXPIRES_AT_KEY    = 'auth_expires_at';
const USER_KEY          = 'auth_user';
/** Mensaje de sesión expirada que muestra LoginForm tras un redirect automático. */
export const SESSION_MSG_KEY = 'auth_session_msg';

export interface ApiEnvelope<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
    errors?: string[];
}

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly payload?: unknown,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

function readAccessToken(): string | null {
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === 'true') {
        return '__dev_bypass_token__';
    }
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

function clearSessionTokens(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(EXPIRES_AT_KEY);
    sessionStorage.removeItem(USER_KEY);
}

function redirectExpiredSession(): never {
    sessionStorage.setItem(SESSION_MSG_KEY, 'Tu sesión expiró. Por favor inicia sesión nuevamente.');
    clearSessionTokens();
    window.location.replace('/login');
    throw new ApiError(401, 'Sesión expirada. Por favor inicia sesión nuevamente.');
}

function extractErrorMessage(parsed: unknown, status: number): string {
    if (parsed && typeof parsed === 'object') {
        const p = parsed as Record<string, unknown>;
        if (typeof p.error === 'string' && p.error) return p.error;
        if (typeof p.message === 'string' && p.message) return p.message;
    }
    if (typeof parsed === 'string' && parsed) return parsed;
    return `Error HTTP ${status}`;
}

/** Promise compartida para evitar llamadas concurrentes al refresh. */
let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
    const rt = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (!rt) throw new Error('No refresh token available');

    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
    });

    if (!res.ok) throw new ApiError(res.status, 'No se pudo renovar la sesión');

    const json = await res.json();
    const payload = (json && typeof json === 'object' && 'data' in json) ? json.data : json;

    sessionStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
    sessionStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + (payload.expiresIn ?? 900) * 1000));

    return payload.accessToken as string;
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
    body?: BodyInit | object | null;
    /** Si es false, no adjunta Authorization header (endpoints públicos o de auth). */
    requireAuth?: boolean;
    /** Interno: evita bucle infinito en llamadas de refresh/logout. */
    skipRefresh?: boolean;
}

/**
 * Realiza la petición HTTP cruda. Devuelve el JSON parseado tal cual.
 * Lanza ApiError si la respuesta no es 2xx.
 * En 401 intenta renovar el token automáticamente antes de fallar.
 */
export async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
    const { body, requireAuth = true, skipRefresh = false, headers, ...rest } = init;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const finalHeaders: Record<string, string> = {
        Accept: 'application/json',
        ...(headers as Record<string, string> | undefined),
    };

    let finalBody: BodyInit | null | undefined;
    if (body != null && !(body instanceof FormData) && typeof body !== 'string') {
        finalHeaders['Content-Type'] = finalHeaders['Content-Type'] ?? 'application/json';
        finalBody = JSON.stringify(body);
    } else {
        finalBody = body as BodyInit | null | undefined;
    }

    // Proactive refresh: if the token expires within 60 s, renew before sending.
    let accessToken = readAccessToken();
    if (requireAuth && !skipRefresh && accessToken) {
        const expiresAt = Number(sessionStorage.getItem(EXPIRES_AT_KEY) ?? 0);
        if (expiresAt > 0 && Date.now() > expiresAt - 60_000) {
            try {
                if (!refreshPromise) {
                    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
                }
                accessToken = await refreshPromise;
            } catch (err) {
                if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                    redirectExpiredSession();
                }
                // Network / 5xx error — don't invalidate the session.
                // Proceed with the current token; the 401 interceptor will retry if needed.
            }
        }
    }
    if (requireAuth && accessToken) {
        finalHeaders['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
        const res = await fetch(`${BASE_URL}${path}`, {
            ...rest,
            body: finalBody,
            signal: rest.signal ?? controller.signal,
            headers: finalHeaders,
        });

        if (res.status === 204) return undefined as T;

        // ── Interceptor 401 ──────────────────────────────────────────────────
        if (res.status === 401 && requireAuth && !skipRefresh) {
            let newToken: string;
            try {
                if (!refreshPromise) {
                    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
                }
                newToken = await refreshPromise;
            } catch (err) {
                if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                    redirectExpiredSession();
                }
                throw new ApiError(0, 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
            }

            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), DEFAULT_TIMEOUT_MS);
            try {
                const retryRes = await fetch(`${BASE_URL}${path}`, {
                    ...rest,
                    body: finalBody,
                    signal: retryController.signal,
                    headers: { ...finalHeaders, Authorization: `Bearer ${newToken}` },
                });

                if (retryRes.status === 204) return undefined as T;

                const retryText = await retryRes.text();
                let retryParsed: unknown = retryText;
                try { retryParsed = retryText ? JSON.parse(retryText) : null; } catch { /* */ }

                if (!retryRes.ok) {
                    throw new ApiError(
                        retryRes.status,
                        extractErrorMessage(retryParsed, retryRes.status),
                        retryParsed,
                    );
                }
                return retryParsed as T;
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') {
                    throw new ApiError(0, 'La solicitud tardó demasiado. Intenta de nuevo.');
                }
                throw err;
            } finally {
                clearTimeout(retryTimeoutId);
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        const text = await res.text();
        let parsed: unknown = text;
        try {
            parsed = text ? JSON.parse(text) : null;
        } catch { /* dejamos parsed como string */ }

        if (!res.ok) {
            throw new ApiError(res.status, extractErrorMessage(parsed, res.status), parsed);
        }

        return parsed as T;
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new ApiError(0, 'La solicitud tardó demasiado. Intenta de nuevo.');
        }
        if (err instanceof TypeError) {
            throw new ApiError(
                0,
                'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.',
                err.message,
            );
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Llama al endpoint y extrae `data` del envelope `{success, data}`.
 * Si la respuesta no tiene envelope, devuelve el cuerpo tal cual.
 */
export async function apiData<T>(path: string, init?: ApiFetchOptions): Promise<T> {
    const raw = await apiFetch<ApiEnvelope<T> | T>(path, init);
    if (raw && typeof raw === 'object' && 'data' in (raw as object)) {
        return (raw as ApiEnvelope<T>).data;
    }
    return raw as T;
}

export const apiGet = <T>(path: string, init?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
    apiData<T>(path, { ...init, method: 'GET' });

export const apiPost = <T>(path: string, body?: object, init?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
    apiData<T>(path, { ...init, method: 'POST', body });

export const apiPut = <T>(path: string, body?: object, init?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
    apiData<T>(path, { ...init, method: 'PUT', body });

export const apiDelete = <T>(path: string, init?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
    apiData<T>(path, { ...init, method: 'DELETE' });

/** @deprecated — compatibilidad legacy. */
export const USER_ID_KEY = 'auth_user_id';
