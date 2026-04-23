/**
 * importarService.ts
 *
 * Endpoints de importación masiva (admin). Por ahora sólo estudiantes.
 *   POST /api/importar/estudiantes  (multipart/form-data, campo `archivo`)
 */

import { apiFetch } from './apiClient';
import { API_PATHS } from '../config/apiConfig';

export interface ImportarEstudiantesResult {
    total?:      number;
    creados?:    number;
    duplicados?: number;
    errores?:    Array<{ fila?: number; carnet?: string; error: string }> | string[];
    mensaje?:    string;
    message?:    string;
    [k: string]: unknown;
}

/**
 * Sube un archivo (.xlsx / .csv) al endpoint de importación masiva de
 * estudiantes. El backend responde con el resumen del proceso.
 */
export async function importarEstudiantes(file: File): Promise<ImportarEstudiantesResult> {
    const form = new FormData();
    // El backend acepta el campo estándar `archivo`. Por compatibilidad
    // agregamos también `file` (algunos endpoints lo esperan).
    form.append('archivo', file, file.name);
    form.append('file', file, file.name);

    const raw = await apiFetch<ImportarEstudiantesResult | { data: ImportarEstudiantesResult }>(
        API_PATHS.importar.estudiantes,
        { method: 'POST', body: form },
    );
    if (raw && typeof raw === 'object' && 'data' in raw && raw.data && typeof raw.data === 'object') {
        return raw.data as ImportarEstudiantesResult;
    }
    return raw as ImportarEstudiantesResult;
}
