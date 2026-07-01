/**
 * Button.tsx — Primitiva de botón del sistema de diseño.
 *
 * Reemplaza los múltiples estilos de botón dispersos (dash-btn, nu-btn,
 * usr-btn, proy-btn, eval-btn, en-btn, sn-btn…) con una sola API.
 *
 * Ejemplos:
 *   <Button onClick={…}><Plus size={18} /> Registrar</Button>
 *   <Button variant="secondary" size="sm">Cancelar</Button>
 *   <Button variant="danger" loading>Eliminar</Button>
 */

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'contrast';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Ocupa todo el ancho del contenedor. */
    block?: boolean;
    /** Muestra spinner y deshabilita el botón. */
    loading?: boolean;
}

const SIZE_CLASS: Record<ButtonSize, string> = {
    sm: 'ui-btn--sm',
    md: '',
    lg: 'ui-btn--lg',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            block = false,
            loading = false,
            disabled,
            className,
            children,
            type = 'button',
            ...rest
        },
        ref,
    ) => {
        const classes = [
            'ui-btn',
            `ui-btn--${variant}`,
            SIZE_CLASS[size],
            block ? 'ui-btn--block' : '',
            className ?? '',
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <button
                ref={ref}
                type={type}
                className={classes}
                disabled={disabled || loading}
                aria-busy={loading || undefined}
                {...rest}
            >
                {loading && <span className="ui-btn__spinner" aria-hidden="true" />}
                {children}
            </button>
        );
    },
);

Button.displayName = 'Button';

export default Button;
