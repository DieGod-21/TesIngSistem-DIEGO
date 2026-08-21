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
    /**
     * Id numérico en el padrón, o null si este carné no está en él.
     *
     * `GET /api/tesis/aprobados` identifica a la gente SOLO por carné: no
     * publica el id. Y el carné, aun siendo estable, no sirve para abrir a
     * nadie —las rutas y el panel de inspección del padrón trabajan con el id
     * numérico—, así que sin esto lo único que podía hacer un enlace de esta
     * lista era dejar al usuario en una búsqueda y que él terminara el trabajo.
     *
     * El cruce se hace contra el mismo padrón que ya viaja en el lote del
     * workspace: ni una petición más. Mismo criterio y misma tolerancia que
     * `WorkItem.studentId`: null cuando el carné aparece en tesis pero no en el
     * padrón, y quien enruta hace su propio repliegue.
     */
    estudianteId: number | null;
    /**
     * Posición (base 0) dentro del padrón, o null si no está en él.
     *
     * Es un hecho sobre los datos, no sobre la pantalla: «este expediente es el
     * número 26 de los que devuelve el servidor». Cuántos caben por página es
     * decisión de presentación y se resuelve en `lens.ts`, no aquí.
     */
    posicionPadron: number | null;
}

/** Lo mínimo del padrón que la auditoría necesita para identificar a alguien. */
export interface EntradaPadron {
    id: number;
    carnet: string;
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
export function auditarElegibilidad(
    lista: ListaTesis,
    padron: readonly EntradaPadron[] = [],
): AuditoriaElegibilidad {
    const minimo = lista.nota_minima;
    const auditable = Number.isFinite(minimo) && minimo > NOTA_MINIMA_DESCONOCIDA;
    const observados: ObservacionElegibilidad[] = [];

    // Índice carné → (id, posición). Se construye una vez: recorrer el padrón
    // por cada observación convertiría esto en cuadrático sobre dos listas que
    // en producción rondan los cientos de filas.
    const enPadron = new Map<string, { id: number; posicion: number }>();
    padron.forEach((e, posicion) => {
        if (!enPadron.has(e.carnet)) enPadron.set(e.carnet, { id: e.id, posicion });
    });

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
            const ubicacion = enPadron.get(e.carnet);
            observados.push({
                carnet: e.carnet,
                nombre: e.nombre,
                faltan,
                bajoMinimo,
                estudianteId: ubicacion?.id ?? null,
                posicionPadron: ubicacion?.posicion ?? null,
            });
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
 * LENGUAJE DE USUARIO, no de ingeniería. Quien lee esto coordina graduaciones:
 * no le sirve saber que dos endpoints discrepan, le sirve saber qué nota falta
 * y en qué curso, porque eso es exactamente lo que tiene que ir a resolver.
 * Nombrar el curso concreto convierte el aviso en una tarea.
 */
export function describirObservacion(o: ObservacionElegibilidad): string {
    const partes: string[] = [];
    if (o.faltan.length > 0) {
        const cursos = o.faltan.join(' y ');
        partes.push(`Falta ${o.faltan.length > 1 ? 'la nota de' : 'la nota de'} ${cursos}`);
    }
    if (o.bajoMinimo.length > 0) {
        partes.push(`${o.bajoMinimo.join(' y ')} por debajo del mínimo`);
    }
    return partes.join(' · ');
}
