/**
 * workQueue.ts — Derivación de ÍTEMS DE TRABAJO (Work Queue) desde datasets en lote.
 *
 * Función pura y determinista: mismos datasets → misma cola, mismo orden. No
 * hace fetch, no navega, no usa la hora ni aleatoriedad. Complejidad O(n): se
 * indexan las fuentes una sola vez por carnet y se recorre la matrícula.
 *
 * El ranking es una HEURÍSTICA DE PRESENTACIÓN transparente (un mapa fijo por
 * tipo), no autoridad de negocio. No oculta trabajo: todo ítem accionable queda
 * en la lista; el orden solo sugiere por dónde empezar.
 */

import type { ResolucionTerna, TernaResumen, ReporteTernaItem } from '../../../types/api';
import { deriveGradStatus, deriveStage } from './stage';
import { STAGE_ORDER } from './pipelineMeta';
import { assertNever } from '../../../utils/assertNever';
import type {
    GradStatus,
    PipelineStage,
    StageSignals,
    TernaSignals,
    WorkItem,
    WorkItemKind,
    WorkItemTarget,
    WorkQueueResult,
    WorkspaceDatasets,
} from './types';
import type { TesisEstudiante } from '../../../services/tesisService';

/** Clave de join canónica; los carnets se comparan sin espacios accidentales. */
function keyOf(carnet: string | null | undefined): string {
    return (carnet ?? '').trim();
}

const MS_PER_DAY = 86_400_000;

/**
 * Antigüedad en días de un timestamp respecto a `now` (inyectado, no `Date.now`
 * interno → función pura). null si falta el timestamp/now o el timestamp es
 * inválido. Nunca negativa (un timestamp futuro cuenta como 0).
 */
function computeAgeDays(timestamp: string | null, now?: number): number | null {
    if (timestamp == null || now == null) return null;
    const t = Date.parse(timestamp);
    if (Number.isNaN(t)) return null;
    return Math.max(0, Math.floor((now - t) / MS_PER_DAY));
}

/** Desempate por envejecimiento: más antiguo primero; los sin edad, al final. */
function compareAge(a: WorkItem, b: WorkItem): number {
    if (a.ageDays == null && b.ageDays == null) return 0;
    if (a.ageDays == null) return 1;
    if (b.ageDays == null) return -1;
    return b.ageDays - a.ageDays;
}

/** Ranking por tipo (menor = más urgente). Transparente y documentado. */
const KIND_PRIORITY: Record<WorkItemKind, number> = {
    terna_estancada: 0,     // alguien espera; bloquea la fase final
    cerrar_resolucion: 1,   // decisión lista para formalizar
    crear_caso: 2,          // elegible atascado sin caso abierto
    registrar_nota_pg2: 3,  // backlog de captura, más cerca de graduarse
    registrar_nota_pg1: 4,  // backlog de captura, fase temprana
    revisar_no_elegible: 5, // consulta / caso borde
};

/** Etapa → tipo de trabajo. Etapas sanas (en_terna, sin_datos) no generan ítem. */
const STAGE_TO_KIND: Partial<Record<PipelineStage, WorkItemKind>> = {
    pg1_pendiente: 'registrar_nota_pg1',
    pg2_pendiente: 'registrar_nota_pg2',
    no_elegible: 'revisar_no_elegible',
    elegible_sin_caso: 'crear_caso',
    terna_estancada: 'terna_estancada',
    resuelto: 'cerrar_resolucion',
};

/** true = el ítem desaparece solo al cambiar los datos (no requiere descarte). */
const KIND_SELF_CLEARING: Record<WorkItemKind, boolean> = {
    registrar_nota_pg1: true,
    registrar_nota_pg2: true,
    revisar_no_elegible: true,
    crear_caso: false,      // crear el caso ocurre fuera de esta superficie
    terna_estancada: false, // se resuelve cuando los evaluadores envían
    cerrar_resolucion: false, // requiere reconocimiento del coordinador
};

const KIND_REASON: Record<WorkItemKind, string> = {
    registrar_nota_pg1: 'Falta la nota de PG1 (curso 043).',
    registrar_nota_pg2: 'Aprobó PG1; falta la nota de PG2 (curso 049).',
    revisar_no_elegible: 'No elegible a tesis; revisar el motivo.',
    crear_caso: 'Elegible a tesis sin caso abierto.',
    terna_estancada: 'Terna en progreso con evaluaciones pendientes.',
    cerrar_resolucion: 'Terna con resolución lista para cerrar.',
};

function emptyStageCounts(): Record<PipelineStage, number> {
    return STAGE_ORDER.reduce((acc, s) => {
        acc[s] = 0;
        return acc;
    }, {} as Record<PipelineStage, number>);
}

/** Índices por carnet construidos una sola vez (O(n)). */
interface Indices {
    /** carnet → nombre autoritativo (padrón primero; luego otras fuentes). */
    names: Map<string, string>;
    /** carnet → id del padrón (para enrutar al detalle por /students/:id). */
    idByCarnet: Map<string, number>;
    aprobados: Map<string, TesisEstudiante>;
    reprobados: Map<string, TesisEstudiante>;
    /** carnet → terna más avanzada (mayor `numero` ante múltiples). */
    ternaByCarnet: Map<string, TernaResumen>;
    /** terna_id → resolución del reporte global. */
    resolucionByTernaId: Map<number, ResolucionTerna>;
    /** carnet → resolución del reporte global (respaldo si no hay match por id). */
    resolucionByCarnet: Map<string, ResolucionTerna>;
    /** Universo completo de carnets (unión de todas las fuentes). */
    carnets: Set<string>;
}

function buildIndices(d: WorkspaceDatasets): Indices {
    const names = new Map<string, string>();
    const idByCarnet = new Map<string, number>();
    const aprobados = new Map<string, TesisEstudiante>();
    const reprobados = new Map<string, TesisEstudiante>();
    const ternaByCarnet = new Map<string, TernaResumen>();
    const resolucionByTernaId = new Map<number, ResolucionTerna>();
    const resolucionByCarnet = new Map<string, ResolucionTerna>();
    const carnets = new Set<string>();

    const remember = (carnet: string, nombre?: string | null) => {
        if (!carnet) return;
        carnets.add(carnet);
        if (nombre && !names.has(carnet)) names.set(carnet, nombre);
    };

    // Padrón: fuente autoritativa del nombre y del id (se registra primero).
    for (const e of d.students) {
        const c = keyOf(e.carnet);
        remember(c, e.nombre);
        if (c && typeof e.id === 'number' && !idByCarnet.has(c)) idByCarnet.set(c, e.id);
    }

    for (const t of d.tesisAprobados) {
        const c = keyOf(t.carnet);
        if (!c) continue;
        aprobados.set(c, t);
        remember(c, t.nombre);
    }
    for (const t of d.tesisReprobados) {
        const c = keyOf(t.carnet);
        if (!c) continue;
        reprobados.set(c, t);
        remember(c, t.nombre);
    }

    for (const t of d.ternas) {
        const c = keyOf(t.carnet);
        if (!c) continue;
        const prev = ternaByCarnet.get(c);
        // Ante múltiples ternas por carnet, conservar la de mayor `numero`.
        if (!prev || (t.numero ?? 0) >= (prev.numero ?? 0)) ternaByCarnet.set(c, t);
        remember(c, t.estudiante_nombre);
    }

    for (const r of d.reporteTernas) {
        if (typeof r.terna_id === 'number') resolucionByTernaId.set(r.terna_id, r.resolucion);
        const c = keyOf(r.carnet);
        if (c && !resolucionByCarnet.has(c)) resolucionByCarnet.set(c, r.resolucion);
        remember(c, r.estudiante);
    }

    return { names, idByCarnet, aprobados, reprobados, ternaByCarnet, resolucionByTernaId, resolucionByCarnet, carnets };
}

function toTernaSignals(t: TernaResumen): TernaSignals {
    return {
        id: t.id,
        estado: t.estado,
        evaluacionesEnviadas: t.evaluaciones_enviadas ?? 0,
        totalEvaluadores: t.total_evaluadores ?? 0,
        fechaEvaluacion: t.fecha_evaluacion ?? null,
    };
}

function gradStatusOf(t: TesisEstudiante | undefined, which: 1 | 2): GradStatus {
    if (!t) return 'desconocido';
    return which === 1
        ? deriveGradStatus(t.nota_grad1, t.estado_grad1)
        : deriveGradStatus(t.nota_grad2, t.estado_grad2);
}

/** Ensambla las señales de un carnet a partir de los índices. */
function signalsFor(carnet: string, idx: Indices): StageSignals {
    const terna = idx.ternaByCarnet.get(carnet) ?? null;
    let resolucion: ResolucionTerna | null = null;
    if (terna) {
        resolucion = idx.resolucionByTernaId.get(terna.id) ?? idx.resolucionByCarnet.get(carnet) ?? null;
    }
    const tesis = idx.aprobados.get(carnet) ?? idx.reprobados.get(carnet);
    return {
        tesisAprobado: idx.aprobados.has(carnet),
        tesisReprobado: idx.reprobados.has(carnet),
        grad1: gradStatusOf(tesis, 1),
        grad2: gradStatusOf(tesis, 2),
        terna: terna ? toTernaSignals(terna) : null,
        resolucion,
    };
}

function buildTarget(kind: WorkItemKind, carnet: string, terna: TernaSignals | null): WorkItemTarget {
    switch (kind) {
        case 'terna_estancada':
        case 'cerrar_resolucion':
            return { kind: 'terna_detail', carnet, ternaId: terna?.id };
        case 'crear_caso':
            return { kind: 'create_proyecto', carnet };
        case 'registrar_nota_pg1':
        case 'registrar_nota_pg2':
            return { kind: 'notas_entry', carnet };
        case 'revisar_no_elegible':
            return { kind: 'student_detail', carnet };
    }
    return assertNever(kind);
}

/**
 * Deriva el ítem de trabajo de un estudiante (o null si su etapa es sana).
 * Puro: depende solo de sus argumentos.
 */
export function deriveWorkItem(
    carnet: string,
    nombre: string,
    signals: StageSignals,
    stage: PipelineStage,
    studentId?: number,
    now?: number,
): WorkItem | null {
    const kind = STAGE_TO_KIND[stage];
    if (!kind) return null;
    const timestamp = signals.terna?.fechaEvaluacion ?? null;
    return {
        id: `${kind}:${carnet}`,
        kind,
        carnet,
        nombre,
        studentId,
        stage,
        priority: KIND_PRIORITY[kind],
        reason: KIND_REASON[kind],
        target: buildTarget(kind, carnet, signals.terna),
        selfClearing: KIND_SELF_CLEARING[kind],
        timestamp,
        ageDays: computeAgeDays(timestamp, now),
    };
}

/**
 * Motor completo: datasets en lote → cola de trabajo priorizada + cobertura +
 * pulso por etapa. Recorre la UNIÓN de carnets de todas las fuentes (no solo el
 * padrón) para que ningún caso quede fuera de cobertura.
 */
export function deriveWorkQueue(d: WorkspaceDatasets, opts: { now?: number } = {}): WorkQueueResult {
    const idx = buildIndices(d);
    const stageCounts = emptyStageCounts();
    const items: WorkItem[] = [];

    const carnets = Array.from(idx.carnets).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    let withoutStatus = 0;

    for (const carnet of carnets) {
        const signals = signalsFor(carnet, idx);
        const stage = deriveStage(signals);
        stageCounts[stage] += 1;
        if (stage === 'sin_datos') withoutStatus += 1;

        const nombre = idx.names.get(carnet) ?? carnet;
        const item = deriveWorkItem(carnet, nombre, signals, stage, idx.idByCarnet.get(carnet), opts.now);
        if (item) items.push(item);
    }

    // Orden determinista: prioridad (severidad del tipo) → antigüedad (más viejo
    // primero, donde haya) → carnet (desempate estable).
    items.sort((a, b) =>
        (a.priority - b.priority)
        || compareAge(a, b)
        || (a.carnet < b.carnet ? -1 : a.carnet > b.carnet ? 1 : 0),
    );

    const totalStudents = carnets.length;
    return {
        items,
        coverage: {
            totalStudents,
            withStatus: totalStudents - withoutStatus,
            withoutStatus,
        },
        stageCounts,
    };
}
