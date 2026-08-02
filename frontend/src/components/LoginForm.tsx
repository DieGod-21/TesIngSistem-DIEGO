import React, { useState } from 'react';
import { IonButton, IonInput, IonSpinner } from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SESSION_MSG_KEY } from '../services/apiClient';
import umgLogo from '../assets/umg_logo.png';

const LoginForm: React.FC = () => {
    const { login, loading, error } = useAuth();
    const { toast } = useToast();

    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [touched, setTouched]   = useState({ email: false, password: false });

    // Feedback unificado: el login usa el mismo sistema de toasts que el resto
    // de la app (no el IonToast de Ionic) para una experiencia coherente.
    React.useEffect(() => {
        if (error) toast.error(error, 4000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error]);

    React.useEffect(() => {
        const msg = sessionStorage.getItem(SESSION_MSG_KEY);
        if (msg) {
            toast.warning(msg, 5000);
            sessionStorage.removeItem(SESSION_MSG_KEY);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const emailError = (() => {
        if (!touched.email) return null;
        if (!email.trim()) return 'Ingresa tu correo electrónico.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Correo electrónico inválido.';
        return null;
    })();

    const passwordError = (() => {
        if (!touched.password) return null;
        if (!password) return 'Ingresa tu contraseña.';
        return null;
    })();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ email: true, password: true });
        if (emailError || passwordError || !email.trim() || !password) return;
        try {
            await login(email.trim(), password);
        } catch {
            // AuthContext almacena el error y dispara el toast
        }
    };

    const isFormValid =
        email.trim() !== '' &&
        password !== '' &&
        emailError === null &&
        passwordError === null;

    return (
        <>
            <div className="auth-mobile-logo">
                <img src={umgLogo} alt="Logo Universidad Mariano Gálvez" />
                <span className="auth-mobile-logo__title">Gestión PG1-PG2</span>
            </div>

            <div className="auth-form-header">
                <h2 className="auth-form-header__title">Bienvenido</h2>
                <p className="auth-form-header__subtitle">
                    Ingresa tus credenciales para acceder al sistema de evaluación de tesis.
                </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} data-testid="login-form" noValidate>
                <div className="auth-form__field">
                    <label htmlFor="email" className="auth-form__label">
                        Correo electrónico
                    </label>
                    <div className={`auth-input-wrapper${emailError ? ' auth-input-wrapper--error' : ''}`}>
                        <IonInput
                            id="email"
                            type="email"
                            inputmode="email"
                            value={email}
                            placeholder="usuario@umg.edu.gt"
                            autocomplete="email"
                            onIonInput={(e) => setEmail(String(e.detail.value ?? ''))}
                            onIonBlur={() => setTouched(t => ({ ...t, email: true }))}
                        />
                    </div>
                    <div className="auth-field-error" aria-live="polite">
                        {emailError ?? ''}
                    </div>
                </div>

                <div className="auth-form__field">
                    <label htmlFor="password" className="auth-form__label">
                        Contraseña
                    </label>
                    <div className={`auth-input-wrapper${passwordError ? ' auth-input-wrapper--error' : ''}`}>
                        <IonInput
                            id="password"
                            type="password"
                            value={password}
                            placeholder="••••••••"
                            autocomplete="current-password"
                            onIonInput={(e) => setPassword(String(e.detail.value ?? ''))}
                            onIonBlur={() => setTouched(t => ({ ...t, password: true }))}
                        />
                    </div>
                    <div className="auth-field-error" aria-live="polite">
                        {passwordError ?? ''}
                    </div>
                </div>

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

            {/* El acceso es por invitación (ver Usuarios): la vía real es el
                coordinador, no un formulario. Se enuncia como información, no
                como enlace: no existe destino y un enlace que no lleva a
                ninguna parte es peor que su ausencia. */}
            <div className="auth-secondary">
                <p>El acceso se otorga por invitación. Solicítalo a tu coordinador.</p>
            </div>
        </>
    );
};

export default LoginForm;
