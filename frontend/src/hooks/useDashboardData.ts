/**
 * useDashboardData.ts
 *
 * Hook que encapsula la obtención de datos del dashboard:
 *   - Summary (KPIs, deadlines, resources) desde dashboardService
 *   - Pending Actions (tabla de expedientes) desde dashboardService
 *
 * Separa la lógica de datos de la presentación (DashboardPage).
 * Testeable unitariamente sin renderizar componentes.
 */

import { useCallback, useEffect, useState } from 'react';
import { getDashboardSummary, getPendingActions } from '../services/dashboardService';
import { isCancel } from '../services/apiClient';
import type { DashboardSummary, PendingAction } from '../services/dashboardService';
import type { AsyncState } from '../types/async';

export function useDashboardData() {
    const [summary, setSummary] = useState<AsyncState<DashboardSummary>>({ status: 'idle' });
    const [tableState, setTableState] = useState<AsyncState<PendingAction[]>>({ status: 'loading' });
    const [searchQuery, setSearchQuery] = useState('');

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
                message: err instanceof Error ? err.message : 'Error al cargar datos',
            });
        }
    }, []);

    // ── Carga de acciones pendientes ─────────────────────────────────

    const loadActions = useCallback(async (query: string, signal?: AbortSignal) => {
        setTableState({ status: 'loading' });
        try {
            const data = await getPendingActions(query, { signal });
            if (signal?.aborted) return;
            setTableState({ status: 'success', data });
        } catch (err) {
            if (signal?.aborted || isCancel(err)) return;
            setTableState({
                status: 'error',
                message: err instanceof Error ? err.message : 'Error al cargar expedientes',
            });
        }
    }, []);

    // ── Efectos de carga inicial ─────────────────────────────────────
    // Resumen y expedientes son independientes → se cargan concurrentemente
    // (efectos separados). Cada uno se cancela por su cuenta al navegar.

    useEffect(() => {
        const controller = new AbortController();
        loadSummary(controller.signal);
        return () => controller.abort();
    }, [loadSummary]);

    useEffect(() => {
        const controller = new AbortController();
        loadActions(searchQuery, controller.signal);
        return () => controller.abort();
    }, [searchQuery, loadActions]);

    // ── Handler para búsqueda ────────────────────────────────────────

    const handleSearch = useCallback((q: string) => setSearchQuery(q), []);

    return {
        summary,
        tableState,
        searchQuery,
        loadSummary,
        loadActions,
        handleSearch,
    } as const;
}
