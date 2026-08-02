/**
 * Alert.tsx — Mensaje en línea del sistema de diseño.
 *
 * Fuente única para el feedback contextual (no flotante). Sustituye a
 * im-feedback, sn-upload-msg y tdetail-banner.
 *
 * Construido sobre los tokens `--toast-*`, que ya tienen pareja clara/oscura
 * verificada: el modo oscuro funciona por herencia, sin overrides.
 *
 * El rol ARIA se deriva del tono: los errores interrumpen, el resto no.
 *
 * Ejemplo:
 *   <Alert tone="danger" icon={<AlertCircle size={16} />}>No se pudo importar.</Alert>
 */

import React from 'react';

export type AlertTone = 'success' | 'danger' | 'warning' | 'info';

export interface AlertProps {
    tone: AlertTone;
    /** Icono decorativo a la izquierda. */
    icon?: React.ReactNode;
    /** Título en negrita sobre el cuerpo. */
    title?: React.ReactNode;
    /** Sobrescribe el rol derivado del tono. */
    role?: 'alert' | 'status';
    className?: string;
    children?: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({ tone, icon, title, role, className, children }) => (
    <div
        className={['ui-alert', `ui-alert--${tone}`, className ?? ''].filter(Boolean).join(' ')}
        role={role ?? (tone === 'danger' ? 'alert' : 'status')}
    >
        {icon && (
            <span className="ui-alert__icon" aria-hidden="true">
                {icon}
            </span>
        )}
        <div className="ui-alert__body">
            {title && <strong className="ui-alert__title">{title}</strong>}
            {children}
        </div>
    </div>
);

export default Alert;
