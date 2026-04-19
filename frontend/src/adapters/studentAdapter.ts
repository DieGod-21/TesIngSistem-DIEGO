/**
 * studentAdapter.ts
 *
 * Convierte DTOs del API externo al modelo interno Student.
 *
 * CUANDO LLEGUE EL NUEVO API:
 *   1. Actualiza StudentDTO en types/dto.ts con el nuevo schema
 *   2. Ajusta los mapeos en adaptStudent() aquí
 *   3. Los hooks y componentes NO cambian
 */

import type { StudentDTO, RecentStudentDTO, BulkImportResponseDTO, UploadDTO } from '../types/dto';
import type { Student } from '../types/student';
import type { ImportResult, UploadItem } from '../services/studentsService';

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

export function adaptBulkImport(dto: BulkImportResponseDTO): ImportResult {
  return {
    imported: dto.importados ?? 0,
    rejected: dto.rechazados ?? 0,
    total:    dto.total      ?? 0,
    errors:   Array.isArray(dto.errores)
      ? dto.errores.map((e) => ({ row: e.fila, carnetId: e.carnet_id, reason: e.razon }))
      : [],
  };
}

export function adaptUpload(dto: UploadDTO): UploadItem {
  return {
    id:         dto.id,
    filename:   dto.filename,
    type:       dto.type,
    status:     dto.status,
    imported:   dto.imported ?? 0,
    rejected:   dto.rejected ?? 0,
    total:      dto.total_rows ?? (dto.imported ?? 0) + (dto.rejected ?? 0),
    errors:     Array.isArray(dto.errors)
      ? dto.errors.map((e) => ({ row: e.fila, carnetId: e.carnet_id, reason: e.razon }))
      : [],
    uploadedBy: dto.uploaded_by ?? '',
    uploadedAt: (() => {
      const d = new Date(dto.created_at);
      return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-GT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    })(),
  };
}

export function adaptRecentStudent(dto: RecentStudentDTO) {
  return {
    id:            dto.id,
    nombreCompleto: dto.nombre_completo,
    carnetId:      dto.carnet_id,
    approved:      dto.approved,
    updatedAt:     dto.updated_at,
    phaseName:     dto.phase_name,
    phaseDescription: dto.phase_description,
  };
}
