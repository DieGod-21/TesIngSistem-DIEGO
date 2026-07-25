/**
 * pipelineMeta.ts — Enumeraciones canónicas del pipeline con EXHAUSTIVIDAD
 * garantizada en tiempo de compilación.
 *
 * Antes, el orden de etapas vivía como arrays sueltos (`ALL_STAGES`,
 * `STAGE_ORDER`) que TypeScript no obligaba a completar: añadir una
 * `PipelineStage` sin listarla la eliminaba en silencio del pulso y de los
 * conteos. Aquí el orden se deriva de un `Record<PipelineStage, number>` (y el
 * de tipos de un `Record<WorkItemKind, true>`): omitir una clave es un ERROR de
 * compilación. Es la única fuente del orden del pipeline; UI y dominio la reusan.
 */

import type { PipelineStage, WorkItemKind } from './types';

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

/** Presencia de cada tipo de trabajo. El Record fuerza exhaustividad. */
const WORK_ITEM_KIND_SET: Record<WorkItemKind, true> = {
    registrar_nota_pg1: true,
    registrar_nota_pg2: true,
    revisar_no_elegible: true,
    crear_caso: true,
    terna_estancada: true,
    cerrar_resolucion: true,
};

/** Lista canónica de todos los tipos de trabajo. */
export const WORK_ITEM_KINDS: readonly WorkItemKind[] =
    Object.keys(WORK_ITEM_KIND_SET) as WorkItemKind[];
