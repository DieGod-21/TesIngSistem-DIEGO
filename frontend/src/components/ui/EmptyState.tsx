/**
 * EmptyState.tsx — Estado vacío / sin resultados del sistema de diseño.
 *
 * Icono en chip de marca + título + descripción + acción opcional.
 * Unifica los múltiples vacíos ad-hoc (sl-empty, tempty, usr-empty…).
 *
 *   <EmptyState icon={<Inbox />} title="Sin resultados" description="…" action={<Button/>} />
 */

import React from 'react';

export interface EmptyStateProps {
    icon?: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    /** Tono del chip de icono. */
    tone?: 'primary' | 'success' | 'danger' | 'neutral';
    className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    icon, title, description, action, tone = 'primary', className,
}) => (
    <div className={['ui-empty', `ui-empty--${tone}`, className ?? ''].filter(Boolean).join(' ')} role="status">
        {icon && <span className="ui-empty__icon" aria-hidden="true">{icon}</span>}
        <p className="ui-empty__title">{title}</p>
        {description && <p className="ui-empty__desc">{description}</p>}
        {action && <div className="ui-empty__action">{action}</div>}
    </div>
);

export default EmptyState;
