import { apiGet, apiPost } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import type { Proyecto, FaseProyecto } from '../types/api';

export interface CreateProyectoDto {
    titulo: string;
    descripcion: string;
    fase: FaseProyecto;
}

export async function listProyectos(): Promise<Proyecto[]> {
    const data = await apiGet<Proyecto[] | { proyectos: Proyecto[] }>(API_PATHS.proyectos.list);
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'proyectos' in data) {
        return (data as { proyectos: Proyecto[] }).proyectos;
    }
    return [];
}

export async function createProyecto(dto: CreateProyectoDto): Promise<Proyecto> {
    return apiPost<Proyecto>(API_PATHS.proyectos.list, dto);
}
