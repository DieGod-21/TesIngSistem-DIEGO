/**
 * studentsService.ts
 *
 * Servicio de datos para el módulo de estudiantes.
 * Único endpoint soportado: POST /api/estudiantes (crear).
 * El listado se obtiene vía `estudiantesService.listEstudiantes`.
 */

import { apiFetch } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import type { StudentDTO } from '../types/dto';
import type { Student } from '../types/student';
import { adaptStudent } from '../adapters/studentAdapter';

/** Dominios válidos para correo institucional */
export const ALLOWED_EMAIL_DOMAINS = ['@miumg.edu.gt', '@umg.edu.gt'];

/** Payload del formulario de registro */
export interface StudentPayload {
    nombreCompleto: string;
    carnetId: string;
    correoInstitucional: string;
}

/**
 * Registra un estudiante vía POST /api/estudiantes.
 * Campos reales del backend: nombre, carnet, email.
 */
export async function createStudent(payload: StudentPayload): Promise<Student> {
    const dto = await apiFetch<StudentDTO>(API_PATHS.estudiantes.list, {
        method: 'POST',
        body: JSON.stringify({
            nombre: payload.nombreCompleto.trim(),
            carnet: payload.carnetId.trim(),
            email:  payload.correoInstitucional.trim(),
        }),
    });
    return adaptStudent(dto);
}
