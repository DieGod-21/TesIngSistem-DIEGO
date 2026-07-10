/**
 * useStudentSearch.ts
 *
 * Fuente de sugerencias para el buscador único del TopHeader.
 *
 * - Carga el padrón de estudiantes una sola vez (perezosa: solo cuando el
 *   buscador se activa), consumiendo la API como caja negra.
 * - El filtrado es 100% en cliente con `matchesText`: tolerante a mayúsculas,
 *   acentos y coincidencias parciales por tokens sobre nombre + carné + email.
 *   Así "Jesús", "de jesus", "Perez", "José" o "Jos" localizan a
 *   "José de Jesús Pérez".
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { getEstudiantesRegistry } from '../services/estudiantesService';
import { isCancel } from '../services/apiClient';
import { matchesText } from '../utils/text';
import type { Estudiante } from '../types/api';

const MIN_CHARS = 2;
const MAX_SUGGESTIONS = 8;

export function useStudentSearch(query: string, enabled: boolean) {
    const [all, setAll] = useState<Estudiante[]>([]);
    const [loading, setLoading] = useState(false);
    const loadedRef = useRef(false);

    useEffect(() => {
        if (!enabled || loadedRef.current) return;
        const controller = new AbortController();
        loadedRef.current = true;
        setLoading(true);
        // Reutiliza el mismo padrón COMPARTIDO que el Listado: si ya está en
        // caché no hay descarga; si está en vuelo, se deduplica. La telemetría de
        // truncamiento se resuelve en el servicio.
        getEstudiantesRegistry()
            .then((res) => {
                if (controller.signal.aborted) return;
                setAll(res.estudiantes);
            })
            .catch((err) => {
                // Cancelación: silenciosa, no reintenta ni marca error.
                if (controller.signal.aborted || isCancel(err)) return;
                loadedRef.current = false; // permite reintentar en el próximo focus
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [enabled]);

    const q = query.trim();

    const suggestions = useMemo(() => {
        if (q.length < MIN_CHARS) return [];
        return all
            .filter((e) => matchesText(`${e.nombre ?? ''} ${e.carnet ?? ''} ${e.email ?? ''}`, q))
            .slice(0, MAX_SUGGESTIONS);
    }, [all, q]);

    return {
        suggestions,
        /** Cargando el padrón por primera vez (aún sin datos para filtrar). */
        loading: loading && all.length === 0,
        minChars: MIN_CHARS,
    } as const;
}
