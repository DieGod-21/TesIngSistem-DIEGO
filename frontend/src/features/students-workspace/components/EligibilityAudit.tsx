/**
 * EligibilityAudit.tsx — Aviso de elegibilidad sin respaldo.
 *
 * Aparece SOLO cuando el servidor se contradice consigo mismo: cuando declara
 * elegible a alguien y, en la misma respuesta, no adjunta las notas que
 * sostienen ese veredicto. En una cohorte sana este componente no se dibuja.
 *
 * Es deliberadamente un aviso y no una corrección. El producto no recalcula la
 * elegibilidad —esa autoridad es del backend—, pero tampoco puede repetir un
 * número que la respuesta que lo trae desmiente. Quien decide es el
 * coordinador, y para decidir necesita ver de quién se trata.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Alert } from '../../../components/ui';
import { routes } from '../../../config/routes';
import { describirObservacion } from '../domain/eligibility';
import type { AuditoriaElegibilidad } from '../domain/eligibility';
import '../styles/eligibility-audit.css';

/** Cuántos se enseñan antes de plegar el resto. */
const VISIBLES = 6;

interface Props {
    auditoria: AuditoriaElegibilidad | null;
}

const EligibilityAudit: React.FC<Props> = ({ auditoria }) => {
    const [desplegado, setDesplegado] = useState(false);

    if (!auditoria || !auditoria.hayObservaciones) return null;

    const { observados, declarados, sustentados } = auditoria;
    const mostrados = desplegado ? observados : observados.slice(0, VISIBLES);
    const restantes = observados.length - mostrados.length;

    return (
        <Alert
            tone="warning"
            className="elig-audit"
            icon={<ShieldAlert size={18} />}
            title={
                observados.length === 1
                    ? 'Un expediente figura como elegible sin respaldo'
                    : `${observados.length} expedientes figuran como elegibles sin respaldo`
            }
        >
            <p className="elig-audit__lead">
                El servidor declara {declarados} elegible{declarados !== 1 ? 's' : ''} y adjunta las
                notas que lo sostienen en {sustentados}. {observados.length === 1 ? 'El restante' : 'Los restantes'}{' '}
                aparece{observados.length === 1 ? '' : 'n'} en la lista oficial, pero su expediente
                individual no cumple el requisito.
            </p>

            <ul className="elig-audit__list">
                {mostrados.map((o) => (
                    <li key={o.carnet} className="elig-audit__row">
                        <Link
                            className="elig-audit__link"
                            to={routes.studentsSearch(o.carnet)}
                            /* El nombre accesible incluye el motivo: quien navega
                               por lector de pantalla no debería tener que abrir el
                               expediente para saber por qué está en esta lista. */
                            aria-label={`${o.nombre}, carné ${o.carnet}: ${describirObservacion(o)}. Abrir en el padrón.`}
                        >
                            <span className="elig-audit__nombre">{o.nombre}</span>
                            <span className="elig-audit__carnet">{o.carnet}</span>
                        </Link>
                        <span className="elig-audit__motivo">{describirObservacion(o)}</span>
                    </li>
                ))}
            </ul>

            {restantes > 0 && (
                <button
                    type="button"
                    className="elig-audit__mas"
                    onClick={() => setDesplegado(true)}
                >
                    Ver {restantes} más
                </button>
            )}
        </Alert>
    );
};

export default EligibilityAudit;
