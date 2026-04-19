import { apiFetch } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import type { AcademicPhaseDTO } from '../types/dto';

/** Modelo interno de fase académica */
export interface AcademicPhase {
    id: number;
    name: string;
    description: string | null;
    isActive: boolean;
}

function adaptPhase(dto: AcademicPhaseDTO): AcademicPhase {
    return {
        id:          dto.id,
        name:        dto.name,
        description: dto.description ?? null,
        isActive:    dto.is_active,
    };
}

export async function getAcademicPhases(): Promise<AcademicPhase[]> {
    const dtos = await apiFetch<AcademicPhaseDTO[]>(API_PATHS.academicPhases.active);
    return dtos.map(adaptPhase);
}

export async function getAllAcademicPhases(): Promise<AcademicPhase[]> {
    const dtos = await apiFetch<AcademicPhaseDTO[]>(API_PATHS.academicPhases.admin);
    return dtos.map(adaptPhase);
}

export async function createAcademicPhase(data: { name: string; description: string }): Promise<AcademicPhase> {
    const dto = await apiFetch<AcademicPhaseDTO>(API_PATHS.academicPhases.active, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return adaptPhase(dto);
}

export async function updateAcademicPhase(
    id: number,
    data: { name: string; description: string }
): Promise<AcademicPhase> {
    const dto = await apiFetch<AcademicPhaseDTO>(API_PATHS.academicPhases.byId(id), {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    return adaptPhase(dto);
}

export async function toggleAcademicPhase(id: number): Promise<AcademicPhase> {
    const dto = await apiFetch<AcademicPhaseDTO>(API_PATHS.academicPhases.toggle(id), { method: 'PATCH' });
    return adaptPhase(dto);
}
