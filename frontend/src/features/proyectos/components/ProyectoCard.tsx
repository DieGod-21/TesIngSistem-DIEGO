import React from 'react';
import { User } from 'lucide-react';
import { Badge } from '../../../components/ui';
import type { Proyecto } from '../../../types/api';

/**
 * ProyectoCard — un trabajo de graduación en la cuadrícula.
 *
 * La tarjeta responde, en este orden: qué se propone, de quién es y en qué
 * fase está. Antes gastaba una fila entera en la píldora de fase, repetía esa
 * misma fase en texto largo justo debajo de la descripción y la separaba del
 * autor con dos divisores. Tres zonas para tres datos que caben en dos.
 */

interface Props {
    proyecto: Proyecto;
}

const ProyectoCard: React.FC<Props> = ({ proyecto }) => (
    <article className="proy-card">
        <h3 className="proy-card__title">{proyecto.titulo}</h3>

        {/* La ausencia se NOMBRA. Las tarjetas de una fila comparten alto, así
            que un proyecto sin descripción dejaba un vacío entre el título y el
            divisor del pie que se lee como «esto no cargó». Decirlo cuesta una
            línea y convierte un fallo aparente en un dato. */}
        {proyecto.descripcion?.trim()
            ? <p className="proy-card__desc">{proyecto.descripcion}</p>
            : <p className="proy-card__desc proy-card__desc--empty">Sin descripción</p>}

        {/* Pie: la persona primero (es lo que se busca al escanear), la fase
            como etiqueta al margen. Un solo divisor en toda la tarjeta. */}
        <footer className="proy-card__foot">
            {proyecto.estudiante_nombre && (
                <span className="proy-card__student">
                    <User size={13} aria-hidden="true" />
                    {/* El nombre va en su PROPIO bloque: `text-overflow` no actúa
                        sobre un nodo de texto suelto dentro de un contenedor
                        flexible, así que el nombre largo se cortaba a hueso, sin
                        puntos suspensivos que avisaran de que faltaba texto. */}
                    <span className="proy-card__student-name">{proyecto.estudiante_nombre}</span>
                </span>
            )}
            <Badge tone={proyecto.fase === 'PG1' ? 'primary' : 'info'}>
                {proyecto.fase}
            </Badge>
        </footer>
    </article>
);

export default ProyectoCard;
