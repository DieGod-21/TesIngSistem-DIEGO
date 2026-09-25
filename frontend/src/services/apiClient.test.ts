import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiFetch, apiBlob, ApiError, CanceledError, isCancel } from './apiClient';
import { ACCESS_TOKEN_KEY } from '../config/storageKeys';
import { userMessageFor } from './errorMessages';

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

describe('apiBlob — descargas binarias con la misma sesión', () => {
    beforeEach(() => { sessionStorage.clear(); });
    afterEach(() => { vi.unstubAllGlobals(); });

    it('devuelve el binario y adjunta el Bearer', async () => {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, 'tok');
        const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
        const fetchMock = vi.fn(async () => ({ status: 200, ok: true, blob: async () => pdf }) as unknown as Response);
        vi.stubGlobal('fetch', fetchMock);

        const res = await apiBlob('/api/reportes/ternas/1/acta.pdf', { headers: { Accept: 'application/pdf' } });

        expect(res).toBe(pdf);
        const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
        expect(init.method).toBe('GET');
        expect((init.headers as Record<string, string>).Accept).toBe('application/pdf');
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    });

    it('un error JSON del servidor llega clasificado (403 → forbidden)', async () => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            jsonResponse(403, { success: false, message: 'Evaluador no pertenece a esta terna' })));

        const err = await catchError(apiBlob('/api/reportes/ternas/1/acta.pdf'));
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).kind).toBe('forbidden');
        expect((err as ApiError).message).toBe('Evaluador no pertenece a esta terna');
    });
});

/** Respuesta con cuerpo de texto tal cual (HTML de un proxy, texto plano…). */
function textResponse(status: number, text: string): Response {
    return {
        status,
        ok: status >= 200 && status < 300,
        text: async () => text,
    } as unknown as Response;
}

const PAGINA_CADDY = '<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head>'
    + '<body><h1>502 Bad Gateway</h1><p>dial tcp 10.0.1.7:3000: connect: connection refused</p></body></html>';

/**
 * Lo que llega cuando la respuesta NO es de la API: la página de error de
 * Caddy con la API caída, el texto plano de un limitador, o el index.html del
 * frontend servido en lugar de una ruta /api mal enrutada. Nada de eso es un
 * mensaje para quien coordina graduaciones: se muestra el texto por tipo.
 */
describe('apiClient — respuestas que no son de la API', () => {
    beforeEach(() => { sessionStorage.clear(); });
    afterEach(() => { vi.unstubAllGlobals(); });

    it('un 502 con la página HTML del proxy no llega crudo al usuario', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => textResponse(502, PAGINA_CADDY)));
        const err = await catchError(apiFetch('/api/ternas', { requireAuth: false }));

        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).kind).toBe('server');
        const visible = userMessageFor(err);
        expect(visible).toBe('El servidor tuvo un problema. Intenta de nuevo en unos minutos.');
        expect(visible).not.toContain('<');
        expect(visible).not.toContain('10.0.1.7');
    });

    it('un 429 en texto plano se traduce por su tipo', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => textResponse(429, 'Too many requests, please try again later.')));
        const err = await catchError(apiFetch('/api/ternas', { requireAuth: false }));
        expect(userMessageFor(err)).toBe('Demasiadas solicitudes en poco tiempo. Espera un momento y vuelve a intentar.');
    });

    it('el mensaje JSON explícito de la API se sigue respetando', async () => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            jsonResponse(500, { success: false, message: 'No se pudo conectar a la base de datos' })));
        const err = await catchError(apiFetch('/api/ternas', { requireAuth: false }));
        expect(userMessageFor(err)).toBe('No se pudo conectar a la base de datos');
    });

    it('un 200 con HTML no se toma por datos: es un fallo, no una lista vacía', async () => {
        const indexHtml = '<!doctype html><html lang="es"><head><meta charset="UTF-8" /></head><body><div id="root"></div></body></html>';
        vi.stubGlobal('fetch', vi.fn(async () => textResponse(200, indexHtml)));
        const err = await catchError(apiFetch('/api/estudiantes', { requireAuth: false }));

        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).kind).toBe('invalidResponse');
        expect(userMessageFor(err)).toBe('El servidor respondió de forma inesperada. Intenta de nuevo en unos minutos.');
    });

    it('un 200 vacío o JSON sigue siendo un éxito', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => textResponse(200, '')));
        await expect(apiFetch('/api/x', { requireAuth: false })).resolves.toBeNull();
        vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { success: true, data: [] })));
        await expect(apiFetch('/api/x', { requireAuth: false })).resolves.toEqual({ success: true, data: [] });
    });

    it('una descarga que devuelve HTML en lugar del PDF es un fallo', async () => {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, 'tok');
        const html = new Blob(['<html></html>'], { type: 'text/html; charset=utf-8' });
        vi.stubGlobal('fetch', vi.fn(async () =>
            ({ status: 200, ok: true, blob: async () => html }) as unknown as Response));
        const err = await catchError(apiBlob('/api/reportes/ternas/1/acta.pdf'));
        expect((err as ApiError).kind).toBe('invalidResponse');
    });
});
