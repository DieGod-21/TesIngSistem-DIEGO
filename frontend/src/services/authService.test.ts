import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { verifySession } from './authService';

function jsonResponse(status: number, body: unknown): Response {
    return {
        status,
        ok: status >= 200 && status < 300,
        text: async () => (body == null ? '' : JSON.stringify(body)),
    } as unknown as Response;
}

describe('verifySession — tres estados (la red no destruye la sesión)', () => {
    beforeEach(() => { sessionStorage.clear(); });
    afterEach(() => { vi.unstubAllGlobals(); });

    it('2xx → authenticated con el usuario refrescado', async () => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            jsonResponse(200, { id: 1, nombre: 'Ada Lovelace', email: 'ada@umg.edu.gt', rol: 'admin' })));

        const result = await verifySession();
        expect(result.status).toBe('authenticated');
        if (result.status === 'authenticated') {
            expect(result.user.role).toBe('admin');
            expect(result.user.nombre).toBe('Ada Lovelace');
        }
    });

    it('403 (rechazo explícito) → unauthenticated', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(403, { error: 'Prohibido' })));
        const result = await verifySession();
        expect(result.status).toBe('unauthenticated');
    });

    it('fallo de red → unknown (la sesión se conserva)', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
        const result = await verifySession();
        expect(result.status).toBe('unknown');
    });
});
