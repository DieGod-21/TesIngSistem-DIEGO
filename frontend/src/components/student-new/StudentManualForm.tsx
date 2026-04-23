/**
 * StudentManualForm.tsx
 *
 * Registro manual contra POST /api/estudiantes.
 * Campos expuestos por el backend real: nombre, carnet, email.
 */

import React, { useState } from 'react';
import { IonToast } from '@ionic/react';
import { User, CreditCard, Mail, GraduationCap, Save, Trash2 } from 'lucide-react';
import { createStudent } from '../../services/studentsService';
import type { StudentPayload } from '../../services/studentsService';
import { useForm } from '../../hooks/useForm';
import { runValidators, validators } from '../../utils/validators';

type FormFields = {
    nombreCompleto:      string;
    carnetId:            string;
    correoInstitucional: string;
};

const EMPTY_FORM: FormFields = {
    nombreCompleto:      '',
    carnetId:            '',
    correoInstitucional: '',
};

function validate(values: FormFields) {
    const errors: Partial<FormFields> = {};

    const nombre = runValidators(values.nombreCompleto, validators.required('El nombre completo'));
    if (nombre) errors.nombreCompleto = nombre;
    else if (values.nombreCompleto.trim().length > 150) errors.nombreCompleto = 'El nombre no puede exceder 150 caracteres';

    const carnet = runValidators(values.carnetId, validators.required('El carnet ID'));
    if (carnet) errors.carnetId = carnet;
    else if (values.carnetId.trim().length > 50) errors.carnetId = 'El carnet no puede exceder 50 caracteres';

    const correo = runValidators(
        values.correoInstitucional,
        validators.required('El correo institucional'),
        validators.email.format,
        validators.email.institutional,
    );
    if (correo) errors.correoInstitucional = correo;

    return errors;
}

const StudentManualForm: React.FC = () => {
    const [toast, setToast] = useState<{ open: boolean; message: string; color: string }>({
        open: false, message: '', color: 'success',
    });

    const { values, submitting, handleChange, handleBlur, handleSubmit, reset, showError } =
        useForm<FormFields>({
            initialValues: EMPTY_FORM,
            validate,
            onSubmit: async (vals) => {
                try {
                    const payload: StudentPayload = {
                        nombreCompleto:      vals.nombreCompleto,
                        carnetId:            vals.carnetId,
                        correoInstitucional: vals.correoInstitucional,
                    };
                    await createStudent(payload);
                    setToast({ open: true, message: 'Estudiante registrado exitosamente.', color: 'success' });
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Error al registrar. Intenta de nuevo.';
                    setToast({ open: true, message: msg, color: 'danger' });
                    throw err;
                }
            },
        });

    return (
        <>
            <div className="sn-card">
                <div className="sn-card__header">
                    <GraduationCap size={20} className="sn-card__header-icon" />
                    <h3 className="sn-card__title">Registro Manual</h3>
                </div>

                <form className="sn-form" onSubmit={handleSubmit} noValidate>
                    <div className="sn-form__group sn-form__group--full">
                        <label className="sn-form__label" htmlFor="sn-nombre">
                            Nombre Completo <span className="sn-form__required">*</span>
                        </label>
                        <div className={`sn-field${showError('nombreCompleto') ? ' sn-field--error' : ''}`}>
                            <User size={16} className="sn-field__icon" aria-hidden="true" />
                            <input
                                id="sn-nombre"
                                type="text"
                                className="sn-field__input"
                                placeholder="Ej. Juan Pérez López"
                                maxLength={150}
                                value={values.nombreCompleto}
                                onChange={(e) => handleChange('nombreCompleto', e.target.value)}
                                onBlur={() => handleBlur('nombreCompleto')}
                                aria-describedby="sn-nombre-error"
                                aria-invalid={!!showError('nombreCompleto')}
                            />
                        </div>
                        <p id="sn-nombre-error" className="sn-field__error" role="alert">
                            {showError('nombreCompleto') ?? ''}
                        </p>
                    </div>

                    <div className="sn-form__row">
                        <div className="sn-form__group">
                            <label className="sn-form__label" htmlFor="sn-carnet">
                                Carnet ID <span className="sn-form__required">*</span>
                            </label>
                            <div className={`sn-field${showError('carnetId') ? ' sn-field--error' : ''}`}>
                                <CreditCard size={16} className="sn-field__icon" aria-hidden="true" />
                                <input
                                    id="sn-carnet"
                                    type="text"
                                    className="sn-field__input"
                                    placeholder="1234-20-XXXX"
                                    maxLength={50}
                                    value={values.carnetId}
                                    onChange={(e) => handleChange('carnetId', e.target.value)}
                                    onBlur={() => handleBlur('carnetId')}
                                    aria-describedby="sn-carnet-error"
                                    aria-invalid={!!showError('carnetId')}
                                />
                            </div>
                            <p id="sn-carnet-error" className="sn-field__error" role="alert">
                                {showError('carnetId') ?? ''}
                            </p>
                        </div>

                        <div className="sn-form__group">
                            <label className="sn-form__label" htmlFor="sn-correo">
                                Correo Institucional <span className="sn-form__required">*</span>
                            </label>
                            <div className={`sn-field${showError('correoInstitucional') ? ' sn-field--error' : ''}`}>
                                <Mail size={16} className="sn-field__icon" aria-hidden="true" />
                                <input
                                    id="sn-correo"
                                    type="email"
                                    className="sn-field__input"
                                    placeholder="usuario@miumg.edu.gt"
                                    maxLength={100}
                                    value={values.correoInstitucional}
                                    onChange={(e) => handleChange('correoInstitucional', e.target.value)}
                                    onBlur={() => handleBlur('correoInstitucional')}
                                    aria-describedby="sn-correo-error"
                                    aria-invalid={!!showError('correoInstitucional')}
                                />
                            </div>
                            <p id="sn-correo-error" className="sn-field__error" role="alert">
                                {showError('correoInstitucional') ?? ''}
                            </p>
                        </div>
                    </div>

                    <div className="sn-form__actions">
                        <button
                            type="submit"
                            className="sn-btn-primary"
                            disabled={submitting}
                            aria-busy={submitting}
                        >
                            <Save size={16} />
                            {submitting ? 'Registrando…' : 'Registrar Estudiante'}
                        </button>
                        <button
                            type="button"
                            className="sn-btn-secondary"
                            onClick={reset}
                            disabled={submitting}
                        >
                            <Trash2 size={16} />
                            Limpiar Formulario
                        </button>
                    </div>
                </form>
            </div>

            <IonToast
                isOpen={toast.open}
                message={toast.message}
                color={toast.color}
                duration={3000}
                position="bottom"
                onDidDismiss={() => setToast((t) => ({ ...t, open: false }))}
            />
        </>
    );
};

export default StudentManualForm;
