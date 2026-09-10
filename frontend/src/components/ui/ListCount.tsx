/**
 * ListCount.tsx — Cuántos elementos está enseñando esta lista.
 *
 * Un filtro que no dice cuánto dejó fuera obliga a contar a mano. Cinco
 * listados respondían de cinco formas distintas; esto la vuelve compartida.
 *
 *   sin filtro            «11 proyectos»
 *   con filtro            «3 de 11 proyectos»
 *   sin total conocido    «5 ternas»
 *
 * El último caso es deliberado: Ternas filtra en el servidor y solo recibe lo
 * que pidió, así que el total sin filtrar no está en la pantalla. Inventarlo
 * sería peor que omitirlo.
 */

import React from 'react';

export interface ListCountProps {
    /** Cuántos elementos se están enseñando ahora mismo. */
    showing: number;
    /**
     * Cuántos hay en total sin filtrar. Se omite cuando la pantalla no lo
     * sabe (filtrado en servidor): entonces solo se dice cuántos se ven.
     */
    total?: number;
    /** Nombre de la entidad: `['proyecto', 'proyectos']`. */
    noun: [singular: string, plural: string];
    className?: string;
}

const ListCount: React.FC<ListCountProps> = ({ showing, total, noun, className }) => {
    const filtrando = total !== undefined && total !== showing;
    const cifra = filtrando ? total : showing;
    const palabra = cifra === 1 ? noun[0] : noun[1];

    return (
        <p
            className={['ui-list-count', className ?? ''].filter(Boolean).join(' ')}
            /*
             * `polite`: el recuento cambia como CONSECUENCIA de escribir en el
             * buscador o pulsar un chip. Quien navega sin ver la lista se
             * entera de que el filtro hizo algo, y se entera al terminar de
             * teclear, no en mitad de la palabra.
             */
            aria-live="polite"
        >
            {filtrando ? (
                <>
                    <strong className="ui-list-count__n">{showing}</strong>
                    {' de '}
                    <span className="ui-tnum">{total}</span>
                    {` ${palabra}`}
                </>
            ) : (
                <>
                    <strong className="ui-list-count__n">{showing}</strong>
                    {` ${palabra}`}
                </>
            )}
        </p>
    );
};

export default ListCount;
