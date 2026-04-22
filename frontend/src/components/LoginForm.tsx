/**
 * LoginForm.tsx
 *
 * El API Control de Notas no expone un endpoint de login con password.
 * La autenticación es por header X-Usuario-Id (entero) que el coordinador
 * proporciona a evaluadores y administradores.
 *
 * Este formulario solicita ese ID y valida llamando a /api/usuarios/yo.
 */

import React, { useState } from 'react';
import { IonButton, IonInput, IonSpinner, IonToast } from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import umgLogo from '../assets/umg_logo.png';

const LoginForm: React.FC = () => {
    const { loginByUserId, loading, error } = useAuth();

    const [userId, setUserId] = useState('');
    const [touched, setTouched] = useState(false);
    const [showToast, setShowToast] = useState(false);

    React.useEffect(() => { if (error) setShowToast(true); }, [error]);

    const idError = (() => {
        if (!touched) return null;
        if (userId.trim() === '') return 'Ingresa tu ID de usuario.';
        const n = Number(userId);
        if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
            return 'El ID debe ser un número entero positivo.';
        }
        return null;
    })();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (idError || userId.trim() === '') return;
        try {
            await loginByUserId(Number(userId));
        } catch {
            // El AuthContext ya almacena el error y dispara el toast
        }
    };

    const isFormValid = userId.trim() !== '' && idError === null;

    return (
        <>
            <IonToast
                isOpen={showToast}
                onDidDismiss={() => setShowToast(false)}
                message={error ?? 'No se pudo iniciar sesión'}
                duration={4000}
                color="danger"
                position="top"
            />

            <div className="auth-mobile-logo">
                <img src={umgLogo} alt="Logo Universidad Mariano Gálvez" />
                <span className="auth-mobile-logo__title">Gestión PG1-PG2</span>
            </div>

            <div className="auth-form-header">
                <h2 className="auth-form-header__title">Bienvenido</h2>
                <p className="auth-form-header__subtitle">
                    Ingresa tu ID de usuario para acceder al sistema de evaluación de tesis.
                </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} data-testid="login-form" noValidate>
                <div className="auth-form__field">
                    <label htmlFor="user-id" className="auth-form__label">
                        ID de Usuario
                    </label>
                    <div className={`auth-input-wrapper${idError ? ' auth-input-wrapper--error' : ''}`}>
                        <IonInput
                            id="user-id"
                            type="number"
                            inputmode="numeric"
                            value={userId}
                            placeholder="Ej. 1"
                            autocomplete="off"
                            onIonInput={(e) => setUserId(String(e.detail.value ?? ''))}
                            onIonBlur={() => setTouched(true)}
                        />
                    </div>
                    <div className="auth-field-error" aria-live="polite">
                        {idError ?? ''}
                    </div>
                </div>

                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 8px' }}>
                    Si no conoces tu ID, contacta al coordinador del programa de graduación.
                </p>

                <IonButton
                    expand="block"
                    type="submit"
                    className="auth-submit-btn"
                    disabled={loading || !isFormValid}
                >
                    {loading ? <IonSpinner name="crescent" /> : (
                        <>
                            <span>Ingresar</span>
                            <svg
                                className="btn-icon"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                            >
                                <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </>
                    )}
                </IonButton>
            </form>

            <div className="auth-secondary">
                <p>
                    ¿No tienes acceso?{' '}
                    <a href="#" className="auth-secondary__link">
                        Contacte a su Coordinador
                    </a>
                </p>
            </div>

            <div className="auth-help-links">
                <a href="#">Términos</a>
                <span className="auth-help-links__sep">•</span>
                <a href="#">Privacidad</a>
                <span className="auth-help-links__sep">•</span>
                <a href="#">Soporte Técnico</a>
            </div>
        </>
    );
};

export default LoginForm;
