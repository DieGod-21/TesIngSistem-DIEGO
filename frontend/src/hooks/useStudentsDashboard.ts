/**
 * useStudentsDashboard.ts
 *
 * Hook que encapsula la logica de datos de estudiantes
 * usada en el panel de inicio del dashboard:
 *   - KPIs desde GET /api/dashboard/summary (backend)
 *   - Estudiantes recientes desde GET /api/dashboard/recent-students
 *   - Filtrado rapido (busqueda + estado)
 *
 * Ya NO descarga todos los estudiantes al frontend.
 */

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../services/apiClient';
import { getRecentStudentsSummary } from '../services/dashboardService';
import type { RecentStudent } from '../services/dashboardService';

interface StudentKpis {
    total: number;
    approved: number;
    pending: number;
}

/** Estudiante reciente mapeado a formato del UI */
interface RecentStudentUI {
    id: string;
    nombreCompleto: string;
    carnetId: string;
    approved: boolean;
    updatedAt: string;
    phaseName: string | null;
    phaseDescription: string | null;
    faseAcademica: string;
}

/** Respuesta del backend GET /api/dashboard/summary */
interface BackendSummary {
    total: number;
    approved: number;
    pending: number;
    completionPct: number;
    byPhase: Array<{ phase_id: number; phase_name: string; phase_description: string; count: number }>;
}

function mapRecentStudent(s: RecentStudent): RecentStudentUI {
    return {
        id:               s.id,
        nombreCompleto:   s.nombre_completo,
        carnetId:         s.carnet_id,
        approved:         s.approved,
        updatedAt:        s.updated_at,
        phaseName:        s.phase_name,
        phaseDescription: s.phase_description,
        faseAcademica:    s.phase_name ?? '',
    };
}

export function useStudentsDashboard() {
    const [studentKpis, setStudentKpis] = useState<StudentKpis>({ total: 0, approved: 0, pending: 0 });
    const [recentStudents, setRecentStudents] = useState<RecentStudentUI[]>([]);

    // Filtros del panel de actividad reciente
    const [dashStudentQuery, setDashStudentQuery] = useState('');
    const [dashStatusFilter, setDashStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');

    // ── Carga inicial (async) ─────────────────────────────────────────

    useEffect(() => {
        let canceled = false;

        const load = async () => {
            const [summary, recent] = await Promise.all([
                apiFetch<BackendSummary>('/dashboard/summary'),
                getRecentStudentsSummary(5),
            ]);
            if (!canceled) {
                setStudentKpis({
                    total:    summary.total,
                    approved: summary.approved,
                    pending:  summary.pending,
                });
                setRecentStudents(recent.map(mapRecentStudent));
            }
        };

        load();
        return () => { canceled = true; };
    }, []);

    // ── Actividad reciente filtrada ──────────────────────────────────

    const filteredRecent = useMemo(() => {
        const q = dashStudentQuery.trim().toLowerCase();
        return recentStudents.filter((s) => {
            const matchText = !q ||
                s.nombreCompleto.toLowerCase().includes(q) ||
                s.carnetId.toLowerCase().includes(q);
            const matchStatus =
                dashStatusFilter === 'all' ||
                (dashStatusFilter === 'approved' && s.approved) ||
                (dashStatusFilter === 'pending' && !s.approved);
            return matchText && matchStatus;
        });
    }, [recentStudents, dashStudentQuery, dashStatusFilter]);

    return {
        studentKpis,
        recentStudents,
        filteredRecent,
        dashStudentQuery,
        setDashStudentQuery,
        dashStatusFilter,
        setDashStatusFilter,
    } as const;
}
