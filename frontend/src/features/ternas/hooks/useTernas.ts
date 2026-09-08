import { useCallback, useEffect, useState } from 'react';
import { listTernas, listTernasCached, TERNAS_LIST_KEY } from '../../../services/ternasService';
import { getCached } from '../../../services/cache';
import { isCancel } from '../../../services/apiClient';
import { userMessageFor } from '../../../services/errorMessages';
import type { TernaResumen, EstadoTerna } from '../../../types/api';

/**
 * SIN filtro, se usa la caché. CON filtro, no.
 *
 * No es simetría con los otros módulos: es que la caché que ya existe
 * —`ternas:list`, invalidada por cada escritura de terna— guarda exactamente
 * el listado SIN filtrar, que es con lo que se entra a la pantalla (el chip
 * arranca en «Todas»). Era el único módulo de listado que aún tiraba lo ya
 * pintado al volver:
 *
 *     antes    vacio -> ESQUELETO -> contenido      /api/ternas 2 -> 4
 *
 * Los estados concretos siguen resolviéndose en el servidor, sin cachear: son
 * cinco combinaciones que envejecen de forma distinta, y cachearlas por
 * separado añadiría claves e invalidación sin resolver el caso que se repite.
 */
export function useTernas(estado?: EstadoTerna) {
    const [ternas, setTernas] = useState<TernaResumen[]>(
        () => (estado === undefined ? getCached<TernaResumen[]>(TERNAS_LIST_KEY) ?? [] : []),
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            /* El cargador cacheado NO recibe la señal del consumidor: la carga
               es compartida y no debe cancelarse porque uno se desmonte (ver
               `cache.ts`). El guardia de abajo sigue evitando el render tardío. */
            const data = estado === undefined
                ? await listTernasCached()
                : await listTernas(estado, { signal });
            if (signal?.aborted) return;
            setTernas(data);
        } catch (e) {
            if (signal?.aborted || isCancel(e)) return;
            setError(userMessageFor(e));
            setTernas([]);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [estado]);

    useEffect(() => {
        const controller = new AbortController();
        reload(controller.signal);
        return () => controller.abort();
    }, [reload]);

    return { ternas, loading, error, reload: () => reload() };
}
