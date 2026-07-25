import { describe, it, expect } from 'vitest';
import {
    isVisibleInQueue, canActOnKind, QUEUE_KIND_VISIBLE,
    visibleActionableItems, isPendingItem,
} from './queuePolicy';
import type { WorkItem } from './domain/types';
import type { Capabilities } from '../../config/permissions';

const ADMIN: Capabilities = {
    canManageUsers: true, canViewReports: true, canImportStudents: true,
    canEditGrades: true, canReopenEvaluations: true,
};
const EVALUADOR: Capabilities = {
    canManageUsers: false, canViewReports: false, canImportStudents: false,
    canEditGrades: false, canReopenEvaluations: false,
};

function item(over: Partial<WorkItem>): WorkItem {
    return {
        id: 'x', kind: 'registrar_nota_pg1', carnet: 'A1', nombre: 'Ana',
        stage: 'pg1_pendiente', priority: 4, reason: '', selfClearing: true,
        timestamp: null, ageDays: null, target: { kind: 'notas_entry', carnet: 'A1' }, ...over,
    };
}

describe('queuePolicy — visibilidad (independiente de selfClearing)', () => {
    it('los tipos generadores de trabajo son visibles', () => {
        expect(isVisibleInQueue(item({ kind: 'registrar_nota_pg1' }))).toBe(true);
        expect(isVisibleInQueue(item({ kind: 'terna_estancada' }))).toBe(true);
        expect(isVisibleInQueue(item({ kind: 'cerrar_resolucion' }))).toBe(true);
    });

    it('la visibilidad no depende de la bandera selfClearing', () => {
        // Mismo kind visible tanto si selfClearing true como false.
        expect(isVisibleInQueue(item({ kind: 'terna_estancada', selfClearing: false }))).toBe(true);
        expect(QUEUE_KIND_VISIBLE.terna_estancada).toBe(true);
    });
});

describe('queuePolicy — selección de la cola', () => {
    const ADMIN: Capabilities = {
        canManageUsers: true, canViewReports: true, canImportStudents: true,
        canEditGrades: true, canReopenEvaluations: true,
    };

    it('visibleActionableItems filtra por visibilidad y capacidad', () => {
        const noGrades: Capabilities = { ...ADMIN, canEditGrades: false };
        const items = [
            item({ id: 'a', kind: 'registrar_nota_pg1' }),   // exige canEditGrades
            item({ id: 'b', kind: 'revisar_no_elegible' }),  // sin capacidad extra
        ];
        expect(visibleActionableItems(items, ADMIN).map((i) => i.id)).toEqual(['a', 'b']);
        expect(visibleActionableItems(items, noGrades).map((i) => i.id)).toEqual(['b']);
    });

    it('isPendingItem: self-clearing siempre pendiente; el resto según descarte', () => {
        const dismissed = new Set(['x']);
        const isDismissed = (id: string) => dismissed.has(id);
        expect(isPendingItem(item({ id: 'x', selfClearing: true }), isDismissed)).toBe(true);
        expect(isPendingItem(item({ id: 'x', selfClearing: false }), isDismissed)).toBe(false);
        expect(isPendingItem(item({ id: 'y', selfClearing: false }), isDismissed)).toBe(true);
    });
});

describe('queuePolicy — autorización por tipo', () => {
    it('registrar nota exige canEditGrades', () => {
        expect(canActOnKind('registrar_nota_pg1', ADMIN)).toBe(true);
        expect(canActOnKind('registrar_nota_pg1', EVALUADOR)).toBe(false);
    });

    it('terna estancada exige canReopenEvaluations', () => {
        expect(canActOnKind('terna_estancada', ADMIN)).toBe(true);
        expect(canActOnKind('terna_estancada', EVALUADOR)).toBe(false);
    });

    it('los tipos sin capacidad extra (null) siempre pasan', () => {
        expect(canActOnKind('revisar_no_elegible', EVALUADOR)).toBe(true);
        expect(canActOnKind('cerrar_resolucion', EVALUADOR)).toBe(true);
    });
});
