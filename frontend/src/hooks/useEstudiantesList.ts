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
 *   Se pide hasta `FETCH_ALL_LIMIT` registros. Si la API devuelve exactamente
 *   ese número, es probable que existan más y el conjunto esté truncado: la
 *   búsqueda/paginación local sería incompleta. En ese caso `atLimit` se pone a
 *   true (para avisar en la UI) y se emite un warning. Si esto ocurre de forma
 *   habitual, migrar a búsqueda + paginación server-side con normalización de
 *   acentos (ver deuda técnica).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listEstudiantes } from '../services/estudiantesService';
import { matchesText } from '../utils/text';
import { FETCH_ALL_LIMIT } from '../config/apiConfig';
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

    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            const res = await listEstudiantes({ limit: FETCH_ALL_LIMIT });
            if (signal?.aborted) return;
            const list = res.estudiantes ?? [];
            setAll(list);
            const truncated = list.length >= FETCH_ALL_LIMIT;
            setAtLimit(truncated);
            if (truncated) {
                console.warn(
                    `[useEstudiantesList] Se alcanzó el límite de ${FETCH_ALL_LIMIT} registros; ` +
                    'la búsqueda/paginación local puede estar incompleta. Migrar a server-side.',
                );
            }
        } catch (e) {
            if (signal?.aborted) return;
            setError(e instanceof Error ? e.message : 'No se pudo cargar la lista de estudiantes.');
            setAll([]);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
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
        reload: () => load(),
    } as const;
}
