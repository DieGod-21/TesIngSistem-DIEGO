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

import React, { useEffect, useRef } from 'react';

export type AlertTone = 'success' | 'danger' | 'warning' | 'info';

export interface AlertProps {
    tone: AlertTone;
    /** Icono decorativo a la izquierda. */
    icon?: React.ReactNode;
    /** Título en negrita sobre el cuerpo. */
    title?: React.ReactNode;
    /** Sobrescribe el rol derivado del tono. */
    role?: 'alert' | 'status';
    /**
     * Se lleva el foco al aparecer.
     *
     * Para el error de un envío que falla. MEDIDO: al fallar el alta de un
     * usuario el foco acababa en `<body>`. El botón enviado se deshabilita
     * mientras dura la petición, y deshabilitar el elemento enfocado tira el
     * foco al documento; en el camino feliz no se nota porque el diálogo se
     * cierra y el foco vuelve solo al botón que lo abrió, pero cuando falla el
     * diálogo SIGUE abierto y quien navega con el teclado se queda fuera de él:
     * el siguiente tabulador empieza arriba del todo, fuera de la trampa de
     * foco.
     *
     * Llevar el foco al mensaje es además lo que recomienda WCAG para un error
     * de envío: se aterriza EN el problema, y desde ahí el tabulador sigue
     * dentro del diálogo.
     */
    autoFocus?: boolean;
    className?: string;
    children?: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({ tone, icon, title, role, autoFocus, className, children }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (autoFocus) ref.current?.focus();
    }, [autoFocus]);

    return (
    <div
        ref={ref}
        className={['ui-alert', `ui-alert--${tone}`, className ?? ''].filter(Boolean).join(' ')}
        role={role ?? (tone === 'danger' ? 'alert' : 'status')}
        /* `-1`: alcanzable por programa, nunca por tabulador. El mensaje no es
           una parada más del recorrido; solo el sitio donde aterrizar cuando
           algo acaba de fallar. */
        tabIndex={autoFocus ? -1 : undefined}
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
};

export default Alert;
