/**
 * evaluatorData.ts — Lote de datos del workspace del evaluador.
 *
 * Capa DELGADA: pide, no decide. Toda la interpretación vive en el dominio
 * (`derivarAsignaciones`), que es puro y está probado aparte.
 *
 * ── DE DÓNDE SALEN LOS DATOS ────────────────────────────────────────────────
 *
 *   GET /api/ternas          → el SERVIDOR ya acota: «Evaluador: solo ve las
 *                              ternas en que está asignado». No se pide la
 *                              lista global para filtrarla aquí.
 *   GET /api/ternas/{id}     → detalle de cada una, que es donde vive
 *                              `evaluadores[]` y, con él, el estado de MI
 *                              evaluación. El servidor responde 403 si la
 *                              terna no es mía.
 *
 * Ningún endpoint administrativo entra aquí: ni el padrón, ni el resumen de
 * tesis, ni el reporte global, ni el catálogo de proyectos.
 */

import { listTernasCached, getTernaByIdCached } from '../../../services/ternasService';
import { derivarAsignaciones } from '../domain/assignments';
import type { TrabajoEvaluador } from '../domain/assignments';
import type { TernaDetalle } from '../../../types/api';

/**
 * Trae las asignaciones del evaluador autenticado.
 *
 * Los detalles se piden EN PARALELO y con `allSettled`: si una terna falla
 * —403 por un cambio de asignación, un 500 puntual—, el resto del workspace
 * tiene que seguir funcionando. Una terna sin detalle no desaparece de la
 * lista: aparece sin estado propio, que es la verdad.
 */
export async function getEvaluatorAssignments(usuarioId: number | null): Promise<TrabajoEvaluador> {
    const ternas = await listTernasCached();

    const resultados = await Promise.allSettled(
        ternas.map((t) => getTernaByIdCached(t.id)),
    );

    const detalles = new Map<number, TernaDetalle>();
    resultados.forEach((r, i) => {
        if (r.status === 'fulfilled') detalles.set(ternas[i].id, r.value);
    });

    return derivarAsignaciones(ternas, detalles, usuarioId);
}
