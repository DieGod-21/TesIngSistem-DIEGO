import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';
import { upsertNota } from '../services/notasService';
import { Button } from './ui';
import { useFocusTrap } from '../hooks/useFocusTrap';

const CURSOS = [
    { code: '043' as const, label: 'Proyecto de Graduación I' },
    { code: '049' as const, label: 'Proyecto de Graduación II' },
];

interface Props {
    open: boolean;
    carnet: string;
    initialCurso?: '043' | '049';
    initialNota?: number | null;
    onClose: () => void;
    onSaved: () => void;
}

interface FormState {
    curso: '043' | '049';
    nota: string;
    observacion: string;
}

const EditNotaModal: React.FC<Props> = ({
    open,
    carnet,
    initialCurso = '043',
    initialNota,
    onClose,
    onSaved,
}) => {
    const [form, setForm] = useState<FormState>({
        curso: initialCurso,
        nota: initialNota != null ? String(initialNota) : '',
        observacion: '',
    });
    const [notaError, setNotaError] = useState<string | undefined>();
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setForm({ curso: initialCurso, nota: initialNota != null ? String(initialNota) : '', observacion: '' });
            setNotaError(undefined);
            setApiError(null);
        }
    }, [open, initialCurso, initialNota]);

    const handleClose = () => { if (!loading) onClose(); };
    const modalRef = useFocusTrap<HTMLDivElement>(open, handleClose);

    if (!open) return null;

    const validate = (): boolean => {
        const val = Number(form.nota);
        if (form.nota.trim() === '') {
            setNotaError('La nota es requerida.');
            return false;
        }
        if (!Number.isFinite(val) || val < 0 || val > 100) {
            setNotaError('La nota debe ser un número entre 0 y 100.');
            return false;
        }
        setNotaError(undefined);
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        setApiError(null);
        try {
            await upsertNota({
                carnet,
                curso_codigo: form.curso,
                nota_final: Number(form.nota),
                observacion: form.observacion.trim() || null,
            });
            onSaved();
        } catch (err) {
            setApiError(err instanceof Error ? err.message : 'No se pudo guardar la nota. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div
            className="en-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="en-title"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div className="en-modal" ref={modalRef}>
                <header className="en-modal__header">
                    {/* El mismo diálogo sirve para EDITAR una nota existente y
                        para REGISTRAR una que falta, y el título decía siempre
                        «Editar Nota»: desde el botón «Registrar» de un curso sin
                        nota se abría un modal que afirmaba estar editando algo
                        que no existe. El título lo decide el dato, no la plantilla. */}
                    <h2 id="en-title" className="en-modal__title">
                        {initialNota != null ? 'Editar Nota' : 'Registrar Nota'}
                    </h2>
                    <button
                        type="button"
                        className="ui-icon-btn"
                        onClick={handleClose}
                        aria-label="Cerrar"
                        disabled={loading}
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>

                <form className="en-modal__body" onSubmit={handleSubmit} noValidate>
                    <div className="en-field">
                        <label htmlFor="en-curso" className="en-label">Curso</label>
                        <select
                            id="en-curso"
                            data-autofocus
                            className="ui-control en-select"
                            value={form.curso}
                            onChange={(e) => setForm((s) => ({ ...s, curso: e.target.value as '043' | '049' }))}
                            disabled={loading}
                        >
                            {CURSOS.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.code} – {c.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="en-field">
                        <label htmlFor="en-nota" className="en-label">
                            Nota <span aria-hidden="true">*</span>
                        </label>
                        <input
                            id="en-nota"
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            className={`ui-control en-input${notaError ? ' en-input--error' : ''}`}
                            value={form.nota}
                            onChange={(e) => {
                                setForm((s) => ({ ...s, nota: e.target.value }));
                                if (notaError) setNotaError(undefined);
                            }}
                            placeholder="0 – 100"
                            disabled={loading}
                        />
                        {notaError && (
                            <span className="en-field-error" role="alert">{notaError}</span>
                        )}
                    </div>

                    <div className="en-field">
                        <label htmlFor="en-obs" className="en-label">Observación (opcional)</label>
                        <textarea
                            id="en-obs"
                            className="ui-control en-textarea"
                            value={form.observacion}
                            onChange={(e) => setForm((s) => ({ ...s, observacion: e.target.value }))}
                            placeholder="Notas adicionales…"
                            rows={3}
                            disabled={loading}
                        />
                    </div>

                    {apiError && (
                        <div className="en-api-error" role="alert">{apiError}</div>
                    )}

                    <footer className="en-modal__footer">
                        <Button variant="secondary" onClick={handleClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" loading={loading} disabled={loading}>
                            {!loading && <Save size={14} aria-hidden="true" />}
                            {loading ? 'Guardando…' : 'Guardar'}
                        </Button>
                    </footer>
                </form>
            </div>
        </div>,
        document.body,
    );
};

export default EditNotaModal;
