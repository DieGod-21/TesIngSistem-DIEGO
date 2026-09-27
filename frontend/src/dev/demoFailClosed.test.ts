/**
 * demoFailClosed.test.ts — En modo demo, nada de /api sale hacia el servidor real.
 *
 * El doble dejaba pasar al `fetch` original toda ruta que no supiera atender,
 * y en `npm run dev` ese `fetch` va al proxy de Vite, que apunta a PRODUCCIÓN.
 * Quien trabaja en demo cree estar aislado: una ruta nueva sin manejador, o un
 * verbo no previsto, habría escrito en datos reales —con el token real si la
 * pestaña venía de una sesión de verdad—.
 *
 * Archivo propio a propósito: el doble captura el `fetch` original al
 * instalarse, y aquí ese original es un espía que no debe llamarse nunca para
 * /api.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

const real = vi.fn(async () => new Response('{"desde":"servidor-real"}', { status: 200 }));

beforeAll(async () => {
    window.fetch = real as unknown as typeof window.fetch;
    const { installDemoApi } = await import('./demoApi');
    installDemoApi();
});

describe('modo demo — cerrado ante lo que no conoce', () => {
    it('una ruta /api sin manejador responde 501 y NO llega al servidor real', async () => {
        const res = await fetch('/api/estudiantes/buscar?q=ana');
        expect(res.status).toBe(501);
        const cuerpo = await res.json();
        expect(cuerpo.success).toBe(false);
        expect(cuerpo.message).toContain('GET /api/estudiantes/buscar');
        expect(real).not.toHaveBeenCalled();
    });

    it('un verbo no previsto sobre una ruta conocida tampoco se escapa', async () => {
        const res = await fetch('/api/estudiantes/1', { method: 'PATCH' });
        expect(res.status).toBe(501);
        expect(real).not.toHaveBeenCalled();
    });

    it('una URL absoluta a producción también la atiende el doble', async () => {
        const res = await fetch('https://notas.digicom.com.gt/api/ternas/1/evaluadores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: 2, rol: 'vocal' }),
        });
        expect(res.status).toBe(501);
        expect(real).not.toHaveBeenCalled();
    });

    it('lo que no es /api (módulos, fuentes, imágenes) sigue su camino', async () => {
        await fetch('/assets/logo.svg');
        expect(real).toHaveBeenCalledTimes(1);
    });
});
