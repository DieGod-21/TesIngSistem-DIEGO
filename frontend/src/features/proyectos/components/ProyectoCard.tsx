import React from 'react';
import { Badge } from '../../../components/ui';
import type { Proyecto } from '../../../types/api';

const FASE_LABEL: Record<string, string> = {
    PG1: 'Proyecto de Graduación I',
    PG2: 'Proyecto de Graduación II',
};

interface Props {
    proyecto: Proyecto;
}

const ProyectoCard: React.FC<Props> = ({ proyecto }) => (
    <article className={`proy-card proy-card--${proyecto.fase === 'PG1' ? 'pg1' : 'pg2'}`}>
        <div className="proy-card__top">
            <Badge tone={proyecto.fase === 'PG1' ? 'primary' : 'info'}>
                {proyecto.fase}
            </Badge>
        </div>
        <h3 className="proy-card__title">{proyecto.titulo}</h3>
        {proyecto.descripcion && (
            <p className="proy-card__desc">{proyecto.descripcion}</p>
        )}
        <p className="proy-card__fase">{FASE_LABEL[proyecto.fase] ?? proyecto.fase}</p>
        {proyecto.estudiante_nombre && (
            <p className="proy-card__student">{proyecto.estudiante_nombre}</p>
        )}
    </article>
);

export default ProyectoCard;
