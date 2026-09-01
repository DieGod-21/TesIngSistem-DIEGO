/**
 * usePrimeraLlegada.test.tsx
 *
 * Lo que se protege no es «devuelve un booleano»: es CUÁNDO cambia y, sobre
 * todo, que no vuelva atrás. Una lista que recupera la cascada al deshacer un
 * filtro es exactamente el defecto que este hook existe para cerrar.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { usePrimeraLlegada } from './usePrimeraLlegada';

/** Anfitrión mínimo: pinta la respuesta del hook para las claves que le den. */
function montar(inicial: ReadonlyArray<string | number>) {
    let poner: (c: ReadonlyArray<string | number>) => void = () => {};

    const Anfitrion: React.FC = () => {
        const [claves, setClaves] = React.useState(inicial);
        poner = setClaves;
        return <p data-testid="r">{usePrimeraLlegada(claves) ? 'primera' : 'ya-no'}</p>;
    };

    render(<Anfitrion />);
    const leer = () => screen.getByTestId('r').textContent;
    const cambiar = (c: ReadonlyArray<string | number>) => act(() => poner(c));
    return { leer, cambiar };
}

describe('usePrimeraLlegada', () => {
    it('sin datos todavía no es una llegada, y llegar no la gasta', () => {
        // Una lista vacía es «aún no ha llegado nada», no «llegó una lista
        // vacía»: si contara como llegada, el primer lote real ya vendría
        // marcado como cambio y NUNCA se escalonaría nada.
        const { leer, cambiar } = montar([]);
        expect(leer()).toBe('primera');

        cambiar([1, 2, 3]);
        expect(leer()).toBe('primera');
    });

    it('el mismo conjunto repetido no cuenta como cambio', () => {
        // Un re-render por cualquier otro motivo —abrir un diálogo, teclear en
        // un campo— no puede gastar la cascada de una lista que no ha llegado
        // todavía a pintarse.
        const { leer, cambiar } = montar([7, 8]);
        cambiar([7, 8]);
        cambiar([7, 8]);
        expect(leer()).toBe('primera');
    });

    it('en cuanto cambia el conjunto deja de ser llegada', () => {
        const { leer, cambiar } = montar([1, 2, 3]);
        cambiar([1, 3]);
        expect(leer()).toBe('ya-no');
    });

    it('y NO vuelve, aunque se recupere el conjunto original', () => {
        /*
         * La mitad que de verdad importa. Filtrar y quitar el filtro devuelve
         * exactamente las mismas claves: comparar «actual contra el primero»
         * sin recordar que ya hubo un cambio daría «primera» otra vez y la
         * cascada se reproduciría entera — el defecto medido en Proyectos
         * (ocho tarjetas) y en Usuarios (seis filas).
         */
        const { leer, cambiar } = montar([1, 2, 3]);
        cambiar([2]);
        expect(leer()).toBe('ya-no');
        cambiar([1, 2, 3]);
        expect(leer()).toBe('ya-no');
    });

    it('el orden forma parte de la identidad', () => {
        // Reordenar mueve las filas de sitio; el DOM las remonta igual que si
        // fueran otras.
        const { leer, cambiar } = montar([1, 2]);
        cambiar([2, 1]);
        expect(leer()).toBe('ya-no');
    });

    it('quedarse sin datos no reabre la cascada', () => {
        // Un filtro sin resultados vacía la lista. Al volver a haber algo eso
        // sigue sin ser una llegada.
        const { leer, cambiar } = montar([1, 2]);
        cambiar([3]);
        cambiar([]);
        cambiar([1, 2]);
        expect(leer()).toBe('ya-no');
    });
});
