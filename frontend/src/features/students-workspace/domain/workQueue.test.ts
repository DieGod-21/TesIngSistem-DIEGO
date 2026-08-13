import { describe, it, expect } from 'vitest';
import { deriveWorkQueue } from './workQueue';
import type { WorkspaceDatasets } from './types';
import type { Estudiante, TernaResumen, ReporteTernaItem } from '../../../types/api';
import type { TesisEstudiante } from '../../../services/tesisService';

// ─── Builders de fixtures ────────────────────────────────────────────────────
function student(carnet: string, nombre: string): Estudiante {
    return { id: Number(carnet.replace(/\D/g, '')) || 0, carnet, nombre, email: '', carrera: '', activo: true };
}
function tesis(carnet: string, over: Partial<TesisEstudiante> = {}): TesisEstudiante {
    return { carnet, nombre: `N-${carnet}`, nota_grad1: null, nota_grad2: null, ...over };
}
function terna(carnet: string, over: Partial<TernaResumen> = {}): TernaResumen {
    return {
        id: 100, numero: 1, estado: 'en_progreso', titulo: 'T', estudiante_nombre: `N-${carnet}`, carnet,
        total_evaluadores: 3, evaluaciones_enviadas: 0, fecha_evaluacion: null, ...over,
    };
}
function reporteItem(carnet: string, over: Partial<ReporteTernaItem> = {}): ReporteTernaItem {
    return { terna_id: 100, numero: 1, carnet, estudiante: `N-${carnet}`, titulo: 'T', promedio: null, resolucion: 'pendiente', ...over };
}
function datasets(over: Partial<WorkspaceDatasets> = {}): WorkspaceDatasets {
    return { students: [], tesisAprobados: [], tesisReprobados: [], notaMinimaTesis: 70, ternas: [], reporteTernas: [], ...over };
}

describe('deriveWorkQueue — derivación e integración', () => {
    it('genera un ítem por cada etapa accionable y ninguno para las sanas', () => {
        const d = datasets({
            students: [
                student('A1', 'Ana'),      // pg1 faltante → registrar_nota_pg1
                student('A2', 'Beto'),     // pg2 faltante → registrar_nota_pg2
                student('A3', 'Ceci'),     // no elegible  → revisar_no_elegible
                student('A4', 'Dani'),     // elegible sin caso → crear_caso
                student('A5', 'Eva'),      // terna estancada → terna_estancada
                student('A6', 'Fito'),     // terna sana en progreso → (sin ítem)
                student('A7', 'Gaby'),     // resuelto → cerrar_resolucion
                student('A8', 'Hugo'),     // sin datos → (sin ítem)
            ],
            tesisReprobados: [
                tesis('A1', { nota_grad1: null }),                 // PG1 falta
                tesis('A2', { nota_grad1: 90, estado_grad1: 'APROBADO', nota_grad2: null }), // PG2 falta
                tesis('A3', { nota_grad1: 90, estado_grad1: 'APROBADO', nota_grad2: 85, estado_grad2: 'APROBADO' }), // ambos ok → no_elegible
            ],
            tesisAprobados: [tesis('A4', { nota_grad1: 95, estado_grad1: 'APROBADO', nota_grad2: 95, estado_grad2: 'APROBADO' })],
            ternas: [
                terna('A5', { id: 105, evaluaciones_enviadas: 1, total_evaluadores: 3 }),
                terna('A6', { id: 106, evaluaciones_enviadas: 3, total_evaluadores: 3 }),
                terna('A7', { id: 107, estado: 'completada' }),
            ],
        });

        const res = deriveWorkQueue(d);
        const byCarnet = Object.fromEntries(res.items.map((i) => [i.carnet, i.kind]));

        expect(byCarnet).toEqual({
            A1: 'registrar_nota_pg1',
            A2: 'registrar_nota_pg2',
            A3: 'revisar_no_elegible',
            A4: 'crear_caso',
            A5: 'terna_estancada',
            A7: 'cerrar_resolucion',
        });
        // A6 (terna sana) y A8 (sin datos) NO generan ítem de trabajo.
        expect(res.items.find((i) => i.carnet === 'A6')).toBeUndefined();
        expect(res.items.find((i) => i.carnet === 'A8')).toBeUndefined();
    });

    it('ordena por prioridad y desempata por carnet de forma determinista', () => {
        const d = datasets({
            students: [student('Z1', 'Z'), student('M1', 'M'), student('A9', 'A')],
            // Dos con la misma prioridad (ambos pg1) + uno más urgente (terna_estancada).
            tesisReprobados: [tesis('Z1'), tesis('A9')],
            ternas: [terna('M1', { id: 200, evaluaciones_enviadas: 0, total_evaluadores: 2 })],
        });
        const res = deriveWorkQueue(d);
        expect(res.items.map((i) => i.carnet)).toEqual(['M1', 'A9', 'Z1']);
        // Misma entrada → mismo orden (idempotente).
        expect(deriveWorkQueue(d).items.map((i) => i.id)).toEqual(res.items.map((i) => i.id));
    });

    it('reporta cobertura y pulso por etapa sobre la matrícula completa', () => {
        const d = datasets({
            students: [student('C1', 'x'), student('C2', 'y'), student('C3', 'z')],
            tesisAprobados: [tesis('C1', { nota_grad1: 90, estado_grad1: 'APROBADO', nota_grad2: 90, estado_grad2: 'APROBADO' })],
            // C2 y C3 sin estado en ninguna fuente → sin_datos.
        });
        const res = deriveWorkQueue(d);
        expect(res.coverage).toEqual({ totalStudents: 3, withStatus: 1, withoutStatus: 2 });
        expect(res.stageCounts.elegible_sin_caso).toBe(1);
        expect(res.stageCounts.sin_datos).toBe(2);
    });

    it('incluye carnets presentes en ternas/tesis aunque falten en el padrón (cobertura por unión)', () => {
        const d = datasets({
            students: [], // padrón vacío
            ternas: [terna('X9', { id: 300, evaluaciones_enviadas: 0, total_evaluadores: 3 })],
        });
        const res = deriveWorkQueue(d);
        expect(res.coverage.totalStudents).toBe(1);
        const item = res.items.find((i) => i.carnet === 'X9');
        expect(item?.kind).toBe('terna_estancada');
        expect(item?.nombre).toBe('N-X9'); // nombre tomado de la terna al faltar el padrón
    });

    it('ante múltiples ternas por carnet, usa la de mayor número', () => {
        const d = datasets({
            students: [student('R1', 'Rita')],
            ternas: [
                terna('R1', { id: 401, numero: 1, estado: 'completada' }),
                terna('R1', { id: 402, numero: 2, estado: 'en_progreso', evaluaciones_enviadas: 0, total_evaluadores: 3 }),
            ],
        });
        const res = deriveWorkQueue(d);
        const item = res.items.find((i) => i.carnet === 'R1');
        expect(item?.kind).toBe('terna_estancada');   // ganó la terna numero 2
        expect(item?.target.ternaId).toBe(402);
    });

    it('la resolución del reporte global asciende a resuelto (join por terna_id)', () => {
        const d = datasets({
            students: [student('P1', 'Pao')],
            ternas: [terna('P1', { id: 500, estado: 'en_progreso', evaluaciones_enviadas: 3, total_evaluadores: 3 })],
            reporteTernas: [reporteItem('P1', { terna_id: 500, resolucion: 'aprueba_tesis' })],
        });
        const res = deriveWorkQueue(d);
        const item = res.items.find((i) => i.carnet === 'P1');
        expect(item?.kind).toBe('cerrar_resolucion');
        expect(item?.target).toEqual({ kind: 'terna_detail', carnet: 'P1', ternaId: 500 });
    });

    it('marca self-clearing y propaga timestamp de terna para aging', () => {
        const d = datasets({
            students: [student('S1', 'Sol'), student('S2', 'Tom')],
            tesisReprobados: [tesis('S1')], // pg1 → self-clearing, sin timestamp
            ternas: [terna('S2', { id: 600, evaluaciones_enviadas: 1, total_evaluadores: 3, fecha_evaluacion: '2026-07-01' })],
        });
        const res = deriveWorkQueue(d);
        const pg1 = res.items.find((i) => i.carnet === 'S1')!;
        const est = res.items.find((i) => i.carnet === 'S2')!;
        expect(pg1.selfClearing).toBe(true);
        expect(pg1.timestamp).toBeNull();
        expect(est.selfClearing).toBe(false);
        expect(est.timestamp).toBe('2026-07-01');
    });

    it('con `now`, prioriza por antigüedad dentro de la misma prioridad (más viejo primero)', () => {
        const now = Date.parse('2026-07-25');
        const d = datasets({
            students: [student('NEW', 'Nuevo'), student('OLD', 'Viejo')],
            ternas: [
                terna('NEW', { id: 1, evaluaciones_enviadas: 0, total_evaluadores: 3, fecha_evaluacion: '2026-07-20' }),
                terna('OLD', { id: 2, evaluaciones_enviadas: 0, total_evaluadores: 3, fecha_evaluacion: '2026-06-01' }),
            ],
        });
        const res = deriveWorkQueue(d, { now });
        // Ambos terna_estancada (misma prioridad) → gana el más antiguo pese al carnet.
        expect(res.items.map((i) => i.carnet)).toEqual(['OLD', 'NEW']);
        const old = res.items.find((i) => i.carnet === 'OLD')!;
        expect(old.ageDays).toBe(Math.floor((now - Date.parse('2026-06-01')) / 86_400_000));
    });

    it('sin `now`, el aging queda deshabilitado (ageDays null) y no altera el orden', () => {
        const d = datasets({
            students: [student('T1', 'x')],
            ternas: [terna('T1', { id: 9, evaluaciones_enviadas: 0, total_evaluadores: 3, fecha_evaluacion: '2026-06-01' })],
        });
        const res = deriveWorkQueue(d);
        expect(res.items[0].ageDays).toBeNull();
    });

    it('resuelve studentId desde el padrón (y lo omite si el carnet no está en él)', () => {
        const d = datasets({
            students: [{ id: 777, carnet: 'K1', nombre: 'Kim', email: '', carrera: '', activo: true }],
            tesisReprobados: [
                tesis('K1'),          // en el padrón → studentId 777
                tesis('K2'),          // NO en el padrón → studentId undefined
            ],
        });
        const res = deriveWorkQueue(d);
        expect(res.items.find((i) => i.carnet === 'K1')?.studentId).toBe(777);
        expect(res.items.find((i) => i.carnet === 'K2')?.studentId).toBeUndefined();
    });

    it('crear_caso apunta a create_proyecto sin ternaId (V2: el API no acepta vínculo)', () => {
        const d = datasets({
            students: [student('E1', 'Eli')],
            tesisAprobados: [tesis('E1', { nota_grad1: 90, estado_grad1: 'APROBADO', nota_grad2: 90, estado_grad2: 'APROBADO' })],
        });
        const item = deriveWorkQueue(d).items[0];
        expect(item.kind).toBe('crear_caso');
        expect(item.target).toEqual({ kind: 'create_proyecto', carnet: 'E1' });
        expect(item.target.ternaId).toBeUndefined();
    });
});
