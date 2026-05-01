/**
 * usuariosService.ts
 *
 * Acceso a /api/usuarios/*. Útil para el flujo de admin.
 */

import { apiGet, apiPost } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import type { Usuario, RolUsuario } from '../types/api';

export interface CreateUsuarioDto {
    nombre: string;
    email: string;
    rol: RolUsuario;
}

export async function getMe(): Promise<Usuario> {
    const data = await apiGet<{ usuario: Usuario } | Usuario>(API_PATHS.usuarios.me);
    if (data && typeof data === 'object' && 'usuario' in data) {
        return (data as { usuario: Usuario }).usuario;
    }
    return data as Usuario;
}

export async function listUsuarios(rol?: RolUsuario): Promise<Usuario[]> {
    const qs = rol ? `?rol=${rol}` : '';
    const data = await apiGet<{ usuarios?: Usuario[] } | Usuario[]>(
        `${API_PATHS.usuarios.list}${qs}`,
    );
    if (Array.isArray(data)) return data;
    return data?.usuarios ?? [];
}

export async function createUsuario(dto: CreateUsuarioDto): Promise<Usuario> {
    return apiPost<Usuario>(API_PATHS.usuarios.list, dto);
}
