/**
 * proyectosService.ts
 *
 * Acceso a /api/proyectos/*.
 *
 * Un proyecto NO existe por su cuenta: el contrato exige `estudianteId` al
 * crearlo («Registrar proyecto de tesis»), y es la pieza que enlaza al
 * estudiante con su terna, porque `POST /api/ternas` se crea sobre un
 * `proyectoId`. La cadena completa del sistema es
 *
 *     estudiante → proyecto → terna → evaluación → resolución
 *
 * y este servicio cubre el segundo eslabón.
 */

import { apiGet, apiPost } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import { cached, invalidate } from './cache';
import { unwrapCollection, unwrapEntity } from './normalize';
import type { Proyecto, FaseProyecto } from '../types/api';

export interface CreateProyectoDto {
    /**
     * OBLIGATORIO por contrato. Un proyecto pertenece siempre a un estudiante;
     * sin este campo el API responde 422 y el alta no llega a existir.
     */
    estudianteId: number;
    titulo: string;
    descripcion?: string | null;
    fase?: FaseProyecto;
}

export interface ListProyectosParams {
    fase?: FaseProyecto;
    search?: string;
}

export async function listProyectos(
    params: ListProyectosParams = {},
    opts: { signal?: AbortSignal } = {},
): Promise<Proyecto[]> {
    const qs = new URLSearchParams();
    if (params.fase)   qs.set('fase', params.fase);
    if (params.search) qs.set('search', params.search);
    const url = `${API_PATHS.proyectos.list}${qs.toString() ? `?${qs}` : ''}`;
    const data = await apiGet<Proyecto[] | { proyectos: Proyecto[] }>(url, { signal: opts.signal });
    return unwrapCollection<Proyecto>(data, ['proyectos'], url);
}

// ─── Listado cacheado (el servicio POSEE su caché) ──────────────────────────

export const PROYECTOS_CACHE_PREFIX = 'proyectos';
export const PROYECTOS_LIST_KEY = 'proyectos:list';

/** Listado completo de proyectos, cacheado + deduplicado (TTL por defecto). */
export function listProyectosCached(): Promise<Proyecto[]> {
    return cached(PROYECTOS_LIST_KEY, () => listProyectos());
}

/** Invalida los proyectos tras un alta. */
export function invalidateProyectos(): void {
    invalidate(PROYECTOS_CACHE_PREFIX);
}

export async function getProyectoById(
    id: number,
    opts: { signal?: AbortSignal } = {},
): Promise<Proyecto> {
    const data = await apiGet<{ proyecto: Proyecto } | Proyecto>(
        API_PATHS.proyectos.byId(id),
        { signal: opts.signal },
    );
    return unwrapEntity<Proyecto>(data, 'proyecto', API_PATHS.proyectos.byId(id));
}

/**
 * Proyectos de un estudiante concreto.
 *
 * El expediente lo necesita para responder «¿sobre qué trabaja esta persona?»,
 * pregunta que hasta ahora obligaba a salir del expediente, abrir el listado de
 * proyectos y buscar a mano por nombre.
 *
 * 404 significa «este estudiante no tiene proyectos», que es un estado normal
 * del sistema y no un fallo: se traduce a lista vacía para que la interfaz
 * pueda dibujar su estado vacío en vez de un error.
 */
export async function getProyectosByEstudiante(
    estudianteId: number,
    opts: { signal?: AbortSignal } = {},
): Promise<Proyecto[]> {
    const url = API_PATHS.proyectos.byEstudiante(estudianteId);
    const data = await apiGet<Proyecto[] | { proyectos: Proyecto[] }>(url, { signal: opts.signal });
    return unwrapCollection<Proyecto>(data, ['proyectos'], url);
}

export async function createProyecto(dto: CreateProyectoDto): Promise<Proyecto> {
    const proyecto = await apiPost<Proyecto>(API_PATHS.proyectos.list, dto);
    invalidateProyectos();
    return proyecto;
}
