/**
 * tesisService.ts
 *
 * Acceso a /api/tesis/* — listados oficiales de aprobación/reprobación
 * de tesis (PG1+PG2). Reutilizado por el filtro del listado de
 * estudiantes al llegar desde las KPI clicables del dashboard.
 */

import { apiGet } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import type { EstadoTesis } from '../types/api';

export interface TesisEstudiante {
    carnet: string;
    nombre: string;
    email?: string | null;
    nota_grad1: number | null;
    nota_grad2: number | null;
    estado_grad1?: string | null;
    estado_grad2?: string | null;
}

interface TesisListResp {
    total: number;
    nota_minima: number;
    estudiantes: TesisEstudiante[];
}

/** GET /api/tesis/aprobados — estudiantes que aprueban tesis. */
export async function getAprobadosTesis(): Promise<TesisListResp> {
    const data = await apiGet<TesisListResp>(API_PATHS.tesis.aprobados);
    return normalize(data);
}

/** GET /api/tesis/reprobados — estudiantes que no cumplen con tesis. */
export async function getReprobadosTesis(): Promise<TesisListResp> {
    const data = await apiGet<TesisListResp>(API_PATHS.tesis.reprobados);
    return normalize(data);
}

/** GET /api/tesis/estado/{carnet} — estado de tesis calculado por el servidor. */
export async function getTesisEstadoByCarnet(carnet: string): Promise<EstadoTesis> {
    return apiGet<EstadoTesis>(API_PATHS.tesis.byCarnet(carnet));
}

function normalize(d: Partial<TesisListResp> | null | undefined): TesisListResp {
    return {
        total:        d?.total ?? 0,
        nota_minima:  d?.nota_minima ?? 0,
        estudiantes:  d?.estudiantes ?? [],
    };
}
