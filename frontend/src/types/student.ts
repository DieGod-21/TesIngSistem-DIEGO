/**
 * student.ts
 *
 * Interfaz canónica del estudiante (modelo de dominio).
 * También expone el tipo de respuesta del backend y un mapper.
 */

// ─── Modelo de dominio (camelCase, usado en toda la UI) ──────────────

export interface Student {
    id: string;
    nombreCompleto: string;
    carnetId: string;
    correoInstitucional: string;
    /** Nombre legible del semestre (ej. "Primer Semestre 2025") */
    semestreLectivo: string;
    /** UUID del semestre en la base de datos */
    semesterId: string;
    /** @deprecated usar academicPhaseId + phaseName + phaseDescription */
    faseAcademica: string;
    /** ID numérico en academic_phases */
    academicPhaseId: number | null;
    /** Código de fase (ej. "anteproyecto") */
    phaseName: string | null;
    /** Etiqueta legible (ej. "Anteproyecto de Tesis") */
    phaseDescription: string | null;
    approved: boolean;
    createdAt: string;
    updatedAt: string;
}

// ─── Respuesta directa del API (snake_case) ──────────────────────────

export interface BackendStudent {
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

// ─── Mapper ──────────────────────────────────────────────────────────

export function mapBackendStudent(s: BackendStudent): Student {
    return {
        id:                   s.id,
        nombreCompleto:       s.nombre_completo,
        carnetId:             s.carnet_id,
        correoInstitucional:  s.correo_institucional,
        semestreLectivo:      s.semestre ?? s.semester_id,
        semesterId:           s.semester_id,
        faseAcademica:        s.fase_academica,
        academicPhaseId:      s.academic_phase_id ?? null,
        phaseName:            s.phase_name ?? null,
        phaseDescription:     s.phase_description ?? null,
        approved:             s.approved,
        createdAt:            s.created_at,
        updatedAt:            s.updated_at,
    };
}
