import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderPlus, Loader2 } from 'lucide-react';
import { createProyecto } from '../../../services/proyectosService';
import type { FaseProyecto } from '../../../types/api';

interface Props {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

interface FormState {
    titulo: string;
    descripcion: string;
    fase: FaseProyecto;
}

interface FormErrors {
    titulo?: string;
    descripcion?: string;
}

const INITIAL: FormState = { titulo: '', descripcion: '', fase: 'PG1' };

const NuevoProyectoModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
    const [form, setForm] = useState<FormState>(INITIAL);
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    if (!open) return null;

    const handleClose = () => {
        if (loading) return;
        setForm(INITIAL);
        setErrors({});
        setApiError(null);
        onClose();
    };

    const validate = (): boolean => {
        const e: FormErrors = {};
        if (!form.titulo.trim())      e.titulo      = 'El título es requerido.';
        if (!form.descripcion.trim()) e.descripcion = 'La descripción es requerida.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const set =
        (field: keyof FormState) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            setForm((s) => ({ ...s, [field]: e.target.value }));
            if (errors[field as keyof FormErrors]) {
                setErrors((prev) => ({ ...prev, [field]: undefined }));
            }
        };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        setApiError(null);
        try {
            await createProyecto({
                titulo: form.titulo.trim(),
                descripcion: form.descripcion.trim(),
                fase: form.fase,
            });
            setForm(INITIAL);
            setErrors({});
            onCreated();
        } catch (err) {
            setApiError(err instanceof Error ? err.message : 'Error al crear el proyecto.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div
            className="np-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="np-title"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div className="np-modal">
                <header className="np-modal__header">
                    <h2 id="np-title" className="np-modal__title">
                        <FolderPlus size={18} aria-hidden="true" />
                        Nuevo Proyecto
                    </h2>
                    <button
                        type="button"
                        className="np-modal__close"
                        onClick={handleClose}
                        aria-label="Cerrar"
                        disabled={loading}
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>

                <form className="np-modal__body" onSubmit={handleSubmit} noValidate>
                    <div className="np-field">
                        <label htmlFor="np-titulo" className="np-label">
                            Título <span aria-hidden="true">*</span>
                        </label>
                        <input
                            id="np-titulo"
                            type="text"
                            className={`np-input${errors.titulo ? ' np-input--error' : ''}`}
                            value={form.titulo}
                            onChange={set('titulo')}
                            placeholder="Ej. Sistema de gestión de inventarios"
                            disabled={loading}
                            autoComplete="off"
                        />
                        {errors.titulo && (
                            <span className="np-field-error" role="alert">{errors.titulo}</span>
                        )}
                    </div>

                    <div className="np-field">
                        <label htmlFor="np-desc" className="np-label">
                            Descripción <span aria-hidden="true">*</span>
                        </label>
                        <textarea
                            id="np-desc"
                            className={`np-textarea${errors.descripcion ? ' np-input--error' : ''}`}
                            value={form.descripcion}
                            onChange={set('descripcion')}
                            placeholder="Describe brevemente el proyecto…"
                            disabled={loading}
                            rows={4}
                        />
                        {errors.descripcion && (
                            <span className="np-field-error" role="alert">{errors.descripcion}</span>
                        )}
                    </div>

                    <div className="np-field">
                        <label htmlFor="np-fase" className="np-label">Fase</label>
                        <select
                            id="np-fase"
                            className="np-select"
                            value={form.fase}
                            onChange={set('fase')}
                            disabled={loading}
                        >
                            <option value="PG1">PG1 – Proyecto de Graduación I</option>
                            <option value="PG2">PG2 – Proyecto de Graduación II</option>
                        </select>
                    </div>

                    {apiError && (
                        <div className="np-api-error" role="alert">{apiError}</div>
                    )}

                    <footer className="np-modal__footer">
                        <button
                            type="button"
                            className="np-btn np-btn--secondary"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="np-btn np-btn--primary"
                            disabled={loading || !form.titulo.trim() || !form.descripcion.trim()}
                        >
                            {loading
                                ? <><Loader2 size={14} className="np-spin" aria-hidden="true" /> Creando…</>
                                : 'Crear Proyecto'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>,
        document.body,
    );
};

export default NuevoProyectoModal;
