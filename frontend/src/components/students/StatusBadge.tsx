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
import { Badge } from '../ui';

interface StatusBadgeProps {
    approved: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ approved }) =>
    approved ? (
        <Badge tone="success">
            <CheckCircle2 size={11} aria-hidden="true" />
            Aprobado
        </Badge>
    ) : (
        <Badge tone="warning">
            <Clock size={11} aria-hidden="true" />
            Pendiente
        </Badge>
    );

export default StatusBadge;
