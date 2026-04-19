/**
 * ToastContext.tsx
 *
 * Sistema de notificaciones toast global.
 *
 * Uso:
 *   const { toast } = useToast();
 *   toast.success('Estudiante aprobado');
 *   toast.error('No se pudo guardar');
 *   toast.info('Importando registros…');
 *
 * Renderizado: añadir <ToastContainer /> en AppShell o App.tsx
 */

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
    /** ms antes de auto-dismiss (default 3500) */
    duration?: number;
    /** true cuando está saliendo (para la animación de salida) */
    exiting?: boolean;
}

interface ToastContextValue {
    toasts: ToastItem[];
    addToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────

const DEFAULT_DURATION = 3500;
const EXIT_DURATION = 300;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const removeToast = useCallback((id: string) => {
        // Primero marca como "exiting" para animar la salida
        setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, EXIT_DURATION);
    }, []);

    const addToast = useCallback((type: ToastType, message: string, duration = DEFAULT_DURATION) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts((prev) => [...prev, { id, type, message, duration }]);
        timersRef.current[id] = setTimeout(() => removeToast(id), duration);
    }, [removeToast]);

    const api = {
        success: (msg: string, dur?: number) => addToast('success', msg, dur),
        error:   (msg: string, dur?: number) => addToast('error',   msg, dur),
        info:    (msg: string, dur?: number) => addToast('info',    msg, dur),
        warning: (msg: string, dur?: number) => addToast('warning', msg, dur),
    };

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </ToastContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
    return {
        toast: {
            success: (msg: string, dur?: number) => ctx.addToast('success', msg, dur),
            error:   (msg: string, dur?: number) => ctx.addToast('error',   msg, dur),
            info:    (msg: string, dur?: number) => ctx.addToast('info',    msg, dur),
            warning: (msg: string, dur?: number) => ctx.addToast('warning', msg, dur),
        },
    };
}

// ─── Container + Item ─────────────────────────────────────────────────

import '../styles/toast.css';

const ICONS: Record<ToastType, string> = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
    warning: '⚠',
};

const ToastItem: React.FC<{ item: ToastItem; onDismiss: (id: string) => void }> = ({ item, onDismiss }) => (
    <div
        className={`toast toast--${item.type}${item.exiting ? ' toast--exit' : ''}`}
        role="alert"
        aria-live="assertive"
    >
        <span className="toast__icon" aria-hidden="true">{ICONS[item.type]}</span>
        <span className="toast__message">{item.message}</span>
        <button
            className="toast__close"
            aria-label="Cerrar notificación"
            onClick={() => onDismiss(item.id)}
        >×</button>
    </div>
);

const ToastContainer: React.FC<{ toasts: ToastItem[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
    if (toasts.length === 0) return null;
    return (
        <div className="toast-container" aria-label="Notificaciones">
            {toasts.map((t) => (
                <ToastItem key={t.id} item={t} onDismiss={onDismiss} />
            ))}
        </div>
    );
};
