import { describe, it, expect } from 'vitest';
import { buildSnapshot, diffSnapshots, queueSignatureOf } from './snapshot';
import type { PipelineStage, WorkItem, WorkQueueResult } from './types';

function stageCounts(over: Partial<Record<PipelineStage, number>> = {}): Record<PipelineStage, number> {
    return {
        sin_datos: 0, pg1_pendiente: 0, pg2_pendiente: 0, no_elegible: 0,
        elegible_sin_caso: 0, en_terna: 0, terna_estancada: 0, resuelto: 0, ...over,
    };
}

function mkResult(over: Partial<Record<PipelineStage, number>>, ids: string[]): WorkQueueResult {
    return {
        items: ids.map((id) => ({ id }) as WorkItem),
        coverage: { totalStudents: 0, withStatus: 0, withoutStatus: 0 },
        stageCounts: stageCounts(over),
    };
}

describe('snapshot — construcción y firma', () => {
    it('buildSnapshot copia el stage map y calcula la firma', () => {
        const s = buildSnapshot(mkResult({ elegible_sin_caso: 3 }, ['a', 'b']), 'u1', 1000);
        expect(s.user).toBe('u1');
        expect(s.timestamp).toBe(1000);
        expect(s.stageMap.elegible_sin_caso).toBe(3);
        expect(typeof s.queueSignature).toBe('string');
    });

    it('la firma es estable ante reordenamiento y cambia con el conjunto', () => {
        const a = queueSignatureOf([{ id: 'a' }, { id: 'b' }] as WorkItem[]);
        const b = queueSignatureOf([{ id: 'b' }, { id: 'a' }] as WorkItem[]);
        const c = queueSignatureOf([{ id: 'a' }] as WorkItem[]);
        expect(a).toBe(b);
        expect(a).not.toBe(c);
    });
});

describe('snapshot — diff', () => {
    it('sin visita previa → no meaningful', () => {
        const cur = buildSnapshot(mkResult({ resuelto: 2 }, ['a']), 'u1', 2000);
        expect(diffSnapshots(null, cur).meaningful).toBe(false);
    });

    it('usuario distinto (mismo dispositivo) → no meaningful', () => {
        const prev = buildSnapshot(mkResult({}, []), 'u1', 1000);
        const cur = buildSnapshot(mkResult({ resuelto: 2 }, []), 'u2', 2000);
        expect(diffSnapshots(prev, cur).meaningful).toBe(false);
    });

    it('calcula deltas de etapa (solo no-cero, en orden) + tiempo + queueChanged', () => {
        const prev = buildSnapshot(mkResult({ elegible_sin_caso: 1 }, ['a']), 'u1', 1000);
        const cur = buildSnapshot(mkResult({ elegible_sin_caso: 4, resuelto: 2 }, ['a', 'b']), 'u1', 5000);
        const diff = diffSnapshots(prev, cur);
        expect(diff.meaningful).toBe(true);
        expect(diff.sincePreviousMs).toBe(4000);
        expect(diff.stageDeltas).toEqual([
            { stage: 'elegible_sin_caso', delta: 3 },
            { stage: 'resuelto', delta: 2 },
        ]);
        expect(diff.queueChanged).toBe(true);
    });

    it('sin cambios de etapa → no meaningful (no duplica la cola por firma sola)', () => {
        const prev = buildSnapshot(mkResult({ resuelto: 2 }, ['a']), 'u1', 1000);
        const cur = buildSnapshot(mkResult({ resuelto: 2 }, ['a']), 'u1', 2000);
        const diff = diffSnapshots(prev, cur);
        expect(diff.meaningful).toBe(false);
        expect(diff.queueChanged).toBe(false);
    });
});
