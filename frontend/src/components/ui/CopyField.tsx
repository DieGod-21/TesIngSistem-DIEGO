/**
 * CopyField.tsx — Un dato que se copia de un clic.
 *
 * El producto expone identificadores que el coordinador traslada
 * constantemente a otros sistemas (carné, correo). Copiarlos no debe exigir
 * seleccionar texto ni Ctrl+C: la fila entera ES el botón.
 *
 * El acuse vuelve solo (ver useCopyToClipboard). El texto accesible cambia con
 * el estado, así que un lector de pantalla también recibe la confirmación.
 */

import React from 'react';
import { Check, Copy } from 'lucide-react';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

export interface CopyFieldProps {
    /** Texto que se copia. Es también el que se muestra si no hay `children`. */
    value: string;
    /** Nombre del dato para el lector de pantalla: "Copiar carné 199012000". */
    label: string;
    /** Icono principal del dato (sobre, credencial…). Opcional. */
    icon?: React.ReactNode;
    /** Reinicia el acuse al cambiar (p. ej. el id del estudiante). */
    resetKey?: unknown;
    /** Cifras tabulares para identificadores numéricos. */
    tnum?: boolean;
    className?: string;
    children?: React.ReactNode;
}

const CopyField: React.FC<CopyFieldProps> = ({
    value, label, icon, resetKey, tnum = false, className, children,
}) => {
    const { copied, copy } = useCopyToClipboard(resetKey);

    return (
        <button
            type="button"
            className={['ui-copy', copied ? 'is-copied' : '', className ?? ''].filter(Boolean).join(' ')}
            onClick={() => copy(value)}
            aria-label={copied ? `${label} copiado` : `Copiar ${label} ${value}`}
        >
            {icon && <span className="ui-copy__icon" aria-hidden="true">{icon}</span>}
            <span className={`ui-copy__value${tnum ? ' ui-tnum' : ''}`}>{children ?? value}</span>
            <span className="ui-copy__action" aria-hidden="true">
                {copied ? <Check size={14} /> : <Copy size={14} />}
            </span>
        </button>
    );
};

export default CopyField;
