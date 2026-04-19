import React from 'react';
import ReactDOM from 'react-dom';
import { Loader2 } from 'lucide-react';

interface Props {
    title: string;
    message: string;
    confirmLabel?: string;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<Props> = ({
    title,
    message,
    confirmLabel = 'Eliminar',
    loading = false,
    onConfirm,
    onCancel,
}) =>
    ReactDOM.createPortal(
        <div
            className="em-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cfm-title"
            aria-describedby="cfm-msg"
        >
            <div className="cfm-panel">
                <p className="cfm-title" id="cfm-title">{title}</p>
                <p className="cfm-msg" id="cfm-msg">{message}</p>
                <div className="cfm-actions">
                    <button className="em-btn em-btn--ghost" onClick={onCancel} disabled={loading}>
                        Cancelar
                    </button>
                    <button className="em-btn em-btn--danger" onClick={onConfirm} disabled={loading}>
                        {loading && <Loader2 size={14} className="em-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );

export default ConfirmModal;
