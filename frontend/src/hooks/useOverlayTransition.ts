/**
 * useOverlayTransition.ts — Ciclo de vida de una capa que se abre y se cierra.
 *
 * ── QUÉ PROBLEMA RESUELVE ───────────────────────────────────────────────
 *
 * Los diálogos del producto entran animados y se van de golpe:
 *
 *     abrir → entrada animada → interacción → cerrar → desmontaje INMEDIATO
 *
 * La asimetría se nota. Al abrir, la capa se presenta y el ojo la sigue; al
 * cerrar desaparece entre dos cuadros y el contexto de debajo reaparece sin
 * que nadie lo haya anunciado. Es la diferencia entre cerrar una puerta y que
 * la puerta deje de existir.
 *
 * El estorbo no es la animación —CSS la hace en cuatro líneas— sino que React
 * desmonta el componente en cuanto `open` pasa a false, así que no queda nada
 * que animar. Este hook posee esa ventana: mantiene la capa montada mientras
 * se va, y la retira cuando termina.
 *
 *     abrir → entrada → interacción → cierre → SALIDA animada → desmontaje
 *
 * ── POR QUÉ NO GSAP ─────────────────────────────────────────────────────
 *
 * Se evaluó. Una salida de diálogo son dos elementos, una duración y ningún
 * valor dinámico: no hay orquestación que coordinar ni recorrido que revertir,
 * que es donde una librería de animación gana. Lo único que CSS no podía hacer
 * era retrasar el desmontaje, y eso es estado de React —este hook— no motor de
 * animación. Añadir una dependencia para un fundido de 140ms sería pagar peso
 * de bundle por nada.
 *
 * Lo que SÍ justificaría revisarlo: salidas interrumpibles que deban invertirse
 * a mitad de camino, transiciones de elemento compartido (FLIP) entre la fila
 * de una lista y su panel, o escalonados con número de elementos variable.
 *
 * ── LA PROPIEDAD QUE NO SE PUEDE PERDER ─────────────────────────────────
 *
 * Una capa atascada tapa la aplicación entera. Por eso el desmontaje NUNCA
 * depende de un solo aviso: se escucha el fin de la animación y además se pone
 * un techo de tiempo. Si la animación no existe (movimiento reducido), si el
 * navegador no dispara el evento o si una edición futura del CSS quita el
 * keyframe, la capa se cierra igual.
 *
 * El techo se DEDUCE del CSS ya aplicado en vez de escribirse aquí como
 * número: así no hay dos verdades que se puedan desincronizar, y el caso de
 * movimiento reducido —donde el CSS deja la duración en cero— sale gratis.
 *
 * ── USO ─────────────────────────────────────────────────────────────────
 *
 *     const { montado, saliendo, overlayRef } = useOverlayTransition(open);
 *     if (!montado) return null;
 *     return createPortal(
 *         <div ref={overlayRef}
 *              className={`ui-modal-overlay${saliendo ? ' ui-modal-overlay--saliendo' : ''}`}
 *              aria-hidden={saliendo || undefined}>
 *             <div className={`ui-modal${saliendo ? ' ui-modal--saliendo' : ''}`}>…</div>
 *         </div>, document.body);
 *
 * El foco NO espera a la salida: el atrapador se desactiva en cuanto `open`
 * pasa a false y devuelve el foco a quien abrió. Quien usa teclado recupera el
 * control de inmediato mientras la capa termina de irse.
 */

import { useEffect, useRef, useState } from 'react';

/** Margen sobre la duración declarada antes de retirar la capa por las malas. */
const HOLGURA_MS = 150;

/** Milisegundos de una lista de tiempos CSS («140ms, 0.2s»): el mayor. */
function mayorDuracion(valor: string): number {
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
 * Cuánto tarda de verdad en irse este elemento, según el CSS que ya tiene
 * aplicado. Cero significa «no hay salida que esperar».
 */
function duracionDeSalida(el: HTMLElement): number {
    const cs = getComputedStyle(el);
    if (cs.animationName === 'none') return 0;
    return mayorDuracion(cs.animationDuration) + mayorDuracion(cs.animationDelay);
}

export interface OverlayTransition {
    /** ¿Hay que renderizar la capa? Incluye el tramo de salida. */
    montado: boolean;
    /** ¿Se está yendo? Gobierna la clase de salida y `aria-hidden`. */
    saliendo: boolean;
    /** Va en el elemento MÁS EXTERNO de la capa (el velo). */
    overlayRef: React.RefObject<HTMLDivElement | null>;
}

export function useOverlayTransition(abierto: boolean): OverlayTransition {
    /*
     * ── POR QUÉ ESTO SE AJUSTA DURANTE EL RENDER Y NO EN UN EFECTO ──────
     *
     * La primera versión montaba la capa desde un `useEffect`. Parecía
     * inofensivo y rompía la accesibilidad entera del diálogo:
     *
     *   1. `open` pasa a true → el render devuelve null (aún no hay montaje)
     *   2. corren los efectos → el atrapador de foco busca su contenedor…
     *      y no hay nodo, así que se rinde en silencio
     *   3. este efecto monta la capa → segundo render, ya con DOM
     *   4. el atrapador NO vuelve a correr: su dependencia (`open`) no cambió
     *
     * Resultado: diálogo sin foco inicial, sin cierre con Escape y sin Tab
     * atrapado. Nada fallaba en consola; simplemente el teclado dejaba de
     * servir. Lo cazó la prueba de navegador, no el compilador.
     *
     * Ajustar el estado DURANTE el render —el patrón que React documenta para
     * reaccionar a un cambio de prop— hace que el montaje ocurra en el mismo
     * commit en que `open` se vuelve true. Cuando los efectos corren, el nodo
     * ya existe. React descarta el render intermedio sin pintarlo, así que
     * tampoco hay parpadeo.
     */
    const [saliendo, setSaliendo] = useState(false);
    const [abiertoPrevio, setAbiertoPrevio] = useState(abierto);
    const overlayRef = useRef<HTMLDivElement | null>(null);

    if (abiertoPrevio !== abierto) {
        setAbiertoPrevio(abierto);
        // Cerrar abre la ventana de salida; reabrir la cancela.
        setSaliendo(!abierto);
    }

    const montado = abierto || saliendo;

    useEffect(() => {
        if (!saliendo) return;

        const el = overlayRef.current;
        // Sin nodo no hay animación posible ni forma de escucharla.
        if (!el) { setSaliendo(false); return; }

        /*
         * La duración se lee UNA vez, al empezar la salida, y no en cada
         * cuadro: medir el layout repetidamente es justo lo que encarece una
         * animación. Aquí es una sola lectura por cierre.
         */
        const total = duracionDeSalida(el);
        if (total <= 0) { setSaliendo(false); return; }

        let vivo = true;
        const terminar = () => {
            if (!vivo) return;
            vivo = false;
            setSaliendo(false);
        };

        // El evento burbujea desde los hijos, que tienen su propia animación;
        // solo cuenta la del velo, que es el elemento que envuelve a todo.
        const alTerminar = (e: AnimationEvent) => {
            if (e.target === el) terminar();
        };

        el.addEventListener('animationend', alTerminar);
        // Techo: si el aviso no llega —pestaña en segundo plano, animación
        // retirada por CSS, navegador que no dispara el evento— la capa se
        // retira igual. Una capa atascada tapa la aplicación entera.
        const techo = window.setTimeout(terminar, total + HOLGURA_MS);

        return () => {
            vivo = false;
            el.removeEventListener('animationend', alTerminar);
            window.clearTimeout(techo);
        };
    }, [saliendo]);

    return { montado, saliendo, overlayRef };
}
