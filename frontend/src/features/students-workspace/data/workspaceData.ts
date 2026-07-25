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
import { listTernasCached } from '../../../services/ternasService';
import { getGlobalTernasReportCached } from '../../../services/reportesService';
import type { WorkspaceDatasets } from '../domain/types';

/**
 * Descarga (o reutiliza de caché) los datasets en lote del workspace.
 *
 * La frescura la garantiza el contrato de invalidación de los servicios: cada
 * escritura invalida su caché (tesis / ternas / reporte / padrón), por lo que
 * basta con recargar. No hay un "force" propio: quedaría muerto tras el cleanup.
 *
 * Fail-fast (Promise.all): si una fuente falla, la promesa se rechaza con el
 * error real. La degradación por-fuente es responsabilidad del hook consumidor.
 */
export async function getWorkspaceDatasets(): Promise<WorkspaceDatasets> {
    const [registry, aprobados, reprobados, ternas, reporte] = await Promise.all([
        getEstudiantesRegistry(),
        getAprobadosTesisCached(),
        getReprobadosTesisCached(),
        listTernasCached(),
        getGlobalTernasReportCached(),
    ]);
    return {
        students: registry.estudiantes,
        tesisAprobados: aprobados.estudiantes,
        tesisReprobados: reprobados.estudiantes,
        ternas,
        reporteTernas: reporte.ternas,
    };
}
