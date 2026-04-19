import { apiFetch } from './apiClient';

export interface AcademicPhase {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
}

/** GET /api/academic-phases — fases activas (para formularios de estudiantes). */
export async function getAcademicPhases(): Promise<AcademicPhase[]> {
    return apiFetch<AcademicPhase[]>('/academic-phases');
}

/** GET /api/academic-phases/admin — todas las fases (solo admin). */
export async function getAllAcademicPhases(): Promise<AcademicPhase[]> {
    return apiFetch<AcademicPhase[]>('/academic-phases/admin');
}

/** POST /api/academic-phases — crea una nueva fase (solo admin). */
export async function createAcademicPhase(data: { name: string; description: string }): Promise<AcademicPhase> {
    return apiFetch<AcademicPhase>('/academic-phases', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/** PUT /api/academic-phases/:id — actualiza nombre y descripción (solo admin). */
export async function updateAcademicPhase(
    id: number,
    data: { name: string; description: string }
): Promise<AcademicPhase> {
    return apiFetch<AcademicPhase>(`/academic-phases/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/** PATCH /api/academic-phases/:id/toggle — activa o desactiva una fase (solo admin). */
export async function toggleAcademicPhase(id: number): Promise<AcademicPhase> {
    return apiFetch<AcademicPhase>(`/academic-phases/${id}/toggle`, { method: 'PATCH' });
}
