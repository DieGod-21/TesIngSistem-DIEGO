/**
 * useCachedResource.ts — Un recurso de la caché compartida visto desde una pantalla.
 *
 * - Valor inicial síncrono desde la caché: al volver a la pantalla el dato
 *   está en el primer render, sin esqueleto.
 * - Vuelve a leer cuando un servicio invalida la clave, y si dos lecturas se
 *   cruzan gana la más reciente.
 * - `load` no recibe la señal del montaje porque la carga es compartida (ver
 *   `cached()`); cada montaje descarta sus respuestas obsoletas.
 * - La clave decide qué datos se leen: si la carga depende de un filtro, el
 *   filtro va en la clave. `load` puede ser una flecha en línea; se usa la
 *   última, pero cambiarla no relanza la lectura.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCached, subscribe } from '../services/cache';
import { isCancel } from '../services/apiClient';
import { userMessageFor } from '../services/errorMessages';

export interface CachedResource<T> {
    /** Lo último conocido; `undefined` hasta la primera respuesta si no había caché. */
    data: T | undefined;
    loading: boolean;
    error: string | null;
    /** Vuelve a leer (de la caché si sigue vigente; del servidor si no). */
    reload: () => Promise<void>;
}

export function useCachedResource<T>(key: string, load: () => Promise<T>): CachedResource<T> {
    const [data, setData] = useState<T | undefined>(() => getCached<T>(key));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const ultima = useRef(0);
    const cargaActual = useRef(load);

    useEffect(() => {
        cargaActual.current = load;
    });

    const leer = useCallback(async (signal?: AbortSignal) => {
        const turno = ++ultima.current;
        const obsoleta = () => signal?.aborted === true || turno !== ultima.current;
        setLoading(true);
        setError(null);
        try {
            const valor = await cargaActual.current();
            if (obsoleta()) return;
            setData(valor);
        } catch (e) {
            if (obsoleta() || isCancel(e)) return;
            setError(userMessageFor(e));
        } finally {
            if (!obsoleta()) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        void leer(controller.signal);
        const baja = subscribe(key, () => { void leer(controller.signal); });
        return () => {
            controller.abort();
            baja();
        };
    }, [key, leer]);

    const reload = useCallback(() => leer(), [leer]);

    return { data, loading, error, reload };
}
