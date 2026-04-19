/**
 * AppFooter.tsx
 *
 * Footer institucional — Universidad Mariano Gálvez de Guatemala
 * Facultad de Ingeniería en Sistemas de Información
 * Coordinación de Proyecto de Graduación
 *
 * — Año dinámico con new Date().getFullYear()
 * — margin-top: auto → se pega al fondo si el contenido es corto
 * — Fluye naturalmente si el contenido es largo
 * — Efecto glass con backdrop-filter
 * — Responsive: stack en móvil
 * — Sin textos de prototipo
 *
 * Estructura para futura integración:
 * TODO: Integrar API de eventos académicos
 * TODO: Agregar enlace a Reglamento de Tesis institucional
 * TODO: Agregar enlace al portal del estudiante UMG
 */

import React from 'react';
import '../styles/app-footer.css';

const currentYear = new Date().getFullYear();

const AppFooter: React.FC = () => (
    <footer className="app-footer" role="contentinfo" aria-label="Pie de página institucional">
        <div className="app-footer__inner">

            {/* Identificación institucional */}
            <div className="app-footer__brand">
                <p className="app-footer__institution">
                    Universidad Mariano Gálvez de Guatemala
                </p>
                <p className="app-footer__dept">
                    Facultad de Ingeniería en Sistemas de Información &mdash; Coordinación de Proyecto de Graduación
                </p>
            </div>

            {/* Links institucionales y versión */}
            <nav className="app-footer__links" aria-label="Recursos institucionales">
                <a
                    className="app-footer__link"
                    href="#"
                    aria-label={`Guía Normativa de Proyecto de Graduación ${currentYear}`}
                >
                    Guía Normativa {currentYear}
                </a>
                <span className="app-footer__sep" aria-hidden="true">·</span>
                <a
                    className="app-footer__link"
                    href="#"
                    aria-label="Soporte técnico del sistema"
                >
                    Soporte Técnico
                </a>
                <span className="app-footer__sep" aria-hidden="true">·</span>
                <span className="app-footer__copy">
                    &copy; {currentYear} UMG &mdash; Todos los derechos reservados
                </span>
            </nav>

        </div>
    </footer>
);

export default AppFooter;
