/**
 * useStudentsPipeline.ts — Capa DELGADA entre el dominio y la UI.
 *
 * Descarga los datasets en lote (capa data/) y los pasa por `deriveWorkQueue`
 * (única fuente de verdad). El componente que lo consume NO recalcula nada: solo
 * renderiza `result`. Maneja loading / error / recarga.
 *
 * `enabled` gatea el fetch: el panorama es una herramienta del coordinador
 * (canViewReports). Un rol sin ese permiso no dispara peticiones admin (evita
 * 403 en cada montaje); la lente sigue funcionando sin conteos.
 *
 * `lensCounts` expone tamaños de roster (no reglas de negocio): el número que se
 * muestra en cada chip coincide con lo que verá el usuario al aplicar la lente.
 */

import { useCallback, useEffect, useState } from 'react';
import { getWorkspaceDatasets } from '../data/workspaceData';
import { deriveWorkQueue } from '../domain/workQueue';
import type { WorkQueueResult } from '../domain/types';
import { userMessageFor } from '../../../services/errorMessages';

export interface LensCounts {
    all: number;
    approved: number;
    failed: number;
}

export interface StudentsPipeline {
    result: WorkQueueResult | null;
    lensCounts: LensCounts | null;
    loading: boolean;
    error: string | null;
    reload: () => void;
}

export function useStudentsPipeline(enabled: boolean): StudentsPipeline {
    const [result, setResult] = useState<WorkQueueResult | null>(null);
    const [lensCounts, setLensCounts] = useState<LensCounts | null>(null);
    const [loading, setLoading] = useState<boolean>(enabled);
    const [error, setError] = useState<string | null>(null);
    const [nonce, setNonce] = useState(0);

    const reload = useCallback(() => setNonce((n) => n + 1), []);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }
        let mounted = true;
        setLoading(true);
        setError(null);

        getWorkspaceDatasets({ force: nonce > 0 })
            .then((datasets) => {
                if (!mounted) return;
                setResult(deriveWorkQueue(datasets));
                setLensCounts({
                    all: datasets.students.length,
                    approved: datasets.tesisAprobados.length,
                    failed: datasets.tesisReprobados.length,
                });
            })
            .catch((e) => {
                if (mounted) setError(userMessageFor(e));
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => { mounted = false; };
    }, [enabled, nonce]);

    return { result, lensCounts, loading, error, reload };
}
