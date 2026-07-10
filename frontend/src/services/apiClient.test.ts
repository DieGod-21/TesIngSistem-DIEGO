import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiFetch, ApiError, CanceledError, isCancel } from './apiClient';

/** Respuesta simulada con la forma mínima que consume apiFetch. */
function jsonResponse(status: number, body: unknown): Response {
    return {
        status,
        ok: status >= 200 && status < 300,
        text: async () => (body == null ? '' : JSON.stringify(body)),
    } as unknown as Response;
}

/** fetch que nunca resuelve pero respeta la señal de aborto (para cancel/timeout). */
function hangingFetch() {
    return vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
        const s = init?.signal ?? undefined;
        const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
        if (s) {
            if (s.aborted) { onAbort(); return; }
            s.addEventListener('abort', onAbort, { once: true });
        }
    }));
}

async function catchError(p: Promise<unknown>): Promise<unknown> {
    try { await p; return null; } catch (e) { return e; }
}

describe('apiClient — clasificación de errores', () => {
    beforeEach(() => { sessionStorage.clear(); });
    afterEach(() => { vi.unstubAllGlobals(); });

    it('422 con errors[] → kind validation, mensaje y lista de validación', async () => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            jsonResponse(422, { errors: ['Correo inválido', 'Contraseña muy corta'] })));

        const err = await catchError(apiFetch('/x', { requireAuth: false }));
        expect(err).toBeInstanceOf(ApiError);
        const api = err as ApiError;
        expect(api.kind).toBe('validation');
        expect(api.errors).toEqual(['Correo inválido', 'Contraseña muy corta']);
        expect(api.message).toContain('Correo inválido');
    });

    it('mapea 403/404/409/429/500/503 a su clasificación', async () => {
        const cases: Array<[number, string]> = [
            [403, 'forbidden'], [404, 'notFound'], [409, 'conflict'],
            [429, 'rateLimited'], [500, 'server'], [503, 'unavailable'],
        ];
        for (const [status, kind] of cases) {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(status, { error: 'x' })));
            const err = await catchError(apiFetch('/x', { requireAuth: false }));
            expect((err as ApiError).kind).toBe(kind);
            expect((err as ApiError).status).toBe(status);
        }
    });

    it('fallo de red (TypeError) → kind offline', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
        const err = await catchError(apiFetch('/x', { requireAuth: false }));
        expect((err as ApiError).kind).toBe('offline');
    });
});

describe('apiClient — cancelación vs timeout', () => {
    beforeEach(() => { sessionStorage.clear(); });
    afterEach(() => { vi.unstubAllGlobals(); });

    it('señal del llamador abortada → CanceledError (no es error de UI)', async () => {
        vi.stubGlobal('fetch', hangingFetch());
        const controller = new AbortController();
        controller.abort();

        const err = await catchError(apiFetch('/x', { requireAuth: false, signal: controller.signal }));
        expect(isCancel(err)).toBe(true);
        expect(err).toBeInstanceOf(CanceledError);
    });

    it('timeout vencido → ApiError kind timeout (no cancelación)', async () => {
        vi.stubGlobal('fetch', hangingFetch());
        const err = await catchError(apiFetch('/x', { requireAuth: false, timeout: 5 }));
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).kind).toBe('timeout');
        expect(isCancel(err)).toBe(false);
    });
});
