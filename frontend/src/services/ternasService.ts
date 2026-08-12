/**
 * ternasService.ts
 *
 * Acceso al módulo de Ternas:
 *   - Listado (filtrado por usuario autenticado)
 *   - Detalle con evaluadores y resultado
 *   - Guardar borrador, enviar evaluación, reabrir (admin)
 */

import { apiGet, apiPost } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import { cached, invalidate } from './cache';
import { invalidateReportes } from './reportesService';
import { unwrapEntity, unwrapCollection } from './normalize';
import type { TernaResumen, TernaDetalle, EstadoTerna } from '../types/api';

interface TernasListEnvelope {
    ternas?: TernaResumen[];
    data?: TernaResumen[];
}

/**
 * Lista las ternas. Backend filtra por rol (admin → todas, evaluador → asignadas).
 */
export async function listTernas(estado?: EstadoTerna, opts: { signal?: AbortSignal } = {}): Promise<TernaResumen[]> {
    const qs = estado ? `?estado=${estado}` : '';
    const url = `${API_PATHS.ternas.list}${qs}`;
    const data = await apiGet<TernaResumen[] | TernasListEnvelope>(url, { signal: opts.signal });
    return unwrapCollection<TernaResumen>(data, ['ternas', 'data'], url);
}

// ─── Listado completo cacheado (dueño de la caché de ternas) ────────────────
// El servicio POSEE su caché; las mutaciones de evaluación la invalidan (y con
// ella el reporte global, del que deriva la resolución).

export const TERNAS_CACHE_PREFIX = 'ternas';
export const TERNAS_LIST_KEY = 'ternas:list';

/** Listado completo de ternas (sin filtro), cacheado + deduplicado (TTL por defecto). */
export function listTernasCached(): Promise<TernaResumen[]> {
    return cached(TERNAS_LIST_KEY, () => listTernas());
}

/** Invalida el listado de ternas tras una escritura de evaluación. */
export function invalidateTernas(): void {
    invalidate(TERNAS_CACHE_PREFIX);
}

// ─── Alta de terna ──────────────────────────────────────────────────────────

/** Mínimo y máximo de evaluadores que el contrato acepta en el alta. */
export const TERNA_MIN_EVALUADORES = 2;
export const TERNA_MAX_EVALUADORES = 3;

export interface CreateTernaDto {
    /** Número visible de la terna. */
    numero: number;
    /** Proyecto sobre el que se evalúa. La terna no se crea contra el estudiante. */
    proyectoId: number;
    /** Entre 2 y 3 evaluadores, por contrato. */
    evaluadoresIds: number[];
    /** Opcional, formato `YYYY-MM-DD`. */
    fechaEvaluacion?: string;
}

/**
 * Crea una terna y le asigna sus evaluadores en una sola operación (solo admin).
 *
 * Es la operación que pone en marcha todo lo demás: sin terna no hay
 * evaluaciones que enviar, ni resolución que reportar. Invalida el listado y el
 * reporte global porque ambos ganan una fila.
 */
export async function createTerna(dto: CreateTernaDto) {
    const res = await apiPost<unknown>(API_PATHS.ternas.list, dto);
    invalidateTernas();
    invalidateReportes();
    return res;
}

/** Detalle de una terna con evaluadores y resultado ponderado. */
export async function getTernaById(id: number, opts: { signal?: AbortSignal } = {}): Promise<TernaDetalle> {
    const data = await apiGet<{ terna: TernaDetalle } | TernaDetalle>(API_PATHS.ternas.byId(id), { signal: opts.signal });
    return unwrapEntity<TernaDetalle>(data, 'terna', API_PATHS.ternas.byId(id));
}

export interface EvaluacionPayload {
    calificacion: number;
    comentarios?: string | null;
}

/**
 * Guarda borrador (puede llamarse múltiples veces). No invalida caché: un
 * borrador no altera los campos en lote (evaluaciones_enviadas / estado /
 * resolución) que consume el workspace.
 */
export async function saveDraft(ternaId: number, payload: Partial<EvaluacionPayload>) {
    return apiPost<unknown>(API_PATHS.ternas.draft(ternaId), payload);
}

/** Envía evaluación final (irreversible salvo reapertura por admin). */
export async function submitEvaluation(ternaId: number, payload: EvaluacionPayload) {
    const res = await apiPost<unknown>(API_PATHS.ternas.submit(ternaId), payload);
    // Cambia evaluaciones_enviadas / estado / resolución → invalidar ternas + reporte.
    invalidateTernas();
    invalidateReportes();
    return res;
}

/** Reabre la evaluación de un evaluador (solo admin). */
export async function reopenEvaluation(ternaId: number, evaluadorId: number) {
    const res = await apiPost<unknown>(API_PATHS.ternas.reopen(ternaId), { evaluadorId });
    // Cambia el estado/avance de la terna → invalidar ternas + reporte.
    invalidateTernas();
    invalidateReportes();
    return res;
}
