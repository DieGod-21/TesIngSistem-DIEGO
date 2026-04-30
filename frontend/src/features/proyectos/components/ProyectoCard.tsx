import React from 'react';
import type { Proyecto } from '../../../types/api';

const FASE_LABEL: Record<string, string> = {
    PG1: 'Proyecto de Graduación I',
    PG2: 'Proyecto de Graduación II',
};

interface Props {
    proyecto: Proyecto;
}

const ProyectoCard: React.FC<Props> = ({ proyecto }) => (
    <article className="proy-card">
        <div className="proy-card__top">
            <span className={`proy-badge proy-badge--${proyecto.fase.toLowerCase()}`}>
                {proyecto.fase}
            </span>
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
