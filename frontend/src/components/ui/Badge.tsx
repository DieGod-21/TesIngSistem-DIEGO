/**
 * Badge.tsx — Primitiva de etiqueta de estado.
 *
 * Unifica los múltiples badges (dash-badge, sl-badge, usr-badge, proy-badge,
 * estado-*, ui-status-chip…) en una sola API con tono semántico.
 *
 * Ejemplos:
 *   <Badge tone="success">Aprobado</Badge>
 *   <Badge tone="warning" dot>Pendiente</Badge>
 */

import React from 'react';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    tone?: BadgeTone;
    /** Muestra un punto de color antes del texto. */
    dot?: boolean;
}

const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', dot = false, className, children, ...rest }) => {
    const classes = ['ui-badge', `ui-badge--${tone}`, className ?? ''].filter(Boolean).join(' ');
    return (
        <span className={classes} {...rest}>
            {dot && <span className="ui-badge__dot" aria-hidden="true" />}
            {children}
        </span>
    );
};

export default Badge;
