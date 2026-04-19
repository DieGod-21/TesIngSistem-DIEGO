import { apiFetch, apiFetchList } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import type { CalendarEventDTO, CalendarDeadlineDTO } from '../types/dto';

/** Modelo interno de evento de calendario (camelCase) */
export interface CalendarEvent {
    id: string;
    title: string;
    type: string;
    startDate: string;
    endDate: string | null;
    location: string | null;
    description: string | null;
    academicPhase: string | null;
    hasReminder: boolean;
    reminderMinutes: number;
}

/** Modelo interno de deadline de calendario (camelCase) */
export interface CalendarDeadline {
    id: string;
    title: string;
    description: string | null;
    date: string;
    academicPhase: string | null;
}

/** Payload para crear/actualizar un evento — nombres que el API espera */
export interface EventPayload {
    titulo: string;
    tipo: string;
    fecha_inicio: string;
    fecha_fin?: string | null;
    ubicacion?: string | null;
    descripcion?: string | null;
    recordatorio?: boolean;
    recordatorio_tiempo?: number;
}

function adaptEvent(dto: CalendarEventDTO): CalendarEvent {
    return {
        id:              dto.id,
        title:           dto.titulo,
        type:            dto.tipo,
        startDate:       dto.fecha_inicio,
        endDate:         dto.fecha_fin         ?? null,
        location:        dto.ubicacion         ?? null,
        description:     dto.descripcion       ?? null,
        academicPhase:   dto.fase_academica    ?? null,
        hasReminder:     dto.recordatorio      ?? false,
        reminderMinutes: dto.recordatorio_tiempo ?? 0,
    };
}

function adaptDeadline(dto: CalendarDeadlineDTO): CalendarDeadline {
    return {
        id:            dto.id,
        title:         dto.titulo,
        description:   dto.descripcion    ?? null,
        date:          dto.fecha,
        academicPhase: dto.fase_academica ?? null,
    };
}

export function getCalendarEvents(): Promise<CalendarEvent[]> {
    return apiFetchList<CalendarEventDTO>(`${API_PATHS.events.list}?limit=100`)
        .then((dtos) => dtos.map(adaptEvent));
}

export function getCalendarDeadlines(): Promise<CalendarDeadline[]> {
    return apiFetchList<CalendarDeadlineDTO>(`${API_PATHS.deadlines.list}?limit=100`)
        .then((dtos) => dtos.map(adaptDeadline));
}

export function createEvent(data: EventPayload): Promise<CalendarEvent> {
    return apiFetch<CalendarEventDTO>(API_PATHS.events.list, {
        method: 'POST',
        body: JSON.stringify(data),
    }).then(adaptEvent);
}

export function updateEvent(id: string, data: Partial<EventPayload>): Promise<CalendarEvent> {
    return apiFetch<CalendarEventDTO>(API_PATHS.events.byId(id), {
        method: 'PUT',
        body: JSON.stringify(data),
    }).then(adaptEvent);
}

export function deleteEvent(id: string): Promise<void> {
    return apiFetch<void>(API_PATHS.events.byId(id), { method: 'DELETE' });
}

export function deleteDeadline(id: string): Promise<void> {
    return apiFetch<void>(API_PATHS.deadlines.byId(id), { method: 'DELETE' });
}
