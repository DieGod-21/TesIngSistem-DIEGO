/**
 * useDashboardData.ts
 *
 * Hook que encapsula la obtención de datos del dashboard:
 *   - Summary (KPIs) desde dashboardService
 *
 * El "trabajo pendiente" ya NO se carga aquí: el Dashboard consume la misma
 * cola priorizada que el workspace (`useStudentsPipeline` → `deriveWorkQueue`).
 * Antes existían dos respuestas distintas a "¿qué hago ahora?", con fuentes,
 * orden y acciones diferentes; se conservó la del dominio, que es la única con
 * priorización, envejecimiento, tipos de trabajo y política de permisos.
 *
 * Separa la lógica de datos de la presentación (DashboardPage).
 * Testeable unitariamente sin renderizar componentes.
 */

import { useCallback, useEffect, useState } from 'react';
import { getDashboardSummary } from '../services/dashboardService';
import { isCancel } from '../services/apiClient';
import { userMessageFor } from '../services/errorMessages';
import type { DashboardSummary } from '../services/dashboardService';
import type { AsyncState } from '../types/async';

export function useDashboardData() {
    const [summary, setSummary] = useState<AsyncState<DashboardSummary>>({ status: 'idle' });

    // ── Carga de resumen ─────────────────────────────────────────────

    const loadSummary = useCallback(async (signal?: AbortSignal) => {
        setSummary({ status: 'loading' });
        try {
            const data = await getDashboardSummary({ signal });
            if (signal?.aborted) return;
            setSummary({ status: 'success', data });
        } catch (err) {
            if (signal?.aborted || isCancel(err)) return;
            setSummary({
                status: 'error',
                message: userMessageFor(err),
            });
        }
    }, []);

    // ── Carga inicial ────────────────────────────────────────────────
    // Se cancela por su cuenta al navegar.

    useEffect(() => {
        const controller = new AbortController();
        loadSummary(controller.signal);
        return () => controller.abort();
    }, [loadSummary]);

    return { summary, loadSummary } as const;
}
