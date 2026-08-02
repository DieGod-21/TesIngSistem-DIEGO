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
 *
 * El pie no enlaza a recursos institucionales: mientras esas URLs no existan
 * publicadas, un enlace inerte promete algo que el producto no cumple. Cuando
 * la coordinación publique la Guía Normativa o el canal de soporte, se añaden
 * aquí con su destino real.
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

            <p className="app-footer__copy">
                &copy; {currentYear} UMG &mdash; Todos los derechos reservados
            </p>

        </div>
    </footer>
);

export default AppFooter;
