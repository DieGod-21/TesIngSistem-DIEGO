/**
 * dashboardService.ts
 *
 * Fuente de datos para el Panel de Control.
 * - KPIs: desde GET /api/dashboard/summary (agregaciones SQL en backend)
 * - Estudiantes recientes: desde GET /api/dashboard/recent-students
 * - Acciones pendientes: estudiantes sin aprobar (approved = false)
 * - Deadlines: estaticos (el backend tiene /api/deadlines pero sin datos semilla definidos)
 * - Recursos: estaticos
 *
 * Universidad Mariano Galvez — Coordinacion de Proyecto de Graduacion
 */

import { apiFetch } from './apiClient';
import type { BackendStudent } from '../types/student';

// ─── Interfaces ────────────────────────────────────────────────────

export interface KpiData {
    id: string;
    label: string;
    value: string;
    trend: string;
    trendPositive: boolean;
    description: string;
    iconName: string;
    iconVariant: 'blue' | 'red';
    progressValue?: number;
}

export interface PendingAction {
    id: string;
    studentName: string;
    studentId: string;
    avatarInitials: string;
    avatarVariant: 'blue' | 'green' | 'slate';
    projectTitle: string;
    phase: string;
    actionLabel: string;
    actionVariant: 'danger' | 'warning' | 'urgent';
    deadline: string;
    deadlineUrgent?: boolean;
}

export interface Deadline {
    id: string;
    month: string;
    day: string;
    title: string;
    subtitle: string;
}

export interface FacultyResource {
    id: string;
    label: string;
    iconName: string;
    href: string;
}

export interface DashboardSummary {
    kpis: KpiData[];
    deadlines: Deadline[];
    resources: FacultyResource[];
}

/** Respuesta del backend GET /api/dashboard/summary */
interface BackendSummary {
    total: number;
    approved: number;
    pending: number;
    completionPct: number;
    byPhase: Array<{
        phase_id: number;
        phase_name: string;
        phase_description: string;
        count: number;
    }>;
}

/** Respuesta del backend GET /api/dashboard/recent-students */
export interface RecentStudent {
    id: string;
    nombre_completo: string;
    carnet_id: string;
    approved: boolean;
    updated_at: string;
    phase_name: string;
    phase_description: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

function initials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
}

const AVATAR_VARIANTS: Array<'blue' | 'green' | 'slate'> = ['blue', 'green', 'slate'];

// ─── Datos estaticos ────────────────────────────────────────────────

const STATIC_DEADLINES: Deadline[] = [
    {
        id: 'dl-1',
        month: 'Abr',
        day: '15',
        title: 'Revisión de Anteproyectos',
        subtitle: 'Fase Anteproyecto — Primer Semestre 2026',
    },
    {
        id: 'dl-2',
        month: 'May',
        day: '09',
        title: 'Entrega de Capítulos I-III',
        subtitle: 'Tesis — Estudiantes con Asesor Asignado',
    },
    {
        id: 'dl-3',
        month: 'Jun',
        day: '20',
        title: 'Defensas Privadas',
        subtitle: 'Salón B-102 — Fase Final de Graduación',
    },
];

const currentYear = new Date().getFullYear();
const STATIC_RESOURCES: FacultyResource[] = [
    { id: 'res-1', label: `Guía Normativa ${currentYear}`, iconName: 'Download', href: '#' },
    { id: 'res-2', label: 'Plantillas LaTeX / Word',        iconName: 'File',     href: '#' },
    { id: 'res-3', label: 'Repositorio Institucional',      iconName: 'Link',     href: '#' },
];

// ─── API publica ────────────────────────────────────────────────────

/**
 * Obtiene el resumen del dashboard.
 * Los KPIs se calculan en el backend con SQL (COUNT, GROUP BY).
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
    const summary = await apiFetch<BackendSummary>('/dashboard/summary');

    const { total, approved, pending, completionPct, byPhase } = summary;

    const phaseKpis: KpiData[] = byPhase.map((p) => ({
        id:            `kpi-phase-${p.phase_id}`,
        label:         p.phase_description || p.phase_name,
        value:         String(p.count),
        trend:         '',
        trendPositive: true,
        description:   `Estudiantes en ${p.phase_description || p.phase_name}`,
        iconName:      'GraduationCap',
        iconVariant:   'blue' as const,
    }));

    const kpis: KpiData[] = [
        ...phaseKpis,
        {
            id:            'kpi-pending',
            label:         'Sin Aprobar',
            value:         String(pending),
            trend:         '',
            trendPositive: pending === 0,
            description:   'Expedientes pendientes de revisión',
            iconName:      'AlertTriangle',
            iconVariant:   pending > 0 ? 'red' : 'blue',
        },
        {
            id:            'kpi-completion',
            label:         'Completación',
            value:         `${completionPct}%`,
            trend:         '',
            trendPositive: true,
            description:   `${approved} de ${total} aprobados`,
            iconName:      'CheckCircle',
            iconVariant:   'blue',
            progressValue: completionPct,
        },
    ];

    return {
        kpis,
        deadlines: STATIC_DEADLINES,
        resources: STATIC_RESOURCES,
    };
}

/**
 * Obtiene los estudiantes mas recientes desde el backend.
 */
export async function getRecentStudentsSummary(limit = 5): Promise<RecentStudent[]> {
    return apiFetch<RecentStudent[]>(`/dashboard/recent-students?limit=${limit}`);
}

/**
 * Devuelve estudiantes sin aprobar como acciones pendientes.
 * Filtra opcionalmente por query.
 */
export async function getPendingActions(query?: string): Promise<PendingAction[]> {
    const params = new URLSearchParams({ approved: 'false', limit: '50' });
    if (query?.trim()) params.set('search', query.trim());

    const response = await apiFetch<{ data: BackendStudent[]; pagination: unknown }>(`/students?${params}`);
    const students = Array.isArray(response) ? response : response.data;

    return students
        .map((s, i): PendingAction => ({
            id:            s.id,
            studentName:   s.nombre_completo,
            studentId:     s.carnet_id,
            avatarInitials: initials(s.nombre_completo),
            avatarVariant: AVATAR_VARIANTS[i % AVATAR_VARIANTS.length],
            projectTitle:  s.correo_institucional,
            phase:         s.phase_description ?? s.phase_name ?? s.fase_academica ?? '—',
            actionLabel:   'Pendiente de aprobación',
            actionVariant: 'warning',
            deadline:      'Sin fecha límite',
            deadlineUrgent: false,
        }));
}
