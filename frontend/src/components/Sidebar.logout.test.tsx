/**
 * Sidebar.logout.test.tsx — Cerrar sesión es una petición, no un enlace.
 *
 * ── QUÉ DEFECTO PROTEGE ─────────────────────────────────────────────────
 *
 * `handleLogout` esperaba a `logout()` —una llamada de red— y solo después
 * navegaba. Mientras tanto el botón seguía habilitado y sin ninguna señal de
 * que algo estuviera pasando, así que dos pulsaciones impacientes lanzaban
 * DOS cierres de sesión contra el servidor.
 *
 * Y `logout()` propaga si el servidor falla (usa try/finally sin catch): la
 * promesa quedaba rechazada sin capturar, no se navegaba a ningún sitio y la
 * barra se quedaba igual que antes. Desde fuera, pulsar no hacía nada.
 *
 * Ninguna de las dos cosas se ve en una captura: hace falta un `logout` que
 * tarde y otro que falle.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

const logout = vi.fn();
const push = vi.fn();

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        capabilities: {},
        workspace: 'admin',
        logout,
    }),
}));

vi.mock('react-router-dom', async () => {
    const real = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...real,
        useHistory: () => ({ push }),
    };
});

beforeEach(() => {
    logout.mockReset();
    push.mockReset();
});

const montar = () =>
    render(<MemoryRouter initialEntries={['/dashboard']}><Sidebar /></MemoryRouter>);

// Se busca por «sesión», que está en las dos etiquetas: el nombre accesible
// cambia a «Cerrando sesión…» en cuanto empieza la petición.
const boton = () => screen.getByRole('button', { name: /sesión/i });

/** Una promesa que se resuelve cuando la prueba quiera. */
function promesaControlada<T>() {
    let resolver!: (v: T) => void;
    let rechazar!: (e: unknown) => void;
    const promesa = new Promise<T>((res, rej) => { resolver = res; rechazar = rej; });
    return { promesa, resolver, rechazar };
}

describe('Sidebar · cerrar sesión', () => {
    it('mientras la petición está en curso, lo dice y no admite otra', async () => {
        const { promesa, resolver } = promesaControlada<void>();
        logout.mockReturnValue(promesa);

        montar();
        expect(boton()).not.toBeDisabled();

        fireEvent.click(boton());

        // En curso: anunciado, visible y cerrado a más pulsaciones.
        expect(boton()).toHaveAttribute('aria-busy', 'true');
        expect(boton()).toBeDisabled();
        expect(boton()).toHaveTextContent(/cerrando sesión/i);

        // AQUÍ está el defecto: un segundo clic lanzaba otro cierre.
        fireEvent.click(boton());
        fireEvent.click(boton());
        expect(logout, 'una sola petición por mucho que se insista').toHaveBeenCalledTimes(1);

        await act(async () => { resolver(); await promesa; });
        expect(push).toHaveBeenCalledWith('/login');
    });

    it('si el servidor falla, devuelve el control en vez de quedarse mudo', async () => {
        const { promesa, rechazar } = promesaControlada<void>();
        logout.mockReturnValue(promesa);

        montar();
        fireEvent.click(boton());
        expect(boton()).toBeDisabled();

        await act(async () => {
            rechazar(new Error('servidor caído'));
            await promesa.catch(() => {});
        });

        expect(boton(), 'se puede reintentar').not.toBeDisabled();
        expect(boton()).toHaveTextContent(/cerrar sesión/i);
        expect(push, 'no se navega a ninguna parte si no se cerró').not.toHaveBeenCalled();
    });

    it('en reposo no anuncia nada', () => {
        logout.mockResolvedValue(undefined);
        montar();
        expect(boton()).not.toHaveAttribute('aria-busy');
        expect(boton()).toHaveTextContent(/cerrar sesión/i);
    });
});
