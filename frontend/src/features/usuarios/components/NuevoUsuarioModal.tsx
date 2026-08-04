import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, X } from 'lucide-react';
import { createUsuario } from '../../../services/usuariosService';
import type { RolUsuario } from '../../../types/api';
import { Button } from '../../../components/ui';
import { useFocusTrap } from '../../../hooks/useFocusTrap';

interface Props {
    open: boolean;
    onClose: () => void;
    /** Recibe el nombre del usuario creado para el mensaje de confirmación. */
    onCreated: (nombre: string) => void;
}

interface FormState {
    nombre: string;
    email: string;
    rol: RolUsuario;
}

interface FormErrors {
    nombre?: string;
    email?: string;
}

const INITIAL: FormState = { nombre: '', email: '', rol: 'evaluador' };

const NuevoUsuarioModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
    const [form, setForm] = useState<FormState>(INITIAL);
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const handleClose = () => {
        if (loading) return;
        setForm(INITIAL);
        setErrors({});
        setApiError(null);
        onClose();
    };

    const modalRef = useFocusTrap<HTMLDivElement>(open, handleClose);

    if (!open) return null;

    const set =
        (field: keyof FormState) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            setForm((s) => ({ ...s, [field]: e.target.value }));
            if (errors[field as keyof FormErrors]) {
                setErrors((prev) => ({ ...prev, [field]: undefined }));
            }
        };

    const validate = (): boolean => {
        const e: FormErrors = {};
        if (!form.nombre.trim()) e.nombre = 'El nombre es requerido.';
        if (!form.email.trim()) {
            e.email = 'El correo es requerido.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            e.email = 'Ingresa un correo válido.';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        setApiError(null);
        const nombre = form.nombre.trim();
        try {
            await createUsuario({
                nombre,
                email: form.email.trim(),
                rol: form.rol,
            });
            setForm(INITIAL);
            setErrors({});
            onCreated(nombre);
        } catch (err) {
            setApiError(err instanceof Error ? err.message : 'No se pudo crear el usuario. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div
            className="nu-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nu-title"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div className="nu-modal" ref={modalRef}>
                <header className="nu-modal__header">
                    <h2 id="nu-title" className="nu-modal__title">
                        <UserPlus size={18} aria-hidden="true" />
                        Nuevo Usuario
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

                <form className="nu-modal__body" onSubmit={handleSubmit} noValidate>
                    <div className="nu-field">
                        <label htmlFor="nu-nombre" className="nu-label">
                            Nombre <span aria-hidden="true">*</span>
                        </label>
                        <input
                            id="nu-nombre"
                            data-autofocus
                            type="text"
                            className={`ui-control nu-input${errors.nombre ? ' nu-input--error' : ''}`}
                            value={form.nombre}
                            onChange={set('nombre')}
                            placeholder="Nombre completo"
                            disabled={loading}
                            autoComplete="off"
                        />
                        {errors.nombre && (
                            <span className="nu-field-error" role="alert">{errors.nombre}</span>
                        )}
                    </div>

                    <div className="nu-field">
                        <label htmlFor="nu-email" className="nu-label">
                            Correo <span aria-hidden="true">*</span>
                        </label>
                        <input
                            id="nu-email"
                            type="email"
                            className={`ui-control nu-input${errors.email ? ' nu-input--error' : ''}`}
                            value={form.email}
                            onChange={set('email')}
                            placeholder="correo@ejemplo.com"
                            disabled={loading}
                            autoComplete="off"
                        />
                        {errors.email && (
                            <span className="nu-field-error" role="alert">{errors.email}</span>
                        )}
                    </div>

                    <div className="nu-field">
                        <label htmlFor="nu-rol" className="nu-label">Rol</label>
                        <select
                            id="nu-rol"
                            className="ui-control nu-select"
                            value={form.rol}
                            onChange={set('rol')}
                            disabled={loading}
                        >
                            <option value="evaluador">Evaluador</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>

                    {apiError && (
                        <div className="nu-api-error" role="alert">{apiError}</div>
                    )}

                    <footer className="nu-modal__footer">
                        <Button variant="secondary" onClick={handleClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            loading={loading}
                            disabled={loading || !form.nombre.trim() || !form.email.trim()}
                        >
                            {loading ? 'Creando…' : 'Crear Usuario'}
                        </Button>
                    </footer>
                </form>
            </div>
        </div>,
        document.body,
    );
};

export default NuevoUsuarioModal;
