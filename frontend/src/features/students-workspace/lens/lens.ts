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
 *
 * NO contiene reglas de negocio de etapas (eso es exclusivo del dominio
 * deriveStage/deriveWorkQueue). Aquí solo hay routing + mapeo de presentación.
 */

import { routes } from '../../../config/routes';

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
    { id: 'approved', label: 'Elegibles a tesis', status: 'approved', tesisFilter: 'aprobados' },
    { id: 'failed', label: 'Pendientes de tesis', status: 'failed', tesisFilter: 'reprobados' },
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

/**
 * Construye la URL de una lente preservando ?search= y normalizando el alias
 * heredado ?filter (se reescribe siempre a ?status=). No pierde otros params.
 * La ruta base proviene del registro central de rutas.
 */
export function buildLensUrl(currentSearch: string, lens: LensId): string {
    const qp = new URLSearchParams(currentSearch);
    qp.delete('filter');
    const def = LENSES.find((l) => l.id === lens);
    if (def?.status) qp.set('status', def.status);
    else qp.delete('status');
    const q = qp.toString();
    return q ? `${routes.students()}?${q}` : routes.students();
}
