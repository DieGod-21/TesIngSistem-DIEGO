import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { TernaResumen } from '../../../types/api';

interface Props {
    terna: TernaResumen;
    onSelect: (id: number) => void;
}

const ESTADO_LABEL: Record<TernaResumen['estado'], string> = {
    pendiente:   'Pendiente',
    en_progreso: 'En progreso',
    completada:  'Completada',
};

const TernaCard: React.FC<Props> = ({ terna, onSelect }) => {
    const total = terna.total_evaluadores ?? 0;
    const enviadas = terna.evaluaciones_enviadas ?? 0;
    const pct = total > 0 ? Math.round((enviadas / total) * 100) : 0;

    return (
        <button
            type="button"
            className="terna-card"
            onClick={() => onSelect(terna.id)}
            aria-label={`Abrir terna ${terna.numero}: ${terna.estudiante_nombre}`}
        >
            <div className="terna-card__head">
                <span className="terna-card__numero">Terna #{String(terna.numero).padStart(2, '0')}</span>
                <span className={`terna-card__estado estado-${terna.estado}`}>
                    {ESTADO_LABEL[terna.estado]}
                </span>
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
