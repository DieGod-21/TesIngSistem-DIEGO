/**
 * studentAdapter.ts
 *
 * Convierte el DTO del API real (/api/estudiantes) al modelo interno Student.
 */

import type { StudentDTO } from '../types/dto';
import type { Student } from '../types/student';

export function adaptStudent(dto: StudentDTO): Student {
    return {
        id:                  dto.id,
        nombreCompleto:      dto.nombre_completo,
        carnetId:            dto.carnet_id,
        correoInstitucional: dto.correo_institucional,
        semestreLectivo:     dto.semestre ?? dto.semester_id,
        semesterId:          dto.semester_id,
        faseAcademica:       dto.fase_academica,
        academicPhaseId:     dto.academic_phase_id ?? null,
        phaseName:           dto.phase_name ?? null,
        phaseDescription:    dto.phase_description ?? null,
        approved:            dto.approved,
        createdAt:           dto.created_at,
        updatedAt:           dto.updated_at,
    };
}
