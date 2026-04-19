import { useCallback, useEffect, useRef, useState } from 'react';
import * as svc from '../services/notificationsService';
import type { AppNotification } from '../services/notificationsService';
import { useAuth } from '../context/AuthContext';

const POLL_INTERVAL = 60_000; // 1 min

export function useNotifications() {
    const { isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetch = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const data = await svc.getNotifications();
            setNotifications(data);
        } catch { /* ignore network errors silently */ }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;
        setLoading(true);
        fetch().finally(() => setLoading(false));

        intervalRef.current = setInterval(fetch, POLL_INTERVAL);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isAuthenticated, fetch]);

    // Refetch when window becomes visible (user returns to tab)
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') fetch();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [fetch]);

    const markAsRead = useCallback(async (id: string) => {
        try {
            const updated = await svc.markAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? updated : n))
            );
        } catch { /* ignore */ }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await svc.markAllAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
        } catch { /* ignore */ }
    }, []);

    const unreadCount = notifications.filter((n) => !n.leida).length;

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh: fetch };
}
