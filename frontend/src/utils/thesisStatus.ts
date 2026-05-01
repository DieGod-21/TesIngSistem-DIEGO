/**
 * thesisStatus.ts
 *
 * Cálculo centralizado del estado de tesis a partir de las notas
 * crudas de PG1 (043) y PG2 (049). El backend NO entrega un estado
 * fiable de tesis, así que toda la lógica vive en el frontend.
 *
 * Regla estricta:
 *   - PENDIENTE  → si pg1 o pg2 es null/undefined.
 *   - APROBADO   → si pg1 >= 70 Y pg2 >= 70.
 *   - REPROBADO  → en cualquier otro caso.
 */

import { COURSE_CODES, THESIS_MIN_GRADE } from '../config/apiConfig';
import type {
    CursoNotaResumen,
    EstadoTesis,
    Nota,
    ReporteEstudiante,
} from '../types/api';

export type EstadoTesisCalculado = 'PENDIENTE' | 'APROBADO' | 'REPROBADO';

export interface NotasPG {
    pg1: number | null;
    pg2: number | null;
}

export interface EstadoTesisResultado {
    estado:   EstadoTesisCalculado;
    aprobado: boolean;
}

const toNumberOrNull = (v: number | string | null | undefined): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
};

/** Calcula el estado de tesis según la regla estricta del proyecto. */
export function computeEstadoTesis({ pg1, pg2 }: NotasPG): EstadoTesisResultado {
    if (pg1 == null || pg2 == null) {
        return { estado: 'PENDIENTE', aprobado: false };
    }
    if (pg1 >= THESIS_MIN_GRADE && pg2 >= THESIS_MIN_GRADE) {
        return { estado: 'APROBADO', aprobado: true };
    }
    return { estado: 'REPROBADO', aprobado: false };
}

/** Normaliza pg1/pg2 desde un EstadoTesis o ReporteEstudiante. */
export function extractGradesFromReporte(
    rep: EstadoTesis | ReporteEstudiante | null | undefined,
): NotasPG {
    return {
        pg1: rep?.graduacion_1 ? toNumberOrNull(rep.graduacion_1.nota_final) : null,
        pg2: rep?.graduacion_2 ? toNumberOrNull(rep.graduacion_2.nota_final) : null,
    };
}

/** Normaliza pg1/pg2 desde la lista cruda de notas del estudiante. */
export function extractGradesFromNotas(notas: Nota[] | null | undefined): NotasPG {
    if (!Array.isArray(notas)) return { pg1: null, pg2: null };
    let pg1: number | null = null;
    let pg2: number | null = null;
    for (const n of notas) {
        if (!n) continue;
        if (n.curso_codigo === COURSE_CODES.PG1 && pg1 == null) {
            pg1 = toNumberOrNull(n.nota_final);
        } else if (n.curso_codigo === COURSE_CODES.PG2 && pg2 == null) {
            pg2 = toNumberOrNull(n.nota_final);
        }
    }
    return { pg1, pg2 };
}

/** Combina notas: cualquier valor faltante en `primary` se completa con `fallback`. */
export function mergeGrades(primary: NotasPG, fallback: NotasPG): NotasPG {
    return {
        pg1: primary.pg1 ?? fallback.pg1,
        pg2: primary.pg2 ?? fallback.pg2,
    };
}

/** Fusión de CursoNotaResumen del reporte con los items derivados de /notas. */
export function buildCursosResumen(
    rep: EstadoTesis | ReporteEstudiante | null | undefined,
    notas: Nota[] | null | undefined,
): CursoNotaResumen[] {
    const merged: Record<string, CursoNotaResumen> = {};

    if (rep?.graduacion_1) merged[rep.graduacion_1.curso] = rep.graduacion_1;
    if (rep?.graduacion_2) merged[rep.graduacion_2.curso] = rep.graduacion_2;

    if (Array.isArray(notas)) {
        for (const n of notas) {
            if (!n) continue;
            if (n.curso_codigo !== COURSE_CODES.PG1 && n.curso_codigo !== COURSE_CODES.PG2) continue;
            if (merged[n.curso_codigo]) continue;
            const num = toNumberOrNull(n.nota_final);
            if (num == null) continue;
            merged[n.curso_codigo] = {
                curso:      n.curso_codigo,
                ciclo:      n.ciclo,
                nota_final: num,
                estado:     n.estado,
            };
        }
    }
    return Object.values(merged);
}
