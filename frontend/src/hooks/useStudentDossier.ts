/**
 * useStudentDossier.ts
 *
 * Expediente completo de un estudiante: los datos que necesitan tanto la vista
 * de detalle como el panel de inspección rápida del listado.
 *
 * Existe para que ambas superficies compartan EXACTAMENTE la misma carga y los
 * mismos valores derivados. Antes esta cadena vivía inline en
 * StudentDetailPage; duplicarla en el drawer habría creado una segunda fuente
 * de verdad sobre el estado de tesis.
 *
 * No introduce peticiones nuevas: es la misma cadena de servicios que ya hacía
 * la página, con la misma cancelación por AbortSignal.
 *
 * `id` nulo → el hook queda inactivo (no consulta nada). Esto permite montar el
 * drawer siempre y que solo cargue cuando hay un estudiante seleccionado.
 */

import { useCallback, useEffect, useState } from 'react';
import { getEstudianteById } from '../services/estudiantesService';
import { getReporteEstudiante } from '../services/reportesService';
import { getNotasByEstudianteId } from '../services/notasService';
import { getProyectosByEstudiante } from '../services/proyectosService';
import { isCancel } from '../services/apiClient';
import { userMessageFor } from '../services/errorMessages';
import {
    buildCursosResumen,
    computeEstadoTesis,
    extractGradesFromNotas,
    extractGradesFromReporte,
    mergeGrades,
} from '../utils/thesisStatus';
import { THESIS_MIN_GRADE } from '../config/apiConfig';
import type {
    CursoNotaResumen, EstadoTesis, Estudiante, Nota, Proyecto, ReporteEstudiante,
    ReporteEstudianteTerna,
} from '../types/api';

interface DossierState {
    student: Estudiante | null;
    reporte: ReporteEstudiante | null;
    notas:   Nota[] | null;
    /**
     * Proyectos de la persona. `null` mientras no se sabe; `[]` significa
     * «comprobado: no tiene», que es un estado del sistema y no un fallo.
     */
    proyectos: Proyecto[] | null;
    loading: boolean;
    error:   string | null;
}

const EMPTY: DossierState = {
    student: null, reporte: null, notas: null, proyectos: null, loading: false, error: null,
};

export function useStudentDossier(id: string | number | null) {
    const [state, setState] = useState<DossierState>(EMPTY);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (id == null || id === '') { setState(EMPTY); return; }

        const controller = new AbortController();
        const { signal } = controller;
        const numId = Number(id);
        if (!Number.isFinite(numId)) {
            setState({ ...EMPTY, error: 'ID inválido.' });
            return;
        }

        setState((s) => ({ ...s, loading: true, error: null }));

        (async () => {
            try {
                // Cadena por dependencia: el reporte necesita el carné del
                // estudiante y las notas son una carga condicional. La señal se
                // propaga a la red para cancelar de verdad al navegar.
                const student = await getEstudianteById(numId, { signal });
                if (signal.aborted) return;

                // El reporte y los proyectos no dependen entre sí: van en
                // paralelo. Encadenarlos solo sumaría una ida y vuelta a una
                // pantalla que ya espera dos.
                const [reporte, proyectos] = await Promise.all([
                    getReporteEstudiante(student.carnet, { signal }).catch(() => null),
                    // Un 404 aquí significa «no tiene proyectos», no un fallo:
                    // se traduce a lista vacía para que la vista lo pueda decir.
                    getProyectosByEstudiante(numId, { signal }).catch(() => [] as Proyecto[]),
                ]);
                if (signal.aborted) return;

                const fromReporte = extractGradesFromReporte(reporte);
                let notas: Nota[] | null = null;
                if (fromReporte.pg1 == null || fromReporte.pg2 == null) {
                    const notasResp = await getNotasByEstudianteId(numId, { signal }).catch(() => null);
                    if (signal.aborted) return;
                    notas = notasResp?.notas ?? null;
                }

                setState({ student, reporte, notas, proyectos, loading: false, error: null });
            } catch (e) {
                // Cancelación: nunca es un error de UI.
                if (signal.aborted || isCancel(e)) return;
                setState({ ...EMPTY, error: userMessageFor(e) });
            }
        })();

        return () => controller.abort();
    }, [id, refreshKey]);

    const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

    // ── Valores derivados de presentación (sin lógica de negocio nueva) ──
    const grades: CursoNotaResumen[] = buildCursosResumen(state.reporte, state.notas);

    const pgGrades = mergeGrades(
        extractGradesFromReporte(state.reporte),
        extractGradesFromNotas(state.notas),
    );
    const tesis = computeEstadoTesis(pgGrades);

    const tesisInput: EstadoTesis | null = state.student
        ? {
            carnet:        state.student.carnet,
            nombre:        state.student.nombre,
            email:         state.student.email,
            aprueba_tesis: tesis.aprobado,
            razon:         tesis.estado === 'APROBADO'
                ? `Cumple con la nota mínima (${THESIS_MIN_GRADE}) en PG1 y PG2.`
                : tesis.estado === 'PENDIENTE'
                    ? 'Faltan notas de PG1 y/o PG2.'
                    : `No alcanza la nota mínima (${THESIS_MIN_GRADE}) en PG1 y/o PG2.`,
            nota_minima:   THESIS_MIN_GRADE,
            promedio:      state.reporte?.promedio ?? null,
            graduacion_1:  grades.find((g) => g.curso === '043') ?? null,
            graduacion_2:  grades.find((g) => g.curso === '049') ?? null,
        }
        : null;

    const terna: ReporteEstudianteTerna | null = state.reporte?.terna ?? null;
    const promedio: number | null = state.reporte?.promedio ?? null;

    /**
     * El proyecto vigente. El API devuelve una colección porque un estudiante
     * podría acumular registros de PG1 y PG2; para el expediente manda el más
     * avanzado, que es sobre el que se está trabajando ahora.
     */
    const proyecto: Proyecto | null = (() => {
        const ps = state.proyectos;
        if (!ps || ps.length === 0) return null;
        return ps.find((p) => p.fase === 'PG2') ?? ps[0];
    })();

    return { ...state, grades, tesis, tesisInput, terna, promedio, proyecto, reload } as const;
}
