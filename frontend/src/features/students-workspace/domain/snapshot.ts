/**
 * snapshot.ts — "Desde tu última visita" (Wave 5), a nivel de DOMINIO.
 *
 * El diff entre dos visitas es lógica de negocio, así que vive aquí (puro,
 * determinista, testable), NO en React. El snapshot se deriva de la salida ya
 * calculada por `deriveWorkQueue` (mismas etapas): no hay segunda fuente de
 * verdad.
 *
 * Almacenamiento mínimo (lo exige la spec): user, timestamp, stage map, firma de
 * cola. La firma es un hash compacto del conjunto de ítems (no la lista), para
 * detectar cambios de cola sin duplicar lo que ya muestra el Work Queue.
 */

import type { PipelineStage, WorkItem, WorkQueueResult } from './types';
import { STAGE_ORDER } from './pipelineMeta';

/** Estado mínimo persistido de una visita. */
export interface WorkspaceSnapshot {
    user: string;
    timestamp: number;
    stageMap: Record<PipelineStage, number>;
    queueSignature: string;
}

export interface StageDelta {
    stage: PipelineStage;
    delta: number;
}

/** Resultado del diff entre la visita previa y la actual. */
export interface SnapshotDiff {
    /** Tiempo transcurrido desde la visita previa (ms); null si no hay previa. */
    sincePreviousMs: number | null;
    /** Cambios netos por etapa (solo no-cero, en orden de pipeline). */
    stageDeltas: StageDelta[];
    /** true si el conjunto de ítems de la cola cambió (por firma). */
    queueChanged: boolean;
    /** true si hay algo describible que mostrar (gate de "aparecer"). */
    meaningful: boolean;
}

/** Firma compacta y estable del conjunto de ítems (hash djb2 + tamaño). */
export function queueSignatureOf(items: readonly WorkItem[]): string {
    const joined = items.map((i) => i.id).sort().join('');
    let h = 5381;
    for (let i = 0; i < joined.length; i++) {
        h = (((h << 5) + h) ^ joined.charCodeAt(i)) >>> 0;
    }
    return `${(h >>> 0).toString(36)}:${items.length}`;
}

/** Construye el snapshot mínimo a partir de la salida del dominio. */
export function buildSnapshot(result: WorkQueueResult, user: string, now: number): WorkspaceSnapshot {
    return {
        user,
        timestamp: now,
        stageMap: { ...result.stageCounts },
        queueSignature: queueSignatureOf(result.items),
    };
}

/**
 * Diffea la visita previa contra la actual. Sin previa, o con usuario distinto
 * (mismo dispositivo, otro coordinador), no hay nada que mostrar.
 */
export function diffSnapshots(previous: WorkspaceSnapshot | null, current: WorkspaceSnapshot): SnapshotDiff {
    if (!previous || previous.user !== current.user) {
        return { sincePreviousMs: null, stageDeltas: [], queueChanged: false, meaningful: false };
    }
    const stageDeltas = STAGE_ORDER
        .map((stage) => ({ stage, delta: (current.stageMap[stage] ?? 0) - (previous.stageMap[stage] ?? 0) }))
        .filter((d) => d.delta !== 0);
    const queueChanged = previous.queueSignature !== current.queueSignature;
    return {
        sincePreviousMs: current.timestamp - previous.timestamp,
        stageDeltas,
        queueChanged,
        // "Aparece" solo si hay deltas de etapa describibles (no duplicamos la
        // lista de la cola cuando solo cambió la firma sin mover conteos).
        meaningful: stageDeltas.length > 0,
    };
}
