/**
 * dashboardService.ts
 *
 * Fuente de datos para el Panel de Control. Sólo endpoints REALES:
 *   - GET /api/tesis/resumen → KPIs globales
 *
 * El "trabajo pendiente" NO se pide aquí: el Dashboard consume la misma cola
 * priorizada del workspace (`deriveWorkQueue`), que es la única con
 * priorización, envejecimiento y política de permisos.
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

export interface DashboardSummary {
    kpis: KpiData[];
}

// ─── API publica ────────────────────────────────────────────────────

/**
 * Resumen del dashboard construido a partir de GET /api/tesis/resumen.
 * No existe un endpoint /dashboard/summary en el backend; aquí derivamos
 * los KPIs a partir de las estadísticas oficiales de tesis.
 */
export async function getDashboardSummary(opts: { signal?: AbortSignal } = {}): Promise<DashboardSummary> {
    const { resumen } = await apiGet<TesisResumenResponse>(API_PATHS.tesis.resumen, { signal: opts.signal });

    const { total_estudiantes, aprobados, reprobados, porcentaje_aprobacion } = resumen;
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
            /*
             * Cuenta EXACTAMENTE los reprobados, que es lo que hay detrás de
             * `?status=failed`. Antes sumaba un `pending` calculado como
             * `total_estudiantes − aprobados − reprobados`, que por definición
             * del endpoint vale siempre cero: `total_estudiantes` ES la suma de
             * los otros dos. Aquella aritmética no añadía a nadie y a cambio la
             * descripción prometía incluir «con nota pendiente», gente que la
             * tarjeta nunca contó y que el destino tampoco muestra.
             */
            id:            'kpi-pending',
            label:         'Sin Aprobar',
            value:         String(reprobados),
            trend:         '',
            trendPositive: reprobados === 0,
            description:   `No alcanzan la nota mínima de ${resumen.nota_minima_requerida}`,
            iconName:      'AlertTriangle',
            iconVariant:   reprobados > 0 ? 'red' : 'blue',
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
