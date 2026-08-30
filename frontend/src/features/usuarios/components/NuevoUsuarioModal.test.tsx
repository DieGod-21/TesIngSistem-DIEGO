/**
 * NuevoUsuarioModal.test.tsx — El contenido sobrevive a la salida.
 *
 * ── QUÉ DEFECTO PROTEGE ─────────────────────────────────────────────────
 *
 * Cerrar dejó de desmontar en el acto: la capa sobrevive lo que dura su
 * animación de salida. Cuatro diálogos vaciaban su formulario DENTRO del
 * manejador de cierre, justo antes de avisar al padre, así que el vaciado y
 * el inicio de la salida caían en el mismo lote de React y el usuario se
 * quedaba mirando su propio texto desaparecer ANTES que el diálogo.
 *
 * La curva de salida es de aceleración: a mitad de camino la capa sigue al
 * ~68 % de opacidad, así que el formulario en blanco se lee perfectamente.
 * Se percibía como pérdida de datos, no como pulido — peor que el desmontaje
 * instantáneo que sustituyó.
 *
 * El arreglo mueve el vaciado a la APERTURA. Estas pruebas fijan las dos
 * mitades: que el contenido aguanta la salida, y que el diálogo sigue
 * naciendo limpio (que es lo que el vaciado tenía que garantizar).
 *
 * ── POR QUÉ SE CIERRA PULSANDO, Y NO CAMBIANDO LA PROP ───────────────────
 *
 * El defecto vive en `handleClose`, que corre ANTES de avisar al padre. Una
 * prueba que se limite a pasar `open={false}` se salta ese manejador entero y
 * pasa igual con el defecto puesto — se comprobó. Hay que cerrar por donde
 * cierra el usuario para que el vaciado y el cierre caigan en el mismo lote.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import NuevoUsuarioModal from './NuevoUsuarioModal';

const originalGetComputedStyle = window.getComputedStyle;

beforeEach(() => {
    vi.useFakeTimers();
    /*
     * jsdom no aplica hojas de estilo, así que `animationName` llega vacío y
     * el hook deduciría duración cero: la capa se desmontaría en el acto y no
     * habría ventana de salida que observar. Se sirve aquí la misma animación
     * que declara ui.css.
     */
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element) => ({
        ...originalGetComputedStyle(el),
        animationName: 'ui-overlay-out',
        animationDuration: '140ms',
        animationDelay: '0s',
    })) as typeof window.getComputedStyle);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

/** El diálogo gobernado por su padre, como en la pantalla real. */
const Anfitrion: React.FC = () => {
    const [open, setOpen] = React.useState(true);
    return (
        <>
            <button type="button" data-testid="reabrir" onClick={() => setOpen(true)}>
                reabrir
            </button>
            <NuevoUsuarioModal open={open} onClose={() => setOpen(false)} onCreated={() => {}} />
        </>
    );
};

const nombre = () => screen.queryByLabelText(/nombre/i) as HTMLInputElement | null;
const velo = () => document.querySelector('.ui-modal-overlay');
const escribirNombre = (texto: string) =>
    act(() => { fireEvent.change(nombre()!, { target: { value: texto } }); });
const pulsarCerrar = () =>
    act(() => { fireEvent.click(screen.getByLabelText('Cerrar')); });

describe('NuevoUsuarioModal · ventana de salida', () => {
    it('conserva lo escrito mientras el diálogo se va', () => {
        render(<Anfitrion />);
        escribirNombre('Ana Pérez');
        expect(nombre()!.value).toBe('Ana Pérez');

        pulsarCerrar();

        // La capa entra en su ventana de salida…
        expect(velo(), 'sigue montada mientras se va').not.toBeNull();
        expect(velo()).toHaveClass('ui-modal-overlay--saliendo');

        // …y AQUÍ está el defecto: el nombre tiene que seguir escrito.
        expect(nombre(), 'el campo sigue en el DOM').not.toBeNull();
        expect(nombre()!.value, 'el texto no se borra durante el fundido').toBe('Ana Pérez');

        // Sigue ahí a mitad del fundido, que es cuando más se ve.
        act(() => { vi.advanceTimersByTime(70); });
        expect(nombre()!.value).toBe('Ana Pérez');

        // Y al final se desmonta del todo.
        act(() => { vi.advanceTimersByTime(140 + 150); });
        expect(velo(), 'termina de irse').toBeNull();
    });

    it('vuelve a abrirse limpio: el vaciado se movió, no se perdió', () => {
        render(<Anfitrion />);
        escribirNombre('Ana Pérez');
        pulsarCerrar();

        act(() => { vi.advanceTimersByTime(140 + 150); });
        expect(velo()).toBeNull();

        act(() => { fireEvent.click(screen.getByTestId('reabrir')); });
        expect(nombre()!.value, 'el diálogo nace vacío').toBe('');
    });
});
