import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderPlus } from 'lucide-react';
import { createProyecto } from '../../../services/proyectosService';
import type { Estudiante, FaseProyecto } from '../../../types/api';
import { Button, Alert } from '../../../components/ui';
import StudentPicker from '../../../components/StudentPicker';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { userMessageFor } from '../../../services/errorMessages';

interface Props {
    open: boolean;
    onClose: () => void;
    /** Recibe el título del proyecto creado para el mensaje de confirmación. */
    onCreated: (titulo: string) => void;
    /** Carnés que ya tienen proyecto: no se ofrecen para evitar el 409 del API. */
    carnetsConProyecto?: ReadonlySet<string>;
}

interface FormState {
    titulo: string;
    descripcion: string;
    fase: FaseProyecto;
}

interface FormErrors {
    estudiante?: string;
    titulo?: string;
}

const INITIAL: FormState = { titulo: '', descripcion: '', fase: 'PG1' };

const NuevoProyectoModal: React.FC<Props> = ({ open, onClose, onCreated, carnetsConProyecto }) => {
    const [form, setForm] = useState<FormState>(INITIAL);
    const [estudiante, setEstudiante] = useState<Estudiante | null>(null);
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const handleClose = () => {
        if (loading) return;
        setForm(INITIAL);
        setEstudiante(null);
        setErrors({});
        setApiError(null);
        onClose();
    };

    const modalRef = useFocusTrap<HTMLDivElement>(open, handleClose);

    if (!open) return null;

    const validate = (): boolean => {
        const e: FormErrors = {};
        // El estudiante NO es un adorno del formulario: el contrato lo exige y
        // sin él el alta ni siquiera llega a crearse.
        if (!estudiante)         e.estudiante = 'Elige a quién pertenece el proyecto.';
        if (!form.titulo.trim()) e.titulo     = 'El título es requerido.';
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
        if (!validate() || !estudiante) return;
        setLoading(true);
        setApiError(null);
        const titulo = form.titulo.trim();
        const descripcion = form.descripcion.trim();
        try {
            await createProyecto({
                estudianteId: estudiante.id,
                titulo,
                // La descripción es opcional por contrato. Vacía se envía como
                // `null` para no registrar una cadena en blanco que el resto de
                // la interfaz tendría que distinguir luego de «sin descripción».
                descripcion: descripcion || null,
                fase: form.fase,
            });
            setForm(INITIAL);
            setEstudiante(null);
            setErrors({});
            onCreated(titulo);
        } catch (err) {
            setApiError(userMessageFor(err) || 'No se pudo crear el proyecto. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div
            className="ui-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="np-title"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div className="ui-modal ui-modal--form" ref={modalRef}>
                <header className="ui-modal__header">
                    <h2 id="np-title" className="ui-modal__title">
                        <FolderPlus size={18} aria-hidden="true" />
                        Nuevo Proyecto
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
                        <label htmlFor="np-estudiante" className="ui-modal__label">
                            Estudiante <span aria-hidden="true">*</span>
                        </label>
                        <StudentPicker
                            id="np-estudiante"
                            value={estudiante}
                            onChange={(v) => {
                                setEstudiante(v);
                                if (errors.estudiante) setErrors((p) => ({ ...p, estudiante: undefined }));
                            }}
                            disabled={loading}
                            error={errors.estudiante}
                            excludeCarnets={carnetsConProyecto}
                            hint="Solo se listan estudiantes que aún no tienen proyecto registrado."
                        />
                    </div>

                    <div className="ui-modal__field">
                        <label htmlFor="np-titulo" className="ui-modal__label">
                            Título <span aria-hidden="true">*</span>
                        </label>
                        <input
                            id="np-titulo"
                            data-autofocus
                            type="text"
                            className={`ui-control${errors.titulo ? ' ui-control--error' : ''}`}
                            value={form.titulo}
                            onChange={set('titulo')}
                            placeholder="Ej. Sistema de gestión de inventarios"
                            disabled={loading}
                            autoComplete="off"
                        />
                        {errors.titulo && (
                            <span className="ui-modal__error" role="alert">{errors.titulo}</span>
                        )}
                    </div>

                    <div className="ui-modal__field">
                        <label htmlFor="np-desc" className="ui-modal__label">
                            Descripción <span className="ui-modal__opt">(opcional)</span>
                        </label>
                        <textarea
                            id="np-desc"
                            className="ui-control"
                            value={form.descripcion}
                            onChange={set('descripcion')}
                            placeholder="Describe brevemente el proyecto…"
                            disabled={loading}
                            rows={4}
                        />
                    </div>

                    <div className="ui-modal__field">
                        <label htmlFor="np-fase" className="ui-modal__label">Fase</label>
                        <select
                            id="np-fase"
                            className="ui-control"
                            value={form.fase}
                            onChange={set('fase')}
                            disabled={loading}
                        >
                            <option value="PG1">PG1 – Proyecto de Graduación I</option>
                            <option value="PG2">PG2 – Proyecto de Graduación II</option>
                        </select>
                    </div>

                    {apiError && (
                        <Alert tone="danger">{apiError}</Alert>
                    )}

                    <footer className="ui-modal__footer">
                        <Button variant="secondary" onClick={handleClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            loading={loading}
                            disabled={loading || !estudiante || !form.titulo.trim()}
                        >
                            {loading ? 'Creando…' : 'Crear Proyecto'}
                        </Button>
                    </footer>
                </form>
            </div>
        </div>,
        document.body,
    );
};

export default NuevoProyectoModal;
