import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Calendar, Clock, MapPin, AlignLeft, Bell, Trash2, Loader2 } from 'lucide-react';
import type { CalendarEvent, EventPayload } from '../services/calendarService';

const TIPOS = ['defensa', 'reunion', 'revision', 'entrega', 'otro'] as const;
const REMINDER_OPTIONS = [
    { value: 1, label: '1 día antes' },
    { value: 2, label: '2 días antes' },
    { value: 3, label: '3 días antes' },
    { value: 7, label: '1 semana antes' },
];

interface Props {
    event: CalendarEvent | null;
    defaultDate?: string;
    canWrite: boolean;
    onSave: (payload: EventPayload) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    onClose: () => void;
}

interface FormState {
    titulo: string;
    tipo: string;
    fecha_inicio: string;
    fecha_fin: string;
    ubicacion: string;
    descripcion: string;
    recordatorio: boolean;
    recordatorio_tiempo: number;
}

const EMPTY: FormState = {
    titulo: '',
    tipo: 'reunion',
    fecha_inicio: '',
    fecha_fin: '',
    ubicacion: '',
    descripcion: '',
    recordatorio: false,
    recordatorio_tiempo: 1,
};

function toInputDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
}

const CLOSE_DURATION = 180; // ms — must match CSS animation duration

const EventModal: React.FC<Props> = ({ event, defaultDate, canWrite, onSave, onDelete, onClose }) => {
    const isEdit = event !== null;
    const overlayRef = useRef<HTMLDivElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);
    const [closing, setClosing] = useState(false);

    const [form, setForm] = useState<FormState>(() =>
        isEdit
            ? {
                titulo: event.titulo,
                tipo: event.tipo,
                fecha_inicio: toInputDate(event.fecha_inicio),
                fecha_fin: toInputDate(event.fecha_fin),
                ubicacion: event.ubicacion ?? '',
                descripcion: event.descripcion ?? '',
                recordatorio: event.recordatorio ?? false,
                recordatorio_tiempo: event.recordatorio_tiempo ?? 1,
            }
            : { ...EMPTY, fecha_inicio: defaultDate ?? '' }
    );

    const [errors, setErrors]   = useState<Partial<Record<keyof FormState, string>>>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [saving, setSaving]   = useState(false);
    const [deleting, setDel]    = useState(false);
    const [confirmDel, setConf] = useState(false);

    // Animated close: set closing → CSS plays exit anim → call real onClose
    const triggerClose = useCallback(() => {
        if (closing) return;
        setClosing(true);
        setTimeout(onClose, CLOSE_DURATION);
    }, [closing, onClose]);

    // Focus first input on open
    useEffect(() => { setTimeout(() => firstInputRef.current?.focus(), 60); }, []);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') triggerClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [triggerClose]);

    const set = (field: keyof FormState, value: string | boolean | number) => {
        setApiError(null);
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const validate = (): boolean => {
        const e: Partial<Record<keyof FormState, string>> = {};
        if (!form.titulo.trim()) e.titulo = 'El título es requerido';
        if (!form.tipo) e.tipo = 'El tipo es requerido';
        if (!form.fecha_inicio) e.fecha_inicio = 'La fecha de inicio es requerida';
        if (form.fecha_fin && form.fecha_inicio && form.fecha_fin <= form.fecha_inicio)
            e.fecha_fin = 'La fecha de fin debe ser posterior al inicio';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = useCallback(async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            await onSave({
                titulo: form.titulo.trim(),
                tipo: form.tipo,
                fecha_inicio: form.fecha_inicio,
                fecha_fin: form.fecha_fin || null,
                ubicacion: form.ubicacion.trim() || null,
                descripcion: form.descripcion.trim() || null,
                recordatorio: form.recordatorio,
                recordatorio_tiempo: form.recordatorio_tiempo,
            });
            triggerClose();
        } catch (err) {
            setApiError(err instanceof Error ? err.message : 'Error al guardar el evento');
        } finally { setSaving(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form, onSave, triggerClose]);

    const handleDelete = useCallback(async () => {
        if (!event || !onDelete) return;
        setDel(true);
        try {
            await onDelete(event.id);
            triggerClose();
        } catch { /* error handled by parent */ }
        finally { setDel(false); setConf(false); }
    }, [event, onDelete, triggerClose]);

    const chipColorClass = (tipo: string) => {
        switch (tipo) {
            case 'defensa': case 'revision': case 'reunion': return 'em-type--blue';
            case 'entrega': return 'em-type--orange';
            default: return 'em-type--gray';
        }
    };

    const modal = (
        <div
            className={`em-overlay ${closing ? 'em-overlay--closing' : ''}`}
            ref={overlayRef}
            onClick={(e) => { if (e.target === overlayRef.current) triggerClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label={isEdit ? 'Editar evento' : 'Crear evento'}
        >
            <div className={`em-panel ${closing ? 'em-panel--closing' : ''}`}>
                {/* Header */}
                <div className="em-header">
                    <div className="em-header__left">
                        <span className={`em-type-badge ${chipColorClass(form.tipo)}`}>
                            {form.tipo}
                        </span>
                        <h2 className="em-header__title">
                            {isEdit ? 'Editar evento' : 'Nuevo evento'}
                        </h2>
                    </div>
                    <button className="em-close" onClick={triggerClose} aria-label="Cerrar">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="em-body">
                    {/* Título */}
                    <div className="em-field">
                        <label className="em-label" htmlFor="em-titulo">Título *</label>
                        <input
                            id="em-titulo"
                            ref={firstInputRef}
                            className={`em-input ${errors.titulo ? 'em-input--error' : ''}`}
                            type="text"
                            placeholder="Nombre del evento"
                            value={form.titulo}
                            onChange={(e) => set('titulo', e.target.value)}
                            disabled={!canWrite}
                            maxLength={255}
                        />
                        {errors.titulo && <p className="em-error">{errors.titulo}</p>}
                    </div>

                    {/* Tipo */}
                    <div className="em-field">
                        <label className="em-label" htmlFor="em-tipo">Tipo *</label>
                        <select
                            id="em-tipo"
                            className={`em-select ${errors.tipo ? 'em-input--error' : ''}`}
                            value={form.tipo}
                            onChange={(e) => set('tipo', e.target.value)}
                            disabled={!canWrite}
                        >
                            {TIPOS.map((t) => (
                                <option key={t} value={t}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Fechas */}
                    <div className="em-row">
                        <div className="em-field">
                            <label className="em-label" htmlFor="em-fi">
                                <Calendar size={13} style={{ marginRight: 4 }} />
                                Fecha inicio *
                            </label>
                            <input
                                id="em-fi"
                                className={`em-input ${errors.fecha_inicio ? 'em-input--error' : ''}`}
                                type="date"
                                value={form.fecha_inicio}
                                onChange={(e) => set('fecha_inicio', e.target.value)}
                                disabled={!canWrite}
                            />
                            {errors.fecha_inicio && <p className="em-error">{errors.fecha_inicio}</p>}
                        </div>
                        <div className="em-field">
                            <label className="em-label" htmlFor="em-ff">
                                <Clock size={13} style={{ marginRight: 4 }} />
                                Fecha fin
                            </label>
                            <input
                                id="em-ff"
                                className={`em-input ${errors.fecha_fin ? 'em-input--error' : ''}`}
                                type="date"
                                value={form.fecha_fin}
                                onChange={(e) => set('fecha_fin', e.target.value)}
                                disabled={!canWrite}
                                min={form.fecha_inicio || undefined}
                            />
                            {errors.fecha_fin && <p className="em-error">{errors.fecha_fin}</p>}
                        </div>
                    </div>

                    {/* Ubicación */}
                    <div className="em-field">
                        <label className="em-label" htmlFor="em-ubicacion">
                            <MapPin size={13} style={{ marginRight: 4 }} />
                            Ubicación
                        </label>
                        <input
                            id="em-ubicacion"
                            className="em-input"
                            type="text"
                            placeholder="Sala, aula o enlace"
                            value={form.ubicacion}
                            onChange={(e) => set('ubicacion', e.target.value)}
                            disabled={!canWrite}
                            maxLength={255}
                        />
                    </div>

                    {/* Descripción */}
                    <div className="em-field">
                        <label className="em-label" htmlFor="em-desc">
                            <AlignLeft size={13} style={{ marginRight: 4 }} />
                            Descripción
                        </label>
                        <textarea
                            id="em-desc"
                            className="em-textarea"
                            placeholder="Detalles adicionales…"
                            rows={3}
                            value={form.descripcion}
                            onChange={(e) => set('descripcion', e.target.value)}
                            disabled={!canWrite}
                        />
                    </div>

                    {/* Recordatorio */}
                    {canWrite && (
                        <div className="em-reminder">
                            <div className="em-reminder__toggle">
                                <Bell size={15} className="em-reminder__icon" />
                                <span className="em-reminder__label">Recordatorio</span>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={form.recordatorio}
                                    className={`em-toggle ${form.recordatorio ? 'em-toggle--on' : ''}`}
                                    onClick={() => set('recordatorio', !form.recordatorio)}
                                >
                                    <span className="em-toggle__thumb" />
                                </button>
                            </div>
                            {form.recordatorio && (
                                <select
                                    className="em-select em-select--sm"
                                    value={form.recordatorio_tiempo}
                                    onChange={(e) => set('recordatorio_tiempo', parseInt(e.target.value, 10))}
                                >
                                    {REMINDER_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}
                </div>

                {/* API error banner */}
                {apiError && (
                    <p className="em-api-error" role="alert">{apiError}</p>
                )}

                {/* Footer */}
                {canWrite && (
                    <div className="em-footer">
                        {isEdit && onDelete && (
                            confirmDel ? (
                                <div className="em-confirm-del">
                                    <span>¿Eliminar este evento?</span>
                                    <button className="em-btn em-btn--danger" onClick={handleDelete} disabled={deleting}>
                                        {deleting ? <Loader2 size={14} className="em-spin" /> : null}
                                        Confirmar
                                    </button>
                                    <button className="em-btn em-btn--ghost" onClick={() => setConf(false)}>
                                        Cancelar
                                    </button>
                                </div>
                            ) : (
                                <button className="em-btn em-btn--ghost em-btn--icon" onClick={() => setConf(true)}>
                                    <Trash2 size={15} />
                                    Eliminar
                                </button>
                            )
                        )}
                        <div className="em-footer__actions">
                            <button className="em-btn em-btn--ghost" onClick={triggerClose}>
                                Cancelar
                            </button>
                            <button className="em-btn em-btn--primary" onClick={handleSave} disabled={saving}>
                                {saving && <Loader2 size={14} className="em-spin" />}
                                {isEdit ? 'Guardar cambios' : 'Crear evento'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // Portal to document.body so Ionic's IonContent shadow DOM doesn't clip the fixed overlay
    return ReactDOM.createPortal(modal, document.body);
};

export default EventModal;
