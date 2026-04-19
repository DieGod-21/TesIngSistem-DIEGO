/**
 * StudentManualForm.tsx
 *
 * Formulario de registro manual de estudiantes.
 * - Carga semestres desde GET /api/semesters
 * - Carga fases académicas desde GET /api/academic-phases
 * - Valida y envía via POST /api/students con academic_phase_id
 */

import React, { useEffect, useState } from 'react';
import { IonToast } from '@ionic/react';
import { User, CreditCard, Mail, BookOpen, GraduationCap, Save, Trash2 } from 'lucide-react';
import {
    createStudent,
    getSemesters,
} from '../../services/studentsService';
import type { StudentPayload, Semester } from '../../services/studentsService';
import { getAcademicPhases } from '../../services/academicPhasesService';
import type { AcademicPhase } from '../../services/academicPhasesService';
import { useForm } from '../../hooks/useForm';
import { runValidators, validators } from '../../utils/validators';

// ─── Tipo del formulario ─────────────────────────────────────────────

type FormFields = {
    nombreCompleto:      string;
    carnetId:            string;
    correoInstitucional: string;
    semesterId:          string;
    academicPhaseId:     string;  // string en el form, se convierte a number al enviar
};

const EMPTY_FORM: FormFields = {
    nombreCompleto:      '',
    carnetId:            '',
    correoInstitucional: '',
    semesterId:          '',
    academicPhaseId:     '',
};

// ─── Validación ──────────────────────────────────────────────────────

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

    const semestre = validators.select('un semestre')(values.semesterId);
    if (semestre) errors.semesterId = semestre;

    const fase = validators.select('una fase académica')(values.academicPhaseId);
    if (fase) errors.academicPhaseId = fase;

    return errors;
}

// ─── Componente ──────────────────────────────────────────────────────

const StudentManualForm: React.FC = () => {
    const [semesters, setSemesters]         = useState<Semester[]>([]);
    const [semLoading, setSemLoading]       = useState(true);
    const [phases, setPhases]               = useState<AcademicPhase[]>([]);
    const [phasesLoading, setPhasesLoading] = useState(true);
    const [toast, setToast] = useState<{ open: boolean; message: string; color: string }>({
        open: false, message: '', color: 'success',
    });

    useEffect(() => {
        let canceled = false;
        getSemesters()
            .then((data) => { if (!canceled) setSemesters(data); })
            .catch(() => {})
            .finally(() => { if (!canceled) setSemLoading(false); });
        getAcademicPhases()
            .then((data) => { if (!canceled) setPhases(data); })
            .catch(() => {})
            .finally(() => { if (!canceled) setPhasesLoading(false); });
        return () => { canceled = true; };
    }, []);

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
                        semesterId:          vals.semesterId,
                        academicPhaseId:     Number(vals.academicPhaseId),
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
                    {/* Nombre Completo */}
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

                    {/* Carnet ID + Correo */}
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

                    {/* Semestre + Fase */}
                    <div className="sn-form__row">
                        <div className="sn-form__group">
                            <label className="sn-form__label" htmlFor="sn-semestre">
                                Semestre Lectivo <span className="sn-form__required">*</span>
                            </label>
                            <div className={`sn-field${showError('semesterId') ? ' sn-field--error' : ''}`}>
                                <BookOpen size={16} className="sn-field__icon" aria-hidden="true" />
                                <select
                                    id="sn-semestre"
                                    className="sn-field__input sn-field__select"
                                    value={values.semesterId}
                                    onChange={(e) => handleChange('semesterId', e.target.value)}
                                    onBlur={() => handleBlur('semesterId')}
                                    aria-describedby="sn-semestre-error"
                                    aria-invalid={!!showError('semesterId')}
                                    disabled={semLoading}
                                >
                                    <option value="">
                                        {semLoading ? 'Cargando semestres…' : 'Seleccionar semestre'}
                                    </option>
                                    {semesters.map((s) => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <p id="sn-semestre-error" className="sn-field__error" role="alert">
                                {showError('semesterId') ?? ''}
                            </p>
                        </div>

                        <div className="sn-form__group">
                            <label className="sn-form__label" htmlFor="sn-fase">
                                Fase Académica <span className="sn-form__required">*</span>
                            </label>
                            <div className={`sn-field${showError('academicPhaseId') ? ' sn-field--error' : ''}`}>
                                <GraduationCap size={16} className="sn-field__icon" aria-hidden="true" />
                                <select
                                    id="sn-fase"
                                    className="sn-field__input sn-field__select"
                                    value={values.academicPhaseId}
                                    onChange={(e) => handleChange('academicPhaseId', e.target.value)}
                                    onBlur={() => handleBlur('academicPhaseId')}
                                    aria-describedby="sn-fase-error"
                                    aria-invalid={!!showError('academicPhaseId')}
                                    disabled={phasesLoading}
                                >
                                    <option value="">
                                        {phasesLoading ? 'Cargando fases…' : 'Seleccionar fase'}
                                    </option>
                                    {phases.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.description ?? p.name} ({p.name})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p id="sn-fase-error" className="sn-field__error" role="alert">
                                {showError('academicPhaseId') ?? ''}
                            </p>
                        </div>
                    </div>

                    {/* Acciones */}
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
