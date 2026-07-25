/**
 * reportesService.ts
 *
 * Acceso a /api/reportes/* (solo admin).
 * El backend a veces devuelve la carga como raíz (`{ resumen, ternas }`)
 * y a veces anidada bajo `reporte`. Aquí normalizamos ambas variantes.
 */

import { apiGet } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import { cached, invalidate } from './cache';
import { unwrapEntity } from './normalize';
import type { ReporteTernasGlobal, ResolucionTerna, ReporteEstudiante } from '../types/api';

export async function getGlobalTernasReport(opts: { signal?: AbortSignal } = {}): Promise<ReporteTernasGlobal> {
    const raw = await apiGet<unknown>(API_PATHS.reportes.ternas, { signal: opts.signal });
    return normalizeGlobal(raw);
}

// ─── Reporte global cacheado (dueño de la caché de reportes) ────────────────
// Mismo patrón que tesis/estudiantes: el servicio POSEE su caché y expone la
// invalidación. Las mutaciones de evaluación (que cambian la resolución) la
// invalidan desde ternasService.

export const REPORTES_CACHE_PREFIX = 'reportes';
export const REPORTES_TERNAS_GLOBAL_KEY = 'reportes:ternas-global';
const REPORTES_TTL_MS = 60_000;

/** Reporte global de ternas, cacheado + deduplicado (consumidores en lote). */
export function getGlobalTernasReportCached(): Promise<ReporteTernasGlobal> {
    return cached(REPORTES_TERNAS_GLOBAL_KEY, () => getGlobalTernasReport(), REPORTES_TTL_MS);
}

/** Invalida el reporte global tras una escritura que cambie una resolución. */
export function invalidateReportes(): void {
    invalidate(REPORTES_CACHE_PREFIX);
}

function normalizeGlobal(raw: unknown): ReporteTernasGlobal {
    // Envolturas posibles: { reporte: {...} } o { data: {...} } o directo.
    // `unwrapEntity` desenvuelve la clave semántica y reporta formas no-objeto.
    const withReporte = unwrapEntity<Record<string, unknown>>(raw, 'reporte', API_PATHS.reportes.ternas);
    const src = (withReporte && typeof withReporte === 'object' && withReporte.data && typeof withReporte.data === 'object')
        ? withReporte.data as Record<string, unknown>
        : (withReporte && typeof withReporte === 'object' ? withReporte : {});

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

export async function getReporteEstudiante(carnet: string, opts: { signal?: AbortSignal } = {}): Promise<ReporteEstudiante> {
    return apiGet<ReporteEstudiante>(API_PATHS.reportes.estudiante(carnet), { signal: opts.signal });
}

export async function getTernaReport(id: number, opts: { signal?: AbortSignal } = {}): Promise<ReporteTernaDetalle> {
    const raw = await apiGet<unknown>(API_PATHS.reportes.ternaById(id), { signal: opts.signal });
    return unwrapEntity<ReporteTernaDetalle>(raw, 'reporte', API_PATHS.reportes.ternaById(id));
}
