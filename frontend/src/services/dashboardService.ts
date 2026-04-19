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
import { API_PATHS } from '../config/apiConfig';
import { FALLBACK_DEADLINES, FALLBACK_RESOURCES } from '../config/staticData';
import { adaptDashboardSummary } from '../adapters/dashboardAdapter';
import { adaptStudent } from '../adapters/studentAdapter';
import type { DashboardSummaryDTO, StudentDTO } from '../types/dto';

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

// BackendSummary movida a types/dto.ts como DashboardSummaryDTO

/** Modelo interno para estudiante reciente (camelCase, sin snake_case) */
export interface RecentStudent {
    id: string;
    nombreCompleto: string;
    carnetId: string;
    approved: boolean;
    updatedAt: string;
    phaseName: string | null;
    phaseDescription: string | null;
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

// Datos temporales movidos a config/staticData.ts

// ─── API publica ────────────────────────────────────────────────────

/**
 * Obtiene el resumen del dashboard.
 * Los KPIs se calculan en el backend con SQL (COUNT, GROUP BY).
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
    const dto = await apiFetch<DashboardSummaryDTO>(API_PATHS.dashboard.summary);
    const summary = adaptDashboardSummary(dto);
    return {
        ...summary,
        deadlines: FALLBACK_DEADLINES,
        resources: FALLBACK_RESOURCES,
    };
}

/**
 * Obtiene los estudiantes mas recientes desde el backend.
 */
export async function getRecentStudentsSummary(limit = 5): Promise<RecentStudent[]> {
    const dtos = await apiFetch<import('../types/dto').RecentStudentDTO[]>(
        `${API_PATHS.dashboard.recentStudents}?limit=${limit}`
    );
    return dtos.map((s) => ({
        id:               s.id,
        nombreCompleto:   s.nombre_completo,
        carnetId:         s.carnet_id,
        approved:         s.approved,
        updatedAt:        s.updated_at,
        phaseName:        s.phase_name  ?? null,
        phaseDescription: s.phase_description ?? null,
    }));
}

/**
 * Devuelve estudiantes sin aprobar como acciones pendientes.
 * Filtra opcionalmente por query.
 */
export async function getPendingActions(query?: string): Promise<PendingAction[]> {
    const params = new URLSearchParams({ approved: 'false', limit: '50' });
    if (query?.trim()) params.set('search', query.trim());

    const response = await apiFetch<{ data: StudentDTO[]; pagination: unknown } | StudentDTO[]>(`${API_PATHS.students.list}?${params}`);
    const dtos = Array.isArray(response) ? response : (response?.data ?? []);

    return dtos.map(adaptStudent).map((s, i): PendingAction => ({
        id:             s.id,
        studentName:    s.nombreCompleto,
        studentId:      s.carnetId,
        avatarInitials: initials(s.nombreCompleto),
        avatarVariant:  AVATAR_VARIANTS[i % AVATAR_VARIANTS.length],
        projectTitle:   s.correoInstitucional,
        phase:          s.phaseDescription ?? s.phaseName ?? s.faseAcademica ?? '—',
        actionLabel:    'Pendiente de aprobación',
        actionVariant:  'warning',
        deadline:       'Sin fecha límite',
        deadlineUrgent: false,
    }));
}
