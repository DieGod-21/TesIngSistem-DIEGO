/**
 * PageHeader.tsx — Encabezado de página estándar.
 *
 * Título + subtítulo + zona de acciones. Unifica dash-page-header,
 * sl-page-header, usr-page__header, proy-page__header, ternas-page__header.
 *
 * Ejemplo:
 *   <PageHeader
 *     title="Estudiantes"
 *     subtitle="Gestión de expedientes PG1-PG2"
 *     actions={<Button>Registrar</Button>}
 *   />
 */

import React from 'react';

export interface PageHeaderProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
    /** Eyebrow por encima del título (contexto de sección). */
    kicker?: React.ReactNode;
    /** Ícono mostrado en un chip a la izquierda del título. */
    icon?: React.ReactNode;
    className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, kicker, icon, className }) => (
    <header className={['ui-page-header', className ?? ''].filter(Boolean).join(' ')}>
        <div className="ui-page-header__lead">
            {kicker && <span className="ui-kicker">{kicker}</span>}
            <div className="ui-page-header__titlebar">
                {icon && <span className="ui-page-header__icon" aria-hidden="true">{icon}</span>}
                <div>
                    <h1 className="ui-page-header__title">{title}</h1>
                    {subtitle && <p className="ui-page-header__subtitle">{subtitle}</p>}
                </div>
            </div>
        </div>
        {actions && <div className="ui-page-header__actions">{actions}</div>}
    </header>
);

export default PageHeader;
