/**
 * animacion.ts — Cuánto tarda de verdad en irse un elemento.
 *
 * ── POR QUÉ EXISTE ──────────────────────────────────────────────────────
 *
 * Cuando algo se va animado, React tiene que esperar a que la animación
 * termine antes de desmontarlo. Ese «cuánto» puede escribirse dos veces —una
 * en la hoja de estilos y otra en el componente— y entonces son dos verdades
 * que se desincronizan en cuanto alguien ajusta la animación.
 *
 * Ya pasó: los toasts esperaban 300ms en JavaScript mientras el CSS animaba
 * 280ms. Veinte milisegundos con el toast invisible pero todavía en el DOM.
 * Y con movimiento reducido, donde el CSS deja la animación en `none`, el
 * JavaScript seguía esperando los 300ms enteros: cerrar un aviso no hacía
 * nada durante un tercio de segundo.
 *
 * La duración se LEE del elemento. Hay una sola verdad, está en el CSS, y el
 * caso de movimiento reducido sale gratis: sin animación declarada la función
 * devuelve cero y quien llama desmonta en el acto.
 *
 * Lo usan `useOverlayTransition` (diálogos) y `ToastContext` (avisos).
 */

/** Milisegundos de una lista de tiempos CSS («140ms, 0.2s»): el mayor. */
export function mayorDuracion(valor: string): number {
    return valor
        .split(',')
        .map((t) => {
            const v = t.trim();
            if (v.endsWith('ms')) return parseFloat(v);
            if (v.endsWith('s')) return parseFloat(v) * 1000;
            return 0;
        })
        .reduce((a, b) => (Number.isFinite(b) && b > a ? b : a), 0);
}

/**
 * Cuánto tarda en irse este elemento, según el CSS que ya tiene aplicado.
 * Cero significa «no hay salida que esperar».
 */
export function duracionDeSalida(el: HTMLElement): number {
    const cs = getComputedStyle(el);
    if (cs.animationName === 'none') return 0;
    return mayorDuracion(cs.animationDuration) + mayorDuracion(cs.animationDelay);
}
