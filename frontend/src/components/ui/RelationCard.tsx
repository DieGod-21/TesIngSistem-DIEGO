/**
 * RelationCard.tsx — Salto a una entidad relacionada.
 *
 * El dominio es una cadena (estudiante → proyecto → terna) y cada pantalla de
 * detalle enseñaba su eslabón dejando al usuario buscar los otros dos a mano.
 * Esta primitiva es el puente, y es la MISMA en las tres pantallas para que el
 * gesto se aprenda una vez.
 *
 * Cuando la relación no existe NO desaparece: se queda apagada nombrando la
 * ausencia. Un hueco donde antes hubo una tarjeta se lee como «esto no cargó»;
 * «Sin terna asignada» se lee como un estado del sistema, que es lo que es.
 *
 * La afordancia es explícita —superficie propia, cursor, flecha, foco visible—
 * porque un `onClick` invisible sobre un bloque de texto no se descubre.
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface RelationCardProps {
    /** Qué tipo de cosa hay al otro lado: «Estudiante», «Proyecto»… */
    kicker: string;
    icon: React.ReactNode;
    /** Nombre de la entidad destino; `null` cuando la relación no existe. */
    title: string | null;
    /** Segunda línea: carné, fase, estado… */
    meta?: React.ReactNode;
    /** Destino. Sin él la tarjeta queda inerte aunque haya título. */
    onOpen?: () => void;
    /** Texto cuando no hay relación. */
    emptyText?: string;
    /** Se muestra mientras se resuelve el vínculo. */
    loading?: boolean;
    className?: string;
}

const RelationCard: React.FC<RelationCardProps> = ({
    kicker,
    icon,
    title,
    meta,
    onOpen,
    emptyText = 'Sin asignar',
    loading = false,
    className,
}) => {
    const interactiva = Boolean(title && onOpen);

    const cuerpo = (
        <>
            <span className="ui-relation__icon" aria-hidden="true">{icon}</span>
            <span className="ui-relation__text">
                <span className="ui-relation__kicker">{kicker}</span>
                <span className={`ui-relation__title${title ? '' : ' ui-relation__title--empty'}`}>
                    {loading ? 'Buscando…' : (title ?? emptyText)}
                </span>
                {title && meta && <span className="ui-relation__meta">{meta}</span>}
            </span>
            {interactiva && (
                <ChevronRight size={16} className="ui-relation__chevron" aria-hidden="true" />
            )}
        </>
    );

    const clases = ['ui-relation', interactiva ? 'ui-relation--interactive' : '', className ?? '']
        .filter(Boolean).join(' ');

    if (!interactiva) {
        return <div className={clases}>{cuerpo}</div>;
    }

    return (
        <button type="button" className={clases} onClick={onOpen}>
            {cuerpo}
        </button>
    );
};

export default RelationCard;
