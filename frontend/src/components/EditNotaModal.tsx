import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';
import { upsertNota } from '../services/notasService';
import { Button, Alert } from './ui';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useOverlayTransition } from '../hooks/useOverlayTransition';
import { userMessageFor } from '../services/errorMessages';

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

    /*
     * El diálogo sobrevive a `open === false` el tiempo que dura su salida.
     *
     * El atrapador de foco NO espera: se le pasa `open`, que ya es false en
     * cuanto se pide cerrar, así que devuelve el foco a quien abrió el diálogo
     * de inmediato. Quien navega con teclado recupera el control mientras la
     * capa termina de irse; hacerle esperar 140ms para poder seguir tecleando
     * sería cambiar accesibilidad por decoración.
     */
    const { montado, saliendo, overlayRef } = useOverlayTransition(open);
    const modalRef = useFocusTrap<HTMLDivElement>(open, handleClose);

    if (!montado) return null;

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
            setApiError(userMessageFor(err) || 'No se pudo guardar la nota. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div
            ref={overlayRef}
            className={`ui-modal-overlay${saliendo ? ' ui-modal-overlay--saliendo' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="en-title"
            /* Mientras se va ya no es un diálogo con el que se pueda hablar: el
               foco salió, no acepta clics y no debe volver a anunciarse a un
               lector de pantalla como si acabara de abrirse. */
            aria-hidden={saliendo || undefined}
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div className={`ui-modal ui-modal--form${saliendo ? ' ui-modal--saliendo' : ''}`} ref={modalRef}>
                <header className="ui-modal__header">
                    {/* El mismo diálogo sirve para EDITAR una nota existente y
                        para REGISTRAR una que falta, y el título decía siempre
                        «Editar Nota»: desde el botón «Registrar» de un curso sin
                        nota se abría un modal que afirmaba estar editando algo
                        que no existe. El título lo decide el dato, no la plantilla. */}
                    <h2 id="en-title" className="ui-modal__title">
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

                <form className="ui-modal__body" onSubmit={handleSubmit} noValidate>
                    <div className="ui-modal__field">
                        <label htmlFor="en-curso" className="ui-modal__label">Curso</label>
                        <select
                            id="en-curso"
                            data-autofocus
                            className="ui-control"
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

                    <div className="ui-modal__field">
                        <label htmlFor="en-nota" className="ui-modal__label">
                            Nota <span aria-hidden="true">*</span>
                        </label>
                        <input
                            id="en-nota"
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            className={`ui-control${notaError ? ' ui-control--error' : ''}`}
                            value={form.nota}
                            onChange={(e) => {
                                setForm((s) => ({ ...s, nota: e.target.value }));
                                if (notaError) setNotaError(undefined);
                            }}
                            placeholder="0 – 100"
                            disabled={loading}
                        />
                        {notaError && (
                            <span className="ui-modal__error" role="alert">{notaError}</span>
                        )}
                    </div>

                    <div className="ui-modal__field">
                        <label htmlFor="en-obs" className="ui-modal__label">Observación (opcional)</label>
                        <textarea
                            id="en-obs"
                            className="ui-control"
                            value={form.observacion}
                            onChange={(e) => setForm((s) => ({ ...s, observacion: e.target.value }))}
                            placeholder="Notas adicionales…"
                            rows={3}
                            disabled={loading}
                        />
                    </div>

                    {apiError && (
                        <Alert tone="danger">{apiError}</Alert>
                    )}

                    <footer className="ui-modal__footer">
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
