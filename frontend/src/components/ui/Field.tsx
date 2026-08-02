/**
 * Field.tsx — Primitiva de campo de formulario del sistema de diseño.
 *
 * Unifica los tres sistemas de campo que convivían en el producto
 * (auth-form__* en login, en-field en detalle, sn-field en registro):
 * etiqueta + control con icono opcional + mensaje de validación.
 *
 * El mensaje se mantiene siempre montado (con espacio reservado) para que
 * la región viva anuncie los cambios y el layout no salte al validar.
 *
 * Ejemplo:
 *   <Field label="Correo" htmlFor="email" required error={showError('email')} icon={<Mail size={16} />}>
 *     <input id="email" className="ui-field__input" aria-describedby="email-error" />
 *   </Field>
 */

import React from 'react';

export interface FieldProps {
    label: React.ReactNode;
    /** Id del control interno. Deriva el id del mensaje: `${htmlFor}-error`. */
    htmlFor: string;
    required?: boolean;
    /** Mensaje de error visible; `undefined` mantiene el campo en estado normal. */
    error?: string | null;
    /** Icono decorativo dentro del control. */
    icon?: React.ReactNode;
    className?: string;
    children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({
    label,
    htmlFor,
    required = false,
    error,
    icon,
    className,
    children,
}) => {
    const classes = ['ui-field', error ? 'ui-field--error' : '', className ?? '']
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classes}>
            <label className="ui-field__label" htmlFor={htmlFor}>
                {label}
                {required && (
                    <span className="ui-field__req" title="Campo obligatorio">
                        *
                    </span>
                )}
            </label>

            <div className="ui-field__control">
                {icon && (
                    <span className="ui-field__icon" aria-hidden="true">
                        {icon}
                    </span>
                )}
                {children}
            </div>

            {/* Región viva permanente: anuncia el error sin desplazar el layout. */}
            <p id={`${htmlFor}-error`} className="ui-field__msg" aria-live="polite">
                {error ?? ''}
            </p>
        </div>
    );
};

export default Field;
