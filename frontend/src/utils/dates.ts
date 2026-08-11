/**
 * dates.ts — Formato de fechas del producto, en un único lugar.
 *
 * MOTIVO CONCRETO: una auditoría sobre el render encontró que la ficha de terna
 * imprimía el valor crudo del API en pantalla —`2025-10-01T15:30:00.000Z`—
 * mientras otras dos pantallas formateaban por su cuenta, cada una con su
 * propio helper y su propia configuración regional (`es-ES` en el panel,
 * `es-GT` en el expediente). Tres tratamientos para un mismo dato.
 *
 * La fecha llega SIEMPRE como string de un API que se consume como caja negra:
 * puede venir vacía, nula o mal formada. Formatear es por tanto una operación
 * que debe fallar de forma segura, no una interpolación.
 */

/** Configuración regional del producto (universidad guatemalteca). */
const LOCALE = 'es-GT';

/** Convierte a Date solo si el resultado es una fecha real. */
function parse(value: string | number | Date | null | undefined): Date | null {
    if (value == null || value === '') return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Fecha corta: `01 oct 2025`. Devuelve `null` si el valor no es una fecha
 * válida, para que quien llama decida qué mostrar (y nunca pinte "undefined",
 * "Invalid Date" ni el ISO crudo).
 */
export function formatShortDate(value: string | number | Date | null | undefined): string | null {
    const d = parse(value);
    if (!d) return null;
    return d.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Fecha y hora: `01 oct 2025, 15:30`. Para momentos concretos (una evaluación
 * ocurre a una hora), no para efemérides.
 */
export function formatDateTime(value: string | number | Date | null | undefined): string | null {
    const d = parse(value);
    if (!d) return null;
    return d.toLocaleString(LOCALE, {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

/**
 * Fecha larga con día de la semana, capitalizada: `Lunes, 3 de agosto`.
 * `toLocaleDateString` devuelve el día en minúscula en español; la mayúscula
 * inicial es una decisión de presentación, no del formateador del navegador.
 */
export function formatLongDate(value: string | number | Date | null | undefined): string | null {
    const d = parse(value);
    if (!d) return null;
    const s = d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Un día en milisegundos. Para convertir antigüedades expresadas en días. */
export const DAY_MS = 86_400_000;

/**
 * Antigüedad en lenguaje natural: `hace 10 meses`.
 *
 * MOTIVO CONCRETO: convivían dos formateadores relativos. «Desde tu última
 * visita» decía «hace 2 días» y la cola de trabajo decía «hace 314 d» —dos
 * abreviaturas distintas para la misma idea, y la segunda además se quedaba en
 * días para siempre: 314 días no se leen, hay que dividirlos mentalmente. La
 * escala continúa hasta meses y años, que es donde el dato vuelve a ser
 * comprensible de un vistazo.
 *
 * Los meses se aproximan a 30 días: es una antigüedad, no una fecha, y el orden
 * de magnitud es lo que se comunica.
 */
export function formatAgo(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0) return 'hace un momento';
    const min = Math.floor(ms / 60_000);
    if (min < 1) return 'hace un momento';
    if (min < 60) return `hace ${min} min`;

    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;

    const d = Math.floor(h / 24);
    if (d < 31) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;

    const meses = Math.round(d / 30);
    if (d < 365) return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;

    const años = Math.floor(d / 365);
    return `hace ${años} ${años === 1 ? 'año' : 'años'}`;
}
