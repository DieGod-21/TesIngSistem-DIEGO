/**
 * useEstudiantesList.ts
 *
 * Lista de estudiantes con búsqueda inteligente y paginación en cliente.
 *
 * DECISIÓN — búsqueda client-side con límite:
 *   Se solicita el conjunto completo una sola vez (la API se consume como caja
 *   negra) y el filtrado + paginación se hacen en el frontend con `matchesText`
 *   (tolerante a mayúsculas, acentos y coincidencias parciales por tokens). Así
 *   "Jesús", "de jesus" o "Perez" localizan a "José de Jesús Pérez" sin depender
 *   de la semántica de búsqueda del servidor. Es la opción correcta para el
 *   volumen actual de una coordinación de PG (decenas/cientos de registros).
 *
 * SALVAGUARDA:
 *   El padrón se obtiene del registro COMPARTIDO (`getEstudiantesRegistry`),
 *   cacheado y deduplicado. La detección de truncamiento usa la metadata de
 *   paginación del backend (no se asume `length == total`): si el conjunto
 *   podría estar incompleto, `atLimit` se pone a true (aviso en UI) y el
 *   servicio emite telemetría + warning en desarrollo. Si ocurre de forma
 *   habitual, migrar a búsqueda + paginación server-side (ver deuda técnica).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getEstudiantesRegistry } from '../services/estudiantesService';
import { isCancel } from '../services/apiClient';
import { matchesText } from '../utils/text';
import type { Estudiante } from '../types/api';

interface Pagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export function useEstudiantesList(initial: { limit?: number; search?: string } = {}) {
    const [all, setAll] = useState<Estudiante[]>([]);
    const [atLimit, setAtLimit] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearchRaw] = useState<string>(initial.search ?? '');
    const [page, setPageState] = useState(1);
    const [limit, setLimitState] = useState(initial.limit ?? 20);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const load = useCallback(async (opts: { signal?: AbortSignal; force?: boolean } = {}) => {
        const { signal, force } = opts;
        setLoading(true);
        setError(null);
        try {
            // Padrón COMPARTIDO (caché + deduplicación): la misma descarga sirve al
            // Listado y al Buscador. `isTruncated` y la telemetría se resuelven en
            // el servicio a partir de la metadata de paginación (no de un límite).
            const res = await getEstudiantesRegistry({ force });
            if (signal?.aborted) return;
            setAll(res.estudiantes);
            setAtLimit(res.isTruncated);
        } catch (e) {
            // Cancelación: nunca es un error de UI.
            if (signal?.aborted || isCancel(e)) return;
            setError(e instanceof Error ? e.message : 'No se pudo cargar la lista de estudiantes.');
            setAll([]);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        load({ signal: controller.signal });
        return () => controller.abort();
    }, [load]);

    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    // Búsqueda inteligente sobre nombre + carné + email (tolerante a acentos/casing).
    const filtered = useMemo(
        () => all.filter((e) =>
            matchesText(`${e.nombre ?? ''} ${e.carnet ?? ''} ${e.email ?? ''}`, search),
        ),
        [all, search],
    );

    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, pages);

    const estudiantes = useMemo(
        () => filtered.slice((safePage - 1) * limit, safePage * limit),
        [filtered, safePage, limit],
    );

    const pagination: Pagination = { total, page: safePage, limit, pages };

    const setSearch = useCallback((value: string) => {
        // Debounce ligero: la búsqueda ya es local, solo evita renders excesivos.
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearchRaw(value);
            setPageState(1);
        }, 150);
    }, []);

    const setPage = useCallback((p: number) => setPageState(p), []);

    const setLimit = useCallback((l: number) => {
        setLimitState(l);
        setPageState(1);
    }, []);

    return {
        estudiantes,
        pagination,
        /** Total de estudiantes registrados (sin filtro). */
        totalAll: all.length,
        /** true si la carga alcanzó FETCH_ALL_LIMIT (posible truncamiento). */
        atLimit,
        search,
        loading,
        error,
        setSearch,
        setPage,
        setLimit,
        // Reintento manual: fuerza refetch saltando la caché compartida.
        reload: () => load({ force: true }),
    } as const;
}
