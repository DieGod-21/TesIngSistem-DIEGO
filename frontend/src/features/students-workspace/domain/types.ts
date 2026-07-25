/**
 * types.ts — Contratos del dominio "Students Workspace" (Work Queue).
 *
 * Este módulo NO hace fetch, NO navega y NO toca React. Solo define las formas
 * de entrada (datasets en lote, tal como los devuelven los servicios existentes)
 * y de salida (etapa de pipeline + ítems de trabajo) del motor de derivación.
 *
 * Todo aquí es data plana y serializable: alimenta funciones puras y
 * deterministas testables de forma independiente.
 */

import type {
    Estudiante,
    EstadoTerna,
    ResolucionTerna,
    TernaResumen,
    ReporteTernaItem,
} from '../../../types/api';
import type { TesisEstudiante } from '../../../services/tesisService';

// ─── Entrada: datasets en lote ──────────────────────────────────────────────

/**
 * Conjunto de datasets EN LOTE que alimenta el motor. Cada campo proviene de un
 * único endpoint ya existente (sin N+1). El motor los recibe por inyección: no
 * los descarga (eso vive en la capa `data/`), lo que lo mantiene puro.
 */
export interface WorkspaceDatasets {
    /** Padrón completo (fuente autoritativa de la matrícula y de los nombres). */
    students: Estudiante[];
    /** Listado oficial de quienes aprueban tesis (/api/tesis/aprobados). */
    tesisAprobados: TesisEstudiante[];
    /** Listado oficial de quienes NO aprueban tesis (/api/tesis/reprobados). */
    tesisReprobados: TesisEstudiante[];
    /** Ternas visibles para el usuario (backend filtra por rol). */
    ternas: TernaResumen[];
    /**
     * Ítems del reporte global de ternas (aporta la `resolucion`, ausente en
     * `TernaResumen`). Es ENRIQUECIMIENTO: el motor tolera un arreglo vacío.
     */
    reporteTernas: ReporteTernaItem[];
}

// ─── Señales intermedias (por estudiante) ───────────────────────────────────

/** Estado de un curso de graduación derivado de las listas de tesis en lote. */
export type GradStatus = 'ok' | 'faltante' | 'reprobado' | 'nsp' | 'desconocido';

/** Señales de la terna relevante de un estudiante (subconjunto de TernaResumen). */
export interface TernaSignals {
    id: number;
    estado: EstadoTerna;
    evaluacionesEnviadas: number;
    totalEvaluadores: number;
    fechaEvaluacion: string | null;
}

/**
 * Señales normalizadas de un estudiante, listas para `deriveStage`. Es la
 * entrada mínima y determinista de la derivación de etapa (sin depender de la
 * forma cruda de cada dataset).
 */
export interface StageSignals {
    tesisAprobado: boolean;
    tesisReprobado: boolean;
    grad1: GradStatus;
    grad2: GradStatus;
    terna: TernaSignals | null;
    resolucion: ResolucionTerna | null;
}

// ─── Salida: etapa de pipeline ──────────────────────────────────────────────

/**
 * Etapa del pipeline de graduación de un estudiante, derivada de datos reales.
 * Orden conceptual: sin_datos → PG1 → PG2 → elegibilidad → terna → resolución.
 */
export type PipelineStage =
    | 'sin_datos'          // no aparece con estado computado en ninguna fuente
    | 'pg1_pendiente'      // falta / reprobó PG1 (curso 043)
    | 'pg2_pendiente'      // PG1 ok; falta / reprobó PG2 (curso 049)
    | 'no_elegible'        // en reprobados por otro motivo (p. ej. promedio)
    | 'elegible_sin_caso'  // aprueba tesis pero aún sin terna
    | 'en_terna'           // terna activa y sana (sin acción del coordinador)
    | 'terna_estancada'    // terna en progreso con evaluaciones pendientes
    | 'resuelto';          // terna completada / con resolución

// ─── Salida: ítems de trabajo (Work Queue) ──────────────────────────────────

/** Tipo de trabajo que el sistema SUGIERE como siguiente paso. */
export type WorkItemKind =
    | 'registrar_nota_pg1'
    | 'registrar_nota_pg2'
    | 'revisar_no_elegible'
    | 'crear_caso'
    | 'terna_estancada'
    | 'cerrar_resolucion';

/**
 * Descriptor PURO del destino de un ítem (a dónde llevaría la acción). NO se
 * ejecuta navegación en Wave 0: es solo data que consumirán las waves de UI
 * ("enrutar, no fingir"). Recuerda (V2): `create_proyecto` no puede prellenar
 * el estudiante porque el API de creación no acepta vínculo.
 */
export type WorkItemTargetKind =
    | 'student_detail'
    | 'terna_detail'
    | 'create_proyecto'
    | 'notas_entry';

export interface WorkItemTarget {
    kind: WorkItemTargetKind;
    carnet: string;
    /** Presente solo para destinos de terna. */
    ternaId?: number;
}

/** Una pieza de trabajo concreta y accionable para el coordinador. */
export interface WorkItem {
    /** Determinista y estable: `${kind}:${carnet}`. */
    id: string;
    kind: WorkItemKind;
    carnet: string;
    nombre: string;
    /**
     * Id numérico del estudiante cuando está en el padrón (para enrutar al
     * detalle, que usa /students/:id). Ausente si el carnet solo aparece en
     * tesis/ternas y no en el padrón: el enrutado hace fallback por carnet.
     */
    studentId?: number;
    stage: PipelineStage;
    /** Rango determinista; menor = más urgente. */
    priority: number;
    /** Motivo legible para UI (español). */
    reason: string;
    /** Descriptor de destino (sin navegar). */
    target: WorkItemTarget;
    /**
     * true si el ítem desaparece SOLO al cambiar los datos (p. ej. registrar la
     * nota). false = requiere estado de "atendido/descartado".
     */
    selfClearing: boolean;
    /** Timestamp de origen del "aging" (fecha_evaluacion) cuando exista; si no, null. */
    timestamp: string | null;
    /**
     * Antigüedad en días = floor((now - timestamp) / día), cuando hay `timestamp`
     * y se proporcionó `now` a `deriveWorkQueue`. Si no, null. Alimenta la
     * priorización por envejecimiento y su indicador en la cola.
     */
    ageDays: number | null;
}

/** Resultado completo del motor: cola priorizada + cobertura + pulso. */
export interface WorkQueueResult {
    /** Ítems de trabajo ordenados por prioridad (asc) y luego carnet (asc). */
    items: WorkItem[];
    /** Cobertura de la cola frente a la matrícula total (detección de huecos). */
    coverage: {
        totalStudents: number;
        withStatus: number;
        withoutStatus: number;
    };
    /** Conteo por etapa (alimenta el "pulso" del pipeline, Zona 2). */
    stageCounts: Record<PipelineStage, number>;
}
