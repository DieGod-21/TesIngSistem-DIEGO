/**
 * useSinceLastVisit.ts — Estado de "Desde tu última visita".
 *
 * Capa DELGADA: captura el snapshot previo (una vez), construye el actual desde
 * `result` (salida del dominio) y delega el diff al DOMINIO. Luego persiste el
 * actual como nueva línea base ("visto"). Sin estado global; solo estado local
 * + localStorage. La impureza (`Date.now`, storage) vive en este borde.
 */

import { useEffect, useRef, useState } from 'react';
import { buildSnapshot, diffSnapshots, type SnapshotDiff, type WorkspaceSnapshot } from '../domain/snapshot';
import { readSnapshot, writeSnapshot } from '../snapshotStore';
import type { WorkQueueResult } from '../domain/types';

export function useSinceLastVisit(result: WorkQueueResult | null, user: string | null): SnapshotDiff | null {
    // Snapshot previo capturado UNA vez, antes de sobrescribirlo.
    const [previous] = useState<WorkspaceSnapshot | null>(() => readSnapshot());
    const seenRef = useRef(false);
    const [diff, setDiff] = useState<SnapshotDiff | null>(null);

    useEffect(() => {
        if (!result || !user || seenRef.current) return;
        const current = buildSnapshot(result, user, Date.now());
        setDiff(diffSnapshots(previous, current));
        writeSnapshot(current); // marca esta visita como la nueva línea base
        seenRef.current = true;
    }, [result, user, previous]);

    return diff;
}
