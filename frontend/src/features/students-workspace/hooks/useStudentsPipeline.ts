/**
 * useStudentsPipeline.ts — Capa DELGADA entre el dominio y la UI.
 *
 * Descarga los datasets en lote (capa data/) y los pasa por `deriveWorkQueue`
 * (única fuente de verdad). El componente que lo consume NO recalcula nada: solo
 * renderiza `result`. Maneja loading / error.
 *
 * `enabled` gatea el fetch: el panorama es una herramienta del coordinador
 * (canViewReports). Un rol sin ese permiso no dispara peticiones admin.
 *
 * La frescura la garantiza el CONTRATO DE INVALIDACIÓN de los servicios: toda
 * mutación que cambie el workspace invalida su caché, por lo que basta con
 * recargar al montar (la página se remonta al volver de una acción).
 *
 * `now` (impuro, del borde) se inyecta al motor puro para el "aging".
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
}

export function useStudentsPipeline(enabled: boolean): StudentsPipeline {
    const [result, setResult] = useState<WorkQueueResult | null>(null);
    const [lensCounts, setLensCounts] = useState<LensCounts | null>(null);
    const [loading, setLoading] = useState<boolean>(enabled);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback((mountedRef: { current: boolean }) => {
        setLoading(true);
        setError(null);
        getWorkspaceDatasets()
            .then((datasets) => {
                if (!mountedRef.current) return;
                setResult(deriveWorkQueue(datasets, { now: Date.now() }));
                setLensCounts({
                    all: datasets.students.length,
                    approved: datasets.tesisAprobados.length,
                    failed: datasets.tesisReprobados.length,
                });
            })
            .catch((e) => {
                if (mountedRef.current) setError(userMessageFor(e));
            })
            .finally(() => {
                if (mountedRef.current) setLoading(false);
            });
    }, []);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }
        const mountedRef = { current: true };
        load(mountedRef);
        return () => { mountedRef.current = false; };
    }, [enabled, load]);

    return { result, lensCounts, loading, error };
}
