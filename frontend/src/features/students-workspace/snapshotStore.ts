/**
 * snapshotStore.ts — Persistencia del snapshot de "Desde tu última visita".
 *
 * localStorage, seguro (tolerante a modo privado / storage deshabilitado). Único
 * snapshot por dispositivo; el campo `user` permite ignorar el de otro
 * coordinador en un dispositivo compartido (no colaborativo, documentado).
 */

import { WORK_QUEUE_SNAPSHOT_KEY } from '../../config/storageKeys';
import type { WorkspaceSnapshot } from './domain/snapshot';

export function readSnapshot(): WorkspaceSnapshot | null {
    try {
        const raw = localStorage.getItem(WORK_QUEUE_SNAPSHOT_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw);
        if (
            p && typeof p === 'object'
            && typeof p.user === 'string'
            && typeof p.timestamp === 'number'
            && p.stageMap && typeof p.stageMap === 'object'
            && typeof p.queueSignature === 'string'
        ) {
            return p as WorkspaceSnapshot;
        }
        return null;
    } catch {
        return null;
    }
}

export function writeSnapshot(snapshot: WorkspaceSnapshot): void {
    try {
        localStorage.setItem(WORK_QUEUE_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch {
        /* storage no disponible: la próxima visita simplemente no tendrá previa */
    }
}
