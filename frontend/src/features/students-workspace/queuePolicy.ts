/**
 * queuePolicy.ts — Política de la cola de trabajo (visibilidad + autorización +
 * selección).
 *
 * Conceptos INDEPENDIENTES (invariante), todos exhaustivos en compilación
 * (Records fuerzan cubrir cada `WorkItemKind`):
 *
 *  1. VISIBILIDAD: qué tipos se muestran (decisión de despliegue del producto,
 *     NO la bandera `selfClearing` del dominio).
 *  2. AUTORIZACIÓN: qué capacidad exige la acción de cada tipo.
 *  3. SELECCIÓN: dado el conjunto del dominio + capacidades + descarte, qué
 *     ítems quedan pendientes. Esta regla vive AQUÍ (pura, testable), no dentro
 *     del componente.
 *
 * Nada de esto reimplementa reglas del dominio: solo selecciona/gatea su salida.
 */

import type { Capabilities } from '../../config/permissions';
import type { WorkItem, WorkItemKind } from './domain/types';

// ─── 1. Visibilidad en la cola (independiente de selfClearing) ──────────────

/** Visibilidad por tipo. El `Record` obliga a decidir cada `WorkItemKind`. */
export const QUEUE_KIND_VISIBLE: Record<WorkItemKind, boolean> = {
    registrar_nota_pg1: true,
    registrar_nota_pg2: true,
    revisar_no_elegible: true,
    crear_caso: true,
    terna_estancada: true,
    cerrar_resolucion: true,
};

export function isVisibleInQueue(item: WorkItem): boolean {
    return QUEUE_KIND_VISIBLE[item.kind];
}

// ─── 2. Autorización por tipo (única fuente) ────────────────────────────────

/** Capacidad requerida por la acción de cada tipo (null = sin capacidad extra). */
export const KIND_REQUIRED_CAPABILITY: Record<WorkItemKind, keyof Capabilities | null> = {
    registrar_nota_pg1: 'canEditGrades',
    registrar_nota_pg2: 'canEditGrades',
    revisar_no_elegible: null,
    crear_caso: null,
    terna_estancada: 'canReopenEvaluations',
    cerrar_resolucion: null,
};

export function canActOnKind(kind: WorkItemKind, caps: Capabilities): boolean {
    const req = KIND_REQUIRED_CAPABILITY[kind];
    return req == null || caps[req];
}

// ─── 3. Selección de la cola (regla de presentación, fuera del componente) ──

/** Ítems visibles y accionables por el usuario (pre-descarte; base del GC). */
export function visibleActionableItems(items: readonly WorkItem[], caps: Capabilities): WorkItem[] {
    return items.filter((i) => isVisibleInQueue(i) && canActOnKind(i.kind, caps));
}

/**
 * ¿El ítem sigue pendiente? Los self-clearing siempre lo están (bajan con el
 * dato, no se descartan); el resto, salvo que hayan sido descartados.
 */
export function isPendingItem(item: WorkItem, isDismissed: (id: string) => boolean): boolean {
    return item.selfClearing || !isDismissed(item.id);
}
