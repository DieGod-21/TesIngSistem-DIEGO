import { apiFetch } from './apiClient';

export interface AppNotification {
    id: string;
    user_id: string;
    titulo: string;
    mensaje: string;
    leida: boolean;
    event_id: string | null;
    created_at: string;
}

export function getNotifications(): Promise<AppNotification[]> {
    return apiFetch<AppNotification[]>('/notifications');
}

export function getUnreadCount(): Promise<{ count: number }> {
    return apiFetch<{ count: number }>('/notifications/unread-count');
}

export function markAsRead(id: string): Promise<AppNotification> {
    return apiFetch<AppNotification>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllAsRead(): Promise<{ ok: boolean }> {
    return apiFetch<{ ok: boolean }>('/notifications/read-all', { method: 'PATCH' });
}
