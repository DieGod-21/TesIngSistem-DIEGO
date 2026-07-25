/**
 * notasService.ts
 *
 * Acceso a /api/notas/* para obtener calificaciones de un estudiante
 * y calcular elegibilidad de tesis en frontend.
 */

import { apiGet, apiPut } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import { invalidateEstudiantes } from './estudiantesService';
import { invalidateTesis } from './tesisService';
import type { Nota, NotasEstudianteResponse } from '../types/api';

export interface UpsertNotaDto {
    carnet: string;
    curso_codigo: string;
    nota_final: number;
    observacion?: string | null;
}

export async function getNotasByEstudianteId(
    id: number | string,
    opts: { signal?: AbortSignal } = {},
): Promise<NotasEstudianteResponse> {
    return apiGet<NotasEstudianteResponse>(API_PATHS.notas.byEstudiante(id), { signal: opts.signal });
}

export async function getNotasByCarnet(
    carnet: string,
    opts: { signal?: AbortSignal } = {},
): Promise<NotasEstudianteResponse> {
    return apiGet<NotasEstudianteResponse>(API_PATHS.notas.byCarnet(carnet), { signal: opts.signal });
}

export async function upsertNota(dto: UpsertNotaDto): Promise<Nota> {
    const nota = await apiPut<Nota>(API_PATHS.notas.upsert, dto);
    // La nota cambia el estado de tesis del estudiante: invalidar el padrón y las
    // listas oficiales de tesis (aprobados/reprobados), de las que deriva la cola
    // de trabajo. Así el ítem self-clearing desaparece en la próxima lectura, sin
    // esperar al TTL.
    invalidateEstudiantes();
    invalidateTesis();
    return nota;
}
