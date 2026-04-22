/**
 * estudiantesService.ts
 *
 * Acceso a /api/estudiantes para listar/buscar estudiantes contra el API real.
 * Reemplaza la lógica legacy de `studentsService.ts` (que asumía semestres y fases).
 */

import { apiGet } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import type { Estudiante } from '../types/api';

export interface EstudiantesPaginatedResponse {
    estudiantes: Estudiante[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface ListEstudiantesParams {
    page?: number;
    limit?: number;
    search?: string;
}

export async function listEstudiantes(
    params: ListEstudiantesParams = {},
): Promise<EstudiantesPaginatedResponse> {
    const qs = new URLSearchParams();
    if (params.page)   qs.set('page', String(params.page));
    if (params.limit)  qs.set('limit', String(params.limit));
    if (params.search) qs.set('search', params.search);
    const url = `${API_PATHS.estudiantes.list}${qs.toString() ? `?${qs}` : ''}`;
    const data = await apiGet<EstudiantesPaginatedResponse | Estudiante[]>(url);
    if (Array.isArray(data)) return { estudiantes: data };
    return data;
}

export async function getEstudianteById(id: number | string): Promise<Estudiante> {
    const data = await apiGet<{ estudiante: Estudiante } | Estudiante>(
        API_PATHS.estudiantes.byId(id),
    );
    if (data && typeof data === 'object' && 'estudiante' in data) {
        return (data as { estudiante: Estudiante }).estudiante;
    }
    return data as Estudiante;
}

export async function getEstudianteByCarnet(carnet: string): Promise<Estudiante> {
    const data = await apiGet<{ estudiante: Estudiante } | Estudiante>(
        API_PATHS.estudiantes.byCarnet(carnet),
    );
    if (data && typeof data === 'object' && 'estudiante' in data) {
        return (data as { estudiante: Estudiante }).estudiante;
    }
    return data as Estudiante;
}
