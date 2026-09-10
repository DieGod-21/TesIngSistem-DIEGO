/**
 * useOverlayTransition — mantiene una capa montada mientras se va.
 *
 * React desmonta en cuanto `open` pasa a false, así que sin esto no queda nada
 * que animar en el cierre. El hook posee esa ventana y retira la capa al
 * terminar.
 *
 * El desmontaje no depende de un solo aviso: se escucha el fin de la animación
 * y además se aplica un techo de tiempo, porque una capa atascada tapa la
 * aplicación entera. El techo se deduce del CSS aplicado en vez de fijarse
 * aquí, para que no haya dos duraciones que desincronizar.
 *
 *     const { montado, saliendo, overlayRef } = useOverlayTransition(open);
 */

import { useEffect, useRef, useState } from 'react';
import { duracionDeSalida } from '../utils/animacion';

/** Margen sobre la duración declarada antes de retirar la capa por las malas. */
const HOLGURA_MS = 150;

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
