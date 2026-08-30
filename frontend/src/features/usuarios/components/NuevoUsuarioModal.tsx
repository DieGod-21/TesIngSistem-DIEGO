import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, X } from 'lucide-react';
import { createUsuario } from '../../../services/usuariosService';
import type { RolUsuario } from '../../../types/api';
import { Button, Alert } from '../../../components/ui';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useOverlayTransition } from '../../../hooks/useOverlayTransition';
import { userMessageFor } from '../../../services/errorMessages';

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
    password: string;
}

interface FormErrors {
    nombre?: string;
    email?: string;
    password?: string;
}

/*
 * Mínimo de la contraseña inicial. El contrato no declara restricciones; este
 * umbral es política del cliente: la cuenta no tiene vía de recuperación
 * (no existe endpoint de restablecimiento), así que la contraseña con la que
 * nace es la que la persona usará. Ocho caracteres es el mínimo defendible.
 */
const PASSWORD_MIN = 8;

const INITIAL: FormState = { nombre: '', email: '', rol: 'evaluador', password: '' };

const NuevoUsuarioModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
    const [form, setForm] = useState<FormState>(INITIAL);
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    /*
     * El formulario se vacía al ABRIR, no al cerrar.
     *
     * Cerrar ya no desmonta en el acto: la capa sobrevive lo que dura su
     * salida. Vaciar aquí el estado dejaba ese formulario en blanco A LA
     * VISTA durante el fundido —la curva de salida es de aceleración, así que
     * a mitad de camino sigue al ~68 % de opacidad— y lo que el usuario veía
     * era su propio texto desapareciendo antes que el diálogo. Se leía como
     * pérdida de datos, no como pulido.
     *
     * Al abrir, el resultado es el mismo (el diálogo siempre nace limpio) y
     * nadie llega a ver el paso intermedio.
     */
    useEffect(() => {
        if (!open) return;
        setForm(INITIAL);
        setErrors({});
        setApiError(null);
    }, [open]);

    const handleClose = () => {
        if (loading) return;
        onClose();
    };

    /* Misma ventana de salida que el resto de diálogos del producto: la capa
       sobrevive a `open === false` lo que dure su animación. El atrapador de
       foco NO espera —recibe `open`— así que el foco vuelve a quien abrió en
       cuanto se pide cerrar. Ver useOverlayTransition. */
    const { montado, saliendo, overlayRef } = useOverlayTransition(open);
    const modalRef = useFocusTrap<HTMLDivElement>(open, handleClose);

    if (!montado) return null;

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
        /*
         * SIN contraseña la cuenta nace muerta: el usuario aparece en el
         * listado pero el login responde «Credenciales inválidas» y no hay
         * endpoint para restablecerla. Por eso aquí es obligatoria aunque el
         * contrato la declare opcional.
         */
        if (!form.password) {
            e.password = 'La contraseña inicial es requerida.';
        } else if (form.password.length < PASSWORD_MIN) {
            e.password = `Debe tener al menos ${PASSWORD_MIN} caracteres.`;
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
                password: form.password,
            });
            // No se vacía aquí: `onCreated` cierra el diálogo y el formulario
            // se quedaría en blanco durante la salida. Lo limpia el efecto de
            // apertura.
            onCreated(nombre);
        } catch (err) {
            setApiError(userMessageFor(err) || 'No se pudo crear el usuario. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div
            ref={overlayRef}
            className={`ui-modal-overlay${saliendo ? ' ui-modal-overlay--saliendo' : ''}`}
            aria-hidden={saliendo || undefined}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nu-title"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div className={`ui-modal ui-modal--form${saliendo ? ' ui-modal--saliendo' : ''}`} ref={modalRef}>
                <header className="ui-modal__header">
                    <h2 id="nu-title" className="ui-modal__title">
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

                <form className="ui-modal__body" onSubmit={handleSubmit} noValidate>
                    <div className="ui-modal__field">
                        <label htmlFor="nu-nombre" className="ui-modal__label">
                            Nombre <span aria-hidden="true">*</span>
                        </label>
                        <input
                            id="nu-nombre"
                            data-autofocus
                            type="text"
                            className={`ui-control${errors.nombre ? ' ui-control--error' : ''}`}
                            value={form.nombre}
                            onChange={set('nombre')}
                            placeholder="Nombre completo"
                            disabled={loading}
                            autoComplete="off"
                        />
                        {errors.nombre && (
                            <span className="ui-modal__error" role="alert">{errors.nombre}</span>
                        )}
                    </div>

                    <div className="ui-modal__field">
                        <label htmlFor="nu-email" className="ui-modal__label">
                            Correo <span aria-hidden="true">*</span>
                        </label>
                        <input
                            id="nu-email"
                            type="email"
                            className={`ui-control${errors.email ? ' ui-control--error' : ''}`}
                            value={form.email}
                            onChange={set('email')}
                            placeholder="correo@ejemplo.com"
                            disabled={loading}
                            autoComplete="off"
                        />
                        {errors.email && (
                            <span className="ui-modal__error" role="alert">{errors.email}</span>
                        )}
                    </div>

                    <div className="ui-modal__field">
                        <label htmlFor="nu-password" className="ui-modal__label">
                            Contraseña inicial <span aria-hidden="true">*</span>
                        </label>
                        <input
                            id="nu-password"
                            type="password"
                            className={`ui-control${errors.password ? ' ui-control--error' : ''}`}
                            value={form.password}
                            onChange={set('password')}
                            placeholder={`Mínimo ${PASSWORD_MIN} caracteres`}
                            disabled={loading}
                            autoComplete="new-password"
                            aria-describedby="nu-password-ayuda"
                        />
                        {errors.password && (
                            <span className="ui-modal__error" role="alert">{errors.password}</span>
                        )}
                        <span id="nu-password-ayuda" className="ui-modal__hint">
                            Compártela con la persona por un medio seguro. No puede
                            recuperarse después: si se pierde, la cuenta queda inutilizable.
                        </span>
                    </div>

                    <div className="ui-modal__field">
                        <label htmlFor="nu-rol" className="ui-modal__label">Rol</label>
                        <select
                            id="nu-rol"
                            className="ui-control"
                            value={form.rol}
                            onChange={set('rol')}
                            disabled={loading}
                        >
                            <option value="evaluador">Evaluador</option>
                            <option value="admin">Administrador</option>
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
                            disabled={loading || !form.nombre.trim() || !form.email.trim() || !form.password}
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
