import { describe, it, expect } from 'vitest';
import { resolveWorkItemHref } from './navigation';
import type { WorkItem } from './domain/types';

function item(over: Partial<WorkItem>): WorkItem {
    return {
        id: 'x', kind: 'registrar_nota_pg1', carnet: 'A1', nombre: 'Ana',
        stage: 'pg1_pendiente', priority: 4, reason: '', selfClearing: true,
        timestamp: null, ageDays: null, target: { kind: 'notas_entry', carnet: 'A1' }, ...over,
    };
}

describe('resolveWorkItemHref — enrutar, no fingir', () => {
    it('nota/detalle con studentId → /students/:id', () => {
        expect(resolveWorkItemHref(item({ studentId: 42 }))).toBe('/students/42');
    });

    it('nota/detalle sin studentId → fallback al roster filtrado por carnet', () => {
        expect(resolveWorkItemHref(item({ studentId: undefined, carnet: '9-A B' })))
            .toBe('/students?search=9-A%20B');
    });

    it('terna con id → /ternas/:id', () => {
        expect(resolveWorkItemHref(item({
            kind: 'terna_estancada', target: { kind: 'terna_detail', carnet: 'A1', ternaId: 500 },
        }))).toBe('/ternas/500');
    });

    it('terna sin id → fallback al listado de ternas', () => {
        expect(resolveWorkItemHref(item({
            kind: 'terna_estancada', target: { kind: 'terna_detail', carnet: 'A1' },
        }))).toBe('/ternas');
    });

    it('crear caso → /proyectos', () => {
        expect(resolveWorkItemHref(item({
            kind: 'crear_caso', target: { kind: 'create_proyecto', carnet: 'A1' },
        }))).toBe('/proyectos');
    });
});
