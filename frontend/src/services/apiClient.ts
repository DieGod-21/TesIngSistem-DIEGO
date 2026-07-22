/**
 * apiClient.ts
 *
 * Cliente HTTP centralizado. Autenticación vía JWT Bearer token.
 * Incluye interceptor 401 con refresh automático y deduplicación
 * para evitar múltiples llamadas simultáneas al endpoint de refresh.
 */

// Claves de sessionStorage — fuente única en config/storageKeys.ts.
import {
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    EXPIRES_AT_KEY,
    USER_KEY,
    SESSION_MSG_KEY,
} from '../config/storageKeys';

// Re-export para compatibilidad: LoginForm importa SESSION_MSG_KEY desde aquí.
export { SESSION_MSG_KEY };

/**
 * Resuelve la URL base de la API con política fail-fast:
 *   - En desarrollo se usa el proxy de Vite (mismo origen) → cadena vacía.
 *   - En producción, VITE_API_URL es OBLIGATORIA. NO hay fallback silencioso:
 *     si falta, la app no arranca en lugar de apuntar a una API no intencionada.
 * El build también falla antes (guard en vite.config.ts); esto es defensa en
 * profundidad por si el bundle se sirviera mal configurado.
 */
function resolveBaseUrl(): string {
    if (import.meta.env.DEV) return '';
    const url = import.meta.env.VITE_API_URL;
    if (!url) {
        throw new Error(
            'Configuración inválida: falta VITE_API_URL. La aplicación no puede ' +
            'apuntar a una API por defecto. Define VITE_API_URL en el entorno de build.',
        );
    }
    return url;
}

const BASE_URL = resolveBaseUrl();

/**
 * Timeouts por tipo de operación (ms). Cada petición puede sobrescribirlo con
 * `timeout` en las opciones. Un timeout NO destruye la sesión: solo aborta la
 * petición y se clasifica como 'timeout'.
 */
export const REQUEST_TIMEOUTS = {
    /**
     * Autenticación (login/logout/refresh/perfil). 15 s: el login es el PRIMER
     * request contra el backend, sin conexión previa calentada, y puede incurrir
     * en latencia de arranque en frío del servidor (hosting modesto/serverless).
     * Un techo de 10 s por debajo del `normal` (20 s) desatendía justo la
     * operación más expuesta a cold-starts; 15 s da margen sin colgar la UI.
     */
    auth: 15_000,
    /** Peticiones normales de la API. */
    normal: 20_000,
    /** Cargas/importaciones grandes: pueden continuar procesándose en servidor. */
    upload: 120_000,
} as const;

const DEFAULT_TIMEOUT_MS = REQUEST_TIMEOUTS.normal;

export interface ApiEnvelope<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
    errors?: string[];
}

/**
 * Clasificación normalizada de errores de red. Las páginas reciben un `kind`
 * estable en lugar de inspeccionar códigos HTTP crudos.
 */
export type NetworkErrorKind =
    | 'cancelled'    // el llamador abortó la petición (no es un error de UI)
    | 'timeout'      // se agotó el tiempo de espera del cliente
    | 'offline'      // fallo de red / sin conexión
    | 'unauthorized' // 401
    | 'forbidden'    // 403
    | 'notFound'     // 404
    | 'conflict'     // 409
    | 'validation'   // 422
    | 'rateLimited'  // 429
    | 'server'       // 500 (o 5xx no específico)
    | 'unavailable'  // 503
    | 'unknown';     // cualquier otro

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly payload?: unknown,
        /** Clasificación estable del error para las páginas. */
        public readonly kind: NetworkErrorKind = 'unknown',
        /** Mensajes de validación del backend (`errors: []`), si los hubo. */
        public readonly errors?: string[],
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Error de cancelación: la petición fue abortada por el llamador. NO representa
 * un fallo; las páginas deben ignorarlo (no mostrar mensaje ni actualizar UI).
 */
export class CanceledError extends Error {
    constructor(message = 'Petición cancelada') {
        super(message);
        this.name = 'CanceledError';
    }
}

/** Predicado único para detectar cancelaciones en cualquier consumidor. */
export function isCancel(err: unknown): boolean {
    return (
        err instanceof CanceledError ||
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof ApiError && err.kind === 'cancelled')
    );
}

/** Traduce un código HTTP a su clasificación. */
function kindFromStatus(status: number): NetworkErrorKind {
    switch (status) {
        case 401: return 'unauthorized';
        case 403: return 'forbidden';
        case 404: return 'notFound';
        case 409: return 'conflict';
        case 422: return 'validation';
        case 429: return 'rateLimited';
        case 503: return 'unavailable';
        case 500: return 'server';
        default:  return status >= 500 ? 'server' : 'unknown';
    }
}

/** Extrae mensajes de validación de `errors: []` (strings u objetos {message}). */
function extractErrors(parsed: unknown): string[] | undefined {
    if (!parsed || typeof parsed !== 'object') return undefined;
    const raw = (parsed as Record<string, unknown>).errors;
    if (!Array.isArray(raw)) return undefined;
    const messages: string[] = [];
    for (const item of raw) {
        if (typeof item === 'string') {
            messages.push(item);
        } else if (item && typeof item === 'object') {
            const m = (item as Record<string, unknown>).message;
            if (typeof m === 'string') messages.push(m);
        }
    }
    return messages.length > 0 ? messages : undefined;
}

/** Construye un ApiError clasificado a partir de una respuesta no-2xx. */
function apiErrorFromResponse(status: number, parsed: unknown): ApiError {
    const errors = extractErrors(parsed);
    const message = errors && errors.length > 0
        ? errors.join(' ')
        : extractErrorMessage(parsed, status);
    return new ApiError(status, message, parsed, kindFromStatus(status), errors);
}

function readAccessToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

function clearSessionTokens(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(EXPIRES_AT_KEY);
    sessionStorage.removeItem(USER_KEY);
}

function redirectExpiredSession(): never {
    clearSessionTokens();
    // Evita un bucle/redirect redundante si ya estamos en /login: solo se
    // redirige (y se deja el mensaje) cuando el usuario está en otra ruta.
    if (window.location.pathname !== '/login') {
        sessionStorage.setItem(SESSION_MSG_KEY, 'Tu sesión expiró. Por favor inicia sesión nuevamente.');
        window.location.replace('/login');
    }
    throw new ApiError(401, 'Sesión expirada. Por favor inicia sesión nuevamente.', undefined, 'unauthorized');
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

    // El refresh es autenticación crítica → timeout corto (auth).
    const link = withTimeout(undefined, REQUEST_TIMEOUTS.auth);
    let res: Response;
    try {
        res = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
            signal: link.signal,
        });
    } finally {
        link.cleanup();
    }

    if (!res.ok) throw new ApiError(res.status, 'No se pudo renovar la sesión', undefined, kindFromStatus(res.status));

    const json = await res.json();
    const payload = (json && typeof json === 'object' && 'data' in json) ? json.data : json;

    sessionStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
    sessionStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + (payload.expiresIn ?? 900) * 1000));

    return payload.accessToken as string;
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
    body?: BodyInit | object | null;
    /** Si es false, no adjunta Authorization header (endpoints públicos o de auth). */
    requireAuth?: boolean;
    /** Interno: evita bucle infinito en llamadas de refresh/logout. */
    skipRefresh?: boolean;
    /** Timeout en ms para esta petición (por defecto REQUEST_TIMEOUTS.normal). */
    timeout?: number;
}

/**
 * Enlaza la señal del llamador con un timeout interno en un único
 * AbortController: la petición se aborta si el llamador cancela O si vence el
 * timeout. `state.timedOut` permite distinguir después ambos casos.
 */
function withTimeout(callerSignal: AbortSignal | undefined | null, timeoutMs: number) {
    const controller = new AbortController();
    const state = { timedOut: false };
    const timeoutId = setTimeout(() => {
        state.timedOut = true;
        controller.abort();
    }, timeoutMs);

    const onCallerAbort = () => controller.abort();
    if (callerSignal) {
        if (callerSignal.aborted) controller.abort();
        else callerSignal.addEventListener('abort', onCallerAbort, { once: true });
    }

    const cleanup = () => {
        clearTimeout(timeoutId);
        if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
    };

    return { signal: controller.signal, state, cleanup };
}

/** Normaliza un fallo de red a ApiError clasificado (timeout/cancelación/offline). */
function normalizeFetchError(err: unknown, callerSignal: AbortSignal | undefined | null, timedOut: boolean): never {
    if (err instanceof DOMException && err.name === 'AbortError') {
        if (timedOut) {
            throw new ApiError(0, 'La solicitud tardó demasiado. Intenta de nuevo.', undefined, 'timeout');
        }
        // Abortada por el llamador → cancelación silenciosa (no es un error de UI).
        if (callerSignal?.aborted) throw new CanceledError();
        throw new CanceledError();
    }
    if (err instanceof TypeError) {
        throw new ApiError(
            0,
            'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.',
            err.message,
            'offline',
        );
    }
    throw err;
}

/**
 * Realiza la petición HTTP cruda. Devuelve el JSON parseado tal cual.
 * Lanza ApiError si la respuesta no es 2xx.
 * En 401 intenta renovar el token automáticamente antes de fallar.
 */
export async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
    const { body, requireAuth = true, skipRefresh = false, headers, timeout, ...rest } = init;
    const timeoutMs = timeout ?? DEFAULT_TIMEOUT_MS;
    const callerSignal = rest.signal;
    const link = withTimeout(callerSignal, timeoutMs);

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
            signal: link.signal,
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
                throw new ApiError(0, 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.', undefined, 'offline');
            }

            const retryLink = withTimeout(callerSignal, timeoutMs);
            try {
                const retryRes = await fetch(`${BASE_URL}${path}`, {
                    ...rest,
                    body: finalBody,
                    signal: retryLink.signal,
                    headers: { ...finalHeaders, Authorization: `Bearer ${newToken}` },
                });

                if (retryRes.status === 204) return undefined as T;

                const retryText = await retryRes.text();
                let retryParsed: unknown = retryText;
                try { retryParsed = retryText ? JSON.parse(retryText) : null; } catch { /* */ }

                if (!retryRes.ok) {
                    throw apiErrorFromResponse(retryRes.status, retryParsed);
                }
                return retryParsed as T;
            } catch (err) {
                normalizeFetchError(err, callerSignal, retryLink.state.timedOut);
            } finally {
                retryLink.cleanup();
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        const text = await res.text();
        let parsed: unknown = text;
        try {
            parsed = text ? JSON.parse(text) : null;
        } catch { /* dejamos parsed como string */ }

        if (!res.ok) {
            throw apiErrorFromResponse(res.status, parsed);
        }

        return parsed as T;
    } catch (err) {
        // ApiError y CanceledError ya están clasificados: se propagan tal cual.
        if (err instanceof ApiError || err instanceof CanceledError) throw err;
        normalizeFetchError(err, callerSignal, link.state.timedOut);
    } finally {
        link.cleanup();
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
