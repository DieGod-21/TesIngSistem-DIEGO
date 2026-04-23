/**
 * dashboardService.ts
 *
 * Fuente de datos para el Panel de Control. Sólo endpoints REALES:
 *   - GET /api/tesis/resumen       → KPIs globales
 *   - GET /api/estudiantes         → estudiantes recientes (paginado)
 *   - GET /api/tesis/reprobados    → acciones pendientes (no cumplen tesis)
 */

import { apiGet } from './apiClient';
import { API_PATHS } from '../config/apiConfig';

// Tipos provenientes de los endpoints REALES (Swagger):
//   GET /api/tesis/resumen         → resumen de aprobación global
//   GET /api/estudiantes           → listado paginado
interface TesisResumen {
    total_estudiantes:     number;
    aprobados:             number;
    reprobados:            number;
    porcentaje_aprobacion: number;
    nota_minima_requerida: number;
}

interface TesisResumenResponse {
    resumen: TesisResumen;
}

interface EstudianteApi {
    id:               number;
    carnet:           string;
    nombre:           string;
    email?:           string | null;
    carrera?:         string | null;
    estado_tesis?:    string | null;
    updated_at?:      string | null;
    created_at?:      string | null;
}

interface EstudiantesListResponse {
    estudiantes: EstudianteApi[];
    pagination:  { total: number; page: number; limit: number; pages: number };
}

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
    /** Si está presente, la KPI es clickeable y navega a esta ruta. */
    navigateTo?: string;
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

export interface DashboardSummary {
    kpis: KpiData[];
}

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

// ─── API publica ────────────────────────────────────────────────────

/**
 * Resumen del dashboard construido a partir de GET /api/tesis/resumen.
 * No existe un endpoint /dashboard/summary en el backend; aquí derivamos
 * los KPIs a partir de las estadísticas oficiales de tesis.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
    const { resumen } = await apiGet<TesisResumenResponse>(API_PATHS.tesis.resumen);

    const { total_estudiantes, aprobados, reprobados, porcentaje_aprobacion } = resumen;
    const pending = Math.max(total_estudiantes - aprobados - reprobados, 0);
    const completionPct = Math.round(porcentaje_aprobacion);

    const kpis: KpiData[] = [
        {
            id:            'kpi-total',
            label:         'Estudiantes',
            value:         String(total_estudiantes),
            trend:         '',
            trendPositive: true,
            description:   'Estudiantes registrados en PG1/PG2',
            iconName:      'GraduationCap',
            iconVariant:   'blue',
            navigateTo:    '/students',
        },
        {
            id:            'kpi-approved',
            label:         'Aprueban tesis',
            value:         String(aprobados),
            trend:         '',
            trendPositive: true,
            description:   `Con ambas notas ≥ ${resumen.nota_minima_requerida}`,
            iconName:      'CheckCircle',
            iconVariant:   'blue',
            navigateTo:    '/students?status=approved',
        },
        {
            id:            'kpi-pending',
            label:         'Sin Aprobar',
            value:         String(reprobados + pending),
            trend:         '',
            trendPositive: reprobados + pending === 0,
            description:   'Reprobados o con nota pendiente',
            iconName:      'AlertTriangle',
            iconVariant:   reprobados + pending > 0 ? 'red' : 'blue',
            navigateTo:    '/students?status=failed',
        },
        {
            id:            'kpi-completion',
            label:         'Completación',
            value:         `${completionPct}%`,
            trend:         '',
            trendPositive: true,
            description:   `${aprobados} de ${total_estudiantes} aprobados`,
            iconName:      'CheckCircle',
            iconVariant:   'blue',
            progressValue: completionPct,
        },
    ];

    return { kpis };
}

/**
 * Obtiene los estudiantes más recientes desde GET /api/estudiantes
 * (paginado). El backend no expone un endpoint "recent-students", pero
 * la primera página del listado cumple el mismo propósito.
 */
export async function getRecentStudentsSummary(limit = 5): Promise<RecentStudent[]> {
    const res = await apiGet<EstudiantesListResponse>(
        `${API_PATHS.estudiantes.list}?page=1&limit=${limit}`
    );
    return (res.estudiantes ?? []).map((s) => ({
        id:               String(s.id),
        nombreCompleto:   s.nombre,
        carnetId:         s.carnet,
        approved:         s.estado_tesis === 'aprobado',
        updatedAt:        s.updated_at ?? s.created_at ?? '',
        phaseName:        s.carrera ?? null,
        phaseDescription: s.carrera ?? null,
    }));
}

/**
 * Acciones pendientes = estudiantes que NO aprueban tesis (GET /api/tesis/reprobados).
 * Es lo más cercano a "sin aprobar" que expone el backend real.
 */
export async function getPendingActions(query?: string): Promise<PendingAction[]> {
    interface ReprobadosResp {
        total: number;
        nota_minima: number;
        estudiantes: Array<{
            carnet: string;
            nombre: string;
            nota_grad1: number | null;
            estado_grad1: string;
            nota_grad2: number | null;
            estado_grad2: string;
        }>;
    }

    const { estudiantes } = await apiGet<ReprobadosResp>(API_PATHS.tesis.reprobados);

    const q = query?.trim().toLowerCase() ?? '';
    const filtered = q
        ? estudiantes.filter((s) =>
              s.nombre.toLowerCase().includes(q) || s.carnet.toLowerCase().includes(q),
          )
        : estudiantes;

    return filtered.map((s, i): PendingAction => ({
        id:             s.carnet,
        studentName:    s.nombre,
        studentId:      s.carnet,
        avatarInitials: initials(s.nombre),
        avatarVariant:  AVATAR_VARIANTS[i % AVATAR_VARIANTS.length],
        projectTitle:   `PG1: ${s.nota_grad1 ?? '—'} · PG2: ${s.nota_grad2 ?? '—'}`,
        phase:          [s.estado_grad1, s.estado_grad2].filter(Boolean).join(' · ') || '—',
        actionLabel:    'No cumple requisito de tesis',
        actionVariant:  'warning',
        deadline:       'Sin fecha límite',
        deadlineUrgent: false,
    }));
}
