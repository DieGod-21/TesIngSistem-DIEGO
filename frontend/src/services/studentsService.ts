/**
 * studentsService.ts
 *
 * Servicio de datos para el módulo de estudiantes.
 * Consume la API real del backend.
 */

import { apiFetch, apiFetchList } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import type { StudentDTO, SemesterDTO, BulkImportResponseDTO, UploadDTO } from '../types/dto';
import type { Student } from '../types/student';
import { adaptStudent, adaptBulkImport, adaptUpload } from '../adapters/studentAdapter';

// ─── Interfaces ────────────────────────────────────────────────────

/** Dominios válidos para correo institucional */
export const ALLOWED_EMAIL_DOMAINS = ['@miumg.edu.gt', '@umg.edu.gt'];

/** Semestre devuelto por GET /api/semesters */
export interface Semester {
    id: string;
    nombre: string;
    anio: number;
    numero: number;
}

/** Payload para crear un estudiante (campos que envía el formulario) */
export interface StudentPayload {
    nombreCompleto: string;
    carnetId: string;
    correoInstitucional: string;
    /** UUID del semestre */
    semesterId: string;
    /** ID numérico de la fase en academic_phases */
    academicPhaseId: number;
}

/** Una fila parseada de un archivo Excel/CSV */
export interface ParsedRow {
    rowIndex: number;
    /** Nombre completo del estudiante (columna "Full Name") */
    fullName?: string;
    carnetId?: string;
    /** Correo institucional opcional (columna "Email (optional)") */
    email?: string;
    /** Nombre de la fase académica (columna "Academic Phase") */
    academicPhase?: string;
    /** Estado de aprobación: "aprobado" | "desaprobado" | boolean (columna "Status") */
    approved?: string | boolean;
    [key: string]: unknown;
}

/** Resultado de una importación masiva */
export interface ImportResult {
    imported: number;
    rejected: number;
    total: number;
    errors: Array<{ row: number; carnetId: string; reason: string }>;
}

/** Error de fila (modelo interno, camelCase) */
export interface UploadError {
    row: number;
    carnetId: string;
    reason: string;
}

/** Ítem de carga reciente (historial) */
export interface UploadItem {
    id: string;
    filename: string;
    status: 'success' | 'error' | 'pending';
    uploadedAt: string;
    type: 'excel' | 'pdf';
    imported: number;
    rejected: number;
    total: number;
    errors: UploadError[];
    uploadedBy: string;
}

// ─── Semesters ──────────────────────────────────────────────────────

export async function getSemesters(): Promise<Semester[]> {
    const dtos = await apiFetchList<SemesterDTO>(API_PATHS.semesters);
    return dtos.map((d) => ({
        id:     d.id,
        nombre: d.nombre,
        anio:   d.anio,
        numero: d.numero,
    }));
}

// ─── Estudiantes ─────────────────────────────────────────────────────

/**
 * Registra un estudiante via POST /api/students.
 * Envía academic_phase_id (nuevo campo relacional).
 */
export async function createStudent(payload: StudentPayload): Promise<Student> {
    const dto = await apiFetch<StudentDTO>(API_PATHS.students.list, {
        method: 'POST',
        body: JSON.stringify({
            nombre_completo:      payload.nombreCompleto.trim(),
            carnet_id:            payload.carnetId.trim(),
            correo_institucional: payload.correoInstitucional.trim(),
            semester_id:          payload.semesterId,
            academic_phase_id:    payload.academicPhaseId,
            approved:             false,
        }),
    });
    return adaptStudent(dto);
}

// ─── Historial ────────────────────────────────────────────────────────

/**
 * Importa filas desde Excel usando POST /api/students/bulk.
 * Cada fila puede traer su propia fase académica y estado de aprobación.
 */
export async function importStudents(rows: ParsedRow[]): Promise<ImportResult> {
    const clean = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ').replace(/\*/g, '').trim();
    const filas = rows.map((row) => ({
        full_name: clean(row.fullName),
        carnet_id: clean(row.carnetId),
        email:     clean(row.email) || undefined,
        phase:     clean(row.academicPhase),
        approved:  row.approved,
    }));

    const dto = await apiFetch<BulkImportResponseDTO>(API_PATHS.students.bulk, {
        method: 'POST',
        body: JSON.stringify({ filas }),
    });

    return adaptBulkImport(dto);
}

export async function uploadPdf(_file: File): Promise<void> {
    // TODO: implementar cuando el nuevo API exponga el endpoint de subida de PDF
    throw new Error('La subida de PDF no está disponible en este momento. Usa Excel para importación masiva.');
}

export async function downloadTemplate(): Promise<void> {
    const blob = await apiFetch<Blob>(API_PATHS.students.template, {
        headers: { Accept: 'application/octet-stream' },
    });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = 'plantilla_estudiantes.xlsx';
    a.click();
    URL.revokeObjectURL(url);
}

export async function deleteUpload(id: string): Promise<void> {
    await apiFetch<void>(API_PATHS.uploads.byId(id), { method: 'DELETE' });
}

export async function getRecentUploads(): Promise<UploadItem[]> {
    const dtos = await apiFetch<UploadDTO[]>(API_PATHS.uploads.list);
    return dtos.map(adaptUpload);
}
