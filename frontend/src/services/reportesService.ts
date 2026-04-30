/**
 * reportesService.ts
 *
 * Acceso a /api/reportes/* (solo admin).
 * El backend a veces devuelve la carga como raíz (`{ resumen, ternas }`)
 * y a veces anidada bajo `reporte`. Aquí normalizamos ambas variantes.
 */

import { apiGet } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import type { ReporteTernasGlobal, ResolucionTerna, ReporteEstudiante } from '../types/api';

export async function getGlobalTernasReport(): Promise<ReporteTernasGlobal> {
    const raw = await apiGet<unknown>(API_PATHS.reportes.ternas);
    return normalizeGlobal(raw);
}

function normalizeGlobal(raw: unknown): ReporteTernasGlobal {
    const obj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
    // Posibles envolturas: { reporte: {...} } o { data: {...} } o directo.
    const src = (obj.reporte && typeof obj.reporte === 'object')
        ? obj.reporte as Record<string, unknown>
        : (obj.data && typeof obj.data === 'object')
            ? obj.data as Record<string, unknown>
            : obj;

    const resumen = (src.resumen && typeof src.resumen === 'object')
        ? src.resumen as ReporteTernasGlobal['resumen']
        : { total: 0, aprueba_tesis: 0, aprueba_curso: 0, reprobados: 0, pendientes: 0 };

    const ternas = Array.isArray(src.ternas)
        ? (src.ternas as ReporteTernasGlobal['ternas'])
        : [];

    return { resumen, ternas };
}

export interface ReporteTernaDetalleEvaluador {
    nombre: string;
    calificacion: number | string | null;
    comentarios: string | null;
    estado: 'borrador' | 'enviada' | string;
}

export interface ReporteTernaDetalle {
    terna_id: number;
    numero: number;
    estado: string;
    proyecto: {
        titulo: string;
        fase?: 'PG1' | 'PG2' | string;
    };
    estudiante: {
        carnet: string;
        nombre: string;
        email?: string;
    };
    evaluadores: ReporteTernaDetalleEvaluador[];
    resultado: {
        promedio: number | string | null;
        resolucion: ResolucionTerna;
        total_evaluadores: number;
        evaluaciones_enviadas: number;
    };
    razon?: string;
}

export async function getReporteEstudiante(carnet: string): Promise<ReporteEstudiante> {
    return apiGet<ReporteEstudiante>(API_PATHS.reportes.estudiante(carnet));
}

export async function getTernaReport(id: number): Promise<ReporteTernaDetalle> {
    const raw = await apiGet<unknown>(API_PATHS.reportes.ternaById(id));
    const obj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
    const src = (obj.reporte && typeof obj.reporte === 'object')
        ? obj.reporte as Record<string, unknown>
        : obj;
    return src as unknown as ReporteTernaDetalle;
}
