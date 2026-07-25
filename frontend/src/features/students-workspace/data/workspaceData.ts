/**
 * workspaceData.ts — Capa de DATOS del Students Workspace.
 *
 * Compone los datasets EN LOTE que alimentan el motor de derivación, reutilizando
 * los servicios existentes y la caché compartida (`cached`/`invalidate`). Sigue
 * la arquitectura de caché ya establecida por `estudiantesService`:
 *   - claves con convención `recurso:sub` (aquí bajo el prefijo `workspace`),
 *   - deduplicación de peticiones en vuelo,
 *   - invalidación por prefijo tras escrituras.
 *
 * No hay N+1: cada fuente es UNA sola petición en lote. El padrón se reutiliza
 * de `estudiantes:registry` (no se vuelve a descargar bajo otra clave).
 */

import { cached, invalidate } from '../../../services/cache';
import { getEstudiantesRegistry } from '../../../services/estudiantesService';
import { getAprobadosTesisCached, getReprobadosTesisCached, invalidateTesis } from '../../../services/tesisService';
import { listTernas } from '../../../services/ternasService';
import { getGlobalTernasReport } from '../../../services/reportesService';
import type { TernaResumen, ReporteTernaItem } from '../../../types/api';
import type { WorkspaceDatasets } from '../domain/types';

/**
 * Prefijo de recurso propio del workspace (ternas + reporte). `invalidate('workspace')`
 * limpia estas claves. Las listas de tesis NO viven aquí: las posee y cachea
 * `tesisService` (dueño del recurso), invalidado por las escrituras de nota.
 */
export const WORKSPACE_CACHE_PREFIX = 'workspace';
export const WORKSPACE_TERNAS_KEY = 'workspace:ternas';
export const WORKSPACE_REPORTE_TERNAS_KEY = 'workspace:reporte-ternas';

/** TTL corto, alineado con el padrón, para no servir datos rancios. */
const WORKSPACE_TTL_MS = 60_000;

function loadTernas(): Promise<TernaResumen[]> {
    return cached(WORKSPACE_TERNAS_KEY, () => listTernas(), WORKSPACE_TTL_MS);
}

function loadReporteTernas(): Promise<ReporteTernaItem[]> {
    return cached(WORKSPACE_REPORTE_TERNAS_KEY, async () => (await getGlobalTernasReport()).ternas, WORKSPACE_TTL_MS);
}

/**
 * Descarga (o reutiliza de caché) los datasets en lote del workspace.
 *
 * `force` invalida las claves del workspace antes de recargar. NO invalida el
 * padrón compartido (`estudiantes:registry`), que tiene su propio ciclo de vida
 * vía `invalidateEstudiantes`.
 *
 * Fail-fast (Promise.all): si una fuente falla, la promesa se rechaza con el
 * error real. La degradación por-fuente es responsabilidad del hook consumidor
 * (Wave 1), no de esta capa.
 */
export async function getWorkspaceDatasets(opts: { force?: boolean } = {}): Promise<WorkspaceDatasets> {
    if (opts.force) invalidateWorkspaceData();
    const [registry, aprobados, reprobados, ternas, reporteTernas] = await Promise.all([
        getEstudiantesRegistry({ force: opts.force }),
        getAprobadosTesisCached(),
        getReprobadosTesisCached(),
        loadTernas(),
        loadReporteTernas(),
    ]);
    return {
        students: registry.estudiantes,
        tesisAprobados: aprobados.estudiantes,
        tesisReprobados: reprobados.estudiantes,
        ternas,
        reporteTernas,
    };
}

/**
 * Invalida las cachés que alimentan el workspace: las propias (ternas + reporte)
 * y las de tesis (cuyo dueño es tesisService). El padrón se invalida por separado
 * con `invalidateEstudiantes`. Reutiliza la invalidación por prefijo existente.
 */
export function invalidateWorkspaceData(): void {
    invalidate(WORKSPACE_CACHE_PREFIX);
    invalidateTesis();
}
