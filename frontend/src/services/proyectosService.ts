import { apiGet, apiPost } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import { unwrapCollection } from './normalize';
import type { Proyecto, FaseProyecto } from '../types/api';

export interface CreateProyectoDto {
    titulo: string;
    descripcion: string;
    fase: FaseProyecto;
}

export async function listProyectos(opts: { signal?: AbortSignal } = {}): Promise<Proyecto[]> {
    const data = await apiGet<Proyecto[] | { proyectos: Proyecto[] }>(API_PATHS.proyectos.list, { signal: opts.signal });
    return unwrapCollection<Proyecto>(data, ['proyectos'], API_PATHS.proyectos.list);
}

export async function createProyecto(dto: CreateProyectoDto): Promise<Proyecto> {
    return apiPost<Proyecto>(API_PATHS.proyectos.list, dto);
}
