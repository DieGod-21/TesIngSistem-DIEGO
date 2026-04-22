/**
 * thesisEligibility.ts
 *
 * REGLA DE NEGOCIO (computada en frontend a partir de /api/notas/estudiante/{id}):
 *
 *   Un estudiante puede graduarse por tesis SOLO si:
 *     - Curso 043 (Proyecto de Graduación I)  ≥ 70  AND
 *     - Curso 049 (Proyecto de Graduación II) ≥ 70
 *
 *   Estados:
 *     - 'eligible'     → ambos cursos ≥ 70
 *     - 'partial'      → exactamente uno de los dos ≥ 70
 *     - 'not_eligible' → ninguno ≥ 70 (ambos reprobados o ambos faltantes)
 *     - 'pending'      → ningún curso registrado todavía
 */

import { COURSE_CODES, THESIS_MIN_GRADE } from '../config/apiConfig';
import type { EstadoNota, Nota } from '../types/api';

export type ThesisEligibility = 'eligible' | 'partial' | 'not_eligible' | 'pending';

export interface CourseGrade {
    /** '043' | '049' */
    code: string;
    /** Nota numérica si el estudiante se presentó. */
    score: number | null;
    /** Estado oficial reportado en el acta. */
    estado: EstadoNota | null;
    /** Etiqueta de UI. */
    label: 'PG1' | 'PG2';
    name: string;
    ciclo: string | null;
    /** ¿La nota satisface la regla de tesis? */
    passes: boolean;
}

export interface ThesisEligibilityResult {
    status: ThesisEligibility;
    pg1: CourseGrade;
    pg2: CourseGrade;
    average: number | null;
    /** Razón legible que se puede mostrar en la UI. */
    reason: string;
    minScore: number;
}

const EMPTY_GRADE = (code: string, label: 'PG1' | 'PG2', name: string): CourseGrade => ({
    code, label, name, score: null, estado: null, ciclo: null, passes: false,
});

function pickLatest(notas: Nota[], code: string): Nota | null {
    const matches = notas.filter((n) => n.curso_codigo === code);
    if (matches.length === 0) return null;
    // El API devuelve un acta por ciclo; si hay duplicados, conservamos el último id.
    return matches.sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
}

/** El backend devuelve nota_final como string ("100.00") en algunos endpoints. */
function toNumber(val: unknown): number | null {
    if (val == null) return null;
    if (typeof val === 'number') return Number.isFinite(val) ? val : null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
}

function toGrade(nota: Nota | null, code: string, label: 'PG1' | 'PG2', defaultName: string): CourseGrade {
    if (!nota) return EMPTY_GRADE(code, label, defaultName);
    const score = toNumber(nota.nota_final);
    return {
        code,
        label,
        name: nota.curso_nombre ?? defaultName,
        ciclo: nota.ciclo ?? null,
        score,
        estado: nota.estado ?? null,
        passes: score != null && score >= THESIS_MIN_GRADE && nota.estado !== 'NSP',
    };
}

/**
 * Calcula la elegibilidad de tesis dada la lista de notas del estudiante.
 * Recibe un array (incluso vacío) y devuelve un resultado consistente.
 */
export function computeThesisEligibility(notas: Nota[] | null | undefined): ThesisEligibilityResult {
    const list = notas ?? [];
    const pg1 = toGrade(pickLatest(list, COURSE_CODES.PG1), COURSE_CODES.PG1, 'PG1', 'Proyecto de Graduación I');
    const pg2 = toGrade(pickLatest(list, COURSE_CODES.PG2), COURSE_CODES.PG2, 'PG2', 'Proyecto de Graduación II');

    const hasPg1 = pg1.score != null;
    const hasPg2 = pg2.score != null;
    const passCount = (pg1.passes ? 1 : 0) + (pg2.passes ? 1 : 0);

    let status: ThesisEligibility;
    if (!hasPg1 && !hasPg2) status = 'pending';
    else if (passCount === 2) status = 'eligible';
    else if (passCount === 1) status = 'partial';
    else status = 'not_eligible';

    const average =
        pg1.score != null && pg2.score != null
            ? Math.round(((pg1.score + pg2.score) / 2) * 100) / 100
            : null;

    const reason = (() => {
        switch (status) {
            case 'eligible':
                return `Aprueba tesis: ${pg1.score} en PG1 y ${pg2.score} en PG2 (≥ ${THESIS_MIN_GRADE} en ambos).`;
            case 'partial': {
                const ok  = pg1.passes ? pg1 : pg2;
                const bad = pg1.passes ? pg2 : pg1;
                if (bad.score == null) {
                    return `Falta nota de ${bad.label}. ${ok.label} = ${ok.score} ≥ ${THESIS_MIN_GRADE}.`;
                }
                return `Aún no aprueba tesis: ${bad.label} = ${bad.score} (< ${THESIS_MIN_GRADE}). ${ok.label} = ${ok.score}.`;
            }
            case 'not_eligible': {
                const parts: string[] = [];
                if (hasPg1) parts.push(`PG1 = ${pg1.score}${pg1.estado === 'NSP' ? ' (NSP)' : ''}`);
                if (hasPg2) parts.push(`PG2 = ${pg2.score}${pg2.estado === 'NSP' ? ' (NSP)' : ''}`);
                return `No aprueba tesis: ${parts.join(' · ')} (mínimo ${THESIS_MIN_GRADE} en cada curso).`;
            }
            default:
                return 'Sin notas registradas todavía.';
        }
    })();

    return { status, pg1, pg2, average, reason, minScore: THESIS_MIN_GRADE };
}
