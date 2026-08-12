/**
 * importarService.ts
 *
 * Endpoints de importación masiva (admin).
 *   POST /api/importar/estudiantes          (multipart, campo `archivo`, Excel)
 *   POST /api/importar/notas/{cursoCodigo}  (multipart, campo `archivo`, PDF)
 *
 * SOBRE LO QUE EL SERVIDOR DEVUELVE
 * ─────────────────────────────────
 * Estas dos respuestas son, con diferencia, las más ricas del contrato. La de
 * notas declara el curso, el ciclo, la fecha del acta, cuántos registros traía
 * el PDF, cuántos se procesaron, cuántos carnés no existían en el padrón, el
 * reparto por estado (aprobado / reprobado / NSP), las operaciones (insertado
 * frente a actualizado) y el DETALLE POR ESTUDIANTE con nombre y nota.
 *
 * El producto tenía modelada otra forma —`{ total, creados, duplicados }`— que
 * no existe en ningún sitio del contrato. Ninguno de esos campos llegaba nunca,
 * de modo que el resumen caía siempre en su texto por defecto y el detalle
 * completo se tiraba. Importar un acta es la operación de mayor alcance del
 * sistema (cambia la elegibilidad de toda una cohorte) y era la que menos
 * contaba de lo que había hecho.
 *
 * Los normalizadores toleran ambas formas: la declarada y la antigua que el
 * código asumía, por si algún despliegue la sirviera.
 */

import { apiFetch, REQUEST_TIMEOUTS } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import { invalidateEstudiantes } from './estudiantesService';
import { invalidateTesis } from './tesisService';

// ─── Formas declaradas en /api-docs.json ────────────────────────────────────

export type ResultadoFila = 'INSERTADO' | 'ACTUALIZADO' | 'NO_ENCONTRADO';

export interface FilaNotaImportada {
    carnet: string;
    nombre: string;
    nota_final: number | string | null;
    estado: 'APROBADO' | 'REPROBADO' | 'NSP' | string;
    resultado: ResultadoFila | string;
}

export interface ImportarNotasResult {
    curso?: string;
    ciclo?: string;
    fecha_acta?: string;
    totales: { en_pdf: number; procesados: number; no_encontrados: number };
    estados: { aprobados: number; reprobados: number; nsp: number };
    operaciones: { insertados: number; actualizados: number };
    detalle: FilaNotaImportada[];
    mensaje?: string;
}

export interface ImportarEstudiantesResult {
    curso?: string;
    total_en_archivo: number;
    estudiantes: { insertados: number; actualizados: number; total_procesados: number };
    inscripciones_nuevas: number;
    filas_invalidas: number;
    /** Filas que el servidor rechazó. Forma no declarada: se muestra lo que traiga. */
    detalle_invalidos: Array<Record<string, unknown>>;
    mensaje?: string;
}

/** Forma cruda: puede venir como raíz o envuelta en `data`. */
function desenvolver(raw: unknown): Record<string, unknown> {
    if (raw && typeof raw === 'object') {
        const o = raw as Record<string, unknown>;
        if (o.data && typeof o.data === 'object') return o.data as Record<string, unknown>;
        return o;
    }
    return {};
}

const num = (v: unknown, alt = 0): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : alt;
};

const obj = (v: unknown): Record<string, unknown> =>
    (v && typeof v === 'object' && !Array.isArray(v)) ? v as Record<string, unknown> : {};

const texto = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() ? v.trim() : undefined;

function normalizarNotas(raw: unknown): ImportarNotasResult {
    const d = desenvolver(raw);
    const totales = obj(d.totales);
    const estados = obj(d.estados);
    const oper    = obj(d.operaciones);
    const detalle = Array.isArray(d.detalle) ? d.detalle as FilaNotaImportada[] : [];

    return {
        curso:      texto(d.curso),
        ciclo:      texto(d.ciclo),
        fecha_acta: texto(d.fecha_acta),
        totales: {
            // Si el servidor no declara el total del PDF, el número de filas del
            // detalle es la mejor aproximación disponible y no una invención.
            en_pdf:         num(totales.en_pdf, detalle.length),
            procesados:     num(totales.procesados, num(d.procesados)),
            no_encontrados: num(totales.no_encontrados),
        },
        estados: {
            aprobados:  num(estados.aprobados),
            reprobados: num(estados.reprobados),
            nsp:        num(estados.nsp),
        },
        operaciones: {
            insertados:   num(oper.insertados,   num(d.creados)),
            actualizados: num(oper.actualizados),
        },
        detalle,
        mensaje: texto(d.mensaje) ?? texto((raw as Record<string, unknown>)?.message),
    };
}

function normalizarEstudiantes(raw: unknown): ImportarEstudiantesResult {
    const d = desenvolver(raw);
    const est = obj(d.estudiantes);
    return {
        curso:            texto(d.curso),
        total_en_archivo: num(d.total_en_archivo, num(d.total)),
        estudiantes: {
            insertados:      num(est.insertados, num(d.creados)),
            actualizados:    num(est.actualizados),
            total_procesados: num(est.total_procesados, num(d.procesados)),
        },
        inscripciones_nuevas: num(d.inscripciones_nuevas),
        filas_invalidas:      num(d.filas_invalidas),
        detalle_invalidos: Array.isArray(d.detalle_invalidos)
            ? d.detalle_invalidos as Array<Record<string, unknown>>
            : (Array.isArray(d.errores) ? d.errores as Array<Record<string, unknown>> : []),
        mensaje: texto(d.mensaje) ?? texto((raw as Record<string, unknown>)?.message),
    };
}

// ─── Llamadas ───────────────────────────────────────────────────────────────

function formulario(file: File): FormData {
    const form = new FormData();
    form.append('archivo', file, file.name);
    form.append('file', file, file.name);
    return form;
}

export async function importarEstudiantes(file: File): Promise<ImportarEstudiantesResult> {
    const raw = await apiFetch<unknown>(
        API_PATHS.importar.estudiantes,
        { method: 'POST', body: formulario(file), timeout: REQUEST_TIMEOUTS.upload },
    );
    // Importación masiva: el padrón cambió → invalidar la caché compartida.
    invalidateEstudiantes();
    return normalizarEstudiantes(raw);
}

export async function importarNotas(cursoCodigo: string, file: File): Promise<ImportarNotasResult> {
    const raw = await apiFetch<unknown>(
        API_PATHS.importar.notas(cursoCodigo),
        { method: 'POST', body: formulario(file), timeout: REQUEST_TIMEOUTS.upload },
    );
    // Las notas importadas cambian la elegibilidad de tesis del padrón → invalidar
    // padrón y listas oficiales de tesis (de las que deriva la cola de trabajo).
    invalidateEstudiantes();
    invalidateTesis();
    return normalizarNotas(raw);
}
