/**
 * useEstudiantesList.ts
 *
 * Hook que maneja la lista paginada de /api/estudiantes con búsqueda server-side.
 * Re-solicita cuando cambia page / limit / search (con debounce en search).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { listEstudiantes, type EstudiantesPaginatedResponse } from '../services/estudiantesService';
import type { Estudiante } from '../types/api';

interface Pagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

const DEFAULT_PAGINATION: Pagination = { total: 0, page: 1, limit: 20, pages: 1 };

export function useEstudiantesList(initial: { limit?: number; search?: string } = {}) {
    const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ ...DEFAULT_PAGINATION, limit: initial.limit ?? 20 });
    const [search, setSearchRaw] = useState<string>(initial.search ?? '');
    const [debouncedSearch, setDebouncedSearch] = useState<string>(initial.search ?? '');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const setSearch = useCallback((value: string) => {
        setSearchRaw(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(value.trim());
            setPagination((p) => ({ ...p, page: 1 }));
        }, 300);
    }, []);

    const setPage = useCallback((page: number) => {
        setPagination((p) => ({ ...p, page }));
    }, []);

    const setLimit = useCallback((limit: number) => {
        setPagination((p) => ({ ...p, limit, page: 1 }));
    }, []);

    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            const res: EstudiantesPaginatedResponse = await listEstudiantes({
                page:   pagination.page,
                limit:  pagination.limit,
                search: debouncedSearch || undefined,
            });
            if (signal?.aborted) return;
            setEstudiantes(res.estudiantes ?? []);
            if (res.pagination) {
                setPagination((p) => ({ ...p, ...res.pagination!, limit: res.pagination!.limit ?? p.limit }));
            }
        } catch (e) {
            if (signal?.aborted) return;
            setError(e instanceof Error ? e.message : 'No se pudo cargar la lista de estudiantes.');
            setEstudiantes([]);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
        // depends on search / page / limit below
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, pagination.limit, debouncedSearch]);

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
    }, [load]);

    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    return {
        estudiantes,
        pagination,
        search,
        loading,
        error,
        setSearch,
        setPage,
        setLimit,
        reload: () => load(),
    } as const;
}
