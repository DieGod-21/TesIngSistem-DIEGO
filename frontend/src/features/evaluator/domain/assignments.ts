/**
 * assignments.ts — Dominio del evaluador. FUNCIONES PURAS, sin React ni red.
 *
 * Responde la única pregunta que le importa a quien evalúa:
 *
 *     ¿qué tengo que hacer YO, y qué ya hice?
 *
 * ── POR QUÉ HACE FALTA UN DOMINIO PARA ESTO ─────────────────────────────────
 *
 * `GET /api/ternas` ya viene acotado por el servidor —«Evaluador: solo ve las
 * ternas en que está asignado»—, pero solo trae el progreso de la TERNA
 * (`evaluaciones_enviadas` / `total_evaluadores`). Eso responde «¿cuánto le
 * falta a este panel?», no «¿me falta a mí?». Una terna con 2 de 3 enviadas
 * puede estar esperándome o no tener nada que ver conmigo.
 *
 * Saber lo mío exige el DETALLE de la terna, que es donde vive `evaluadores[]`
 * con el `eval_estado` de cada uno.
 *
 * ── EL LÍMITE DEL CONTRATO, SIN DISIMULAR ───────────────────────────────────
 *
 * El esquema publicado de `evaluadores[]` es:
 *
 *     nombre · calificacion · comentarios · eval_estado
 *
 * No trae `usuario_id`. Sin un identificador, la única forma de adivinar cuál
 * de las filas es la mía sería comparar el nombre visible, y eso es
 * inaceptable: dos evaluadores homónimos —nada raro en una facultad— harían
 * que el producto enseñara la nota de otra persona como propia.
 *
 * Por eso existe el estado `sin_identificar`. Cuando el servidor no da
 * identidad, el producto lo DICE en vez de inventarla: enseña el progreso del
 * panel, que sí es un dato cierto, y avisa de que no puede distinguir la fila
 * propia. Es un bloqueo del backend documentado, no un fallo silencioso.
 */

import type { TernaDetalle, TernaResumen, FaseProyecto, EstadoTerna } from '../../../types/api';

/**
 * Estado de MI evaluación dentro de una terna.
 *
 * `sin_identificar` NO es un error: es la respuesta honesta cuando el detalle
 * no permite saber cuál fila me corresponde.
 */
export type MiEstado = 'pendiente' | 'enviada' | 'sin_identificar';

export interface Asignacion {
    /** La terna tal y como la devolvió el servidor (ya acotada por rol). */
    terna: TernaResumen;
    /** Qué me toca a mí en esta terna. */
    miEstado: MiEstado;
    /** Mi calificación, si ya la registré (borrador o enviada). */
    miCalificacion: number | null;
    /** ¿Tengo un borrador guardado en el servidor con calificación? */
    tengoBorrador: boolean;
    /** Progreso del panel completo: cuántos de cuántos han enviado. */
    enviadas: number;
    total: number;
}

export interface TrabajoEvaluador {
    /** Todas mis asignaciones, ordenadas: primero lo que me falta. */
    asignaciones: Asignacion[];
    /** Las que esperan mi evaluación. */
    pendientes: Asignacion[];
    /** Las que ya envié. */
    enviadas: Asignacion[];
    /**
     * true cuando NINGUNA fila pudo identificarse como propia y sí había
     * detalles que mirar. Señala un límite del contrato, no un error de red:
     * la interfaz debe explicarlo, no reintentar.
     */
    identidadIndeterminada: boolean;
}

/** Fila de `evaluadores[]` que corresponde a este usuario, o null si no se puede saber. */
function miFila(detalle: TernaDetalle | undefined, usuarioId: number | null) {
    if (!detalle || usuarioId == null || !detalle.evaluadores?.length) return null;
    // Identidad SOLO por id. Nunca por nombre: ver el encabezado de este archivo.
    return detalle.evaluadores.find((e) => (e.usuario_id ?? e.id) === usuarioId) ?? null;
}

/**
 * Peso de ordenación: lo que me falta va primero.
 *
 * Dentro de cada grupo manda la fecha de evaluación (lo más próximo antes) y,
 * a falta de fecha, el número de terna. Una terna sin fecha no se cuela por
 * delante de una que sí la tiene: la que tiene fecha es la que corre prisa.
 */
function ordenar(a: Asignacion, b: Asignacion): number {
    const peso = (x: Asignacion) =>
        x.miEstado === 'pendiente' ? 0 : x.miEstado === 'sin_identificar' ? 1 : 2;
    if (peso(a) !== peso(b)) return peso(a) - peso(b);

    const fa = a.terna.fecha_evaluacion;
    const fb = b.terna.fecha_evaluacion;
    if (fa && fb && fa !== fb) return fa < fb ? -1 : 1;
    if (fa && !fb) return -1;
    if (!fa && fb) return 1;

    return a.terna.numero - b.terna.numero;
}

/**
 * Cruza el listado acotado por el servidor con los detalles disponibles.
 *
 * `detalles` puede estar incompleto (una terna cuyo detalle falló o aún no
 * llegó): esas quedan como `sin_identificar` y siguen mostrándose. Nunca se
 * descarta una asignación por no haber podido leer su detalle — desaparecer
 * trabajo de la lista es mucho peor que mostrarlo sin estado propio.
 */
export function derivarAsignaciones(
    ternas: TernaResumen[],
    detalles: Map<number, TernaDetalle>,
    usuarioId: number | null,
): TrabajoEvaluador {
    const asignaciones: Asignacion[] = ternas.map((terna) => {
        const detalle = detalles.get(terna.id);
        const fila = miFila(detalle, usuarioId);

        const miEstado: MiEstado = fila == null
            ? 'sin_identificar'
            : fila.eval_estado === 'enviada' ? 'enviada' : 'pendiente';

        return {
            terna,
            miEstado,
            miCalificacion: fila?.calificacion ?? null,
            tengoBorrador: miEstado === 'pendiente' && fila?.calificacion != null,
            // El progreso del panel se toma del detalle cuando existe (es el
            // dato fresco) y del listado cuando no.
            enviadas: detalle?.resultado?.evaluaciones_enviadas
                ?? terna.evaluaciones_enviadas
                ?? 0,
            total: detalle?.resultado?.total_evaluadores
                ?? terna.total_evaluadores
                ?? detalle?.evaluadores?.length
                ?? 0,
        };
    });

    asignaciones.sort(ordenar);

    const huboDetalles = ternas.some((t) => detalles.has(t.id));
    const ningunaIdentificada = asignaciones.every((a) => a.miEstado === 'sin_identificar');

    return {
        asignaciones,
        pendientes: asignaciones.filter((a) => a.miEstado === 'pendiente'),
        enviadas: asignaciones.filter((a) => a.miEstado === 'enviada'),
        identidadIndeterminada: huboDetalles && asignaciones.length > 0 && ningunaIdentificada,
    };
}

// ─── Proyectos derivados de las asignaciones ────────────────────────────────

/**
 * Proyecto tal y como lo conoce un evaluador.
 *
 * ── POR QUÉ NO SE USA `GET /api/proyectos` ──────────────────────────────────
 *
 * Ese endpoint devuelve el catálogo COMPLETO —«Admin y evaluadores pueden ver
 * el listado de proyectos», sin filtro por asignación— y sus parámetros son
 * `fase`, `search`, `page` y `limit`: ninguno acota por evaluador. Pedirlo y
 * filtrar en React sería descargar trabajo ajeno para esconderlo con CSS.
 *
 * La terna ya trae lo que identifica al proyecto (título, fase, estudiante,
 * carné y foto), así que los proyectos del evaluador se derivan de sus propias
 * ternas: sin peticiones nuevas y sin ver nada que no le corresponda.
 *
 * ── LO QUE FALTA ────────────────────────────────────────────────────────────
 *
 * La terna NO trae `proyecto_id` (ni el resumen ni el detalle lo declaran), así
 * que desde aquí no se puede enlazar a la ficha del proyecto: no hay id que
 * poner en la URL. Se enlaza a la terna, que es el contexto real del trabajo.
 * Queda documentado como bloqueo del backend.
 */
export interface ProyectoAsignado {
    /** Clave estable para React: carné + fase identifican al proyecto. */
    clave: string;
    titulo: string;
    carnet: string;
    estudianteNombre: string;
    fase: FaseProyecto | null;
    fotoUrl: string | null;
    /** Ternas desde las que se llega a este proyecto (normalmente una). */
    ternas: Array<{ id: number; numero: number; estado: EstadoTerna; miEstado: MiEstado }>;
}

export function derivarProyectos(asignaciones: Asignacion[]): ProyectoAsignado[] {
    const porClave = new Map<string, ProyectoAsignado>();

    for (const a of asignaciones) {
        const t = a.terna;
        const clave = `${t.carnet}::${t.fase ?? ''}`;
        const existente = porClave.get(clave);

        if (existente) {
            existente.ternas.push({ id: t.id, numero: t.numero, estado: t.estado, miEstado: a.miEstado });
            continue;
        }

        porClave.set(clave, {
            clave,
            titulo: t.titulo,
            carnet: t.carnet,
            estudianteNombre: t.estudiante_nombre,
            fase: t.fase ?? null,
            fotoUrl: t.foto_url ?? null,
            ternas: [{ id: t.id, numero: t.numero, estado: t.estado, miEstado: a.miEstado }],
        });
    }

    return Array.from(porClave.values());
}
