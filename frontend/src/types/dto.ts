/**
 * dto.ts — DTOs del API real (Control de Notas, UMG).
 *
 * Estas interfaces reflejan la RESPUESTA EXACTA del backend Swagger.
 * Sólo /services/ y /adapters/ deben importar desde aquí.
 */

/** Respuesta de GET/POST /api/estudiantes — objeto de estudiante. */
export interface StudentDTO {
    id: string;
    nombre_completo: string;
    carnet_id: string;
    correo_institucional: string;
    fase_academica: string;
    semester_id: string;
    approved: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
    semestre: string | null;
    academic_phase_id: number | null;
    phase_name: string | null;
    phase_description: string | null;
}
