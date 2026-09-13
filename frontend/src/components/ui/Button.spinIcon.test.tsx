/**
 * Button.spinIcon.test.tsx
 *
 * `loading` a secas añade un spinner APARTE (`.ui-btn__spinner`) sin quitar
 * nada del resto del contenido: en un botón de refrescar, con icono y texto
 * ya presentes, eso suma un elemento de más al `inline-flex` y el botón
 * cambia de ancho al entrar y salir de carga.
 *
 * `spinIcon` es la alternativa para ese caso: rota el icono que el botón ya
 * trae en vez de añadir uno nuevo. Se fija aquí que las dos mitades se
 * cumplan a la vez — ni spinner de más, ni falta de señal de carga — porque
 * arreglar solo una deja la otra en pie.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Button from './Button';

const Icono = () => <svg data-testid="icono" />;

describe('Button — spinIcon', () => {
    it('con loading + spinIcon no añade el spinner aparte', () => {
        render(<Button loading spinIcon><Icono /> Refrescar</Button>);
        expect(document.querySelector('.ui-btn__spinner')).toBeNull();
        expect(screen.getByTestId('icono')).toBeInTheDocument();
    });

    it('con loading + spinIcon el botón lleva la clase que rota el icono', () => {
        render(<Button loading spinIcon><Icono /> Refrescar</Button>);
        expect(screen.getByRole('button')).toHaveClass('ui-btn--spin-icon');
    });

    it('sin spinIcon, loading sigue mostrando el spinner de siempre', () => {
        render(<Button loading><Icono /> Refrescar</Button>);
        expect(document.querySelector('.ui-btn__spinner')).not.toBeNull();
        expect(screen.getByRole('button')).not.toHaveClass('ui-btn--spin-icon');
    });

    it('spinIcon sin loading no activa nada', () => {
        render(<Button spinIcon><Icono /> Refrescar</Button>);
        expect(document.querySelector('.ui-btn__spinner')).toBeNull();
        expect(screen.getByRole('button')).not.toHaveClass('ui-btn--spin-icon');
    });

    it('loading (con o sin spinIcon) deshabilita el botón igual que antes', () => {
        render(<Button loading spinIcon><Icono /> Refrescar</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
        expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });
});
