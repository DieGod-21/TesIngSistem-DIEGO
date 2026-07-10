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

/** Detalle de una terna con evaluadores y resultado ponderado. */
export async function getTernaById(id: number, opts: { signal?: AbortSignal } = {}): Promise<TernaDetalle> {
    const data = await apiGet<{ terna: TernaDetalle } | TernaDetalle>(API_PATHS.ternas.byId(id), { signal: opts.signal });
    return unwrapEntity<TernaDetalle>(data, 'terna', API_PATHS.ternas.byId(id));
}

export interface EvaluacionPayload {
    calificacion: number;
    comentarios?: string | null;
}

/** Guarda borrador (puede llamarse múltiples veces). */
export async function saveDraft(ternaId: number, payload: Partial<EvaluacionPayload>) {
    return apiPost<unknown>(API_PATHS.ternas.draft(ternaId), payload);
}

/** Envía evaluación final (irreversible salvo reapertura por admin). */
export async function submitEvaluation(ternaId: number, payload: EvaluacionPayload) {
    return apiPost<unknown>(API_PATHS.ternas.submit(ternaId), payload);
}

/** Reabre la evaluación de un evaluador (solo admin). */
export async function reopenEvaluation(ternaId: number, evaluadorId: number) {
    return apiPost<unknown>(API_PATHS.ternas.reopen(ternaId), { evaluadorId });
}
