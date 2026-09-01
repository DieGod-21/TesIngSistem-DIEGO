/**
 * ThemeContext.test.tsx — La ventana del cambio de tema.
 *
 * ── QUÉ PROTEGE ─────────────────────────────────────────────────────────
 *
 * El fundido de color al cambiar de tema vive en una clase que solo existe
 * MIENTRAS dura el cambio. Eso evita los dos defectos de la versión anterior
 * —una lista de selectores que envejecía y que además ralentizaba el hover
 * de todo lo que sí alcanzaba— pero mete el ciclo de vida en JavaScript, y
 * un ciclo de vida se puede romper en silencio:
 *
 *   · si la clase no se pone, no hay fundido y vuelve el salto seco;
 *   · si no se quita, TODO el producto se queda con una transición de color
 *     permanente y con `!important`, que es peor que no haber hecho nada.
 *
 * Ninguna de las dos cosas se ve en una captura de pantalla.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

const originalGetComputedStyle = window.getComputedStyle;

beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.className = '';
});

const Sonda: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    return (
        <button data-testid="toggle" onClick={toggleTheme}>{theme}</button>
    );
};

const montar = () => render(<ThemeProvider><Sonda /></ThemeProvider>);
const raiz = () => document.documentElement;
const cambiando = () => raiz().classList.contains('tema-cambiando');
const pulsar = () => act(() => { fireEvent.click(screen.getByTestId('toggle')); });

describe('ThemeContext · ventana del cambio', () => {
    it('enciende la transición al cambiar y la apaga al terminar', () => {
        montar();
        expect(cambiando(), 'en reposo no hay transición global').toBe(false);

        pulsar();
        expect(cambiando(), 'durante el cambio, sí').toBe(true);
        expect(raiz().getAttribute('data-theme')).toBe('dark');

        // 180ms del token (respaldo en jsdom, que no aplica hojas) + holgura.
        act(() => { vi.advanceTimersByTime(180 + 40 + 1); });
        expect(cambiando(), 'la clase NO puede quedarse puesta').toBe(false);
    });

    it('el tema sigue cambiando aunque el fundido no haya terminado', () => {
        // El color es decoración; el tema es estado. Uno no puede esperar al otro.
        montar();
        pulsar();
        expect(raiz().getAttribute('data-theme')).toBe('dark');
        expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('cambiar dos veces seguidas no apaga la transición a media cara', () => {
        /*
         * El segundo cambio tiene que reiniciar la cuenta. Sin cancelar el
         * temporizador anterior, el primero la apagaría en mitad del segundo
         * fundido y el usuario vería el salto seco que esto venía a quitar.
         */
        montar();
        pulsar();
        act(() => { vi.advanceTimersByTime(150); });   // aún dentro del primero
        pulsar();

        act(() => { vi.advanceTimersByTime(120); });   // el primero ya habría vencido
        expect(cambiando(), 'el temporizador viejo no puede apagar el nuevo').toBe(true);

        act(() => { vi.advanceTimersByTime(180 + 40 + 1); });
        expect(cambiando()).toBe(false);
    });

    it('lee la duración del token en vez de llevar el número repetido', () => {
        // Con una copia del número en JS, ajustar el CSS dejaría la clase
        // puesta de más o de menos sin que nada avisara.
        vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element) => ({
            ...originalGetComputedStyle(el),
            getPropertyValue: (p: string) => (p === '--tema-cambio-ms' ? ' 600ms ' : ''),
        })) as unknown as typeof window.getComputedStyle);

        montar();
        pulsar();

        act(() => { vi.advanceTimersByTime(300); });
        expect(cambiando(), 'con 600ms declarados sigue encendida a los 300').toBe(true);

        act(() => { vi.advanceTimersByTime(300 + 40 + 1); });
        expect(cambiando()).toBe(false);
    });

    it('desmontar durante el cambio no deja la clase ni el temporizador', () => {
        // Si el árbol se va con la clase puesta, queda una transición global
        // con `!important` sobre un documento que nadie va a limpiar.
        /*
         * Se identifica el temporizador POR SU DURACIÓN (la del token) y se
         * comprueba que se cancela ese. Contar los temporizadores del entorno
         * no serviría: React y jsdom arman los suyos y el total es ruido.
         */
        const armar = vi.spyOn(window, 'setTimeout');
        const cancelar = vi.spyOn(window, 'clearTimeout');

        const { unmount } = montar();
        pulsar();
        expect(cambiando()).toBe(true);

        const i = armar.mock.calls.findIndex(([, ms]) => ms === 180 + 40);
        expect(i, 'el cambio armó su temporizador con la duración del token')
            .toBeGreaterThan(-1);
        const idDelCambio = armar.mock.results[i].value;

        unmount();
        expect(cambiando(), 'la limpieza retira la clase').toBe(false);
        expect(cancelar, 'y cancela SU temporizador').toHaveBeenCalledWith(idDelCambio);
    });
});
