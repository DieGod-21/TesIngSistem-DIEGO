/**
 * useDashboardData.test.tsx
 *
 * Reproduce el SÍNTOMA de la regresión del panel: bajo StrictMode, React
 * monta → limpia (aborta) → remonta el efecto de carga. Con el defecto
 * (la señal del consumidor llegaba al loader compartido de la caché), el
 * remonte se enganchaba a la promesa abortada del primer montaje y el estado
 * se quedaba en `loading` para siempre: las tarjetas del panel no salían
 * nunca del esqueleto.
 *
 * El test exige lo que la regla del producto promete:
 *     toda carga termina en success | empty | error — nunca en loading.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from './useDashboardData';
import { clear as clearCache } from '../services/cache';
import { CanceledError } from '../services/apiClient';

vi.mock('../services/apiClient', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../services/apiClient')>();
    return { ...actual, apiGet: vi.fn() };
});

import { apiGet } from '../services/apiClient';

const RESUMEN = {
    resumen: {
        total_estudiantes: 21,
        aprobados: 15,
        reprobados: 6,
        porcentaje_aprobacion: 71.4,
        nota_minima_requerida: 70,
    },
};

/**
 * Doble de apiGet con el mismo comportamiento que la red: respeta la señal de
 * aborto si se la pasan (rechaza con CanceledError) y resuelve tras un tick.
 * Es señal-consciente A PROPÓSITO: si el defecto reapareciera —volver a atar
 * la carga compartida a la señal de un consumidor—, este doble lo castigaría
 * exactamente como lo hace fetch, y el test volvería a fallar.
 */
function apiGetComoRed(_path: string, init?: { signal?: AbortSignal }) {
    return new Promise((resolve, reject) => {
        const signal = init?.signal;
        if (signal?.aborted) return reject(new CanceledError());
        signal?.addEventListener('abort', () => reject(new CanceledError()), { once: true });
        setTimeout(() => resolve(RESUMEN), 5);
    });
}

const StrictWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <React.StrictMode>{children}</React.StrictMode>
);

describe('useDashboardData — la carga siempre termina', () => {
    beforeEach(() => {
        clearCache();
        vi.mocked(apiGet).mockReset();
        vi.mocked(apiGet).mockImplementation(apiGetComoRed as never);
    });

    it('bajo StrictMode (montar→abortar→remontar) alcanza success, no loading eterno', async () => {
        const { result } = renderHook(() => useDashboardData(), { wrapper: StrictWrapper });

        await waitFor(() => {
            expect(result.current.summary.status).toBe('success');
        });

        const summary = result.current.summary;
        if (summary.status === 'success') {
            expect(summary.data.kpis.find((k) => k.id === 'kpi-total')?.value).toBe('21');
        }
    });

    it('un fallo real termina en error con mensaje para el usuario, no en loading', async () => {
        vi.mocked(apiGet).mockRejectedValue(new Error('El servidor tuvo un problema.'));

        const { result } = renderHook(() => useDashboardData(), { wrapper: StrictWrapper });

        await waitFor(() => {
            expect(result.current.summary.status).toBe('error');
        });
    });
});
