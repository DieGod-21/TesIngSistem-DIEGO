/**
 * useStudentsList.ts
 *
 * Hook que encapsula toda la lógica de la página /students:
 *   - Carga de estudiantes desde studentStore
 *   - KPIs computados
 *   - Búsqueda + filtro por estado
 *   - Optimistic UI para el toggle de aprobación con cooldown de 4 s
 *     y capacidad de deshacer antes de que se confirme la llamada API.
 *
 * DashboardPage puede importar solo useStudentsDashboard;
 * este hook es específico de StudentsListPage.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    getStudents,
    updateStudentStatus,
    computeStudentKpis,
} from '../services/studentStore';
import type { Student } from '../types/student';
import { useToast } from '../context/ToastContext';

export type StatusFilter = 'all' | 'approved' | 'pending';

const COOLDOWN_MS = 4000;

export function useStudentsList(initialQuery = '') {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState(initialQuery);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
    const isMountedRef = useRef(true);
    const previousValuesRef = useRef<Map<string, boolean>>(new Map());
    const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const { toast } = useToast();

    // ── Carga inicial (async) ─────────────────────────────────────────

    useEffect(() => {
        let canceled = false;

        const load = async () => {
            try {
                const data = await getStudents();
                if (!canceled) setStudents(data);
            } catch {
                // API error: la tabla queda vacía, no hay crash
            } finally {
                if (!canceled) setLoading(false);
            }
        };

        load();
        return () => {
            canceled = true;
            isMountedRef.current = false;
            timeoutsRef.current.forEach(clearTimeout);
        };
    }, []);

    // ── Toggle de aprobación con cooldown ─────────────────────────────

    const handleToggle = useCallback((id: string, next: boolean) => {
        // Cancelar cooldown previo si existía
        const existingTid = timeoutsRef.current.get(id);
        if (existingTid !== undefined) {
            clearTimeout(existingTid);
            timeoutsRef.current.delete(id);
        }

        // Si el usuario revierte al valor original durante el cooldown → cancelar sin API call
        const storedPrev = previousValuesRef.current.get(id);
        if (storedPrev !== undefined && storedPrev === next) {
            previousValuesRef.current.delete(id);
            setPendingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
            setStudents((prev) => prev.map((s) => s.id === id ? { ...s, approved: next } : s));
            return;
        }

        // Actualización optimista + guardar valor previo para deshacer
        setStudents((prev) => {
            if (!previousValuesRef.current.has(id)) {
                const old = prev.find((s) => s.id === id);
                if (old) previousValuesRef.current.set(id, old.approved);
            }
            return prev.map((s) =>
                s.id === id ? { ...s, approved: next, updatedAt: new Date().toISOString() } : s,
            );
        });

        setPendingIds((prev) => { const s = new Set(prev); s.add(id); return s; });

        // Confirmar via API después del cooldown
        const tid = setTimeout(() => {
            timeoutsRef.current.delete(id);
            previousValuesRef.current.delete(id);
            setPendingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
            updateStudentStatus(id, next)
                .then(() => {
                    if (isMountedRef.current)
                        toast.success(next ? 'Estudiante aprobado correctamente' : 'Aprobación revertida');
                })
                .catch(() => {
                    if (isMountedRef.current) {
                        setStudents((prev) => prev.map((s) => s.id === id ? { ...s, approved: !next } : s));
                        toast.error('No se pudo actualizar el estado. Intenta de nuevo.');
                    }
                });
        }, COOLDOWN_MS);

        timeoutsRef.current.set(id, tid);
    }, [toast]);

    // ── Deshacer toggle (mientras está en cooldown) ───────────────────

    const undoToggle = useCallback((id: string) => {
        const tid = timeoutsRef.current.get(id);
        if (tid !== undefined) {
            clearTimeout(tid);
            timeoutsRef.current.delete(id);
        }
        const prevValue = previousValuesRef.current.get(id);
        if (prevValue !== undefined) {
            setStudents((prev) => prev.map((s) => s.id === id ? { ...s, approved: prevValue } : s));
            previousValuesRef.current.delete(id);
        }
        setPendingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }, []);

    // ── KPIs ─────────────────────────────────────────────────────────

    const kpis = useMemo(() => computeStudentKpis(students), [students]);

    // ── Filtrado ─────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        const normalize = (val: unknown) =>
            (val == null ? '' : String(val)).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normalizeId = (val: unknown) =>
            normalize(val).replace(/[^a-z0-9]/g, '');
        const tokens = normalize(query).split(/\s+/).filter(Boolean);
        const queryId = normalizeId(query);
        return students.filter((s) => {
            const haystack = `${normalize(s.nombreCompleto)} ${normalize(s.correoInstitucional)}`;
            const matchText = tokens.length === 0 || tokens.every((t) => haystack.includes(t));
            const matchId = queryId === '' || normalizeId(s.carnetId).includes(queryId);
            const matchStatus =
                statusFilter === 'all' ||
                (statusFilter === 'approved' && s.approved) ||
                (statusFilter === 'pending' && !s.approved);
            return (matchText || matchId) && matchStatus;
        });
    }, [students, query, statusFilter]);

    return {
        students,
        loading,
        query,
        setQuery,
        statusFilter,
        setStatusFilter,
        handleToggle,
        undoToggle,
        pendingIds,
        kpis,
        filtered,
    } as const;
}
