/**
 * studentsService.ts
 *
 * Servicio de datos para el módulo de estudiantes.
 * Consume la API real del backend.
 */

import { apiFetch, apiFetchList } from './apiClient';
import type { BackendStudent } from '../types/student';

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

/** Respuesta del endpoint POST /api/students/bulk */
interface BulkResponse {
    importados: number;
    rechazados: number;
    total: number;
    errores: Array<{ fila: number; carnet_id: string; razon: string }>;
}

/** Un error de fila devuelto por el historial */
export interface UploadError {
    fila: number;
    carnet_id: string;
    razon: string;
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
    return apiFetchList<Semester>('/semesters');
}

// ─── Estudiantes ─────────────────────────────────────────────────────

/**
 * Registra un estudiante via POST /api/students.
 * Envía academic_phase_id (nuevo campo relacional).
 */
export async function createStudent(payload: StudentPayload): Promise<BackendStudent> {
    return apiFetch<BackendStudent>('/students', {
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
}

// ─── Historial ────────────────────────────────────────────────────────

interface BackendUpload {
    id: string;
    filename: string;
    type: 'excel' | 'pdf';
    status: 'success' | 'error';
    imported: number;
    rejected: number;
    total_rows: number;
    errors: UploadError[];
    created_at: string;
    uploaded_by: string | null;
}

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

    const resp = await apiFetch<BulkResponse>('/students/bulk', {
        method: 'POST',
        body: JSON.stringify({ filas }),
    });

    return {
        imported: resp.importados,
        rejected: resp.rechazados,
        total:    resp.total,
        errors:   resp.errores.map((e) => ({ row: e.fila, carnetId: e.carnet_id, reason: e.razon })),
    };
}

export async function uploadPdf(_file: File): Promise<void> {
    // PDF processing is handled server-side when backend endpoint is added
}

export async function downloadTemplate(): Promise<void> {
    const token = localStorage.getItem('auth_token');
    const base  = import.meta.env.VITE_API_URL ?? '/api';
    const res   = await fetch(`${base}/students/template`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('No se pudo descargar la plantilla');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'plantilla_estudiantes.xlsx';
    a.click();
    URL.revokeObjectURL(url);
}

export async function deleteUpload(id: string): Promise<void> {
    await apiFetch<void>(`/uploads/${id}`, { method: 'DELETE' });
}

export async function getRecentUploads(): Promise<UploadItem[]> {
    const rows = await apiFetch<BackendUpload[]>('/uploads');
    return rows.map((r) => ({
        id:         r.id,
        filename:   r.filename,
        type:       r.type,
        status:     r.status,
        imported:   r.imported  ?? 0,
        rejected:   r.rejected  ?? 0,
        total:      r.total_rows ?? (r.imported ?? 0) + (r.rejected ?? 0),
        errors:     Array.isArray(r.errors) ? r.errors : [],
        uploadedBy: r.uploaded_by ?? '',
        uploadedAt: new Date(r.created_at).toLocaleString('es-GT', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        }),
    }));
}
