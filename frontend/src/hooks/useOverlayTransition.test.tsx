/**
 * useOverlayTransition.test.tsx
 *
 * Lo que se protege aquí no es la animación —eso se mira— sino la propiedad
 * que la hace segura: LA CAPA SIEMPRE SE VA. Una capa atascada tapa la
 * aplicación entera, así que cada camino por el que podría quedarse colgada
 * tiene su prueba: sin animación declarada, sin que llegue el aviso de fin,
 * sin nodo, y con movimiento reducido.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useOverlayTransition } from './useOverlayTransition';
import { useFocusTrap } from './useFocusTrap';

/** Duración que devolverá `getComputedStyle` en la prueba en curso. */
let animacionCss = { animationName: 'salida', animationDuration: '140ms', animationDelay: '0s' };

const originalGetComputedStyle = window.getComputedStyle;

beforeEach(() => {
    vi.useFakeTimers();
    animacionCss = { animationName: 'salida', animationDuration: '140ms', animationDelay: '0s' };
    // jsdom no aplica hojas de estilo, así que la duración se sirve aquí: es
    // exactamente el dato que el hook lee del CSS en el navegador.
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element) => ({
        ...originalGetComputedStyle(el),
        ...animacionCss,
    })) as typeof window.getComputedStyle);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

const Capa: React.FC<{ abierto: boolean }> = ({ abierto }) => {
    const { montado, saliendo, overlayRef } = useOverlayTransition(abierto);
    if (!montado) return null;
    return (
        <div ref={overlayRef} data-testid="velo" data-saliendo={saliendo}>
            contenido
        </div>
    );
};

const velo = () => screen.queryByTestId('velo');

/*
 * jsdom no trae el constructor `AnimationEvent`. El hook solo mira `target`,
 * así que un evento normal con el mismo nombre reproduce el caso con
 * fidelidad y la prueba no depende de qué versión de jsdom haya debajo.
 */
const finDeAnimacion = (nodo: Element) => {
    nodo.dispatchEvent(new Event('animationend', { bubbles: true }));
};

describe('useOverlayTransition', () => {
    it('abrir es inmediato: no hay nada que esperar', () => {
        const { rerender } = render(<Capa abierto={false} />);
        expect(velo()).toBeNull();
        rerender(<Capa abierto />);
        expect(velo()).not.toBeNull();
        expect(velo()?.dataset.saliendo).toBe('false');
    });

    it('al cerrar la capa SIGUE montada, marcada como saliendo', () => {
        // Es la razón de ser del hook: sin esto React desmonta en el acto y no
        // queda nada que animar.
        const { rerender } = render(<Capa abierto />);
        rerender(<Capa abierto={false} />);
        expect(velo()).not.toBeNull();
        expect(velo()?.dataset.saliendo).toBe('true');
    });

    it('se desmonta cuando la animación del velo termina', () => {
        const { rerender } = render(<Capa abierto />);
        const nodo = velo()!;
        rerender(<Capa abierto={false} />);

        act(() => { finDeAnimacion(nodo); });
        expect(velo()).toBeNull();
    });

    it('ignora el fin de animación de un hijo: solo manda el velo', () => {
        // Los paneles de dentro tienen su propia animación y su evento
        // burbujea. Si contara, la capa se retiraría antes de tiempo.
        const { rerender } = render(<Capa abierto />);
        const nodo = velo()!;
        const hijo = nodo.firstChild as HTMLElement ?? document.createElement('span');
        if (!nodo.contains(hijo)) nodo.appendChild(hijo);
        rerender(<Capa abierto={false} />);

        act(() => { finDeAnimacion(hijo); });
        expect(velo()).not.toBeNull();
    });

    it('si el aviso no llega, el techo de tiempo la retira igual', () => {
        // Pestaña en segundo plano, keyframe retirado por una edición futura,
        // navegador que no dispara el evento: la capa se va de todas formas.
        const { rerender } = render(<Capa abierto />);
        rerender(<Capa abierto={false} />);
        expect(velo()).not.toBeNull();

        act(() => { vi.advanceTimersByTime(140 + 150 + 1); });
        expect(velo()).toBeNull();
    });

    it('el techo respeta el retardo declarado, no solo la duración', () => {
        animacionCss = { animationName: 'salida', animationDuration: '100ms', animationDelay: '200ms' };
        const { rerender } = render(<Capa abierto />);
        rerender(<Capa abierto={false} />);

        act(() => { vi.advanceTimersByTime(250); });
        expect(velo(), 'aún dentro del retardo + duración').not.toBeNull();
        act(() => { vi.advanceTimersByTime(201); });
        expect(velo()).toBeNull();
    });

    it('de una lista de duraciones toma la mayor', () => {
        animacionCss = { animationName: 'a, b', animationDuration: '80ms, 300ms', animationDelay: '0s, 0s' };
        const { rerender } = render(<Capa abierto />);
        rerender(<Capa abierto={false} />);

        act(() => { vi.advanceTimersByTime(240); });
        expect(velo()).not.toBeNull();
        act(() => { vi.advanceTimersByTime(220); });
        expect(velo()).toBeNull();
    });

    it('sin animación declarada se desmonta en el acto', () => {
        // Es el camino de MOVIMIENTO REDUCIDO: el CSS deja `animation: none` y
        // el hook lo deduce del propio elemento, sin preguntar por la
        // preferencia por segunda vez ni esperar un evento que no vendrá.
        animacionCss = { animationName: 'none', animationDuration: '0s', animationDelay: '0s' };
        const { rerender } = render(<Capa abierto />);
        rerender(<Capa abierto={false} />);
        expect(velo()).toBeNull();
    });

    it('duración cero tampoco deja la capa esperando', () => {
        animacionCss = { animationName: 'salida', animationDuration: '0s', animationDelay: '0s' };
        const { rerender } = render(<Capa abierto />);
        rerender(<Capa abierto={false} />);
        expect(velo()).toBeNull();
    });

    it('reabrir a mitad de la salida cancela la salida', () => {
        const { rerender } = render(<Capa abierto />);
        rerender(<Capa abierto={false} />);
        expect(velo()?.dataset.saliendo).toBe('true');

        rerender(<Capa abierto />);
        expect(velo()?.dataset.saliendo).toBe('false');

        // Y el techo de la salida cancelada no puede desmontarla después.
        act(() => { vi.advanceTimersByTime(1000); });
        expect(velo()).not.toBeNull();
    });

    it('desmontar el componente durante la salida no deja temporizadores sueltos', () => {
        /*
         * Antes esta prueba solo comprobaba `not.toThrow()`, que no probaba
         * NADA: desde React 18 un setState sobre un componente desmontado es
         * un no-op silencioso —el aviso se retiró— así que pasaba igual con
         * la limpieza del efecto entera borrada.
         *
         * Se cuenta el temporizador: tiene que existir mientras la capa se va
         * y no puede sobrevivir al desmontaje.
         */
        const { rerender, unmount } = render(<Capa abierto />);
        rerender(<Capa abierto={false} />);
        expect(vi.getTimerCount(), 'el techo de la salida quedó armado').toBe(1);

        unmount();
        expect(vi.getTimerCount(), 'el desmontaje canceló el techo').toBe(0);

        // Y avanzar el reloj después no revive nada.
        expect(() => { act(() => { vi.advanceTimersByTime(1000); }); }).not.toThrow();
    });

    it('una capa que nace cerrada no monta nada', () => {
        render(<Capa abierto={false} />);
        expect(velo()).toBeNull();
        act(() => { vi.advanceTimersByTime(1000); });
        expect(velo()).toBeNull();
    });

    /* ── El montaje ocurre en el MISMO commit en que se abre ────────────
     *
     * Regresión real: la primera versión montaba desde un `useEffect`, así que
     * el render de apertura devolvía `null`. Los efectos hermanos —el
     * atrapador de foco, en el caso del diálogo— corrían con el contenedor
     * todavía vacío, se rendían en silencio y NO volvían a intentarlo, porque
     * su dependencia no había cambiado. El diálogo quedaba sin foco inicial,
     * sin Escape y sin Tab atrapado, sin un solo error en consola.
     *
     * Estas dos pruebas fijan la propiedad que lo impide.
     */

    it('el nodo ya existe cuando corren los efectos del mismo componente', () => {
        const vistos: Array<HTMLElement | null> = [];

        const Sonda: React.FC<{ abierto: boolean }> = ({ abierto }) => {
            const { montado, overlayRef } = useOverlayTransition(abierto);
            React.useEffect(() => {
                if (abierto) vistos.push(overlayRef.current);
            }, [abierto, overlayRef]);
            if (!montado) return null;
            return <div ref={overlayRef} data-testid="velo">x</div>;
        };

        const { rerender } = render(<Sonda abierto={false} />);
        rerender(<Sonda abierto />);
        expect(vistos).toHaveLength(1);
        expect(vistos[0], 'el efecto vio el nodo, no null').not.toBeNull();
    });

    it('el atrapador de foco encuentra su contenedor y mueve el foco', () => {
        // La composición exacta del diálogo: los dos hooks, en el mismo orden.
        const Dialogo: React.FC<{ abierto: boolean }> = ({ abierto }) => {
            const { montado, saliendo, overlayRef } = useOverlayTransition(abierto);
            const panelRef = useFocusTrap<HTMLDivElement>(abierto);
            if (!montado) return null;
            return (
                <div ref={overlayRef} data-testid="velo" data-saliendo={saliendo}>
                    <div ref={panelRef}>
                        <button data-autofocus data-testid="primero">Primero</button>
                    </div>
                </div>
            );
        };

        const { rerender } = render(<Dialogo abierto={false} />);
        rerender(<Dialogo abierto />);
        expect(document.activeElement).toBe(screen.getByTestId('primero'));
    });
});
