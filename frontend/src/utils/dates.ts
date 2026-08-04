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
