import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { TernaResumen } from '../../../types/api';
import { Badge } from '../../../components/ui';
import { TERNA_ESTADO_LABEL, TERNA_ESTADO_TONE } from '../../../utils/ternaStatus';

interface Props {
    terna: TernaResumen;
    onSelect: (id: number) => void;
    /** Recién creada: se señala un momento y se lleva a la vista. */
    destacado?: boolean;
}

const TernaCard: React.FC<Props> = ({ terna, onSelect, destacado = false }) => {
    const total = terna.total_evaluadores ?? 0;
    const enviadas = terna.evaluaciones_enviadas ?? 0;
    const pct = total > 0 ? Math.round((enviadas / total) * 100) : 0;

    return (
        <button
            type="button"
            ref={(el) => { if (destacado && el) el.scrollIntoView({ block: 'nearest' }); }}
            /* `ui-scroll-anchor`: la cabecera es pegajosa y, si la terna recién
               creada queda por encima de la ventana, «lo más cercano» es el
               borde de arriba, o sea debajo de la cabecera. */
            className={`terna-card ui-scroll-anchor${destacado ? ' terna-card--nueva' : ''}`}
            onClick={() => onSelect(terna.id)}
            aria-label={`Abrir terna ${terna.numero}: ${terna.estudiante_nombre}`}
        >
            <div className="terna-card__head">
                <span className="terna-card__numero">Terna #{String(terna.numero).padStart(2, '0')}</span>
                <Badge tone={TERNA_ESTADO_TONE[terna.estado]}>
                    {TERNA_ESTADO_LABEL[terna.estado]}
                </Badge>
            </div>

            <h3 className="terna-card__title">{terna.titulo || 'Sin título'}</h3>

            <p className="terna-card__student">
                {terna.estudiante_nombre}
                {' · '}
                <span className="terna-card__carnet">{terna.carnet}</span>
            </p>

            <div className="terna-card__progress" aria-label={`Progreso: ${enviadas} de ${total} evaluaciones enviadas`}>
                <span>{enviadas}/{total} evaluaciones</span>
                <div className="terna-card__progress-bar">
                    <div className="terna-card__progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <ChevronRight size={16} aria-hidden="true" />
            </div>
        </button>
    );
};

export default TernaCard;
