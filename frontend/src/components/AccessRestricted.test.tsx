/**
 * AccessRestricted.test.tsx
 *
 * El estado restringido era el único final del producto sin salida: los
 * vacíos ofrecen «Limpiar filtros» y los errores «Reintentar», y aquí no
 * había más camino que la barra lateral.
 *
 * Se fijan las DOS mitades: que el mensaje siga intacto —el arreglo no puede
 * disolver la explicación— y que la salida exista y lleve al panel. Mirar
 * solo la segunda dejaría pasar un botón que sustituyera al texto.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import AccessRestricted from './AccessRestricted';

/** Renderiza el estado y devuelve el lector de la ruta actual. */
function montar(ui: React.ReactElement) {
    const visto = { ruta: '/reports' };
    render(
        <MemoryRouter initialEntries={['/reports']}>
            {ui}
            <Route path="*" render={({ location }) => { visto.ruta = location.pathname; return null; }} />
        </MemoryRouter>,
    );
    return visto;
}

describe('AccessRestricted', () => {
    it('mantiene el mensaje que explica por qué no se ve la sección', () => {
        montar(<AccessRestricted />);
        expect(screen.getByText('Acceso restringido')).toBeInTheDocument();
        expect(screen.getByText('Esta sección es solo para administradores.')).toBeInTheDocument();
    });

    it('respeta un mensaje contextual propio', () => {
        montar(<AccessRestricted description="Solo coordinación puede ver esto." />);
        expect(screen.getByText('Solo coordinación puede ver esto.')).toBeInTheDocument();
    });

    it('ofrece una salida visible', () => {
        montar(<AccessRestricted />);
        expect(screen.getByRole('button', { name: /ir al inicio/i })).toBeInTheDocument();
    });

    it('la salida lleva al panel de control', () => {
        const visto = montar(<AccessRestricted />);
        fireEvent.click(screen.getByRole('button', { name: /ir al inicio/i }));
        expect(visto.ruta).toBe('/dashboard');
    });
});
