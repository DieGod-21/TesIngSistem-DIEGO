/**
 * studentsService.ts
 *
 * Alta individual de estudiantes: POST /api/estudiantes.
 * El listado se obtiene vía `estudiantesService.getEstudiantesRegistry`.
 */

import { apiPost } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import { invalidateEstudiantes } from './estudiantesService';
import { unwrapEntity } from './normalize';
import type { Estudiante } from '../types/api';

/** Dominios válidos para correo institucional */
export const ALLOWED_EMAIL_DOMAINS = ['@miumg.edu.gt', '@umg.edu.gt'];

/** Payload del formulario de registro */
export interface StudentPayload {
    nombreCompleto: string;
    carnetId: string;
    correoInstitucional: string;
}

/**
 * Registra un estudiante. Contrato: `{ carnet, nombre, email?, carrera? }` →
 * 201 `{ success, data: { estudiante } }`.
 *
 * El cuerpo viaja como objeto para que `apiFetch` lo serialice y declare
 * `Content-Type: application/json`; un string ya serializado salía como
 * `text/plain` y el servidor no lo interpretaba.
 */
export async function createStudent(payload: StudentPayload): Promise<Estudiante> {
    const raw = await apiPost<{ estudiante: Estudiante } | Estudiante>(API_PATHS.estudiantes.list, {
        nombre: payload.nombreCompleto.trim(),
        carnet: payload.carnetId.trim(),
        email:  payload.correoInstitucional.trim(),
    });
    invalidateEstudiantes();
    return unwrapEntity<Estudiante>(raw, 'estudiante', API_PATHS.estudiantes.list);
}
