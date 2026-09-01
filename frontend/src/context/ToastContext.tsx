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

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { duracionDeSalida } from '../utils/animacion';

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

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    /** Cancela y olvida el temporizador de auto-cierre de un aviso. */
    const olvidarTemporizador = useCallback((id: string) => {
        const t = timersRef.current[id];
        if (t !== undefined) {
            clearTimeout(t);
            delete timersRef.current[id];
        }
    }, []);

    /**
     * Retira el aviso del todo. Lo llama el propio elemento cuando su
     * animación de salida ha terminado (ver `ToastItem`).
     */
    const descartar = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    /*
     * Pedir el cierre solo MARCA la salida; quien decide cuándo desaparece de
     * verdad es el elemento, que sabe cuánto dura su propia animación.
     *
     * Antes se esperaba una constante de 300ms escrita aquí mientras el CSS
     * animaba 280ms, y con movimiento reducido —donde el CSS deja la animación
     * en `none`— se seguían esperando los 300ms enteros: pulsar la equis no
     * hacía nada durante un tercio de segundo y el aviso desaparecía después,
     * de golpe. La preferencia quitaba la animación y dejaba la espera.
     */
    const removeToast = useCallback((id: string) => {
        olvidarTemporizador(id);
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    }, [olvidarTemporizador]);

    const addToast = useCallback((type: ToastType, message: string, duration = DEFAULT_DURATION) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts((prev) => [...prev, { id, type, message, duration }]);
        timersRef.current[id] = setTimeout(() => removeToast(id), duration);
    }, [removeToast]);

    /*
     * Los temporizadores de auto-cierre viven fuera de React. Sin esto, salir
     * de la aplicación con avisos en pantalla los dejaba pendientes, y el
     * registro crecía sin fin durante la sesión porque nadie borraba las
     * entradas ya usadas.
     */
    useEffect(() => {
        const registro = timersRef.current;
        return () => {
            Object.values(registro).forEach(clearTimeout);
        };
    }, []);

    // Valor memoizado: evita que los consumidores de `useToast` (páginas y
    // acciones) re-rendericen cuando el provider re-renderiza por su padre
    // (p. ej. ThemeProvider al alternar tema). addToast/removeToast ya son
    // useCallback estables; el valor solo cambia al cambiar `toasts`.
    const value = useMemo<ToastContextValue>(
        () => ({ toasts, addToast, removeToast }),
        [toasts, addToast, removeToast],
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={removeToast} onExited={descartar} />
        </ToastContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────

export function useToast() {
    const ctx = useContext(ToastContext);
    const addToast = ctx?.addToast;
    // Retorno estable: `toast` conserva la misma referencia entre renders
    // (addToast es estable), evitando efectos/renders espurios en consumidores
    // que lo usen como dependencia.
    const api = useMemo(() => ({
        toast: {
            success: (msg: string, dur?: number) => addToast?.('success', msg, dur),
            error:   (msg: string, dur?: number) => addToast?.('error',   msg, dur),
            info:    (msg: string, dur?: number) => addToast?.('info',    msg, dur),
            warning: (msg: string, dur?: number) => addToast?.('warning', msg, dur),
        },
    }), [addToast]);
    if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
    return api;
}

// ─── Container + Item ─────────────────────────────────────────────────

import '../styles/toast.css';

const ICONS: Record<ToastType, string> = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
    warning: '⚠',
};

/** Margen sobre la duración declarada antes de retirar el aviso por las malas. */
const HOLGURA_MS = 120;

/**
 * Un aviso urgente INTERRUMPE lo que el lector de pantalla esté diciendo;
 * uno normal espera su turno. Anunciar «Estudiante guardado» con la misma
 * prioridad que un fallo convierte cada confirmación en una interrupción.
 */
const URGENTE: Record<ToastType, boolean> = {
    error: true,
    warning: true,
    success: false,
    info: false,
};

const ToastItem: React.FC<{
    item: ToastItem;
    onDismiss: (id: string) => void;
    onExited: (id: string) => void;
}> = ({ item, onDismiss, onExited }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { id, exiting } = item;

    /*
     * El aviso decide cuándo se ha ido, leyendo del CSS cuánto dura su propia
     * salida. Y NUNCA depende de un solo aviso: se escucha el fin de la
     * animación y además se pone un techo de tiempo, porque si el evento no
     * llega —pestaña en segundo plano, animación retirada por una edición
     * futura— el aviso se quedaría clavado en pantalla tapando la esquina.
     *
     * Es el mismo contrato que `useOverlayTransition` usa en los diálogos.
     */
    useEffect(() => {
        if (!exiting) return;
        const el = ref.current;
        if (!el) { onExited(id); return; }

        const total = duracionDeSalida(el);
        if (total <= 0) { onExited(id); return; }

        let vivo = true;
        const terminar = () => {
            if (!vivo) return;
            vivo = false;
            onExited(id);
        };
        const alTerminar = (e: AnimationEvent) => { if (e.target === el) terminar(); };

        el.addEventListener('animationend', alTerminar);
        const techo = window.setTimeout(terminar, total + HOLGURA_MS);
        return () => {
            vivo = false;
            el.removeEventListener('animationend', alTerminar);
            window.clearTimeout(techo);
        };
    }, [exiting, id, onExited]);

    return (
        <div
            ref={ref}
            className={`toast toast--${item.type}${exiting ? ' toast--exit' : ''}`}
            role={URGENTE[item.type] ? 'alert' : 'status'}
            aria-live={URGENTE[item.type] ? 'assertive' : 'polite'}
        >
            <span className="toast__icon" aria-hidden="true">{ICONS[item.type]}</span>
            <span className="toast__message">{item.message}</span>
            <button
                className="ui-icon-btn toast__close"
                aria-label="Cerrar notificación"
                onClick={() => onDismiss(id)}
            >×</button>
        </div>
    );
};

const ToastContainer: React.FC<{
    toasts: ToastItem[];
    onDismiss: (id: string) => void;
    onExited: (id: string) => void;
}> = ({ toasts, onDismiss, onExited }) => {
    if (toasts.length === 0) return null;
    return (
        <div className="toast-container" aria-label="Notificaciones">
            {toasts.map((t) => (
                <ToastItem key={t.id} item={t} onDismiss={onDismiss} onExited={onExited} />
            ))}
        </div>
    );
};
