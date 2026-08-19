import { useCallback, useEffect, useState } from 'react';
import { getTernaById } from '../../../services/ternasService';
import { getTesisEstadoByCarnet } from '../../../services/tesisService';
import { getNotasByCarnet } from '../../../services/notasService';
import { isCancel } from '../../../services/apiClient';
import { userMessageFor } from '../../../services/errorMessages';
import {
    buildCursosResumen,
    computeEstadoTesis,
    extractGradesFromNotas,
    extractGradesFromReporte,
    mergeGrades,
} from '../../../utils/thesisStatus';
import { THESIS_MIN_GRADE } from '../../../config/apiConfig';
import type { EstadoTesis, TernaDetalle } from '../../../types/api';

export interface TernaDetalleState {
    terna: TernaDetalle | null;
    eligibility: EstadoTesis | null;
    loading: boolean;
    error: string | null;
}

export function useTernaDetalle(id: number | null) {
    const [state, setState] = useState<TernaDetalleState>({
        terna: null, eligibility: null, loading: true, error: null,
    });

    const reload = useCallback(async (signal?: AbortSignal) => {
        /*
         * DEFECTO CORREGIDO: EL ESQUELETO ETERNO.
         *
         * Antes esto era `if (id == null || Number.isNaN(id)) return;` —una
         * salida silenciosa sin tocar el estado—, y el estado inicial es
         * `loading: true`. Con una URL como `/ternas/abc`, `Number('abc')` es
         * NaN, el hook se iba por aquí y la pantalla se quedaba con el
         * esqueleto puesto y `aria-busy="true"` INDEFINIDAMENTE: nadie iba a
         * resolver esa carga jamás. Comprobado en el navegador con
         * `/ternas/abc` y `/ternas/1;drop`.
         *
         * Una dirección inválida no es una espera: es un final. Se resuelve
         * como error, que es lo que de verdad es.
         */
        if (id == null || Number.isNaN(id)) {
            setState({
                terna: null,
                eligibility: null,
                loading: false,
                error: 'La dirección no corresponde a ninguna terna.',
            });
            return;
        }
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            // Cadena por dependencia: la terna aporta el carné; el estado de tesis
            // y las notas dependen de él, así que no se pueden paralelizar sin
            // sobre-descargar. La señal se propaga para cancelar en navegación.
            const terna = await getTernaById(id, { signal });
            if (signal?.aborted) return;
            let eligibility: EstadoTesis | null = null;
            if (terna?.carnet) {
                const fromBackend = await getTesisEstadoByCarnet(terna.carnet, { signal }).catch(() => null);
                if (signal?.aborted) return;
                const fromReporte = extractGradesFromReporte(fromBackend);
                let notas = null;
                if (fromReporte.pg1 == null || fromReporte.pg2 == null) {
                    const notasResp = await getNotasByCarnet(terna.carnet, { signal }).catch(() => null);
                    if (signal?.aborted) return;
                    notas = notasResp?.notas ?? null;
                }
                const cursos = buildCursosResumen(fromBackend, notas);
                const pgGrades = mergeGrades(fromReporte, extractGradesFromNotas(notas));
                const result = computeEstadoTesis(pgGrades);
                eligibility = {
                    carnet:        terna.carnet,
                    nombre:        terna.estudiante_nombre,
                    aprueba_tesis: result.aprobado,
                    razon:         result.estado === 'APROBADO'
                        ? `Cumple con la nota mínima (${THESIS_MIN_GRADE}) en PG1 y PG2.`
                        : result.estado === 'PENDIENTE'
                            ? 'Faltan notas de PG1 y/o PG2.'
                            : `No alcanza la nota mínima (${THESIS_MIN_GRADE}) en PG1 y/o PG2.`,
                    nota_minima:   THESIS_MIN_GRADE,
                    promedio:      fromBackend?.promedio ?? null,
                    graduacion_1:  cursos.find((c) => c.curso === '043') ?? null,
                    graduacion_2:  cursos.find((c) => c.curso === '049') ?? null,
                };
            }
            if (signal?.aborted) return;
            setState({ terna, eligibility, loading: false, error: null });
        } catch (e) {
            // Cancelación: nunca es un error de UI.
            if (signal?.aborted || isCancel(e)) return;
            setState({
                terna: null,
                eligibility: null,
                loading: false,
                error: userMessageFor(e),
            });
        }
    }, [id]);

    useEffect(() => {
        const controller = new AbortController();
        reload(controller.signal);
        return () => controller.abort();
    }, [reload]);

    return { ...state, reload: () => reload() };
}
