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

/** Veredicto de tesis por carne, para pintarlo en el listado. */
export type VerdictByCarnet = Map<string, 'APROBADO' | 'REPROBADO' | 'PENDIENTE'>;

export interface StudentsPipeline {
    result: WorkQueueResult | null;
    lensCounts: LensCounts | null;
    /**
     * MOTIVO: la lente del padron filtra por estado de tesis («Elegibles 15 /
     * Pendientes 6») y la tabla no mostraba ese estado en ninguna columna. Para
     * saber si un alumno cumple habia que filtrar o abrir su expediente, uno a
     * uno, en el producto cuyo objeto ES la elegibilidad de tesis.
     *
     * Los dos conjuntos ya venian en el mismo lote que alimenta la cola de
     * trabajo: aqui solo se indexan. Sin peticiones nuevas y sin reglas nuevas
     * —quien no esta en ninguna lista oficial es PENDIENTE, exactamente el
     * mismo criterio que usa el resto del producto.
     */
    verdictByCarnet: VerdictByCarnet | null;
    loading: boolean;
    error: string | null;
}

export function useStudentsPipeline(enabled: boolean): StudentsPipeline {
    const [result, setResult] = useState<WorkQueueResult | null>(null);
    const [lensCounts, setLensCounts] = useState<LensCounts | null>(null);
    const [verdictByCarnet, setVerdictByCarnet] = useState<VerdictByCarnet | null>(null);
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
                const veredictos: VerdictByCarnet = new Map();
                // Se SIEMBRA el padron completo como PENDIENTE. Sin esto, quien no
                // aparece en ninguna de las dos listas oficiales quedaba fuera del
                // mapa y el listado pintaba una raya: «no se sabe» en lugar de
                // «faltan notas», que es justo lo que significa la ausencia.
                for (const e of datasets.students) veredictos.set(e.carnet, 'PENDIENTE');
                for (const t of datasets.tesisReprobados) veredictos.set(t.carnet, 'REPROBADO');
                // Aprobados DESPUES: si un carne apareciera en ambas listas, la
                // oficial de aprobados manda (mismo orden de precedencia que el
                // resto del producto).
                for (const t of datasets.tesisAprobados) veredictos.set(t.carnet, 'APROBADO');
                setVerdictByCarnet(veredictos);
            })
            .catch((e) => {
                if (mountedRef.current) { setError(userMessageFor(e)); setVerdictByCarnet(null); }
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

    return { result, lensCounts, verdictByCarnet, loading, error };
}
