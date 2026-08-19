/**
 * AssignmentCard.tsx — Una asignación del evaluador.
 *
 * Responde de un vistazo lo que el evaluador necesita para decidir si abre
 * esto ahora: a quién evalúa, qué proyecto, en qué panel, qué le toca a él y
 * cómo va el resto del panel.
 *
 * ── QUÉ NO ENSEÑA, Y POR QUÉ ────────────────────────────────────────────────
 *
 * No enseña «tu rol dentro de la terna» (presidente, secretario, vocal). El
 * contrato no lo tiene: `evaluadores[]` declara `nombre`, `calificacion`,
 * `comentarios` y `eval_estado`, y nada más. Poner un cargo aquí sería
 * inventarlo. Lo que sí es cierto —y es lo que de verdad se necesita— es el
 * estado de la evaluación propia, que es lo que ocupa ese sitio.
 *
 * Tampoco enlaza a la ficha del proyecto: la terna no trae `proyecto_id`, así
 * que no hay id que poner en la URL. Se enlaza a la terna, que es donde de
 * hecho se evalúa.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, HelpCircle, CalendarDays, ChevronRight } from 'lucide-react';
import { Badge } from '../../../components/ui';
import { routes } from '../../../config/routes';
import { formatLongDate } from '../../../utils/dates';
import type { Asignacion } from '../domain/assignments';

interface Props {
    asignacion: Asignacion;
}

/** Texto e icono del estado propio. Un solo sitio donde se traduce. */
const MI_ESTADO = {
    pendiente: {
        etiqueta: 'Te toca evaluar',
        icono: Clock,
        tono: 'warning' as const,
        cta: 'Evaluar',
    },
    enviada: {
        etiqueta: 'Ya la enviaste',
        icono: CheckCircle2,
        tono: 'success' as const,
        cta: 'Ver',
    },
    sin_identificar: {
        etiqueta: 'Sin confirmar',
        icono: HelpCircle,
        tono: 'neutral' as const,
        cta: 'Abrir',
    },
};

const AssignmentCard: React.FC<Props> = ({ asignacion }) => {
    const { terna, miEstado, miCalificacion, tengoBorrador, enviadas, total } = asignacion;
    const info = MI_ESTADO[miEstado];
    const Icono = info.icono;

    return (
        <li className={`asig asig--${miEstado}`}>
            <Link
                to={routes.ternaDetail(terna.id)}
                className="asig__link"
                /* El nombre accesible lleva el estado propio: quien navega por
                   lector no debería tener que abrir la terna para saber si le
                   toca a él. */
                aria-label={`${info.etiqueta}. ${terna.estudiante_nombre}, ${terna.titulo}. Terna ${terna.numero}.`}
            >
                <span className="asig__cuerpo">
                    <span className="asig__cabecera">
                        <span className="asig__estudiante">{terna.estudiante_nombre}</span>
                        <span className="asig__carnet">{terna.carnet}</span>
                    </span>

                    <span className="asig__titulo">{terna.titulo}</span>

                    <span className="asig__meta">
                        <Badge tone="neutral">Terna {terna.numero}</Badge>
                        {terna.fase && <Badge tone="info">{terna.fase}</Badge>}
                        {terna.fecha_evaluacion && (
                            <span className="asig__fecha">
                                <CalendarDays size={13} aria-hidden="true" />
                                {formatLongDate(terna.fecha_evaluacion)}
                            </span>
                        )}
                    </span>
                </span>

                <span className="asig__lado">
                    <span className={`asig__estado asig__estado--${info.tono}`}>
                        <Icono size={14} aria-hidden="true" />
                        {info.etiqueta}
                    </span>

                    {/* La calificación propia solo se enseña si existe: un cero
                        y un «todavía nada» no pueden parecer lo mismo. */}
                    {miCalificacion != null && (
                        <span className="asig__nota">
                            {tengoBorrador ? 'Borrador: ' : 'Tu nota: '}
                            <strong>{miCalificacion}</strong>
                        </span>
                    )}

                    <span className="asig__panel">
                        {enviadas} de {total} enviadas
                    </span>

                    <span className="asig__cta">
                        {info.cta}
                        <ChevronRight size={15} aria-hidden="true" />
                    </span>
                </span>
            </Link>
        </li>
    );
};

export default AssignmentCard;
