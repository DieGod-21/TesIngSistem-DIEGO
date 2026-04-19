import React, { useState, useEffect } from 'react';
import { IonButton, IonInput, IonIcon, IonSpinner, IonToast } from '@ionic/react';
import { eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import { runValidators, validators, isInstitutionalEmail } from '../utils/validators';
import umgLogo from '../assets/umg_logo.png';

/**
 * LoginForm.tsx
 *
 * Componente de formulario con validación en vivo, toggle de contraseña,
 * spinner de carga y notificación de error vía IonToast.
 *
 * DECISIÓN — dónde vive cada cosa:
 *  - Estado del formulario (email, password, showPassword, emailError): aquí.
 *  - Lógica de autenticación (login(), loading, error): AuthContext.
 *  - Llamada mock a la API: authService (transparente para este componente).
 *
 * El submit con Enter es nativo: el <form> recibe onSubmit y los inputs
 * son de tipo submit/text/password, por lo que funciona sin JS extra.
 */

const LoginForm: React.FC = () => {
    const { login, loading, error } = useAuth();

    // Estado del formulario
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Estado de validación
    const [emailError, setEmailError] = useState<string | null>(null);
    const [emailTouched, setEmailTouched] = useState(false);

    // Toast de error de autenticación
    const [showToast, setShowToast] = useState(false);

    // Mostrar toast cuando llega un error de AuthContext
    useEffect(() => {
        if (error) {
            setShowToast(true);
        }
    }, [error]);

    // ─── Validación de email (centralizada) ───────────────────────────
    const validateEmail = (value: string): string | null =>
        runValidators(value, validators.required('El correo'), validators.email.format);

    const handleEmailChange = (value: string) => {
        setEmail(value);
        // Solo validar en vivo si el campo ya fue tocado (onBlur al menos una vez)
        if (emailTouched) {
            setEmailError(validateEmail(value));
        }
    };

    const handleEmailBlur = () => {
        setEmailTouched(true);
        setEmailError(validateEmail(email));
    };

    // ─── Submit ───────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Forzar validación antes de enviar
        const err = validateEmail(email);
        setEmailTouched(true);
        setEmailError(err);

        if (err || !password.trim()) return;

        await login(email, password);
    };

    // El botón se deshabilita si hay error en email, campos vacíos o carga
    const isFormValid =
        email.trim() !== '' &&
        password.trim() !== '' &&
        emailError === null;

    // Sugerencia de dominio: solo si el email parece válido pero no es institucional
    const showDomainHint =
        email.includes('@') &&
        emailError === null &&
        !isInstitutionalEmail(email);

    return (
        <>
            {/* ── IonToast: error de autenticación ──────────────────────── */}
            <IonToast
                isOpen={showToast}
                onDidDismiss={() => setShowToast(false)}
                message={error ?? 'Error al iniciar sesión'}
                duration={4000}
                color="danger"
                position="top"
            />

            {/* ── Logo móvil (solo pantallas pequeñas) ──────────────────── */}
            <div className="auth-mobile-logo">
                <img src={umgLogo} alt="Logo Universidad Mariano Gálvez" />
                <span className="auth-mobile-logo__title">Gestión PG1-PG2</span>
            </div>

            {/* ── Cabecera del formulario ───────────────────────────────── */}
            <div className="auth-form-header">
                <h2 className="auth-form-header__title">Bienvenido</h2>
                <p className="auth-form-header__subtitle">
                    Inicie sesión con sus credenciales institucionales para continuar.
                </p>
            </div>

            {/* ── Formulario principal ──────────────────────────────────── */}
            {/*
        DECISIÓN: el atributo onSubmit en el <form> habilita submit con Enter
        de forma nativa sin necesitar un listener de teclado adicional.
      */}
            <form className="auth-form" onSubmit={handleSubmit} data-testid="login-form" noValidate>

                {/* Campo: Correo Institucional */}
                <div className="auth-form__field">
                    <label htmlFor="email" className="auth-form__label">
                        Correo Institucional
                    </label>
                    <div className={`auth-input-wrapper${emailError ? ' auth-input-wrapper--error' : ''}`}>
                        <IonInput
                            id="email"
                            type="email"
                            value={email}
                            placeholder="ejemplo@miumg.edu.gt"
                            autocomplete="email"
                            onIonInput={(e) => handleEmailChange(e.detail.value ?? '')}
                            onIonBlur={handleEmailBlur}
                        />
                    </div>

                    {/* Espacio fijo reservado: no produce layout shift */}
                    <div className="auth-field-error" aria-live="polite">
                        {emailError ?? ''}
                    </div>
                </div>

                {/* Campo: Contraseña */}
                <div className="auth-form__field">
                    <div className="auth-form__label-row">
                        <label htmlFor="password" className="auth-form__label">
                            Contraseña
                        </label>
                        <a href="#" className="auth-form__forgot">
                            ¿Olvidó su contraseña?
                        </a>
                    </div>

                    {/*
            DECISIÓN: El toggle de visibilidad es un <button type="button">
            para que no dispare el submit del formulario. IonIcon provee el
            ícono sin dependencias externas (ionicons ya está en el proyecto).
          */}
                    <div className="auth-input-wrapper auth-input-wrapper--password">
                        <IonInput
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            placeholder="••••••••"
                            autocomplete="current-password"
                            onIonInput={(e) => setPassword(e.detail.value ?? '')}
                        />
                        <button
                            type="button"
                            className="auth-password-toggle"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} aria-hidden="true" />
                        </button>
                    </div>

                    {/* Espacio fijo reservado campo contraseña */}
                    <div className="auth-field-error" aria-live="polite" />
                </div>



                {/* Botón de submit con spinner */}
                <IonButton
                    expand="block"
                    type="submit"
                    className="auth-submit-btn"
                    disabled={loading || !isFormValid}
                >
                    {loading ? (
                        /*
                          DECISIÓN: IonSpinner con name="crescent" coincide visualmente
                          con el estilo Ionic y no requiere CSS adicional.
                        */
                        <IonSpinner name="crescent" />
                    ) : (
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
                                <path
                                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </>
                    )}
                </IonButton>
            </form>

            {/* ── Acciones secundarias ──────────────────────────────────── */}
            <div className="auth-secondary">
                <p>
                    ¿No tiene una cuenta?{' '}
                    <a href="#" className="auth-secondary__link">
                        Contacte a su Coordinador
                    </a>
                </p>
            </div>

            {/* ── Links de ayuda ────────────────────────────────────────── */}
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
