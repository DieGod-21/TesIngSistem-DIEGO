/**
 * estudiantesService.ts
 *
 * Acceso a /api/estudiantes para listar/buscar estudiantes contra el API real.
 * Reemplaza la lógica legacy de `studentsService.ts` (que asumía semestres y fases).
 */

import { apiGet } from './apiClient';
import { API_PATHS, FETCH_ALL_LIMIT } from '../config/apiConfig';
import { cached, invalidate } from './cache';
import { unwrapEntity, detectTruncation, reportTruncation } from './normalize';
import type { Estudiante } from '../types/api';

export interface EstudiantesPaginatedResponse {
    estudiantes: Estudiante[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface ListEstudiantesParams {
    page?: number;
    limit?: number;
    search?: string;
}

export async function listEstudiantes(
    params: ListEstudiantesParams = {},
    opts: { signal?: AbortSignal } = {},
): Promise<EstudiantesPaginatedResponse> {
    const qs = new URLSearchParams();
    if (params.page)   qs.set('page', String(params.page));
    if (params.limit)  qs.set('limit', String(params.limit));
    if (params.search) qs.set('search', params.search);
    const url = `${API_PATHS.estudiantes.list}${qs.toString() ? `?${qs}` : ''}`;
    const data = await apiGet<EstudiantesPaginatedResponse | Estudiante[]>(url, { signal: opts.signal });
    if (Array.isArray(data)) return { estudiantes: data };
    return data;
}

// ─── Registro compartido (padrón completo, cacheado + deduplicado) ──────────

/** Clave de recurso; `invalidate('estudiantes')` limpia todo el padrón. */
export const ESTUDIANTES_CACHE_KEY = 'estudiantes:registry';

export interface EstudiantesRegistry {
    estudiantes: Estudiante[];
    /** Total declarado por el backend (o el conteo local si no hay metadata). */
    total: number;
    /** true si el padrón podría estar incompleto (ver detectTruncation). */
    isTruncated: boolean;
}

/**
 * Padrón completo de estudiantes, COMPARTIDO entre Listado, Buscador y
 * lookups. Se descarga una sola vez (caché + deduplicación) y se reutiliza
 * mientras esté vigente, eliminando descargas duplicadas.
 *
 * La descarga NO recibe la señal de un consumidor individual: es compartida y
 * no debe cancelarse porque una pantalla se desmonte. Cada consumidor evita
 * renders obsoletos con su propio AbortSignal.
 */
export async function getEstudiantesRegistry(
    opts: { force?: boolean } = {},
): Promise<EstudiantesRegistry> {
    if (opts.force) invalidate(ESTUDIANTES_CACHE_KEY);
    return cached<EstudiantesRegistry>(
        ESTUDIANTES_CACHE_KEY,
        async () => {
            const res = await listEstudiantes({ limit: FETCH_ALL_LIMIT });
            const estudiantes = res.estudiantes ?? [];
            const total = res.pagination?.total ?? estudiantes.length;
            const isTruncated = detectTruncation(estudiantes.length, res.pagination?.total, FETCH_ALL_LIMIT);
            if (isTruncated) reportTruncation(API_PATHS.estudiantes.list, estudiantes.length, res.pagination?.total);
            return { estudiantes, total, isTruncated };
        },
    );
}

/** Invalida el padrón cacheado tras una escritura (alta, edición, import). */
export function invalidateEstudiantes(): void {
    invalidate(ESTUDIANTES_CACHE_KEY);
}

// ─── Lecturas individuales ──────────────────────────────────────────────────

export async function getEstudianteById(
    id: number | string,
    opts: { signal?: AbortSignal } = {},
): Promise<Estudiante> {
    const data = await apiGet<{ estudiante: Estudiante } | Estudiante>(
        API_PATHS.estudiantes.byId(id),
        { signal: opts.signal },
    );
    return unwrapEntity<Estudiante>(data, 'estudiante', API_PATHS.estudiantes.byId(id));
}

export async function getEstudianteByCarnet(
    carnet: string,
    opts: { signal?: AbortSignal } = {},
): Promise<Estudiante> {
    const data = await apiGet<{ estudiante: Estudiante } | Estudiante>(
        API_PATHS.estudiantes.byCarnet(carnet),
        { signal: opts.signal },
    );
    return unwrapEntity<Estudiante>(data, 'estudiante', API_PATHS.estudiantes.byCarnet(carnet));
}
