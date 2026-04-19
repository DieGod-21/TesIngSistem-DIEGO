/**
 * apiClient.ts
 *
 * Cliente HTTP centralizado para consumir la API del backend.
 *
 * Encapsula fetch con:
 *   - Base URL configurable vía variable de entorno (VITE_API_URL)
 *   - Header Authorization automático si existe token en localStorage
 *   - Content-Type application/json por defecto
 *   - Manejo básico de errores HTTP
 *
 * USO FUTURO: cuando se conecte el backend real, los servicios
 * (authService, dashboardService, studentsService, studentStore)
 * deben reemplazar sus mocks con llamadas a apiFetch().
 *
 * @example
 * import { apiFetch } from './apiClient';
 * const students = await apiFetch<Student[]>('/students');
 * await apiFetch<void>('/students', { method: 'POST', body: JSON.stringify(payload) });
 */

const TOKEN_KEY = 'auth_token';

/** Base URL del API. Usa variable de entorno o fallback a '/api'. */
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

/**
 * Realiza una petición HTTP al backend con configuración centralizada.
 *
 * @param path  - Ruta relativa al endpoint (ej. '/students', '/auth/login')
 * @param init  - Opciones adicionales de fetch (method, body, headers extra, etc.)
 * @returns     - Respuesta parseada como JSON del tipo genérico T
 * @throws      - Error con el texto de la respuesta si el status no es ok
 */
const DEFAULT_TIMEOUT_MS = 30_000;

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const token = localStorage.getItem(TOKEN_KEY);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
        const res = await fetch(`${BASE_URL}${path}`, {
            ...init,
            signal: init?.signal ?? controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...init?.headers,
            },
        });

        if (!res.ok) {
            const errorText = await res.text().catch(() => '');
            let userMessage = errorText || `Error HTTP ${res.status}`;
            try {
                const parsed = JSON.parse(errorText) as { error?: string; message?: string };
                if (parsed.error) userMessage = parsed.error;
                else if (parsed.message) userMessage = parsed.message;
            } catch { /* no es JSON — usar el texto tal cual */ }
            throw new Error(userMessage);
        }

        if (res.status === 204) return undefined as T;

        return res.json() as Promise<T>;
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new Error('La solicitud tardó demasiado. Intenta de nuevo.');
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

/** Fetch para endpoints paginados: extrae `.data` si la respuesta es `{ data, pagination }`, o devuelve el array directamente. */
export async function apiFetchList<T>(path: string, init?: RequestInit): Promise<T[]> {
    const res = await apiFetch<T[] | { data: T[] }>(path, init);
    return Array.isArray(res) ? res : (res?.data ?? []);
}
