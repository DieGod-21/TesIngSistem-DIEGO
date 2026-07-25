/**
 * tesisService.ts
 *
 * Acceso a /api/tesis/* — listados oficiales de aprobación/reprobación
 * de tesis (PG1+PG2). Reutilizado por el filtro del listado de
 * estudiantes al llegar desde las KPI clicables del dashboard.
 */

import { apiGet } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import { cached, invalidate } from './cache';
import type { EstadoTesis } from '../types/api';

export interface TesisEstudiante {
    carnet: string;
    nombre: string;
    email?: string | null;
    nota_grad1: number | null;
    nota_grad2: number | null;
    estado_grad1?: string | null;
    estado_grad2?: string | null;
}

interface TesisListResp {
    total: number;
    nota_minima: number;
    estudiantes: TesisEstudiante[];
}

/** GET /api/tesis/aprobados — estudiantes que aprueban tesis. */
export async function getAprobadosTesis(opts: { signal?: AbortSignal } = {}): Promise<TesisListResp> {
    const data = await apiGet<TesisListResp>(API_PATHS.tesis.aprobados, { signal: opts.signal });
    return normalize(data);
}

/** GET /api/tesis/reprobados — estudiantes que no cumplen con tesis. */
export async function getReprobadosTesis(opts: { signal?: AbortSignal } = {}): Promise<TesisListResp> {
    const data = await apiGet<TesisListResp>(API_PATHS.tesis.reprobados, { signal: opts.signal });
    return normalize(data);
}

// ─── Listas oficiales cacheadas (dueño de la caché de tesis) ────────────────
// Mismo patrón que estudiantesService: el servicio POSEE su caché y expone la
// invalidación. Las escrituras que cambian la elegibilidad (registro de nota)
// llaman `invalidateTesis()` para que la próxima lectura vuelva al origen.

/** Prefijo de recurso; `invalidate('tesis')` limpia aprobados + reprobados. */
export const TESIS_CACHE_PREFIX = 'tesis';
export const TESIS_APROBADOS_KEY = 'tesis:aprobados';
export const TESIS_REPROBADOS_KEY = 'tesis:reprobados';

/** Aprobados de tesis, cacheado + deduplicado (TTL por defecto de la caché). */
export function getAprobadosTesisCached(): Promise<TesisListResp> {
    return cached(TESIS_APROBADOS_KEY, () => getAprobadosTesis());
}

/** Reprobados de tesis, cacheado + deduplicado (TTL por defecto de la caché). */
export function getReprobadosTesisCached(): Promise<TesisListResp> {
    return cached(TESIS_REPROBADOS_KEY, () => getReprobadosTesis());
}

/** Invalida las listas de tesis tras una escritura que cambie la elegibilidad. */
export function invalidateTesis(): void {
    invalidate(TESIS_CACHE_PREFIX);
}

/** GET /api/tesis/estado/{carnet} — estado de tesis calculado por el servidor. */
export async function getTesisEstadoByCarnet(carnet: string, opts: { signal?: AbortSignal } = {}): Promise<EstadoTesis> {
    return apiGet<EstadoTesis>(API_PATHS.tesis.byCarnet(carnet), { signal: opts.signal });
}

function normalize(d: Partial<TesisListResp> | null | undefined): TesisListResp {
    return {
        total:        d?.total ?? 0,
        nota_minima:  d?.nota_minima ?? 0,
        estudiantes:  d?.estudiantes ?? [],
    };
}
