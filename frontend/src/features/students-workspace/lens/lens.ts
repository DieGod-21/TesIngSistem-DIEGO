/**
 * lens.ts — LENTE COMPARTIDA del módulo Students.
 *
 * Única fuente de verdad del "filtro/alcance" del listado. Antes esta lógica
 * vivía inline en StudentsListPage (`parseQuery`/`buildScopeTo`). Al centralizarla
 * aquí, la barra de progreso (ProgressBand) y la página comparten EXACTAMENTE la
 * misma lente: mismo parseo, misma URL, mismo mapeo al roster.
 *
 * Compatibilidad de URLs (no se rompe ningún enlace existente):
 *   - ?status=approved|failed   (preferido)
 *   - ?filter=aprobados|reprobados  (alias heredado)
 *   - ?search=… / ?q=…          (término de búsqueda)
 *   - ?page=…                   (página actual del padrón paginado)
 *   - ?per=…                    (resultados por página)
 *
 * `page`/`per` viven en la URL por el mismo motivo que `status`/`search`: el
 * coordinador abre un expediente desde la página 4 y al volver debe seguir en
 * la página 4. Sin esto, el estado se pierde en cada ida y vuelta.
 *
 * NO contiene reglas de negocio de etapas (eso es exclusivo del dominio
 * deriveStage/deriveWorkQueue). Aquí solo hay routing + mapeo de presentación.
 */

import { routes } from '../../../config/routes';
import { VOCAB } from '../../../config/vocabulary';
import { STAGE_ORDER } from '../domain/pipelineMeta';
import type { PipelineStage } from '../domain/types';

export type LensId = 'all' | 'approved' | 'failed';

/** Filtro de tesis que consumen las vistas del roster (null = padrón completo). */
export type TesisFilter = 'aprobados' | 'reprobados';

export interface LensDef {
    id: LensId;
    label: string;
    /** Valor de ?status= en la URL (null = sin filtro). */
    status: 'approved' | 'failed' | null;
    /** Filtro equivalente para el roster (null = padrón paginado). */
    tesisFilter: TesisFilter | null;
}

/** Definición ordenada de las lentes disponibles (orden de render). */
export const LENSES: readonly LensDef[] = [
    { id: 'all', label: 'Todos', status: null, tesisFilter: null },
    { id: 'approved', label: VOCAB.eligible, status: 'approved', tesisFilter: 'aprobados' },
    { id: 'failed', label: VOCAB.notEligible, status: 'failed', tesisFilter: 'reprobados' },
] as const;

/** Lee la lente activa desde la query string (tolerante al alias heredado). */
export function parseLens(search: string): LensId {
    const qp = new URLSearchParams(search);
    const status = qp.get('status');
    const filter = qp.get('filter');
    if (status === 'approved' || filter === 'aprobados') return 'approved';
    if (status === 'failed' || filter === 'reprobados') return 'failed';
    return 'all';
}

/** Lee el término de búsqueda (soporta ?search= y el alias ?q=). */
export function parseSearchTerm(search: string): string {
    const qp = new URLSearchParams(search);
    return qp.get('search') ?? qp.get('q') ?? '';
}

/** Filtro de tesis equivalente a una lente (para las vistas del roster). */
export function lensToTesisFilter(lens: LensId): TesisFilter | null {
    return LENSES.find((l) => l.id === lens)?.tesisFilter ?? null;
}

/* ── Paginación en la URL ─────────────────────────────────────────── */

/** Opciones de tamaño de página. Fuente única: la UI y el parseo la comparten. */
export const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_PER_PAGE = 20;

/* ── Etapa del pipeline en la URL ─────────────────────────────────── */

/**
 * Etapa del pipeline seleccionada (?stage=), o null.
 *
 * El dominio ya calcula el conteo de cada etapa y la banda de progreso ya los
 * muestra; sin este parámetro esos números eran inertes: el coordinador leía
 * "PG2 pendiente: 47" y no tenía forma de ver quiénes son esos 47.
 *
 * Aquí NO se decide qué es cada etapa (eso es exclusivo del dominio): solo se
 * valida contra el orden canónico y se serializa en la URL.
 */
export function parseStage(search: string): PipelineStage | null {
    const raw = new URLSearchParams(search).get('stage');
    return raw && (STAGE_ORDER as readonly string[]).includes(raw)
        ? (raw as PipelineStage)
        : null;
}

/** URL del listado acotado a una etapa (null = sin acotar). */
export function buildStageUrl(currentSearch: string, stage: PipelineStage | null): string {
    const qp = new URLSearchParams(currentSearch);
    if (stage) qp.set('stage', stage);
    else qp.delete('stage');
    const q = qp.toString();
    return q ? `${routes.students()}?${q}` : routes.students();
}

/**
 * Id del estudiante en inspección rápida (?preview=), o null si el panel está
 * cerrado. Vive en la URL por el mismo motivo que el resto del estado: abrir y
 * cerrar el panel no puede costar el contexto del listado, y el enlace debe
 * poder compartirse tal cual.
 */
export function parsePreview(search: string): string | null {
    const raw = new URLSearchParams(search).get('preview');
    return raw && raw.trim() !== '' ? raw : null;
}

/** URL del listado con el panel abierto en un estudiante (o cerrado con null). */
export function buildPreviewUrl(currentSearch: string, studentId: string | null): string {
    const qp = new URLSearchParams(currentSearch);
    if (studentId) qp.set('preview', studentId);
    else qp.delete('preview');
    const q = qp.toString();
    return q ? `${routes.students()}?${q}` : routes.students();
}

/** Lee la página actual (1 si falta o es inválida). */
export function parsePage(search: string): number {
    const raw = Number(new URLSearchParams(search).get('page'));
    return Number.isInteger(raw) && raw >= 1 ? raw : 1;
}

/** Lee el tamaño de página; solo se aceptan los valores ofrecidos por la UI. */
export function parsePerPage(search: string): number {
    const raw = Number(new URLSearchParams(search).get('per'));
    return (PER_PAGE_OPTIONS as readonly number[]).includes(raw) ? raw : DEFAULT_PER_PAGE;
}

/**
 * Construye la URL del listado aplicando un parche de parámetros y preservando
 * el resto. `null` elimina el parámetro; los valores por defecto no se
 * serializan, para que la URL limpia siga siendo la canónica.
 */
export function buildListUrl(
    currentSearch: string,
    patch: { page?: number | null; per?: number | null; search?: string | null },
): string {
    const qp = new URLSearchParams(currentSearch);

    if ('page' in patch) {
        if (patch.page == null || patch.page <= 1) qp.delete('page');
        else qp.set('page', String(patch.page));
    }
    if ('per' in patch) {
        if (patch.per == null || patch.per === DEFAULT_PER_PAGE) qp.delete('per');
        else qp.set('per', String(patch.per));
    }
    if ('search' in patch) {
        const v = patch.search?.trim();
        if (v) qp.set('search', v);
        else { qp.delete('search'); qp.delete('q'); }
    }

    const q = qp.toString();
    return q ? `${routes.students()}?${q}` : routes.students();
}

/**
 * Construye la URL de una lente preservando ?search= y normalizando el alias
 * heredado ?filter (se reescribe siempre a ?status=). No pierde otros params.
 * La ruta base proviene del registro central de rutas.
 */
export function buildLensUrl(currentSearch: string, lens: LensId): string {
    const qp = new URLSearchParams(currentSearch);
    qp.delete('filter');
    // Cambiar de lente cambia el conjunto: la paginación anterior deja de
    // aplicar y el expediente en inspección puede quedar fuera del alcance.
    qp.delete('page');
    qp.delete('preview');
    const def = LENSES.find((l) => l.id === lens);
    if (def?.status) qp.set('status', def.status);
    else qp.delete('status');
    const q = qp.toString();
    return q ? `${routes.students()}?${q}` : routes.students();
}
