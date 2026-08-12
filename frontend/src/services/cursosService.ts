/**
 * cursosService.ts
 *
 * Acceso a /api/cursos — el catálogo de cursos evaluables.
 *
 * El producto conocía «043» y «049» por constantes escritas a mano en seis
 * sitios, con sus nombres duplicados. El catálogo los publica de verdad y
 * además trae `ciclo`, `seccion` y `anio`, que la interfaz nunca había podido
 * enseñar porque nadie se los había preguntado al servidor.
 *
 * NOTA sobre /api/notas/curso/{codigo}: existe en el contrato («Listar todas
 * las notas de un curso») pero la especificación no declara la forma de la
 * respuesta, y sin garantía de que cada fila lleve la identidad del estudiante
 * una vista de cohorte no puede construirse con honestidad. Queda documentado
 * como capacidad disponible y sin consumir.
 */

import { apiGet } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import { cached } from './cache';
import { unwrapCollection } from './normalize';
import type { Curso } from '../types/api';

export const CURSOS_LIST_KEY = 'cursos:list';

/** Catálogo de cursos evaluables. */
export async function listCursos(opts: { signal?: AbortSignal } = {}): Promise<Curso[]> {
    const data = await apiGet<Curso[] | { cursos: Curso[] }>(
        API_PATHS.cursos.list,
        { signal: opts.signal },
    );
    return unwrapCollection<Curso>(data, ['cursos'], API_PATHS.cursos.list);
}

/**
 * Catálogo cacheado. Es una tabla maestra que cambia por ciclo lectivo, no por
 * sesión: volver a pedirla en cada apertura de un diálogo sería gasto puro.
 */
export function listCursosCached(): Promise<Curso[]> {
    return cached(CURSOS_LIST_KEY, () => listCursos());
}
