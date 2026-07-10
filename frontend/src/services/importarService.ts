/**
 * importarService.ts
 *
 * Endpoints de importación masiva (admin).
 *   POST /api/importar/estudiantes          (multipart, campo `archivo`, Excel)
 *   POST /api/importar/notas/{cursoCodigo}  (multipart, campo `archivo`, PDF)
 */

import { apiFetch, REQUEST_TIMEOUTS } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import { invalidateEstudiantes } from './estudiantesService';

export interface ImportarResult {
    total?:      number;
    creados?:    number;
    duplicados?: number;
    procesados?: number;
    errores?:    Array<{ fila?: number; carnet?: string; error: string }> | string[];
    mensaje?:    string;
    message?:    string;
    [k: string]: unknown;
}

/** @deprecated Use ImportarResult */
export type ImportarEstudiantesResult = ImportarResult;

function normalize(raw: unknown): ImportarResult {
    if (raw && typeof raw === 'object' && 'data' in (raw as object)) {
        return (raw as { data: ImportarResult }).data;
    }
    return raw as ImportarResult;
}

export async function importarEstudiantes(file: File): Promise<ImportarResult> {
    const form = new FormData();
    form.append('archivo', file, file.name);
    form.append('file', file, file.name);
    const result = normalize(
        await apiFetch<ImportarResult | { data: ImportarResult }>(
            API_PATHS.importar.estudiantes,
            { method: 'POST', body: form, timeout: REQUEST_TIMEOUTS.upload },
        ),
    );
    // Importación masiva: el padrón cambió → invalidar la caché compartida.
    invalidateEstudiantes();
    return result;
}

export async function importarNotas(cursoCodigo: string, file: File): Promise<ImportarResult> {
    const form = new FormData();
    form.append('archivo', file, file.name);
    form.append('file', file, file.name);
    const result = normalize(
        await apiFetch<ImportarResult | { data: ImportarResult }>(
            API_PATHS.importar.notas(cursoCodigo),
            { method: 'POST', body: form, timeout: REQUEST_TIMEOUTS.upload },
        ),
    );
    // Las notas importadas cambian el estado de tesis del padrón → invalidar.
    invalidateEstudiantes();
    return result;
}
