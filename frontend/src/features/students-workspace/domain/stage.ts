/**
 * stage.ts — Algoritmo de derivación de ETAPA del pipeline.
 *
 * Funciones puras y deterministas. No hacen fetch, no dependen de la hora, no
 * mutan nada. Reciben señales ya normalizadas y devuelven la etapa.
 *
 * AUTORIDAD DE ELEGIBILIDAD (regla de arquitectura): el backend es la fuente
 * autoritativa siempre que esté disponible. La elegibilidad a tesis la decide el
 * servidor (pertenencia a /tesis/aprobados vs /tesis/reprobados); aquí NO se
 * recalcula, solo se interpreta esa pertenencia + el estado de los cursos ya
 * calculados. El cómputo client-side de `utils/thesisStatus.ts` (usado en el
 * detalle) es una PRESENTACIÓN de lo que el backend ya entregó; ante cualquier
 * divergencia, manda el backend. El workspace nunca debe derivar una regla de
 * elegibilidad distinta de la del servidor.
 */

import type { EstadoNota } from '../../../types/api';
import type { GradStatus, PipelineStage, StageSignals } from './types';

/**
 * Traduce el estado + nota de un curso de graduación (tal como vienen en las
 * listas de tesis en lote) a un `GradStatus` estable.
 *
 * - estado APROBADO            → 'ok'
 * - estado REPROBADO           → 'reprobado'
 * - estado NSP                 → 'nsp'
 * - sin estado y sin nota      → 'faltante'
 * - cualquier otra combinación → 'desconocido'
 */
export function deriveGradStatus(
    nota: number | null | undefined,
    estado: EstadoNota | string | null | undefined,
): GradStatus {
    const e = (estado ?? '').toString().trim().toUpperCase();
    if (e === 'APROBADO') return 'ok';
    if (e === 'REPROBADO') return 'reprobado';
    if (e === 'NSP') return 'nsp';
    if (nota == null) return 'faltante';
    return 'desconocido';
}

/** Un curso está "pendiente de nota" si falta, es NSP o está reprobado. */
function isPendiente(status: GradStatus): boolean {
    return status === 'faltante' || status === 'nsp' || status === 'reprobado';
}

/**
 * Deriva la etapa del pipeline a partir de las señales del estudiante.
 *
 * Prioridad de decisión (una terna manda sobre el estado de tesis, porque es la
 * fase más avanzada del pipeline):
 *   1. Con terna → resuelto / estancada / en_terna.
 *   2. Sin terna, en aprobados → elegible_sin_caso.
 *   3. Sin terna, en reprobados → pg1 / pg2 / no_elegible según el curso que falte.
 *   4. Sin rastro en ninguna fuente → sin_datos.
 */
export function deriveStage(s: StageSignals): PipelineStage {
    if (s.terna) {
        const { estado, evaluacionesEnviadas, totalEvaluadores } = s.terna;
        if (estado === 'completada') return 'resuelto';
        if (s.resolucion && s.resolucion !== 'pendiente') return 'resuelto';
        if (estado === 'en_progreso' && totalEvaluadores > 0 && evaluacionesEnviadas < totalEvaluadores) {
            return 'terna_estancada';
        }
        return 'en_terna';
    }

    if (s.tesisAprobado) return 'elegible_sin_caso';

    if (s.tesisReprobado) {
        if (isPendiente(s.grad1)) return 'pg1_pendiente';
        if (isPendiente(s.grad2)) return 'pg2_pendiente';
        return 'no_elegible';
    }

    return 'sin_datos';
}
