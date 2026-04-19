import React from 'react';
import AuthLayout from '../layout/AuthLayout';
import LoginForm from '../components/LoginForm';
import '../styles/login.css';
import umgLogo from '../assets/umg_logo.png';

/**
 * LoginPage.tsx
 *
 * Página de autenticación — diseño split-screen premium:
 *  - Izquierda: Branding UMG con gradiente animado, glow radial y wave SVG.
 *  - Derecha: Formulario de login con animación de entrada.
 *
 * Elementos decorativos (auth-glow, auth-wave) son aria-hidden para no
 * interferir con lectores de pantalla.
 */

const LoginPage: React.FC = () => {
    return (
        <AuthLayout>
            <main className="auth-screen">

                {/* ── Panel izquierdo: Branding premium ──────────────────── */}
                <section className="auth-branding" aria-label="Información institucional">

                    {/* Glow radial detrás del logo */}
                    <div className="auth-glow" aria-hidden="true" />

                    {/* Bloque principal centrado: logo + facultad + título + frase */}
                    <div className="auth-brand-content">
                        <div className="auth-branding__logo-wrap">
                            <div className="auth-branding__logo-box">
                                <img
                                    src={umgLogo}
                                    alt="Logo Universidad Mariano Gálvez"
                                    className="logo-float"
                                />
                            </div>
                            <h1 className="auth-branding__faculty">Facultad de Ingeniería</h1>
                            <p className="auth-branding__quote">
                                "Conoceréis la verdad, y la verdad os hará libres"
                            </p>
                        </div>

                        <div className="auth-branding__center">
                            <h2 className="auth-branding__title">Gestión PG1-PG2</h2>
                            <p className="auth-branding__subtitle">
                                Plataforma de seguimiento de trabajos de graduación para
                                estudiantes y catedráticos.
                            </p>
                        </div>
                    </div>

                    {/* Copyright – margin-top:auto lo ancla al fondo */}
                    <footer className="auth-branding__footer">
                        © 2026 Universidad Mariano Gálvez de Guatemala
                    </footer>

                    {/* Wave SVG decorativo – position:absolute bottom:0 */}
                    <div className="auth-wave" aria-hidden="true">
                        <svg
                            viewBox="0 0 1200 80"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M0,40 C200,80 400,0 600,40 C800,80 1000,0 1200,40 L1200,80 L0,80 Z"
                                fill="rgba(255,255,255,0.04)"
                            />
                            <path
                                d="M0,55 C150,20 350,70 600,50 C850,30 1050,65 1200,45 L1200,80 L0,80 Z"
                                fill="rgba(255,255,255,0.03)"
                            />
                        </svg>
                    </div>
                </section>

                {/* ── Panel derecho: Formulario ─────────────────────────── */}
                <section className="auth-form-section" aria-label="Formulario de acceso">
                    <div className="auth-form-container">
                        <LoginForm />
                    </div>

                    <footer className="auth-copyright-footer">
                        © 2026 Universidad Mariano Gálvez de Guatemala
                    </footer>
                </section>

            </main>
        </AuthLayout>
    );
};

export default LoginPage;
