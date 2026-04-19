/**
 * RecentUploads.tsx
 *
 * Historial de cargas masivas con estadísticas por carga y panel
 * de errores expandible por fila. Incluye eliminación individual
 * con confirmación inline y animación de salida.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    CheckCircle, XCircle, Clock,
    FileSpreadsheet, FileText,
    ChevronDown, ChevronUp, User,
    Trash2, AlertTriangle,
} from 'lucide-react';
import { getRecentUploads, deleteUpload } from '../../services/studentsService';
import type { UploadItem, UploadError } from '../../services/studentsService';

interface RecentUploadsProps {
    refreshKey?: number;
}

// ─── Sub-components ─────────────────────────────────────────────────

const StatusIcon: React.FC<{ status: UploadItem['status'] }> = ({ status }) => {
    if (status === 'success') return <CheckCircle  size={14} className="sn-upload__status-icon sn-upload__status-icon--success" />;
    if (status === 'error')   return <XCircle      size={14} className="sn-upload__status-icon sn-upload__status-icon--error"   />;
    return                           <Clock        size={14} className="sn-upload__status-icon sn-upload__status-icon--pending"  />;
};

const TypeIcon: React.FC<{ type: UploadItem['type'] }> = ({ type }) =>
    type === 'excel'
        ? <FileSpreadsheet size={13} className="sn-upload__type-icon" />
        : <FileText        size={13} className="sn-upload__type-icon" />;

const ErrorsPanel: React.FC<{ errors: UploadError[] }> = ({ errors }) => (
    <div className="sn-upload__errors-panel">
        <div className="sn-upload__errors-header">
            <span className="sn-upload__errors-label">Detalle de errores</span>
            <span className="sn-upload__errors-count">{errors.length} fila{errors.length !== 1 ? 's' : ''}</span>
        </div>
        <ul className="sn-upload__errors-list">
            {errors.map((e, i) => (
                <li key={i} className="sn-upload__error-row">
                    <span className="sn-upload__err-fila">Fila {e.fila}</span>
                    {e.carnet_id && (
                        <span className="sn-upload__err-carnet">{e.carnet_id}</span>
                    )}
                    <span className="sn-upload__err-reason">{e.razon}</span>
                </li>
            ))}
        </ul>
    </div>
);

interface UploadRowProps {
    item: UploadItem;
    onDeleted: (id: string) => void;
}

const UploadRow: React.FC<UploadRowProps> = ({ item, onDeleted }) => {
    const liRef                       = useRef<HTMLLIElement>(null);
    const [expanded,   setExpanded  ] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [deleting,   setDeleting  ] = useState(false);
    const [removing,   setRemoving  ] = useState(false);
    const hasErrors = item.errors.length > 0;

    const triggerRemove = useCallback(() => {
        const el = liRef.current;
        if (!el) { onDeleted(item.id); return; }

        // 1. Lock the current rendered height so the transition has a "from" value
        const h = el.offsetHeight;
        el.style.height       = `${h}px`;
        el.style.overflow     = 'hidden';
        el.style.marginBottom = '6px'; // ensure it matches CSS even for :last-child

        // 2. Force a reflow so the browser registers the starting state
        void el.offsetHeight;

        // 3. Apply transitions and animate to collapsed state
        el.style.transition   = 'height 0.32s ease, opacity 0.22s ease, transform 0.22s ease, margin-bottom 0.32s ease';
        el.style.height       = '0';
        el.style.opacity      = '0';
        el.style.transform    = 'translateX(-8px)';
        el.style.marginBottom = '0'; // collapses the inter-item gap in sync with height

        setRemoving(true);
        // Remove after the slowest transition (height: 0.32s) completes
        setTimeout(() => onDeleted(item.id), 340);
    }, [item.id, onDeleted]);

    const handleConfirm = async () => {
        setDeleting(true);
        try {
            await deleteUpload(item.id);
            triggerRemove();
        } catch {
            setDeleting(false);
            setConfirming(false);
        }
    };

    return (
        <li
            ref={liRef}
            className={`sn-upload__item sn-upload__item--${item.status}${removing ? ' sn-upload__item--removing' : ''}`}
        >
            {/* ── Fila principal ── */}
            <div className="sn-upload__main">
                <div className="sn-upload__left">
                    <StatusIcon status={item.status} />
                    <TypeIcon   type={item.type}     />
                    <span className="sn-upload__name" title={item.filename}>
                        {item.filename}
                    </span>
                </div>
                <div className="sn-upload__right">
                    <div className="sn-upload__stats">
                        <span className="sn-upload__stat sn-upload__stat--ok" title="Importados">
                            <CheckCircle size={11} /> {item.imported}
                        </span>
                        {item.rejected > 0 && (
                            <span className="sn-upload__stat sn-upload__stat--ko" title="Rechazados">
                                <XCircle size={11} /> {item.rejected}
                            </span>
                        )}
                        <span className="sn-upload__stat sn-upload__stat--total" title="Total filas">
                            / {item.total}
                        </span>
                    </div>
                    {hasErrors && !confirming && (
                        <button
                            type="button"
                            className="sn-upload__toggle"
                            onClick={() => setExpanded((v) => !v)}
                            aria-label={expanded ? 'Ocultar errores' : 'Ver errores'}
                        >
                            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            {expanded ? 'Ocultar' : 'Ver errores'}
                        </button>
                    )}
                    {!confirming && (
                        <button
                            type="button"
                            className="sn-upload__delete-btn"
                            onClick={() => setConfirming(true)}
                            aria-label="Eliminar registro"
                            title="Eliminar registro"
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Confirmación inline ── */}
            {confirming && (
                <div className="sn-upload__confirm">
                    <AlertTriangle size={13} className="sn-upload__confirm-icon" />
                    <span className="sn-upload__confirm-text">¿Eliminar este registro?</span>
                    <button
                        type="button"
                        className="sn-upload__confirm-yes"
                        onClick={handleConfirm}
                        disabled={deleting}
                    >
                        {deleting ? '…' : 'Eliminar'}
                    </button>
                    <button
                        type="button"
                        className="sn-upload__confirm-no"
                        onClick={() => setConfirming(false)}
                        disabled={deleting}
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {/* ── Meta (fecha + usuario) ── */}
            <div className="sn-upload__meta">
                <span className="sn-upload__time">{item.uploadedAt}</span>
                {item.uploadedBy && (
                    <span className="sn-upload__user">
                        <User size={10} /> {item.uploadedBy}
                    </span>
                )}
            </div>

            {/* ── Panel de errores expandible ── */}
            {expanded && hasErrors && <ErrorsPanel errors={item.errors} />}
        </li>
    );
};

// ─── Componente principal ────────────────────────────────────────────

const RecentUploads: React.FC<RecentUploadsProps> = ({ refreshKey = 0 }) => {
    const [uploads, setUploads] = useState<UploadItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError  ] = useState(false);

    useEffect(() => {
        let canceled = false;
        setLoading(true);
        setError(false);
        getRecentUploads()
            .then((data) => { if (!canceled) { setUploads(data); setLoading(false); } })
            .catch(()    => { if (!canceled) { setError(true);   setLoading(false); } });
        return () => { canceled = true; };
    }, [refreshKey]);

    const handleDeleted = (id: string) => {
        setUploads((prev) => prev.filter((u) => u.id !== id));
    };

    return (
        <div className="sn-uploads">
            <p className="sn-uploads__title">Últimas Cargas</p>

            {loading ? (
                <div className="sn-uploads__loading">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="skeleton skeleton--line skeleton--medium sn-uploads__skeleton" />
                    ))}
                </div>
            ) : error ? (
                <p className="sn-uploads__empty sn-uploads__empty--error">
                    No se pudo cargar el historial.
                </p>
            ) : uploads.length === 0 ? (
                <p className="sn-uploads__empty">Sin cargas recientes.</p>
            ) : (
                <ul className="sn-uploads__list">
                    {uploads.map((item) => (
                        <UploadRow key={item.id} item={item} onDeleted={handleDeleted} />
                    ))}
                </ul>
            )}
        </div>
    );
};

export default RecentUploads;
