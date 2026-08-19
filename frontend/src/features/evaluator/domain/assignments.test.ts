import { describe, it, expect } from 'vitest';
import { derivarAsignaciones, derivarProyectos } from './assignments';
import type { TernaDetalle, TernaResumen } from '../../../types/api';

function resumen(id: number, over: Partial<TernaResumen> = {}): TernaResumen {
    return {
        id,
        numero: id,
        estado: 'en_progreso',
        titulo: `Proyecto ${id}`,
        estudiante_nombre: `Estudiante ${id}`,
        carnet: `1890-21-${1000 + id}`,
        fase: 'PG2',
        fecha_evaluacion: null,
        total_evaluadores: 3,
        evaluaciones_enviadas: 1,
        ...over,
    };
}

function detalle(
    id: number,
    evaluadores: Array<{ usuario_id?: number; eval_estado: 'borrador' | 'enviada'; calificacion?: number | null }>,
): TernaDetalle {
    const enviadas = evaluadores.filter((e) => e.eval_estado === 'enviada').length;
    return {
        ...resumen(id),
        evaluadores: evaluadores.map((e, i) => ({
            usuario_id: e.usuario_id,
            nombre: `Evaluador ${e.usuario_id ?? i}`,
            calificacion: e.calificacion ?? null,
            comentarios: null,
            eval_estado: e.eval_estado,
        })),
        resultado: {
            promedio: null,
            resolucion: 'pendiente',
            evaluaciones_enviadas: enviadas,
            total_evaluadores: evaluadores.length,
        },
    };
}

describe('derivarAsignaciones — qué me toca a mí', () => {
    it('marca pendiente la terna donde mi fila sigue en borrador', () => {
        const t = derivarAsignaciones(
            [resumen(1)],
            new Map([[1, detalle(1, [
                { usuario_id: 7, eval_estado: 'borrador' },
                { usuario_id: 8, eval_estado: 'enviada' },
            ])]]),
            7,
        );
        expect(t.pendientes).toHaveLength(1);
        expect(t.enviadas).toHaveLength(0);
        expect(t.asignaciones[0].miEstado).toBe('pendiente');
        expect(t.identidadIndeterminada).toBe(false);
    });

    it('marca enviada la terna donde ya envié, aunque el panel siga incompleto', () => {
        const t = derivarAsignaciones(
            [resumen(1)],
            new Map([[1, detalle(1, [
                { usuario_id: 7, eval_estado: 'enviada', calificacion: 88 },
                { usuario_id: 8, eval_estado: 'borrador' },
            ])]]),
            7,
        );
        expect(t.enviadas).toHaveLength(1);
        expect(t.pendientes).toHaveLength(0);
        expect(t.asignaciones[0].miCalificacion).toBe(88);
        // El panel sigue a medias: eso es cierto y se conserva.
        expect(t.asignaciones[0].enviadas).toBe(1);
        expect(t.asignaciones[0].total).toBe(2);
    });

    it('distingue un borrador CON calificación de uno vacío', () => {
        const t = derivarAsignaciones(
            [resumen(1), resumen(2)],
            new Map([
                [1, detalle(1, [{ usuario_id: 7, eval_estado: 'borrador', calificacion: 75 }])],
                [2, detalle(2, [{ usuario_id: 7, eval_estado: 'borrador' }])],
            ]),
            7,
        );
        const uno = t.asignaciones.find((a) => a.terna.id === 1)!;
        const dos = t.asignaciones.find((a) => a.terna.id === 2)!;
        expect(uno.tengoBorrador).toBe(true);
        expect(dos.tengoBorrador).toBe(false);
    });

    /*
     * El caso que obliga a que exista `sin_identificar`: es EXACTAMENTE lo que
     * devuelve hoy el servidor real, cuyo esquema de `evaluadores[]` no declara
     * `usuario_id`.
     */
    it('no adivina mi fila cuando el contrato no trae identidad', () => {
        const t = derivarAsignaciones(
            [resumen(1)],
            new Map([[1, detalle(1, [
                { eval_estado: 'borrador' },
                { eval_estado: 'enviada' },
            ])]]),
            7,
        );
        expect(t.asignaciones[0].miEstado).toBe('sin_identificar');
        expect(t.pendientes).toHaveLength(0);
        expect(t.identidadIndeterminada).toBe(true);
    });

    it('nunca descarta una asignación por no tener su detalle', () => {
        const t = derivarAsignaciones([resumen(1), resumen(2)], new Map(), 7);
        expect(t.asignaciones).toHaveLength(2);
        expect(t.asignaciones.every((a) => a.miEstado === 'sin_identificar')).toBe(true);
        // Sin ningún detalle NO se acusa al contrato: simplemente no hay datos.
        expect(t.identidadIndeterminada).toBe(false);
    });

    it('pone primero lo que me falta, y dentro de eso lo que evalúa antes', () => {
        const t = derivarAsignaciones(
            [
                resumen(1, { fecha_evaluacion: '2025-12-01' }),
                resumen(2, { fecha_evaluacion: '2025-11-10' }),
                resumen(3, { fecha_evaluacion: '2025-11-01' }),
            ],
            new Map([
                [1, detalle(1, [{ usuario_id: 7, eval_estado: 'borrador' }])],
                [2, detalle(2, [{ usuario_id: 7, eval_estado: 'borrador' }])],
                [3, detalle(3, [{ usuario_id: 7, eval_estado: 'enviada' }])],
            ]),
            7,
        );
        // 2 y 1 están pendientes (2 antes por fecha); 3 ya enviada, al final.
        expect(t.asignaciones.map((a) => a.terna.id)).toEqual([2, 1, 3]);
    });

    it('una terna sin fecha no se adelanta a otra que sí la tiene', () => {
        const t = derivarAsignaciones(
            [resumen(1, { fecha_evaluacion: null }), resumen(2, { fecha_evaluacion: '2025-12-20' })],
            new Map([
                [1, detalle(1, [{ usuario_id: 7, eval_estado: 'borrador' }])],
                [2, detalle(2, [{ usuario_id: 7, eval_estado: 'borrador' }])],
            ]),
            7,
        );
        expect(t.asignaciones.map((a) => a.terna.id)).toEqual([2, 1]);
    });

    it('sin sesión no inventa pendientes', () => {
        const t = derivarAsignaciones(
            [resumen(1)],
            new Map([[1, detalle(1, [{ usuario_id: 7, eval_estado: 'borrador' }])]]),
            null,
        );
        expect(t.pendientes).toHaveLength(0);
        expect(t.asignaciones[0].miEstado).toBe('sin_identificar');
    });

    it('con cero asignaciones no declara el contrato roto', () => {
        const t = derivarAsignaciones([], new Map(), 7);
        expect(t.asignaciones).toEqual([]);
        expect(t.identidadIndeterminada).toBe(false);
    });
});

describe('derivarProyectos — los proyectos salen de MIS ternas, no del catálogo', () => {
    it('convierte cada terna en su proyecto', () => {
        const { asignaciones } = derivarAsignaciones([resumen(1), resumen(2)], new Map(), 7);
        const p = derivarProyectos(asignaciones);
        expect(p).toHaveLength(2);
        expect(p[0].titulo).toBe(p[0].titulo);
        expect(p.every((x) => x.ternas.length === 1)).toBe(true);
    });

    it('agrupa en un solo proyecto las ternas del mismo estudiante y fase', () => {
        const { asignaciones } = derivarAsignaciones(
            [
                resumen(1, { carnet: '1890-21-5000', fase: 'PG2' }),
                resumen(2, { carnet: '1890-21-5000', fase: 'PG2' }),
            ],
            new Map(),
            7,
        );
        const p = derivarProyectos(asignaciones);
        expect(p).toHaveLength(1);
        expect(p[0].ternas.map((t) => t.id).sort()).toEqual([1, 2]);
    });

    it('separa las dos fases del mismo estudiante', () => {
        const { asignaciones } = derivarAsignaciones(
            [
                resumen(1, { carnet: '1890-21-5000', fase: 'PG1' }),
                resumen(2, { carnet: '1890-21-5000', fase: 'PG2' }),
            ],
            new Map(),
            7,
        );
        expect(derivarProyectos(asignaciones)).toHaveLength(2);
    });
});
