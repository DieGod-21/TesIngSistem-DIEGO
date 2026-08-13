/**
 * eligibility.ts — AUDITORÍA del veredicto de elegibilidad contra su evidencia.
 *
 * QUÉ PROBLEMA RESUELVE
 *
 * `GET /api/tesis/aprobados` devuelve, en una sola respuesta, tres cosas:
 *
 *   · el veredicto   — pertenecer a la lista significa «aprueba tesis»
 *   · la regla       — `nota_minima`
 *   · la evidencia   — `nota_grad1` y `nota_grad2` de cada estudiante
 *
 * El producto usaba el veredicto y descartaba las otras dos. Contra el servidor
 * real (13/08/2026) eso escondía una contradicción del propio backend: de los
 * 30 estudiantes que la lista declaraba aprobados, 5 no tenían NINGUNA nota en
 * PG1. Preguntado por uno de ellos, el mismo servidor respondía lo contrario:
 *
 *   GET /api/tesis/estado/1890-18-20913
 *   → { "aprueba_tesis": false,
 *       "razon": "No tiene nota en Proyecto de Graduación I (043)" }
 *
 * Un coordinador que lee «30 elegibles» y abre una terna para uno de esos cinco
 * está convocando a tres evaluadores para un expediente que no puede defender.
 *
 * QUÉ NO HACE ESTE MÓDULO
 *
 * No recalcula la elegibilidad ni corrige el conteo. La regla de arquitectura
 * de `stage.ts` sigue vigente: la elegibilidad la decide el servidor. Lo que
 * aquí se hace es CONTRASTAR el veredicto del servidor con la evidencia y el
 * umbral que publica el servidor, y devolver las divergencias para que la
 * interfaz las muestre. La divergencia no es frontend-contra-backend, que ya
 * estaba resuelta a favor del backend: es backend-contra-backend, un caso que
 * aquella regla no cubre y que solo el frontend está en posición de ver, porque
 * es el único que sostiene las dos respuestas a la vez.
 *
 * Función pura y determinista: misma lista → misma auditoría. No hace fetch,
 * no usa la hora, no muta la entrada.
 */

import type { TesisEstudiante } from '../../../services/tesisService';

/** Los dos cursos que deciden la tesis, en el orden en que se cursan. */
export type CursoTesis = 'PG1' | 'PG2';

/**
 * Valor que toma `nota_minima` cuando el servidor no la publica (lo normaliza
 * `tesisService`). Con este valor no existe umbral contra el que contrastar.
 */
export const NOTA_MINIMA_DESCONOCIDA = 0;

export interface ObservacionElegibilidad {
    carnet: string;
    nombre: string;
    /** Cursos sin nota registrada: el veredicto no puede sostenerse. */
    faltan: CursoTesis[];
    /** Cursos con nota por debajo del mínimo que publica el servidor. */
    bajoMinimo: CursoTesis[];
}

export interface AuditoriaElegibilidad {
    /** Expedientes que la lista trae realmente (no el `total` del sobre). */
    declarados: number;
    /** Aquellos cuya evidencia respalda el veredicto. */
    sustentados: number;
    /** Aquellos cuya evidencia lo contradice, en el orden en que llegaron. */
    observados: ObservacionElegibilidad[];
    /** false si el servidor no publicó el mínimo: solo se auditan ausencias. */
    auditable: boolean;
    hayObservaciones: boolean;
}

interface ListaTesis {
    total: number;
    nota_minima: number;
    estudiantes: TesisEstudiante[];
}

/**
 * Contrasta cada aprobado con la evidencia publicada junto a él.
 *
 * Un expediente queda observado cuando le falta la nota de algún curso o
 * cuando alguna está por debajo del mínimo. Ambas causas se acumulan en una
 * sola observación: es un expediente, no dos incidencias.
 */
export function auditarElegibilidad(lista: ListaTesis): AuditoriaElegibilidad {
    const minimo = lista.nota_minima;
    const auditable = Number.isFinite(minimo) && minimo > NOTA_MINIMA_DESCONOCIDA;
    const observados: ObservacionElegibilidad[] = [];

    for (const e of lista.estudiantes) {
        const faltan: CursoTesis[] = [];
        const bajoMinimo: CursoTesis[] = [];

        const cursos: ReadonlyArray<readonly [CursoTesis, number | null]> = [
            ['PG1', e.nota_grad1 ?? null],
            ['PG2', e.nota_grad2 ?? null],
        ];

        for (const [curso, nota] of cursos) {
            if (nota == null) faltan.push(curso);
            else if (auditable && nota < minimo) bajoMinimo.push(curso);
        }

        if (faltan.length > 0 || bajoMinimo.length > 0) {
            observados.push({ carnet: e.carnet, nombre: e.nombre, faltan, bajoMinimo });
        }
    }

    const declarados = lista.estudiantes.length;
    return {
        declarados,
        sustentados: declarados - observados.length,
        observados,
        auditable,
        hayObservaciones: observados.length > 0,
    };
}

/**
 * Motivo en una línea, para la fila de la observación.
 *
 * Nombra el curso concreto porque es lo que decide la acción siguiente: quien
 * lee esto tiene que ir a registrar UNA nota, no a investigar cuál.
 */
export function describirObservacion(o: ObservacionElegibilidad): string {
    const partes: string[] = [];
    if (o.faltan.length > 0) {
        partes.push(`sin nota de ${o.faltan.join(' ni ')}`);
    }
    if (o.bajoMinimo.length > 0) {
        partes.push(`${o.bajoMinimo.join(' y ')} bajo el mínimo`);
    }
    return partes.join(' · ');
}
