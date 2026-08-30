/**
 * EligibilityAudit.test.tsx
 *
 * El bloque de «expedientes por revisar» informa de TRABAJO, no de una avería.
 * Aquí se fija lo que eso significa en el marcado, que es donde puede volver a
 * torcerse:
 *
 *   · no se anuncia como alerta (nada de `role="alert"`): no interrumpe;
 *   · la acción es «Revisar», nunca «Reintentar»: los datos llegaron bien;
 *   · la cifra encabeza y coincide con lo que se lista;
 *   · con un solo expediente el texto va en singular.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EligibilityAudit from './EligibilityAudit';
import type { AuditoriaElegibilidad, ObservacionElegibilidad } from '../domain/eligibility';

/** Observado mínimo: le falta la nota de PG2 pese a constar como elegible. */
function obs(n: number): ObservacionElegibilidad {
    return {
        carnet: `1890-20-${10000 + n}`,
        nombre: `Estudiante ${n}`,
        faltan: ['PG2'],
        bajoMinimo: [],
        estudianteId: n,
        posicionPadron: n - 1,
    };
}

function auditoria(cuantos: number): AuditoriaElegibilidad {
    const observados = Array.from({ length: cuantos }, (_, i) => obs(i + 1));
    return {
        declarados: cuantos,
        sustentados: 0,
        observados,
        auditable: true,
        hayObservaciones: cuantos > 0,
    };
}

const pinta = (a: AuditoriaElegibilidad | null) =>
    render(<MemoryRouter><EligibilityAudit auditoria={a} /></MemoryRouter>);

describe('EligibilityAudit — trabajo pendiente, no avería', () => {
    it('no se dibuja cuando la cohorte está sana', () => {
        const { container } = pinta(auditoria(0));
        expect(container).toBeEmptyDOMElement();
        pinta(null);
        expect(document.querySelector('.elig-audit')).toBeNull();
    });

    it('NO se anuncia como alerta: informa, no interrumpe', () => {
        pinta(auditoria(4));
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('la acción es revisar, jamás reintentar', () => {
        pinta(auditoria(4));
        expect(screen.getByRole('link', { name: /Revisar en el padrón/ })).toBeInTheDocument();
        expect(screen.queryByText(/Reintentar/i)).toBeNull();
    });

    it('la cifra encabeza y coincide con las filas que lista', () => {
        const { container } = pinta(auditoria(4));
        expect(container.querySelector('.elig-audit__cifra')).toHaveTextContent('4');
        expect(container.querySelectorAll('.elig-audit__row')).toHaveLength(4);
    });

    it('con un solo expediente, el texto va en singular', () => {
        pinta(auditoria(1));
        expect(screen.getByText('expediente por revisar')).toBeInTheDocument();
        expect(screen.getByText(/^Consta como elegible para tesis/)).toBeInTheDocument();
    });

    it('con muchos, pliega la cola y el control de desplegar sobrevive al uso', () => {
        const { container } = pinta(auditoria(9));
        // Seis a la vista, tres plegados.
        expect(container.querySelectorAll('.elig-audit__row')).toHaveLength(6);

        const mas = screen.getByRole('button', { name: 'Ver 3 más' });
        fireEvent.click(mas);
        expect(container.querySelectorAll('.elig-audit__row')).toHaveLength(9);

        // El control NO se desmonta al usarlo: con teclado, desmontarlo deja el
        // foco en el <body> y hay que recorrer la página otra vez.
        const menos = screen.getByRole('button', { name: 'Ver menos' });
        expect(menos).toBe(mas);
        expect(menos).toHaveAttribute('aria-expanded', 'true');
    });

    it('cada fila enlaza por identificador y dice por qué está ahí', () => {
        const { container } = pinta(auditoria(2));
        const fila = container.querySelector('.elig-audit__link')!;
        // Nunca por nombre: dos homónimos abrirían el expediente equivocado.
        expect(fila.getAttribute('href')).toMatch(/preview=\d+/);
        expect(fila.getAttribute('aria-label')).toMatch(/carné .*: .*\. Abrir en el padrón\.$/);
        expect(within(fila as HTMLElement).getByText('Estudiante 1')).toBeInTheDocument();
    });
});
