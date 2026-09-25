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
 * - Se entera de las escrituras: el TopHeader vive toda la sesión, y sin esto
 *   su copia del padrón no veía altas, ediciones ni importaciones hasta
 *   recargar la página. Al invalidarse el padrón, relee si el buscador está
 *   abierto o en el próximo foco si no lo está.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ESTUDIANTES_CACHE_KEY, getEstudiantesRegistry } from '../services/estudiantesService';
import { isCancel } from '../services/apiClient';
import { subscribe } from '../services/cache';
import { matchesText } from '../utils/text';
import type { Estudiante } from '../types/api';

const MIN_CHARS = 2;
const MAX_SUGGESTIONS = 8;

export function useStudentSearch(query: string, enabled: boolean) {
    const [all, setAll] = useState<Estudiante[]>([]);
    const [loading, setLoading] = useState(false);
    const loadedRef = useRef(false);
    /** Sube cada vez que una escritura invalida el padrón. */
    const [version, setVersion] = useState(0);

    useEffect(() => subscribe(ESTUDIANTES_CACHE_KEY, () => {
        loadedRef.current = false;
        setVersion((v) => v + 1);
    }), []);

    useEffect(() => {
        if (!enabled || loadedRef.current) return;
        const controller = new AbortController();
        let llego = false;
        loadedRef.current = true;
        setLoading(true);
        // Reutiliza el mismo padrón COMPARTIDO que el Listado: si ya está en
        // caché no hay descarga; si está en vuelo, se deduplica. La telemetría de
        // truncamiento se resuelve en el servicio.
        getEstudiantesRegistry()
            .then((res) => {
                if (controller.signal.aborted) return;
                llego = true;
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
        return () => {
            // Se fue antes de la respuesta: el próximo foco debe volver a
            // intentarlo, o el buscador quedaría vacío el resto de la sesión.
            if (!llego) loadedRef.current = false;
            controller.abort();
        };
    }, [enabled, version]);

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
