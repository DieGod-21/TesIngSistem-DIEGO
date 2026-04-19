import { apiFetch } from './apiClient';
import { API_PATHS } from '../config/apiConfig';
import type { NotificationDTO, UnreadCountDTO } from '../types/dto';

/** Modelo interno de notificación (camelCase) */
export interface AppNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    read: boolean;
    eventId: string | null;
    createdAt: string;
}

function adaptNotification(dto: NotificationDTO): AppNotification {
    return {
        id:        dto.id,
        userId:    dto.user_id,
        title:     dto.titulo,
        message:   dto.mensaje,
        read:      dto.leida,
        eventId:   dto.event_id  ?? null,
        createdAt: dto.created_at,
    };
}

export function getNotifications(): Promise<AppNotification[]> {
    return apiFetch<NotificationDTO[]>(API_PATHS.notifications.list)
        .then((dtos) => dtos.map(adaptNotification));
}

export function getUnreadCount(): Promise<UnreadCountDTO> {
    return apiFetch<UnreadCountDTO>(API_PATHS.notifications.unreadCount);
}

export function markAsRead(id: string): Promise<AppNotification> {
    return apiFetch<NotificationDTO>(API_PATHS.notifications.markRead(id), { method: 'PATCH' })
        .then(adaptNotification);
}

export function markAllAsRead(): Promise<{ ok: boolean }> {
    return apiFetch<{ ok: boolean }>(API_PATHS.notifications.markAllRead, { method: 'PATCH' });
}
