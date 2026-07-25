/**
 * useDismissals.ts — Estado del descarte de la cola (localStorage + GC).
 *
 * Envuelve la lógica pura de `dismissals.ts`. Mantiene en estado el conjunto de
 * ids descartados, lo persiste y lo poda contra los ids actualmente presentes.
 *
 * `currentIds = null` (aún cargando) evita el GC: nunca se pierden descartes por
 * una lista vacía transitoria.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    readDismissed, writeDismissed, pruneDismissed, withDismissed, withoutDismissed,
} from '../dismissals';

export interface Dismissals {
    isDismissed: (id: string) => boolean;
    dismiss: (id: string) => void;
    restore: (id: string) => void;
}

export function useDismissals(currentIds: string[] | null): Dismissals {
    const [ids, setIds] = useState<string[]>(() => readDismissed());
    const idsRef = useRef(ids);
    idsRef.current = ids;

    // Firma estable de los ids presentes para no re-ejecutar el GC en cada render.
    const signature = currentIds ? currentIds.join('|') : null;

    useEffect(() => {
        if (signature === null || currentIds === null) return;
        const pruned = pruneDismissed(idsRef.current, currentIds);
        if (pruned.length !== idsRef.current.length) {
            setIds(pruned);
            writeDismissed(pruned);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature]);

    const dismiss = useCallback((id: string) => {
        setIds((prev) => {
            const next = withDismissed(prev, id);
            writeDismissed(next);
            return next;
        });
    }, []);

    const restore = useCallback((id: string) => {
        setIds((prev) => {
            const next = withoutDismissed(prev, id);
            writeDismissed(next);
            return next;
        });
    }, []);

    const set = useMemo(() => new Set(ids), [ids]);
    const isDismissed = useCallback((id: string) => set.has(id), [set]);

    return { isDismissed, dismiss, restore };
}
