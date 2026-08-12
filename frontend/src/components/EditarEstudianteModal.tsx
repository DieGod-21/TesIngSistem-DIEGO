/**
 * EditarEstudianteModal.tsx
 *
 * Corrección de los datos de identidad de un expediente.
 *
 * Hasta ahora el expediente era de solo lectura: un correo mal escrito en la
 * carga masiva no se podía arreglar desde el producto, y ese correo es el único
 * canal para avisar a la persona de que le falta una nota. El contrato admite
 * `PUT /api/estudiantes/{id}` con nombre, correo y carrera.
 *
 * El CARNÉ no está: es la clave con la que notas, tesis y reportes referencian
 * a la persona, y el contrato tampoco permite cambiarlo. Se muestra bloqueado
 * en lugar de omitirlo, para que quede claro que no es un olvido.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserCog } from 'lucide-react';
import { updateEstudiante } from '../services/estudiantesService';
import { userMessageFor } from '../services/errorMessages';
import { Alert, Button } from './ui';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { Estudiante } from '../types/api';

interface Props {
    open: boolean;
    estudiante: Estudiante;
    onClose: () => void;
    onSaved: () => void;
}

interface Errores {
    nombre?: string;
    email?: string;
}

const EditarEstudianteModal: React.FC<Props> = ({ open, estudiante, onClose, onSaved }) => {
    const [nombre, setNombre]   = useState(estudiante.nombre ?? '');
    const [email, setEmail]     = useState(estudiante.email ?? '');
    const [carrera, setCarrera] = useState(estudiante.carrera ?? '');
    const [errores, setErrores] = useState<Errores>({});
    const [guardando, setGuardando] = useState(false);
    const [apiError, setApiError]   = useState<string | null>(null);

    // Al abrir sobre otro expediente el formulario tiene que partir de SUS
    // datos, no de los del anterior.
    useEffect(() => {
        if (!open) return;
        setNombre(estudiante.nombre ?? '');
        setEmail(estudiante.email ?? '');
        setCarrera(estudiante.carrera ?? '');
        setErrores({});
        setApiError(null);
    }, [open, estudiante]);

    const cerrar = () => { if (!guardando) onClose(); };
    const modalRef = useFocusTrap<HTMLDivElement>(open, cerrar);

    if (!open) return null;

    const enviar = async (ev: React.FormEvent) => {
        ev.preventDefault();
        const errs: Errores = {};
        if (!nombre.trim()) errs.nombre = 'El nombre es requerido.';
        // Validación deliberadamente laxa: basta con que parezca una dirección.
        // Un patrón estricto rechaza correos institucionales válidos y deja al
        // usuario sin poder corregir justo el dato que vino mal.
        if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
            errs.email = 'El correo no tiene un formato válido.';
        }
        setErrores(errs);
        if (Object.keys(errs).length > 0) return;

        setGuardando(true);
        setApiError(null);
        try {
            await updateEstudiante(estudiante.id, {
                nombre: nombre.trim(),
                email: email.trim(),
                carrera: carrera.trim(),
            });
            onSaved();
        } catch (e) {
            setApiError(userMessageFor(e));
        } finally {
            setGuardando(false);
        }
    };

    const sinCambios =
        nombre.trim() === (estudiante.nombre ?? '') &&
        email.trim() === (estudiante.email ?? '') &&
        carrera.trim() === (estudiante.carrera ?? '');

    return createPortal(
        <div
            className="ui-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ee-title"
            onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}
        >
            <div className="ui-modal ui-modal--form" ref={modalRef}>
                <header className="ui-modal__header">
                    <h2 id="ee-title" className="ui-modal__title">
                        <UserCog size={18} aria-hidden="true" />
                        Editar expediente
                    </h2>
                    <button
                        type="button"
                        className="ui-icon-btn"
                        onClick={cerrar}
                        aria-label="Cerrar"
                        disabled={guardando}
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>

                <form className="ui-modal__body" onSubmit={enviar} noValidate>
                    <div className="ui-modal__field">
                        <label htmlFor="ee-carnet" className="ui-modal__label">
                            Carné <span className="ui-modal__opt">(no editable)</span>
                        </label>
                        <input
                            id="ee-carnet"
                            type="text"
                            className="ui-control ui-tnum"
                            value={estudiante.carnet}
                            readOnly
                            disabled
                        />
                    </div>

                    <div className="ui-modal__field">
                        <label htmlFor="ee-nombre" className="ui-modal__label">
                            Nombre <span aria-hidden="true">*</span>
                        </label>
                        <input
                            id="ee-nombre"
                            data-autofocus
                            type="text"
                            className={`ui-control${errores.nombre ? ' ui-control--error' : ''}`}
                            value={nombre}
                            onChange={(e) => { setNombre(e.target.value); setErrores((p) => ({ ...p, nombre: undefined })); }}
                            disabled={guardando}
                            autoComplete="off"
                        />
                        {errores.nombre && <span className="ui-modal__error" role="alert">{errores.nombre}</span>}
                    </div>

                    <div className="ui-modal__field">
                        <label htmlFor="ee-email" className="ui-modal__label">Correo</label>
                        <input
                            id="ee-email"
                            type="email"
                            className={`ui-control${errores.email ? ' ui-control--error' : ''}`}
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setErrores((p) => ({ ...p, email: undefined })); }}
                            placeholder="usuario@miumg.edu.gt"
                            disabled={guardando}
                            autoComplete="off"
                        />
                        {errores.email && <span className="ui-modal__error" role="alert">{errores.email}</span>}
                    </div>

                    <div className="ui-modal__field">
                        <label htmlFor="ee-carrera" className="ui-modal__label">
                            Carrera <span className="ui-modal__opt">(código)</span>
                        </label>
                        <input
                            id="ee-carrera"
                            type="text"
                            className="ui-control"
                            value={carrera}
                            onChange={(e) => setCarrera(e.target.value)}
                            disabled={guardando}
                            autoComplete="off"
                        />
                    </div>

                    {apiError && <Alert tone="danger">{apiError}</Alert>}

                    <footer className="ui-modal__footer">
                        <Button variant="secondary" onClick={cerrar} disabled={guardando}>
                            Cancelar
                        </Button>
                        <Button type="submit" loading={guardando} disabled={guardando || sinCambios || !nombre.trim()}>
                            {guardando ? 'Guardando…' : 'Guardar cambios'}
                        </Button>
                    </footer>
                </form>
            </div>
        </div>,
        document.body,
    );
};

export default EditarEstudianteModal;
