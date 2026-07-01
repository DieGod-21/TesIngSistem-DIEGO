/**
 * Card.tsx — Primitiva de superficie/tarjeta.
 *
 * Superficie estándar del sistema. Con `interactive` se renderiza como <button>
 * accesible (hover/focus/press) para tarjetas que navegan o accionan.
 *
 * Ejemplos:
 *   <Card padded>…</Card>
 *   <Card interactive onClick={…}>…</Card>
 */

import React from 'react';

interface BaseProps {
    /** Aplica padding interno estándar. */
    padded?: boolean;
    className?: string;
    children?: React.ReactNode;
}

type StaticCardProps = BaseProps &
    Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'> & {
        interactive?: false;
    };

type InteractiveCardProps = BaseProps &
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
        interactive: true;
    };

export type CardProps = StaticCardProps | InteractiveCardProps;

const Card: React.FC<CardProps> = ({ padded = false, interactive, className, children, ...rest }) => {
    const classes = [
        'ui-card',
        padded ? 'ui-card--pad' : '',
        interactive ? 'ui-card--interactive' : '',
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    if (interactive) {
        return (
            <button type="button" className={classes} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
                {children}
            </button>
        );
    }

    return (
        <div className={classes} {...(rest as React.HTMLAttributes<HTMLDivElement>)}>
            {children}
        </div>
    );
};

export default Card;
