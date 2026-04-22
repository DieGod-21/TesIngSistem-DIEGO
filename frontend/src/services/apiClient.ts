/**
 * apiClient.ts
 *
 * Cliente HTTP centralizado para consumir el API de Control de Notas.
 *
 * El backend usa autenticación por header `X-Usuario-Id` (no JWT Bearer).
 * Este cliente lee el ID persistido y lo adjunta automáticamente.
 *
 * El backend devuelve respuestas con envelope `{ success, data, message? }`.
 * Para reducir boilerplate exponemos `apiGet` / `apiPost` etc. que extraen `data`.
 */

const USER_ID_KEY = 'auth_user_id';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://notas.digicom.com.gt';

const DEFAULT_TIMEOUT_MS = 30_000;

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

/** Lee el ID de usuario persistido (string numérico) o null si no hay sesión. */
function readUserId(): string | null {
    return localStorage.getItem(USER_ID_KEY);
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
    body?: BodyInit | object | null;
    /** Si es false, no envía X-Usuario-Id (útil para endpoints públicos como /api/tesis/*) */
    requireAuth?: boolean;
}

/**
 * Realiza la petición HTTP cruda. Devuelve el JSON parseado tal cual.
 * Lanza ApiError con el status y mensaje extraídos del envelope si lo hay.
 */
export async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
    const { body, requireAuth = true, headers, ...rest } = init;
    const userId = readUserId();
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

    if (requireAuth && userId) {
        finalHeaders['X-Usuario-Id'] = userId;
    }

    try {
        const res = await fetch(`${BASE_URL}${path}`, {
            ...rest,
            body: finalBody,
            signal: rest.signal ?? controller.signal,
            headers: finalHeaders,
        });

        if (res.status === 204) return undefined as T;

        const text = await res.text();
        let parsed: unknown = text;
        try {
            parsed = text ? JSON.parse(text) : null;
        } catch {
            // dejamos `parsed` como string
        }

        if (!res.ok) {
            const message =
                (typeof parsed === 'object' && parsed && 'error' in parsed && typeof (parsed as ApiEnvelope<unknown>).error === 'string')
                    ? (parsed as ApiEnvelope<unknown>).error!
                    : (typeof parsed === 'object' && parsed && 'message' in parsed && typeof (parsed as ApiEnvelope<unknown>).message === 'string')
                        ? (parsed as ApiEnvelope<unknown>).message!
                        : (typeof parsed === 'string' && parsed) || `Error HTTP ${res.status}`;
            throw new ApiError(res.status, message, parsed);
        }

        return parsed as T;
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new ApiError(0, 'La solicitud tardó demasiado. Intenta de nuevo.');
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

/** Atajo para GET con extracción de envelope. */
export const apiGet = <T>(path: string, init?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
    apiData<T>(path, { ...init, method: 'GET' });

/** Atajo para POST con extracción de envelope. */
export const apiPost = <T>(path: string, body?: object, init?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
    apiData<T>(path, { ...init, method: 'POST', body });

/** Atajo para PUT con extracción de envelope. */
export const apiPut = <T>(path: string, body?: object, init?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
    apiData<T>(path, { ...init, method: 'PUT', body });

/** Atajo para DELETE con extracción de envelope. */
export const apiDelete = <T>(path: string, init?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
    apiData<T>(path, { ...init, method: 'DELETE' });

/** Compatibilidad con código legado: GET de listas con potencial envelope `{data: T[]}`. */
export async function apiFetchList<T>(path: string, init?: ApiFetchOptions): Promise<T[]> {
    const res = await apiFetch<T[] | ApiEnvelope<T[]>>(path, init);
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object' && 'data' in res && Array.isArray((res as ApiEnvelope<T[]>).data)) {
        return (res as ApiEnvelope<T[]>).data;
    }
    return [];
}

export { USER_ID_KEY };
