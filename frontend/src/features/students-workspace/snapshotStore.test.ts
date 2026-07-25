import { describe, it, expect, beforeEach } from 'vitest';
import { readSnapshot, writeSnapshot } from './snapshotStore';
import { WORK_QUEUE_SNAPSHOT_KEY } from '../../config/storageKeys';
import type { WorkspaceSnapshot } from './domain/snapshot';

const SNAP: WorkspaceSnapshot = {
    user: 'u1',
    timestamp: 1234,
    stageMap: {
        sin_datos: 0, pg1_pendiente: 2, pg2_pendiente: 0, no_elegible: 0,
        elegible_sin_caso: 1, en_terna: 0, terna_estancada: 0, resuelto: 3,
    },
    queueSignature: 'abc:5',
};

describe('snapshotStore — persistencia segura', () => {
    beforeEach(() => localStorage.clear());

    it('round-trip write → read', () => {
        writeSnapshot(SNAP);
        expect(readSnapshot()).toEqual(SNAP);
    });

    it('sin dato → null', () => {
        expect(readSnapshot()).toBeNull();
    });

    it('JSON inválido → null (no lanza)', () => {
        localStorage.setItem(WORK_QUEUE_SNAPSHOT_KEY, '{no-json');
        expect(readSnapshot()).toBeNull();
    });

    it('forma inválida → null', () => {
        localStorage.setItem(WORK_QUEUE_SNAPSHOT_KEY, JSON.stringify({ user: 'u1' }));
        expect(readSnapshot()).toBeNull();
    });
});
