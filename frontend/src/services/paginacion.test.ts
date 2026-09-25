/**
 * Listados completos recorridos por páginas.
 *
 * `/api/estudiantes` acepta `limit` ≤ 100 (el servidor recorta lo demás) y
 * `/api/proyectos` devuelve 50 por defecto: pedir «todo» de una vez truncaba
 * sin aviso. Aquí se comprueba que se recorren las páginas y que, si la
 * respuesta no declara paginación, una página llena se reporta como posible
 * truncado en vez de darse por completa.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getEstudiantesRegistry } from './estudiantesService';
import { listProyectos, PROYECTOS_PAGE_SIZE } from './proyectosService';
import * as telemetry from './telemetry';

function jsonResponse(body: unknown): Response {
    return { status: 200, ok: true, text: async () => JSON.stringify(body) } as unknown as Response;
}

const params = (url: string) => new URL(url, 'http://x').searchParams;

describe('paginación de listados completos', () => {
    beforeEach(() => { sessionStorage.clear(); });
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('padrón: pide páginas de 100 y concatena todas', async () => {
        const urls: string[] = [];
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            urls.push(url);
            const page = Number(params(url).get('page'));
            const estudiantes = Array.from({ length: page < 3 ? 100 : 5 }, (_, i) => ({ id: page * 1000 + i }));
            return jsonResponse({ success: true, data: { estudiantes, pagination: { total: 205, page, limit: 100, pages: 3 } } });
        }));

        const reg = await getEstudiantesRegistry({ force: true });

        expect(urls.map((u) => params(u).get('limit'))).toEqual(['100', '100', '100']);
        expect(urls.map((u) => params(u).get('page')).sort()).toEqual(['1', '2', '3']);
        expect(reg.estudiantes).toHaveLength(205);
        expect(reg.total).toBe(205);
        expect(reg.isTruncated).toBe(false);
    });

    it('proyectos: envía page y limit, y recorre las páginas declaradas', async () => {
        const urls: string[] = [];
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            urls.push(url);
            const page = Number(params(url).get('page'));
            const proyectos = Array.from({ length: page === 1 ? 100 : 20 }, (_, i) => ({ id: page * 1000 + i }));
            return jsonResponse({ success: true, data: { proyectos, pagination: { total: 120, page, limit: 100, pages: 2 } } });
        }));

        const lista = await listProyectos({ fase: 'PG2' });

        expect(urls).toHaveLength(2);
        for (const u of urls) {
            expect(params(u).get('limit')).toBe(String(PROYECTOS_PAGE_SIZE));
            expect(params(u).get('fase')).toBe('PG2');
        }
        expect(lista).toHaveLength(120);
    });

    it('proyectos sin paginación declarada: una página llena se reporta como truncada', async () => {
        const reporte = vi.spyOn(telemetry, 'reportError').mockImplementation(() => undefined);
        const proyectos = Array.from({ length: PROYECTOS_PAGE_SIZE }, (_, i) => ({ id: i }));
        vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: true, data: { proyectos } })));

        const lista = await listProyectos();

        expect(lista).toHaveLength(PROYECTOS_PAGE_SIZE);
        expect(reporte).toHaveBeenCalledTimes(1);
        expect(String((reporte.mock.calls[0][0] as Error).message)).toContain('Dataset truncado');
    });

    it('proyectos sin paginación y página incompleta: se da por completo', async () => {
        const reporte = vi.spyOn(telemetry, 'reportError').mockImplementation(() => undefined);
        vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: true, data: { proyectos: [{ id: 1 }] } })));

        expect(await listProyectos()).toHaveLength(1);
        expect(reporte).not.toHaveBeenCalled();
    });
});
