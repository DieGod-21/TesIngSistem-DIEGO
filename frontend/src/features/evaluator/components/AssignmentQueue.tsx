/**
 * AssignmentQueue.tsx — La lista de asignaciones, con TODOS sus estados.
 *
 * Este componente existe sobre todo para que no vuelva a ocurrir lo que
 * ocurría: una vista que solo sabía dibujar «cargando» y «lleno», y que ante
 * cualquier otra cosa se quedaba con el esqueleto puesto indefinidamente.
 *
 * Aquí los cuatro finales son explícitos y excluyentes:
 *
 *     cargando  →  esqueleto con la forma de las tarjetas reales
 *     error     →  mensaje en lenguaje de usuario + reintentar
 *     vacío     →  «no tienes nada asignado» (que es un final, no una espera)
 *     lleno     →  la lista
 */

import React from 'react';
import { Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import { Button, Skeleton, EmptyState } from '../../../components/ui';
import AssignmentCard from './AssignmentCard';
import type { Asignacion } from '../domain/assignments';

interface Props {
    titulo: string;
    subtitulo?: string;
    asignaciones: Asignacion[] | null;
    cargando: boolean;
    error: string | null;
    onReintentar: () => void;
    /** Texto del estado vacío: cambia según se listen todas o solo pendientes. */
    vacioTitulo: string;
    vacioTexto: string;
}

/**
 * Filas del esqueleto.
 *
 * Tres, y no ocho como en la cola del coordinador: el reparto habitual de un
 * evaluador son dos o tres paneles, no la cohorte entera. Reservar ocho huecos
 * encogería la página de golpe al llegar los datos.
 */
const FILAS_ESQUELETO = 3;

const AssignmentQueue: React.FC<Props> = ({
    titulo, subtitulo, asignaciones, cargando, error, onReintentar, vacioTitulo, vacioTexto,
}) => (
    <section className="asig-cola" aria-labelledby="asig-cola-tit">
        <header className="asig-cola__head">
            <h2 id="asig-cola-tit" className="asig-cola__tit">{titulo}</h2>
            {subtitulo && <p className="asig-cola__sub">{subtitulo}</p>}
        </header>

        {cargando && (
            <ul className="asig-lista" aria-busy="true" aria-label="Cargando tus asignaciones…">
                {Array.from({ length: FILAS_ESQUELETO }).map((_, i) => (
                    <li key={i} className="asig asig--esqueleto">
                        <div className="asig__cuerpo">
                            <Skeleton height={17} width="45%" />
                            <Skeleton height={15} width="70%" />
                            <Skeleton height={20} width="35%" />
                        </div>
                        <div className="asig__lado">
                            <Skeleton height={20} width={110} />
                            <Skeleton height={14} width={90} />
                        </div>
                    </li>
                ))}
            </ul>
        )}

        {!cargando && error && (
            <div className="asig-error" role="alert">
                <AlertCircle size={18} aria-hidden="true" />
                <div>
                    <p className="asig-error__tit">No se pudo cargar tu trabajo</p>
                    <p className="asig-error__msg">{error}</p>
                </div>
                <Button variant="secondary" onClick={onReintentar}>
                    <RefreshCw size={15} aria-hidden="true" /> Reintentar
                </Button>
            </div>
        )}

        {!cargando && !error && asignaciones?.length === 0 && (
            <EmptyState
                icon={<Inbox size={26} />}
                title={vacioTitulo}
                description={vacioTexto}
            />
        )}

        {!cargando && !error && asignaciones && asignaciones.length > 0 && (
            <ul className="asig-lista">
                {asignaciones.map((a) => (
                    <AssignmentCard key={a.terna.id} asignacion={a} />
                ))}
            </ul>
        )}
    </section>
);

export default AssignmentQueue;
