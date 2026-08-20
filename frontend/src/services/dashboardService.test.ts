/**
 * dashboardService.test.ts
 *
 * REGRESIÓN (commit e5895e5): al envolver el resumen en la caché compartida,
 * `getDashboardSummary` seguía pasando la señal de aborto del consumidor al
 * loader compartido, violando el contrato de cache.ts. Con StrictMode
 * (montar → abortar → remontar), el segundo montaje se enganchaba a la promesa
 * en vuelo ya abortada, recibía CanceledError, el hook la trataba como
 * cancelación propia y el panel quedaba en `loading` para siempre.
 *
 * Estos tests fijan el contrato reparado: el loader compartido es ciego a las
 * señales de los consumidores. La reproducción del síntoma completo (el hook
 * bajo StrictMode) vive en useDashboardData.test.tsx.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardSummary } from './dashboardService';
import { clear as clearCache } from './cache';

vi.mock('./apiClient', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./apiClient')>();
    return { ...actual, apiGet: vi.fn() };
});

import { apiGet } from './apiClient';

const RESUMEN = {
    resumen: {
        total_estudiantes: 21,
        aprobados: 15,
        reprobados: 6,
        porcentaje_aprobacion: 71.4,
        nota_minima_requerida: 70,
    },
};

describe('getDashboardSummary — caché compartida y cancelación', () => {
    beforeEach(() => {
        clearCache();
        vi.mocked(apiGet).mockReset();
        vi.mocked(apiGet).mockResolvedValue(RESUMEN as never);
    });

    it('la petición compartida NO viaja atada a la señal de ningún consumidor', async () => {
        await getDashboardSummary();
        expect(vi.mocked(apiGet)).toHaveBeenCalledTimes(1);
        const init = vi.mocked(apiGet).mock.calls[0][1] as { signal?: AbortSignal } | undefined;
        // Si esto vuelve a fallar, un desmontaje individual puede abortar la
        // carga que comparten todos los consumidores (loading eterno al remontar).
        expect(init?.signal).toBeUndefined();
    });

    it('deduplica: N consumidores simultáneos → una sola petición de red', async () => {
        const [a, b] = await Promise.all([
            getDashboardSummary(),
            getDashboardSummary(),
        ]);
        expect(a.kpis).toEqual(b.kpis);
        expect(vi.mocked(apiGet)).toHaveBeenCalledTimes(1);
    });

    it('deriva los KPIs del resumen real de tesis', async () => {
        const summary = await getDashboardSummary();
        const porId = new Map(summary.kpis.map((k) => [k.id, k]));
        expect(porId.get('kpi-total')?.value).toBe('21');
        expect(porId.get('kpi-approved')?.value).toBe('15');
        expect(porId.get('kpi-pending')?.value).toBe('6');
        expect(porId.get('kpi-completion')?.value).toBe('71%');
    });
});
