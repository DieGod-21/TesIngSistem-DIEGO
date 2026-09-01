/**
 * ToastContext.test.tsx — El ciclo de vida de un aviso.
 *
 * ── QUÉ DEFECTOS PROTEGE ────────────────────────────────────────────────
 *
 * El aviso se marcaba como saliente y se retiraba tras una constante escrita
 * en JavaScript (300ms) mientras el CSS animaba otra cosa (280ms). De ahí
 * salían tres fallos, y solo el primero era cosmético:
 *
 *   1. Veinte milisegundos con el aviso invisible pero todavía en el DOM.
 *
 *   2. CON MOVIMIENTO REDUCIDO, el CSS deja la animación en `none` pero la
 *      espera de 300ms seguía ahí: pulsar la equis no hacía NADA durante un
 *      tercio de segundo y el aviso desaparecía después, de golpe. La
 *      preferencia quitaba la animación y dejaba la espera — justo lo que no
 *      hay que hacer.
 *
 *   3. El temporizador de auto-cierre no se cancelaba al cerrar a mano, y el
 *      registro de temporizadores no se vaciaba nunca: crecía durante toda la
 *      sesión y al salir de la aplicación quedaban pendientes.
 *
 * Ahora la duración se LEE del elemento, así que hay una sola verdad y el
 * caso de movimiento reducido sale gratis.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

/** Animación que servirá `getComputedStyle` en la prueba en curso. */
let animacionCss = { animationName: 'toast-out', animationDuration: '280ms', animationDelay: '0s' };

const originalGetComputedStyle = window.getComputedStyle;

beforeEach(() => {
    vi.useFakeTimers();
    animacionCss = { animationName: 'toast-out', animationDuration: '280ms', animationDelay: '0s' };
    // jsdom no aplica hojas de estilo: se sirve aquí lo que el componente
    // leería del CSS en un navegador.
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element) => ({
        ...originalGetComputedStyle(el),
        ...animacionCss,
    })) as typeof window.getComputedStyle);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

const Disparador: React.FC = () => {
    const { toast } = useToast();
    return (
        <>
            <button data-testid="ok" onClick={() => toast.success('Guardado')}>ok</button>
            <button data-testid="fallo" onClick={() => toast.error('No se pudo')}>fallo</button>
        </>
    );
};

const montar = () => render(<ToastProvider><Disparador /></ToastProvider>);
const avisos = () => document.querySelectorAll('.toast');
const aviso = () => document.querySelector('.toast');
const lanzar = (cual = 'ok') => act(() => { fireEvent.click(screen.getByTestId(cual)); });
const cerrarAMano = () =>
    act(() => { fireEvent.click(screen.getByLabelText('Cerrar notificación')); });

/* jsdom no trae el constructor `AnimationEvent`; el componente solo mira
   `target`, así que un evento normal con el mismo nombre reproduce el caso. */
const finDeAnimacion = (nodo: Element) =>
    act(() => { nodo.dispatchEvent(new Event('animationend', { bubbles: true })); });

describe('ToastContext · ciclo de vida', () => {
    it('aparece al lanzarlo', () => {
        montar();
        expect(avisos()).toHaveLength(0);
        lanzar();
        expect(avisos()).toHaveLength(1);
        expect(aviso()).toHaveTextContent('Guardado');
    });

    it('al cerrarlo se marca saliente y SIGUE en pantalla mientras se va', () => {
        montar();
        lanzar();
        cerrarAMano();

        expect(aviso(), 'no desaparece de golpe').not.toBeNull();
        expect(aviso()).toHaveClass('toast--exit');
    });

    it('se retira cuando su animación termina, no cuando lo dice un número', () => {
        montar();
        lanzar();
        const nodo = aviso()!;
        cerrarAMano();

        finDeAnimacion(nodo);
        expect(avisos(), 'el fin de la animación lo retira').toHaveLength(0);
    });

    it('si el aviso de fin no llega, el techo de tiempo lo retira igual', () => {
        // Pestaña en segundo plano, o animación retirada por una edición
        // futura del CSS: un aviso clavado tapa la esquina de la pantalla.
        montar();
        lanzar();
        cerrarAMano();
        expect(avisos()).toHaveLength(1);

        act(() => { vi.advanceTimersByTime(280 + 120 + 1); });
        expect(avisos()).toHaveLength(0);
    });

    it('CON MOVIMIENTO REDUCIDO se retira en el acto, sin espera muerta', () => {
        /*
         * Este es el defecto que más se notaba. El CSS deja `animation: none`
         * y antes el JavaScript seguía esperando su constante: la equis no
         * respondía durante 300ms. Ahora la duración se deduce del elemento,
         * y sin animación no hay nada que esperar.
         */
        animacionCss = { animationName: 'none', animationDuration: '0s', animationDelay: '0s' };
        montar();
        lanzar();
        cerrarAMano();

        expect(avisos(), 'sin animación, se va de inmediato').toHaveLength(0);
    });

    it('cerrar a mano cancela el auto-cierre pendiente', () => {
        /*
         * El temporizador de auto-cierre seguía vivo tras cerrar a mano. Al
         * vencer volvía a pedir el cierre de un aviso que ya no existía. Se
         * comprueba que ya no queda nada programado que lo intente.
         */
        montar();
        const enReposo = vi.getTimerCount();

        lanzar();
        expect(vi.getTimerCount(), 'el auto-cierre quedó armado').toBeGreaterThan(enReposo);

        const nodo = aviso()!;
        cerrarAMano();
        finDeAnimacion(nodo);
        expect(avisos()).toHaveLength(0);

        expect(vi.getTimerCount(), 'no queda ningún temporizador suelto').toBe(enReposo);
    });

    it('el auto-cierre retira el aviso solo', () => {
        montar();
        lanzar();
        expect(avisos()).toHaveLength(1);

        act(() => { vi.advanceTimersByTime(3500); });   // duración por defecto
        expect(aviso(), 'empieza a irse').toHaveClass('toast--exit');

        act(() => { vi.advanceTimersByTime(280 + 120 + 1); });
        expect(avisos()).toHaveLength(0);
    });

    it('desmontar con avisos en pantalla no deja temporizadores vivos', () => {
        const { unmount } = montar();
        const enReposo = vi.getTimerCount();

        lanzar();
        lanzar();
        expect(vi.getTimerCount()).toBeGreaterThan(enReposo);

        unmount();
        expect(vi.getTimerCount(), 'la limpieza los cancela todos').toBe(enReposo);
    });

    it('varios avisos se apilan y cada uno se va por su cuenta', () => {
        montar();
        lanzar('ok');
        lanzar('fallo');
        expect(avisos()).toHaveLength(2);

        const primero = avisos()[0];
        act(() => { fireEvent.click(screen.getAllByLabelText('Cerrar notificación')[0]); });
        finDeAnimacion(primero);

        expect(avisos(), 'solo se fue el que se cerró').toHaveLength(1);
        expect(aviso()).toHaveTextContent('No se pudo');
    });

    it('un fallo interrumpe al lector de pantalla; una confirmación espera turno', () => {
        // Anunciar «Guardado» con la misma prioridad que un error convierte
        // cada confirmación en una interrupción.
        montar();
        lanzar('ok');
        expect(aviso()).toHaveAttribute('role', 'status');
        expect(aviso()).toHaveAttribute('aria-live', 'polite');

        lanzar('fallo');
        const error = avisos()[1];
        expect(error).toHaveAttribute('role', 'alert');
        expect(error).toHaveAttribute('aria-live', 'assertive');
    });
});
