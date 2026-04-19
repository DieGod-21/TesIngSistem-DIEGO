/**
 * StatusBadge.tsx
 *
 * Badge de estado para estudiantes.
 * "Pendiente" → gris/amarillo  |  "Aprobado" → verde
 *
 * Sin dependencias externas. Estilos en students-list.css.
 */

import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';

interface StatusBadgeProps {
    approved: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ approved }) =>
    approved ? (
        <span className="sl-badge sl-badge--approved">
            <CheckCircle2 size={11} />
            Aprobado
        </span>
    ) : (
        <span className="sl-badge sl-badge--pending">
            <Clock size={11} />
            Pendiente
        </span>
    );

export default StatusBadge;
