/**
 * pipelineMeta.ts — Orden canónico del pipeline con EXHAUSTIVIDAD garantizada en
 * tiempo de compilación.
 *
 * El orden se deriva de un `Record<PipelineStage, number>`: omitir una etapa es
 * un ERROR de compilación (antes eran arrays sueltos que TS no obligaba a
 * completar). Es la única fuente del orden del pipeline; UI y dominio la reusan.
 *
 * La exhaustividad de `WorkItemKind` la fuerzan los Records que SÍ se consumen
 * (KIND_PRIORITY/REASON/SELF_CLEARING en workQueue, KIND_CTA/ICON en la cola,
 * QUEUE_KIND_VISIBLE/KIND_REQUIRED_CAPABILITY en queuePolicy).
 */

import type { PipelineStage } from './types';

/** Posición canónica de cada etapa (journey). El Record fuerza exhaustividad. */
const STAGE_RANK: Record<PipelineStage, number> = {
    sin_datos: 0,
    pg1_pendiente: 1,
    pg2_pendiente: 2,
    no_elegible: 3,
    elegible_sin_caso: 4,
    en_terna: 5,
    terna_estancada: 6,
    resuelto: 7,
};

/** Orden canónico del pipeline (izquierda → derecha). */
export const STAGE_ORDER: readonly PipelineStage[] =
    (Object.keys(STAGE_RANK) as PipelineStage[]).sort((a, b) => STAGE_RANK[a] - STAGE_RANK[b]);
