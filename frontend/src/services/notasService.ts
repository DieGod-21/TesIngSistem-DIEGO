/**
 * notasService.ts
 *
 * Acceso a /api/notas/* para obtener calificaciones de un estudiante
 * y calcular elegibilidad de tesis en frontend.
 */

import { apiGet } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import type { NotasEstudianteResponse, EstadoTesis, Nota } from '../types/api';
import { computeThesisEligibility, type ThesisEligibilityResult } from '../utils/thesisEligibility';

export async function getNotasByEstudianteId(id: number | string): Promise<NotasEstudianteResponse> {
    return apiGet<NotasEstudianteResponse>(API_PATHS.notas.byEstudiante(id));
}

export async function getNotasByCarnet(carnet: string): Promise<NotasEstudianteResponse> {
    return apiGet<NotasEstudianteResponse>(API_PATHS.notas.byCarnet(carnet));
}

/**
 * Devuelve la elegibilidad calculada en frontend.
 * Usa /api/notas/estudiante/{id} (NO /api/tesis/estado/{carnet}, que es una
 * conveniencia del backend — la regla la computamos nosotros).
 */
export async function getThesisEligibility(estudianteId: number | string): Promise<{
    notas: Nota[];
    eligibility: ThesisEligibilityResult;
}> {
    const res = await getNotasByEstudianteId(estudianteId);
    return { notas: res.notas ?? [], eligibility: computeThesisEligibility(res.notas) };
}

/** Endpoint del backend que ya calcula el estado (útil para listas masivas). */
export async function getEstadoTesisByCarnet(carnet: string): Promise<EstadoTesis> {
    return apiGet<EstadoTesis>(API_PATHS.tesis.byCarnet(carnet), { requireAuth: false });
}
