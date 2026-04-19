/**
 * dto.ts — Data Transfer Objects del API externo.
 *
 * Estas interfaces reflejan la RESPUESTA EXACTA del backend.
 * Son los únicos tipos que deben cambiar cuando el nuevo API llegue.
 *
 * REGLA: nada fuera de /services/ y /adapters/ debe importar desde aquí.
 * Los componentes y hooks solo ven los tipos de /types/*.ts (modelos internos).
 */

// ─── Auth ─────────────────────────────────────────────────────────────────

/** Respuesta de POST /auth/login */
export interface LoginResponseDTO {
  token: string;
  // Si el nuevo API añade refresh_token u otros campos, agregarlos aquí.
  // refresh_token?: string;
}

/** Claims del JWT decodificado */
export interface JwtPayloadDTO {
  user_id: string;
  nombre: string;
  roles: string[];
  exp: number;
}

// ─── Estudiantes ──────────────────────────────────────────────────────────

/** Respuesta de GET /students y POST /students */
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

/** Respuesta de GET /dashboard/recent-students */
export interface RecentStudentDTO {
  id: string;
  nombre_completo: string;
  carnet_id: string;
  approved: boolean;
  updated_at: string;
  phase_name: string;
  phase_description: string;
}

/** Respuesta de POST /students/bulk */
export interface BulkImportResponseDTO {
  importados: number;
  rechazados: number;
  total: number;
  errores: Array<{
    fila: number;
    carnet_id: string;
    razon: string;
  }>;
}

/** Respuesta de GET /uploads */
export interface UploadDTO {
  id: string;
  filename: string;
  type: 'excel' | 'pdf';
  status: 'success' | 'error' | 'pending';
  imported: number;
  rejected: number;
  total_rows: number;
  errors: Array<{ fila: number; carnet_id: string; razon: string }>;
  created_at: string;
  uploaded_by: string | null;
}

// ─── Dashboard ────────────────────────────────────────────────────────────

/** Respuesta de GET /dashboard/summary */
export interface DashboardSummaryDTO {
  total: number;
  approved: number;
  pending: number;
  completionPct: number;
  byPhase: Array<{
    phase_id: number;
    phase_name: string;
    phase_description: string;
    count: number;
  }>;
}

// ─── Fases Académicas ─────────────────────────────────────────────────────

/** Respuesta de GET /academic-phases */
export interface AcademicPhaseDTO {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

// ─── Semestres ────────────────────────────────────────────────────────────

/** Respuesta de GET /semesters */
export interface SemesterDTO {
  id: string;
  nombre: string;
  anio: number;
  numero: number;
}

// ─── Calendario ───────────────────────────────────────────────────────────

/** Respuesta de GET /events */
export interface CalendarEventDTO {
  id: string;
  titulo: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  ubicacion: string | null;
  descripcion: string | null;
  fase_academica: string | null;
  recordatorio: boolean;
  recordatorio_tiempo: number;
}

/** Respuesta de GET /deadlines */
export interface CalendarDeadlineDTO {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  fase_academica: string | null;
}

// ─── Notificaciones ───────────────────────────────────────────────────────

/** Respuesta de GET /notifications */
export interface NotificationDTO {
  id: string;
  user_id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  event_id: string | null;
  created_at: string;
}

/** Respuesta de GET /notifications/unread-count */
export interface UnreadCountDTO {
  count: number;
}
