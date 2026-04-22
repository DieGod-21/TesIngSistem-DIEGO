/**
 * reportesService.ts
 *
 * Acceso a /api/reportes/* (solo admin).
 */

import { apiGet } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import type { ReporteTernasGlobal, ResolucionTerna } from '../types/api';

export async function getGlobalTernasReport(): Promise<ReporteTernasGlobal> {
    return apiGet<ReporteTernasGlobal>(API_PATHS.reportes.ternas);
}

export interface ReporteTernaDetalleEvaluador {
    nombre: string;
    calificacion: number | string | null;
    comentarios: string | null;
    estado: 'borrador' | 'enviada' | string;
}

export interface ReporteTernaDetalle {
    terna_id: number;
    numero: number;
    estado: string;
    proyecto: {
        titulo: string;
        fase?: 'PG1' | 'PG2' | string;
    };
    estudiante: {
        carnet: string;
        nombre: string;
        email?: string;
    };
    evaluadores: ReporteTernaDetalleEvaluador[];
    resultado: {
        promedio: number | string | null;
        resolucion: ResolucionTerna;
        total_evaluadores: number;
        evaluaciones_enviadas: number;
    };
    razon?: string;
}

export async function getTernaReport(id: number): Promise<ReporteTernaDetalle> {
    const data = await apiGet<{ reporte: ReporteTernaDetalle } | ReporteTernaDetalle>(
        API_PATHS.reportes.ternaById(id),
    );
    if (data && typeof data === 'object' && 'reporte' in data) {
        return (data as { reporte: ReporteTernaDetalle }).reporte;
    }
    return data as ReporteTernaDetalle;
}
