/**
 * notasService.ts
 *
 * Acceso a /api/notas/* para obtener calificaciones de un estudiante
 * y calcular elegibilidad de tesis en frontend.
 */

import { apiGet, apiPut } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import type { Nota, NotasEstudianteResponse } from '../types/api';

export interface UpsertNotaDto {
    carnet: string;
    curso_codigo: string;
    nota_final: number;
    observacion?: string | null;
}

export async function getNotasByEstudianteId(id: number | string): Promise<NotasEstudianteResponse> {
    return apiGet<NotasEstudianteResponse>(API_PATHS.notas.byEstudiante(id));
}

export async function getNotasByCarnet(carnet: string): Promise<NotasEstudianteResponse> {
    return apiGet<NotasEstudianteResponse>(API_PATHS.notas.byCarnet(carnet));
}

export async function upsertNota(dto: UpsertNotaDto): Promise<Nota> {
    return apiPut<Nota>(API_PATHS.notas.upsert, dto);
}
