/**
 * EligibilityAudit.tsx — «Expedientes que necesitan revisión».
 *
 * Aparece SOLO cuando el estado de elegibilidad de alguien no cuadra con las
 * notas que tiene registradas. En una cohorte sana este componente no se dibuja.
 *
 * ── VERDAD DE INGENIERÍA ≠ LENGUAJE DE USUARIO ──────────────────────────
 *
 * Por dentro esto detecta que dos endpoints del backend dan veredictos opuestos
 * sobre la misma persona. Esa frase es CIERTA y no debe aparecer en pantalla:
 * quien lee coordina graduaciones, no mantiene el servidor. Lo que necesita
 * saber es que hay cuatro expedientes cuyo estado no cuadra, quiénes son y qué
 * les falta. La causa técnica queda en el código —aquí y en `eligibility.ts`—,
 * donde sirve a quien puede arreglarla.
 *
 * ── NO ES UN ERROR DEL SISTEMA ──────────────────────────────────────────
 *
 * Y la diferencia se nota en la interacción, no solo en el tono: un error
 * ofrece «Reintentar», porque la hipótesis es que algo falló al cargar. Esto
 * ofrece «Revisar»: los datos llegaron bien y son ellos los que no cuadran.
 * Reintentar aquí no arreglaría nada, así que no se ofrece. Por eso tampoco usa
 * el tono `danger` ni `role="alert"`: no interrumpe, informa de trabajo.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
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

    const { observados } = auditoria;
    const mostrados = desplegado ? observados : observados.slice(0, VISIBLES);
    const restantes = observados.length - mostrados.length;
    const uno = observados.length === 1;

    return (
        <Alert
            tone="warning"
            className="elig-audit"
            icon={<ClipboardCheck size={18} />}
            title={
                uno
                    ? 'Un expediente necesita revisión'
                    : `${observados.length} expedientes necesitan revisión`
            }
        >
            <p className="elig-audit__lead">
                {uno ? 'Este expediente aparece' : 'Estos expedientes aparecen'} como
                elegible{uno ? '' : 's'} para tesis, pero {uno ? 'le' : 'les'} falta alguna de las
                notas obligatorias. Conviene confirmar{uno ? 'lo' : 'los'} antes de convocar
                una terna.
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

            <div className="elig-audit__pie">
                {observados.length > VISIBLES && (
                    /*
                     * Alterna, no despliega y desaparece.
                     *
                     * Antes el botón se desmontaba al pulsarlo —`restantes`
                     * pasaba a 0— y con el teclado eso deja el foco en el
                     * <body>: quien había llegado tabulando perdía el sitio y
                     * tenía que recorrer la página otra vez. Al conservarlo, el
                     * foco permanece sobre el control que se acaba de usar, y
                     * de paso la lista se puede volver a plegar.
                     */
                    <button
                        type="button"
                        className="elig-audit__mas"
                        aria-expanded={desplegado}
                        onClick={() => setDesplegado((v) => !v)}
                    >
                        {desplegado ? 'Ver menos' : `Ver ${restantes} más`}
                    </button>
                )}
                {/* La acción es REVISAR, no reintentar: los datos llegaron bien.
                    Lleva al padrón acotado a los elegibles, que es donde estos
                    expedientes se comparan con el resto y se marcan. */}
                <Link className="elig-audit__cta" to={`${routes.students()}?status=approved`}>
                    Revisar en el padrón
                </Link>
            </div>
        </Alert>
    );
};

export default EligibilityAudit;
