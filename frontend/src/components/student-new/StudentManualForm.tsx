/**
 * StudentManualForm.tsx
 *
 * Registro manual contra POST /api/estudiantes.
 * Campos expuestos por el backend real: nombre, carnet, email.
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonToast } from '@ionic/react';
import { User, CreditCard, Mail, UserPlus, Save, Eraser, ChevronRight } from 'lucide-react';
import { createStudent } from '../../services/studentsService';
import type { StudentPayload } from '../../services/studentsService';
import type { Student } from '../../types/student';
import { useForm } from '../../hooks/useForm';
import { runValidators, validators } from '../../utils/validators';
import { Avatar, Button, Card, Field } from '../ui';

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
    const history = useHistory();
    // Rastro de lo creado en esta sesión: el formulario se vacía al guardar.
    const [created, setCreated] = useState<Student[]>([]);
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
                    const student = await createStudent(payload);
                    setCreated((prev) => [student, ...prev]);
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
            <Card className="sn-panel">
                <div className="sn-panel__head">
                    <UserPlus size={18} className="sn-panel__icon" aria-hidden="true" />
                    <h2 className="sn-panel__title">Registro individual</h2>
                    <span className="sn-panel__note">3 campos obligatorios</span>
                </div>

                <div className="sn-panel__body">
                    <form className="sn-form" onSubmit={handleSubmit} noValidate>
                        <Field
                            label="Nombre completo"
                            htmlFor="sn-nombre"
                            required
                            error={showError('nombreCompleto')}
                            icon={<User size={16} />}
                        >
                            <input
                                id="sn-nombre"
                                type="text"
                                className="ui-field__input"
                                placeholder="Ej. Juan Pérez López"
                                maxLength={150}
                                autoComplete="off"
                                value={values.nombreCompleto}
                                onChange={(e) => handleChange('nombreCompleto', e.target.value)}
                                onBlur={() => handleBlur('nombreCompleto')}
                                aria-describedby="sn-nombre-error"
                                aria-invalid={!!showError('nombreCompleto')}
                            />
                        </Field>

                        <div className="ui-field-row">
                            <Field
                                label="Carnet ID"
                                htmlFor="sn-carnet"
                                required
                                error={showError('carnetId')}
                                icon={<CreditCard size={16} />}
                            >
                                <input
                                    id="sn-carnet"
                                    type="text"
                                    className="ui-field__input"
                                    placeholder="1234-20-XXXX"
                                    maxLength={50}
                                    autoComplete="off"
                                    value={values.carnetId}
                                    onChange={(e) => handleChange('carnetId', e.target.value)}
                                    onBlur={() => handleBlur('carnetId')}
                                    aria-describedby="sn-carnet-error"
                                    aria-invalid={!!showError('carnetId')}
                                />
                            </Field>

                            <Field
                                label="Correo institucional"
                                htmlFor="sn-correo"
                                required
                                error={showError('correoInstitucional')}
                                icon={<Mail size={16} />}
                            >
                                <input
                                    id="sn-correo"
                                    type="email"
                                    className="ui-field__input"
                                    placeholder="usuario@miumg.edu.gt"
                                    maxLength={100}
                                    autoComplete="off"
                                    value={values.correoInstitucional}
                                    onChange={(e) => handleChange('correoInstitucional', e.target.value)}
                                    onBlur={() => handleBlur('correoInstitucional')}
                                    aria-describedby="sn-correo-error"
                                    aria-invalid={!!showError('correoInstitucional')}
                                />
                            </Field>
                        </div>

                        <div className="sn-form__actions">
                            <Button type="submit" loading={submitting} disabled={submitting}>
                                {!submitting && <Save size={16} aria-hidden="true" />}
                                {submitting ? 'Registrando…' : 'Registrar estudiante'}
                            </Button>
                            <Button variant="ghost" onClick={reset} disabled={submitting}>
                                <Eraser size={16} aria-hidden="true" />
                                Limpiar
                            </Button>
                        </div>
                    </form>

                    {created.length > 0 && (
                        <div className="sn-log">
                            <div className="sn-log__head">
                                <h3 className="sn-log__title">Registrados en esta sesión</h3>
                                <span className="sn-log__count">{created.length}</span>
                            </div>
                            <ul className="sn-log__list">
                                {created.map((s) => (
                                    <li key={s.id}>
                                        <button
                                            type="button"
                                            className="sn-log__item"
                                            onClick={() => history.push(`/students/${s.id}`)}
                                            aria-label={`Abrir expediente de ${s.nombreCompleto} (${s.carnetId})`}
                                        >
                                            <Avatar name={s.nombreCompleto} size="sm" />
                                            <span className="sn-log__meta">
                                                <span className="sn-log__name">{s.nombreCompleto}</span>
                                                <span className="sn-log__carnet">{s.carnetId}</span>
                                            </span>
                                            <ChevronRight size={16} className="sn-log__go" aria-hidden="true" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </Card>

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
