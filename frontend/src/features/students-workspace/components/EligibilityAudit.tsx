/**
 * EligibilityAudit.tsx — «Expedientes por revisar».
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
 * ── TRABAJO PENDIENTE, NO AVERÍA ────────────────────────────────────────
 *
 * Probado con el producto contra el servidor real: esto se seguía leyendo como
 * «algo se rompió». La causa no era el tono ámbar sino la CANTIDAD de ámbar. El
 * bloque entero iba relleno de color de aviso, y una superficie de media columna
 * teñida de ámbar es el lenguaje de un fallo, por mucho que el texto hable de
 * trabajo. En el mismo panel, justo debajo, la cola de trabajo dice exactamente
 * lo mismo —«esto te toca»— sobre una tarjeta neutra, y nadie la confunde con
 * una avería.
 *
 * Así que el ámbar deja de ser la SUPERFICIE y pasa a ser el ACENTO: vive en el
 * distintivo y en la cifra, que juntos ocupan una fracción del bloque. El resto
 * es la misma tarjeta que usa el resto del panel. La semántica de aviso no se
 * toca —sigue sin `role="alert"`, sigue ofreciendo «Revisar» y no «Reintentar»,
 * porque los datos llegaron bien y son ellos los que no cuadran—, pero ahora la
 * forma dice lo mismo que las palabras.
 *
 * Cada fila es un destino, no una nota: se recorre y se pulsa como las de la
 * cola de trabajo, con el mismo realce al apuntar y el mismo anillo de foco.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, ArrowRight, ChevronRight } from 'lucide-react';
import { routes } from '../../../config/routes';
import { buildFocusUrl } from '../lens/lens';
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
        <section className="elig-audit" aria-labelledby="elig-audit-tit">
            <header className="elig-audit__head">
                {/*
                 * El distintivo es la ÚNICA pieza de color pleno del bloque, y
                 * repite el mismo tinte que la cola de trabajo usa para este
                 * tipo de tarea. Quien ya conoce la cola reconoce el asunto
                 * antes de leer la cifra.
                 */}
                <span className="elig-audit__chip" aria-hidden="true">
                    <ClipboardCheck size={18} />
                </span>

                <div className="elig-audit__heading">
                    {/*
                     * LA CIFRA PRIMERO, y no dentro del título.
                     *
                     * El dato que decide si esto se atiende hoy o la semana que
                     * viene se ve, no se lee. Sigue leyéndose como una sola
                     * frase de corrido para quien usa lector de pantalla:
                     * «4 expedientes por revisar».
                     */}
                    <p className="elig-audit__titulo" id="elig-audit-tit">
                        <span className="elig-audit__cifra">{observados.length}</span>
                        <span className="elig-audit__rotulo">
                            {uno ? 'expediente por revisar' : 'expedientes por revisar'}
                        </span>
                    </p>

                    <p className="elig-audit__lead">
                        {uno ? 'Consta' : 'Constan'} como elegible{uno ? '' : 's'} para tesis, pero
                        {uno ? ' le' : ' les'} falta alguna de las notas obligatorias.
                    </p>
                </div>

                {/* La acción vive JUNTO A LA CIFRA, no al final del bloque.
                    Al pie ocupaba una banda entera para sí sola y alargaba el
                    panel lo suficiente como para empujar la cola de trabajo
                    —lo demás que hay que hacer hoy— fuera de la pantalla. Aquí
                    responde «qué hago» en el mismo golpe de vista que «cuántos
                    son», que es la pregunta que la precede.
                    Es REVISAR, no reintentar: los datos llegaron bien. Lleva al
                    padrón acotado a los elegibles, que es donde estos
                    expedientes se comparan con el resto y se marcan. */}
                <Link
                    className="elig-audit__cta ui-btn ui-btn--primary ui-btn--sm"
                    to={`${routes.students()}?status=approved`}
                >
                    Revisar en el padrón
                    <ArrowRight size={15} aria-hidden="true" className="elig-audit__cta-arrow" />
                </Link>
            </header>

            {/*
             * La lista NO se pliega por defecto, aunque un bloque más compacto
             * lo agradecería: los nombres son la parte accionable —cada uno
             * abre a esa persona en el padrón— y esconderlos dejaría el aviso
             * informando de trabajo sin ofrecer forma de empezarlo. Lo que se
             * pliega es la cola, a partir de los primeros seis.
             */}
            <ul className="elig-audit__list">
                {mostrados.map((o) => (
                    <li key={o.carnet} className="elig-audit__row">
                        <Link
                            className="elig-audit__link"
                            to={buildFocusUrl({
                                estudianteId: o.estudianteId,
                                carnet: o.carnet,
                                posicionPadron: o.posicionPadron,
                            })}
                            /* El nombre accesible incluye el motivo: quien navega
                               por lector de pantalla no debería tener que abrir el
                               expediente para saber por qué está en esta lista. */
                            aria-label={`${o.nombre}, carné ${o.carnet}: ${describirObservacion(o)}. Abrir en el padrón.`}
                        >
                            <span className="elig-audit__ident">
                                <span className="elig-audit__nombre">{o.nombre}</span>
                                <span className="elig-audit__carnet">{o.carnet}</span>
                            </span>
                            <span className="elig-audit__motivo">{describirObservacion(o)}</span>
                            <ChevronRight size={16} className="elig-audit__chevron" aria-hidden="true" />
                        </Link>
                    </li>
                ))}
            </ul>

            {observados.length > VISIBLES && (
                /*
                 * Alterna, no despliega y desaparece.
                 *
                 * Antes el botón se desmontaba al pulsarlo —`restantes` pasaba
                 * a 0— y con el teclado eso deja el foco en el <body>: quien
                 * había llegado tabulando perdía el sitio y tenía que recorrer
                 * la página otra vez. Al conservarlo, el foco permanece sobre
                 * el control que se acaba de usar, y de paso la lista se puede
                 * volver a plegar.
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
        </section>
    );
};

export default EligibilityAudit;
