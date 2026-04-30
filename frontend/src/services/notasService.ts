/**
 * notasService.ts
 *
 * Acceso a /api/notas/* para obtener calificaciones de un estudiante
 * y calcular elegibilidad de tesis en frontend.
 */

import { apiGet } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import type { NotasEstudianteResponse } from '../types/api';

export async function getNotasByEstudianteId(id: number | string): Promise<NotasEstudianteResponse> {
    return apiGet<NotasEstudianteResponse>(API_PATHS.notas.byEstudiante(id));
}

export async function getNotasByCarnet(carnet: string): Promise<NotasEstudianteResponse> {
    return apiGet<NotasEstudianteResponse>(API_PATHS.notas.byCarnet(carnet));
}
