import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiFetch, ApiError, CanceledError, isCancel } from './apiClient';

/** Respuesta simulada: apiFetch usa text(); doRefresh usa json(). */
function jsonResponse(status: number, body: unknown): Response {
    return {
        status,
        ok: status >= 200 && status < 300,
        text: async () => (body == null ? '' : JSON.stringify(body)),
        json: async () => body,
    } as unknown as Response;
}

const REFRESH_OK = { accessToken: 'new', refreshToken: 'rt2', expiresIn: 900 };

const tick = () => new Promise((r) => setTimeout(r, 0));

async function catchError(p: Promise<unknown>): Promise<unknown> {
    try { await p; return null; } catch (e) { return e; }
}

function seedSession(): void {
    sessionStorage.setItem('auth_access_token', 'old');
    sessionStorage.setItem('auth_refresh_token', 'rt');
}

describe('apiClient — interceptor 401 / refresh (casos de borde)', () => {
    beforeEach(() => { sessionStorage.clear(); });
    afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

    it('401 concurrente → un solo refresh (deduplicado) y ambas peticiones reintentan', async () => {
        seedSession();
        let refreshCalls = 0;
        let targetCalls = 0;
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/api/auth/refresh')) {
                refreshCalls++;
                await tick();
                return jsonResponse(200, REFRESH_OK);
            }
            targetCalls++;
            return targetCalls <= 2
                ? jsonResponse(401, { error: 'expired' })
                : jsonResponse(200, { ok: true });
        }));

        const [a, b] = await Promise.all([apiFetch('/x'), apiFetch('/y')]);
        expect(refreshCalls).toBe(1);        // deduplicado
        expect(a).toEqual({ ok: true });
        expect(b).toEqual({ ok: true });
    });

    it('refresh proactivo deduplicado con token por expirar', async () => {
        seedSession();
        sessionStorage.setItem('auth_expires_at', String(Date.now() + 30_000)); // dentro de la ventana de 60s
        let refreshCalls = 0;
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/api/auth/refresh')) {
                refreshCalls++;
                await tick();
                return jsonResponse(200, REFRESH_OK);
            }
            return jsonResponse(200, { ok: true });
        }));

        await Promise.all([apiFetch('/x'), apiFetch('/y')]);
        expect(refreshCalls).toBe(1);
    });

    it('cancelación durante el retry → CanceledError (no timeout)', async () => {
        seedSession();
        const controller = new AbortController();
        let targetCalls = 0;
        vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
            if (url.includes('/api/auth/refresh')) {
                return Promise.resolve(jsonResponse(200, REFRESH_OK));
            }
            targetCalls++;
            if (targetCalls === 1) return Promise.resolve(jsonResponse(401, { error: 'expired' }));
            // retry: cuelga y se aborta al iniciarse
            return new Promise<Response>((_, reject) => {
                init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
                controller.abort();
            });
        }));

        const err = await catchError(apiFetch('/x', { signal: controller.signal }));
        expect(isCancel(err)).toBe(true);
        expect(err).toBeInstanceOf(CanceledError);
    });

    it('timeout durante el retry → ApiError kind timeout', async () => {
        seedSession();
        let targetCalls = 0;
        vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
            if (url.includes('/api/auth/refresh')) {
                return Promise.resolve(jsonResponse(200, REFRESH_OK));
            }
            targetCalls++;
            if (targetCalls === 1) return Promise.resolve(jsonResponse(401, { error: 'expired' }));
            // retry: cuelga respetando la señal; el timeout la abortará
            return new Promise<Response>((_, reject) => {
                init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
            });
        }));

        const err = await catchError(apiFetch('/x', { timeout: 20 }));
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).kind).toBe('timeout');
        expect(isCancel(err)).toBe(false);
    });

    it('refresh token expirado (401) → limpia sesión y redirige a /login', async () => {
        seedSession();
        const original = Object.getOwnPropertyDescriptor(window, 'location');
        const replace = vi.fn();
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { pathname: '/dashboard', replace, assign: vi.fn(), href: 'http://localhost/dashboard' },
        });
        try {
            vi.stubGlobal('fetch', vi.fn(async (url: string) => {
                if (url.includes('/api/auth/refresh')) return jsonResponse(401, { error: 'refresh expired' });
                return jsonResponse(401, { error: 'expired' });
            }));

            const err = await catchError(apiFetch('/x'));
            expect(err).toBeInstanceOf(ApiError);
            expect((err as ApiError).status).toBe(401);
            expect(replace).toHaveBeenCalledWith('/login');
            expect(sessionStorage.getItem('auth_access_token')).toBeNull();
            expect(sessionStorage.getItem('auth_refresh_token')).toBeNull();
        } finally {
            if (original) Object.defineProperty(window, 'location', original);
        }
    });

    it('retry con señal ya abortada → CanceledError (no se aplica update)', async () => {
        seedSession();
        const controller = new AbortController();
        let targetCalls = 0;
        vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
            if (url.includes('/api/auth/refresh')) {
                controller.abort(); // el llamador aborta durante el refresh
                return Promise.resolve(jsonResponse(200, REFRESH_OK));
            }
            targetCalls++;
            if (targetCalls === 1) return Promise.resolve(jsonResponse(401, { error: 'expired' }));
            return new Promise<Response>((_, reject) => {
                const s = init?.signal;
                if (s?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
                s?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
            });
        }));

        const err = await catchError(apiFetch('/x', { signal: controller.signal }));
        expect(isCancel(err)).toBe(true);
    });
});
