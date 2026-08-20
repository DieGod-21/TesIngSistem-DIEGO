/**
 * usuariosService.ts
 *
 * Acceso a /api/usuarios/*. Útil para el flujo de admin.
 */

import { apiGet, apiPost } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import { unwrapEntity, unwrapCollection } from './normalize';
import type { Usuario, RolUsuario } from '../types/api';

export interface CreateUsuarioDto {
    nombre: string;
    email: string;
    rol: RolUsuario;
    /*
     * El contrato (POST /api/usuarios en /api-docs.json) lo declara opcional,
     * pero aquí es obligatorio a propósito: una cuenta creada sin contraseña
     * queda inutilizable —aparece en el listado, el login responde 401
     * «Credenciales inválidas»— y el API no expone ningún endpoint para
     * restablecerla (/api/usuarios/{id} solo admite GET). Ya ocurrió con una
     * cuenta real de evaluador.
     */
    password: string;
}

export async function getMe(opts: { signal?: AbortSignal } = {}): Promise<Usuario> {
    const data = await apiGet<{ usuario: Usuario } | Usuario>(API_PATHS.usuarios.me, { signal: opts.signal });
    return unwrapEntity<Usuario>(data, 'usuario', API_PATHS.usuarios.me);
}

export async function listUsuarios(rol?: RolUsuario, opts: { signal?: AbortSignal } = {}): Promise<Usuario[]> {
    const qs = rol ? `?rol=${rol}` : '';
    const url = `${API_PATHS.usuarios.list}${qs}`;
    const data = await apiGet<{ usuarios?: Usuario[] } | Usuario[]>(url, { signal: opts.signal });
    return unwrapCollection<Usuario>(data, ['usuarios'], url);
}

export async function createUsuario(dto: CreateUsuarioDto): Promise<Usuario> {
    return apiPost<Usuario>(API_PATHS.usuarios.list, dto);
}
