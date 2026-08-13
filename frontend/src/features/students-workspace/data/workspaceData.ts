/**
 * workspaceData.ts — Capa de DATOS del Students Workspace.
 *
 * Compone los datasets EN LOTE que alimentan el motor de derivación, reutilizando
 * los servicios existentes y sus cachés. Tras la consolidación, la caché de cada
 * recurso vive con su DUEÑO (estudiantes / tesis / ternas / reportes) y sus
 * escrituras la invalidan; aquí ya no se define ningún namespace de caché propio.
 *
 * No hay N+1: cada fuente es UNA sola petición en lote, en paralelo.
 */

import { getEstudiantesRegistry } from '../../../services/estudiantesService';
import { getAprobadosTesisCached, getReprobadosTesisCached } from '../../../services/tesisService';
import type { TesisEstudiante } from '../../../services/tesisService';
import { listTernasCached } from '../../../services/ternasService';
import { getGlobalTernasReportCached } from '../../../services/reportesService';
import { reportError } from '../../../services/telemetry';
import type { TernaResumen, ReporteTernaItem } from '../../../types/api';
import type { WorkspaceDatasets } from '../domain/types';

/**
 * Devuelve un manejador de rechazo que degrada una fuente OPCIONAL a un valor
 * vacío y reporta el fallo a telemetría (diagnóstico, sin datos). Así el fallo
 * de una fuente (p. ej. el reporte, admin-only) nunca desactiva el workspace: el
 * dominio ya tolera esos datasets vacíos.
 */
function degradeTo<T>(source: string, fallback: T): (e: unknown) => T {
    return (e) => {
        reportError(e, { source: `workspace:source-degraded:${source}` });
        return fallback;
    };
}

/**
 * Descarga (o reutiliza de caché) los datasets en lote del workspace.
 *
 * La frescura la garantiza el contrato de invalidación de los servicios: cada
 * escritura invalida su caché (tesis / ternas / reporte / padrón), por lo que
 * basta con recargar.
 *
 * Resiliencia por-fuente: el PADRÓN es la base (sin estudiantes no hay
 * workspace); su fallo se propaga y el hook lo muestra como error. Las demás
 * fuentes son enriquecimiento y degradan INDEPENDIENTEMENTE a vacío, de modo que
 * un fallo aislado (reporte, ternas o una lista de tesis) no apaga la cola.
 */
export async function getWorkspaceDatasets(): Promise<WorkspaceDatasets> {
    const [registry, aprobados, reprobados, ternas, reporte] = await Promise.all([
        getEstudiantesRegistry(),
        getAprobadosTesisCached().catch(degradeTo('tesis-aprobados', { estudiantes: [] as TesisEstudiante[], nota_minima: 0 })),
        getReprobadosTesisCached().catch(degradeTo('tesis-reprobados', { estudiantes: [] as TesisEstudiante[], nota_minima: 0 })),
        listTernasCached().catch(degradeTo('ternas', [] as TernaResumen[])),
        getGlobalTernasReportCached().catch(degradeTo('reportes', { ternas: [] as ReporteTernaItem[] })),
    ]);
    return {
        students: registry.estudiantes,
        tesisAprobados: aprobados.estudiantes,
        tesisReprobados: reprobados.estudiantes,
        // Las dos listas publican el MISMO umbral; se toma el de aprobados y se
        // usa el de reprobados solo si aquella fuente degradó a vacío.
        notaMinimaTesis: aprobados.nota_minima || reprobados.nota_minima || 0,
        ternas,
        reporteTernas: reporte.ternas,
    };
}
