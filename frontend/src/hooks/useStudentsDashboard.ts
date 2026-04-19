/**
 * useStudentsDashboard.ts
 *
 * Hook de datos para el panel de inicio del dashboard.
 * Delega toda la lógica de API a los servicios — no toca apiFetch ni DTOs directamente.
 */

import { useEffect, useMemo, useState } from 'react';
import { getDashboardSummary, getRecentStudentsSummary } from '../services/dashboardService';
import type { RecentStudent } from '../services/dashboardService';

interface StudentKpis {
    total: number;
    approved: number;
    pending: number;
}

interface DashboardStudentState {
    studentKpis: StudentKpis;
    recentStudents: RecentStudent[];
    error: string | null;
}

export function useStudentsDashboard() {
    const [state, setState] = useState<DashboardStudentState>({
        studentKpis:    { total: 0, approved: 0, pending: 0 },
        recentStudents: [],
        error:          null,
    });

    const [dashStudentQuery, setDashStudentQuery]   = useState('');
    const [dashStatusFilter, setDashStatusFilter]   = useState<'all' | 'approved' | 'pending'>('all');

    useEffect(() => {
        let canceled = false;

        const load = async () => {
            try {
                const [summary, recent] = await Promise.all([
                    getDashboardSummary(),
                    getRecentStudentsSummary(5),
                ]);
                if (!canceled) {
                    const kpis = summary.kpis;
                    const pendingKpi = kpis.find((k) => k.id === 'kpi-pending');
                    const total    = recent.length;
                    const approved = recent.filter((s) => s.approved).length;
                    const pending  = typeof pendingKpi?.value === 'string'
                        ? parseInt(pendingKpi.value, 10) || 0
                        : total - approved;

                    setState({ studentKpis: { total, approved, pending }, recentStudents: recent, error: null });
                }
            } catch (err) {
                if (!canceled) {
                    setState((prev) => ({
                        ...prev,
                        error: err instanceof Error ? err.message : 'Error al cargar datos del dashboard',
                    }));
                }
            }
        };

        load();
        return () => { canceled = true; };
    }, []);

    const filteredRecent = useMemo(() => {
        const q = dashStudentQuery.trim().toLowerCase();
        return state.recentStudents.filter((s) => {
            const matchText = !q ||
                s.nombreCompleto.toLowerCase().includes(q) ||
                s.carnetId.toLowerCase().includes(q);
            const matchStatus =
                dashStatusFilter === 'all' ||
                (dashStatusFilter === 'approved' &&  s.approved) ||
                (dashStatusFilter === 'pending'  && !s.approved);
            return matchText && matchStatus;
        });
    }, [state.recentStudents, dashStudentQuery, dashStatusFilter]);

    return {
        studentKpis:       state.studentKpis,
        recentStudents:    state.recentStudents,
        filteredRecent,
        dashStudentError:  state.error,
        dashStudentQuery,
        setDashStudentQuery,
        dashStatusFilter,
        setDashStatusFilter,
    } as const;
}
