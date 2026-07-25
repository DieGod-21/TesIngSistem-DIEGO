/**
 * queuePolicy.ts — Política de la cola de trabajo (visibilidad + autorización).
 *
 * Dos conceptos, hoy INDEPENDIENTES (antes colapsados sobre `selfClearing`):
 *
 *  1. VISIBILIDAD: qué tipos de trabajo se muestran en la cola. Es una decisión
 *     de despliegue del producto, NO la bandera `selfClearing` del dominio (que
 *     significa "se limpia solo con el dato / no requiere descarte"). Un ítem
 *     puede ser no-self-clearing y aun así visible (con descarte, Wave 3).
 *
 *  2. AUTORIZACIÓN: qué capacidad exige la acción de cada tipo. Única fuente de
 *     verdad del gating por tipo; el `Record` fuerza exhaustividad en compilación.
 *
 * Ninguno reimplementa reglas de negocio del dominio: solo seleccionan y gatean
 * la salida ya derivada por `deriveWorkQueue`.
 */

import type { Capabilities } from '../../config/permissions';
import type { WorkItem, WorkItemKind } from './domain/types';

// ─── 1. Visibilidad en la cola (independiente de selfClearing) ──────────────

/** Tipos de trabajo visibles en la cola. Cambiar el alcance = editar este set. */
export const QUEUE_VISIBLE_KINDS: ReadonlySet<WorkItemKind> = new Set<WorkItemKind>([
    'registrar_nota_pg1',
    'registrar_nota_pg2',
    'revisar_no_elegible',
    'crear_caso',
    'terna_estancada',
    'cerrar_resolucion',
]);

export function isVisibleInQueue(item: WorkItem): boolean {
    return QUEUE_VISIBLE_KINDS.has(item.kind);
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
