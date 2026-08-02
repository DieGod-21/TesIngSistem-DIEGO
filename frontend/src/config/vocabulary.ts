/**
 * vocabulary.ts — Vocabulario canónico de la interfaz.
 *
 * PROBLEMA QUE RESUELVE
 * El producto llamaba de seis formas distintas al mismo conjunto de
 * estudiantes ("Sin Aprobar", "Requieren atención", "Pendientes de tesis",
 * "No elegible", "Reprobados", "Reprobados o con nota pendiente") y de dos
 * formas al mismo objeto institucional ("Terna" / "Comité evaluador"). El
 * coordinador pulsaba una tarjeta llamada "Sin Aprobar" y aterrizaba en un
 * filtro llamado "Pendientes de tesis": el nombre de lo que pulsas debe ser el
 * nombre de donde llegas, o el modelo mental se rompe en cada salto.
 *
 * REGLA
 * Todo texto de interfaz que nombre uno de estos conceptos se importa de aquí.
 * Si un término no está en este módulo, es que solo lo usa una pantalla.
 *
 * ALCANCE
 * Solo presentación: no define conjuntos, reglas ni etapas. Quién pertenece a
 * cada conjunto lo decide el dominio (`deriveStage`, `computeEstadoTesis`) y el
 * backend; aquí solo se decide cómo se llama en pantalla.
 */

export const VOCAB = {
    // ── Elegibilidad de tesis (nivel CONJUNTO) ──
    // Nombra grupos: KPIs, lentes, títulos de sección.
    /** Cumplen el requisito (ambas notas ≥ mínimo). */
    eligible: 'Elegibles a tesis',
    /** Aún no lo cumplen, por nota insuficiente o por nota sin registrar. */
    notEligible: 'Pendientes de tesis',

    // ── Elegibilidad de tesis (nivel ESTUDIANTE) ──
    // Nombra el veredicto de una persona concreta. Deliberadamente más
    // preciso que el nombre del conjunto: al mirar un expediente, "por qué"
    // importa tanto como "qué".
    verdictEligible: 'Elegible a tesis',
    /** Tiene las notas, pero alguna está por debajo del mínimo. */
    verdictBelowMin: 'Nota insuficiente',
    /** Faltan notas por registrar: aún no se puede decidir. */
    verdictMissing: 'Faltan notas',

    // ── Comité evaluador ──
    // "Terna" es el término institucional y el que ya usan la ruta (/ternas),
    // el menú, los títulos de página, el módulo de reportes y el dominio
    // (en_terna, terna_estancada). Gana por consistencia y por precedencia.
    committee: 'Terna',
    committeePlural: 'Ternas',
} as const;
