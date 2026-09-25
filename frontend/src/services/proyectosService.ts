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
import { unwrapCollection, unwrapEntity, detectTruncation, reportTruncation } from './normalize';
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

/** Máximo que acepta el contrato por página; sin `limit` el servidor usa 50. */
export const PROYECTOS_PAGE_SIZE = 100;

type ProyectosPage =
    | Proyecto[]
    | { proyectos: Proyecto[]; pagination?: { pages?: number; total?: number } };

function urlPagina(params: ListProyectosParams, page: number): string {
    const qs = new URLSearchParams();
    if (params.fase)   qs.set('fase', params.fase);
    if (params.search) qs.set('search', params.search);
    qs.set('page', String(page));
    qs.set('limit', String(PROYECTOS_PAGE_SIZE));
    return `${API_PATHS.proyectos.list}?${qs}`;
}

/**
 * Todos los proyectos que cumplen el filtro, recorriendo las páginas.
 *
 * La respuesta no está documentada: si trae `pagination` se piden las páginas
 * restantes; si no la trae y llega una página llena, el listado podría estar
 * incompleto y se reporta como truncado en vez de asumir que es todo.
 */
export async function listProyectos(
    params: ListProyectosParams = {},
    opts: { signal?: AbortSignal } = {},
): Promise<Proyecto[]> {
    const primeraUrl = urlPagina(params, 1);
    const primera = await apiGet<ProyectosPage>(primeraUrl, { signal: opts.signal });
    const filas = unwrapCollection<Proyecto>(primera, ['proyectos'], primeraUrl);
    const pagination = Array.isArray(primera) ? undefined : primera?.pagination;

    if (typeof pagination?.pages !== 'number') {
        if (detectTruncation(filas.length, undefined, PROYECTOS_PAGE_SIZE)) {
            reportTruncation(API_PATHS.proyectos.list, filas.length);
        }
        return filas;
    }

    const resto = await Promise.all(
        Array.from({ length: Math.max(0, pagination.pages - 1) }, (_, i) => {
            const url = urlPagina(params, i + 2);
            return apiGet<ProyectosPage>(url, { signal: opts.signal })
                .then((p) => unwrapCollection<Proyecto>(p, ['proyectos'], url));
        }),
    );
    const todas = filas.concat(...resto);
    if (detectTruncation(todas.length, pagination.total)) {
        reportTruncation(API_PATHS.proyectos.list, todas.length, pagination.total);
    }
    return todas;
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
    /*
     * La respuesta llega envuelta: `apiData` retira el `{ data }` del sobre
     * genérico, pero queda la envoltura semántica `{ proyecto }`. Esta función
     * declaraba devolver un `Proyecto` y devolvía ese objeto intermedio. Nadie
     * lo notó porque nadie miraba el valor de retorno; en cuanto la pantalla
     * quiso señalar el proyecto recién creado, `id` era `undefined`.
     */
    const raw = await apiPost<{ proyecto: Proyecto } | Proyecto>(API_PATHS.proyectos.list, dto);
    invalidateProyectos();
    return unwrapEntity<Proyecto>(raw, 'proyecto', API_PATHS.proyectos.list);
}
