import { describe, it, expect } from 'vitest';
import { auditarElegibilidad, NOTA_MINIMA_DESCONOCIDA } from './eligibility';
import type { TesisEstudiante } from '../../../services/tesisService';

function alumno(carnet: string, over: Partial<TesisEstudiante> = {}): TesisEstudiante {
    return { carnet, nombre: `N-${carnet}`, nota_grad1: 90, nota_grad2: 90, ...over };
}

describe('auditarElegibilidad — el veredicto contra la evidencia del propio servidor', () => {
    it('no observa nada cuando cada aprobado trae ambas notas por encima del mínimo', () => {
        const a = auditarElegibilidad({
            total: 2,
            nota_minima: 70,
            estudiantes: [alumno('A1'), alumno('A2', { nota_grad1: 70, nota_grad2: 70 })],
        });
        expect(a.declarados).toBe(2);
        expect(a.sustentados).toBe(2);
        expect(a.observados).toEqual([]);
        expect(a.auditable).toBe(true);
    });

    /*
     * El caso real que motivó el módulo: contra el servidor de la UMG,
     * GET /api/tesis/aprobados devolvía 30 estudiantes y 5 de ellos no tenían
     * NINGUNA nota en PG1. El mismo servidor, preguntado por uno de ellos en
     * GET /api/tesis/estado/{carnet}, respondía «aprueba_tesis: false — No
     * tiene nota en Proyecto de Graduación I (043)».
     */
    it('observa al aprobado al que le falta una nota', () => {
        const a = auditarElegibilidad({
            total: 2,
            nota_minima: 70,
            estudiantes: [alumno('OK'), alumno('SIN-PG1', { nota_grad1: null, nota_grad2: 86 })],
        });
        expect(a.sustentados).toBe(1);
        expect(a.observados).toHaveLength(1);
        expect(a.observados[0]).toMatchObject({ carnet: 'SIN-PG1', faltan: ['PG1'], bajoMinimo: [] });
    });

    it('observa al aprobado cuya nota está por debajo del mínimo que publica el servidor', () => {
        const a = auditarElegibilidad({
            total: 1,
            nota_minima: 70,
            estudiantes: [alumno('BAJO', { nota_grad2: 61 })],
        });
        expect(a.observados[0]).toMatchObject({ carnet: 'BAJO', faltan: [], bajoMinimo: ['PG2'] });
    });

    it('acumula las dos causas en el mismo expediente sin duplicarlo', () => {
        const a = auditarElegibilidad({
            total: 1,
            nota_minima: 70,
            estudiantes: [alumno('MIXTO', { nota_grad1: null, nota_grad2: 12 })],
        });
        expect(a.observados).toHaveLength(1);
        expect(a.observados[0].faltan).toEqual(['PG1']);
        expect(a.observados[0].bajoMinimo).toEqual(['PG2']);
    });

    /*
     * El mínimo lo publica el servidor en la MISMA respuesta. Si no viene, no
     * hay regla contra la que contrastar: inventar 70 aquí sería exactamente la
     * clase de contrato imaginado que este proyecto prohíbe. Sin mínimo se
     * comparan solo las ausencias, que no dependen de ningún umbral.
     */
    it('sin mínimo publicado no juzga las notas, pero sigue detectando las que faltan', () => {
        const a = auditarElegibilidad({
            total: 2,
            nota_minima: NOTA_MINIMA_DESCONOCIDA,
            estudiantes: [alumno('BAJO', { nota_grad2: 3 }), alumno('SIN', { nota_grad1: null })],
        });
        expect(a.auditable).toBe(false);
        expect(a.observados.map((o) => o.carnet)).toEqual(['SIN']);
        expect(a.observados[0].bajoMinimo).toEqual([]);
    });

    it('una lista vacía no es una anomalía', () => {
        const a = auditarElegibilidad({ total: 0, nota_minima: 70, estudiantes: [] });
        expect(a.observados).toEqual([]);
        expect(a.sustentados).toBe(0);
        expect(a.hayObservaciones).toBe(false);
    });

    it('es pura: no muta la lista que recibe', () => {
        const entrada = { total: 1, nota_minima: 70, estudiantes: [alumno('X', { nota_grad1: null })] };
        const copia = JSON.parse(JSON.stringify(entrada));
        auditarElegibilidad(entrada);
        expect(entrada).toEqual(copia);
    });

    it('cuenta los declarados por la lista real, no por el total que anuncia el sobre', () => {
        // El `total` del servidor y la longitud del array pueden divergir si la
        // respuesta viene paginada; manda lo que de verdad se puede auditar.
        const a = auditarElegibilidad({ total: 99, nota_minima: 70, estudiantes: [alumno('A1')] });
        expect(a.declarados).toBe(1);
    });

    /* ── Identificación: de quién habla cada observación ───────────────
       La lista de tesis identifica a la gente solo por carné, y con un carné
       no se abre a nadie. Sin el cruce contra el padrón, el aviso solo podía
       dejar al usuario en una búsqueda a medio hacer. */

    it('cruza cada observación con el padrón para darle id y posición', () => {
        const a = auditarElegibilidad(
            { total: 2, nota_minima: 70, estudiantes: [alumno('B', { nota_grad1: null })] },
            [{ id: 91, carnet: 'A' }, { id: 92, carnet: 'B' }],
        );
        expect(a.observados[0].estudianteId).toBe(92);
        expect(a.observados[0].posicionPadron).toBe(1);
    });

    it('sin padrón, la observación existe igual pero sin identificar', () => {
        // No es un fallo: es el caso de siempre, y quien enruta se repliega al
        // carné. Lo que no puede pasar es que la observación desaparezca.
        const a = auditarElegibilidad({ total: 1, nota_minima: 70, estudiantes: [alumno('B', { nota_grad1: null })] });
        expect(a.hayObservaciones).toBe(true);
        expect(a.observados[0].estudianteId).toBeNull();
        expect(a.observados[0].posicionPadron).toBeNull();
    });

    it('un carné que está en tesis pero no en el padrón queda sin id', () => {
        const a = auditarElegibilidad(
            { total: 1, nota_minima: 70, estudiantes: [alumno('FANTASMA', { nota_grad1: null })] },
            [{ id: 1, carnet: 'OTRO' }],
        );
        expect(a.observados[0].estudianteId).toBeNull();
    });

    it('ante carnés repetidos en el padrón manda el primero', () => {
        // Un duplicado no puede hacer que el enlace apunte tan pronto a uno
        // como a otro segun el orden de recorrido: la regla es explícita.
        const a = auditarElegibilidad(
            { total: 1, nota_minima: 70, estudiantes: [alumno('B', { nota_grad1: null })] },
            [{ id: 5, carnet: 'B' }, { id: 6, carnet: 'B' }],
        );
        expect(a.observados[0].estudianteId).toBe(5);
    });

    it('sigue siendo pura con el padrón delante', () => {
        const padron = [{ id: 1, carnet: 'B' }];
        const copia = JSON.parse(JSON.stringify(padron));
        auditarElegibilidad({ total: 1, nota_minima: 70, estudiantes: [alumno('B', { nota_grad1: null })] }, padron);
        expect(padron).toEqual(copia);
    });
});
