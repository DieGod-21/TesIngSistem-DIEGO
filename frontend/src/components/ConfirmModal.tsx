/**
 * ConfirmModal.tsx
 *
 * Modal de confirmación reutilizable y accesible.
 *
 * Props extendidas (retrocompatible con `confirmLabel`):
 *   - variant: 'danger' (default) | 'primary' | 'warning' — estiliza el botón primario.
 *   - confirmText / cancelText: etiquetas de botones (aliases de confirmLabel).
 *   - onConfirm puede ser async; si devuelve una Promise el modal mantiene loading hasta resolver.
 *
 * Accesibilidad:
 *   - role="alertdialog", aria-modal
 *   - Cierra con Escape
 *   - Autofocus en botón de confirmación
 *   - Restaura foco al elemento que lo abrió
 */

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Loader2, AlertTriangle } from 'lucide-react';

type Variant = 'danger' | 'primary' | 'warning';

interface Props {
    title: string;
    message: React.ReactNode;
    /** Alias legacy; prefiere `confirmText`. */
    confirmLabel?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: Variant;
    loading?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
    /** Si true, muestra ícono de advertencia. Auto-true si variant === 'danger'. */
    showIcon?: boolean;
}

const ConfirmModal: React.FC<Props> = ({
    title,
    message,
    confirmLabel,
    confirmText,
    cancelText = 'Cancelar',
    variant = 'danger',
    loading = false,
    onConfirm,
    onCancel,
    showIcon,
}) => {
    const confirmBtnRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const label = confirmText ?? confirmLabel ?? (variant === 'danger' ? 'Eliminar' : 'Confirmar');
    const displayIcon = showIcon ?? variant === 'danger';

    useEffect(() => {
        previousFocusRef.current = document.activeElement as HTMLElement | null;
        confirmBtnRef.current?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !loading) {
                e.stopPropagation();
                onCancel();
            }
        };
        document.addEventListener('keydown', onKey);

        // Bloquea scroll del body mientras está abierto
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
            previousFocusRef.current?.focus?.();
        };
    }, [loading, onCancel]);

    const btnClass = variant === 'primary'
        ? 'em-btn em-btn--primary'
        : variant === 'warning'
        ? 'em-btn em-btn--warning'
        : 'em-btn em-btn--danger';

    return ReactDOM.createPortal(
        <div
            className="em-overlay"
            onClick={(e) => { if (!loading && e.target === e.currentTarget) onCancel(); }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cfm-title"
            aria-describedby="cfm-msg"
        >
            <div className="cfm-panel">
                {displayIcon && (
                    <div className={`cfm-icon cfm-icon--${variant}`} aria-hidden="true">
                        <AlertTriangle size={22} />
                    </div>
                )}
                <p className="cfm-title" id="cfm-title">{title}</p>
                <div className="cfm-msg" id="cfm-msg">{message}</div>
                <div className="cfm-actions">
                    <button
                        type="button"
                        className="em-btn em-btn--ghost"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        ref={confirmBtnRef}
                        className={btnClass}
                        onClick={() => onConfirm()}
                        disabled={loading}
                    >
                        {loading && <Loader2 size={14} className="em-spin" aria-hidden="true" />}
                        {label}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default ConfirmModal;
