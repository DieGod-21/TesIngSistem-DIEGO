/**
 * DashboardAside.tsx — Rail lateral del dashboard.
 *
 * Tres widgets:
 *   1. AcademicProgressCard → datos REALES del resumen de tesis (anillo + leyenda + insight).
 *   2. DeadlinesWidget      → estructura extensible; muestra estado vacío elegante
 *                             hasta que exista un endpoint de entregas.
 *   3. ActivityWidget       → línea de tiempo extensible; estado vacío elegante
 *                             hasta que exista un feed de actividad.
 *
 * Ningún dato se inventa: los widgets sin backend renderizan un placeholder
 * intencional y quedan listos para recibir props reales.
 */

import React from 'react';
import { CalendarClock, Activity, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Card, Badge } from '../ui';
import { VOCAB } from '../../config/vocabulary';
import ProgressRing from './ProgressRing';
import './dashboard-widgets.css';

// ─── 1. Progreso académico (datos reales) ────────────────────────────────

interface AcademicProgressProps {
    total: number;
    /** Cuantos NO cumplen: decide el texto interpretativo, no se imprime. */
    notApproved: number;
    pct: number;
}

export const AcademicProgressCard: React.FC<AcademicProgressProps> = ({
    total, notApproved, pct,
}) => {
    /* El texto NO repite la cifra de pendientes: ya esta en la tarjeta KPI de al
       lado, y con este pie llegaba a aparecer tres veces en la misma pantalla
       (indicador, leyenda y aqui). Interpreta el anillo, que es lo unico que
       esta columna aporta y las tarjetas no. */
    const insight =
        total === 0
            ? 'Aún no hay estudiantes registrados.'
            : pct >= 70
                ? 'La cohorte avanza por buen camino.'
                : notApproved > 0
                    ? 'Todavía hay estudiantes que no cumplen el requisito.'
                    : 'Progreso en desarrollo.';

    return (
        <Card padded className="dash-widget">
            <div className="dash-widget__head">
                <span className="ui-kicker">Progreso académico</span>
            </div>

            <div className="progress-widget">
                <ProgressRing
                    value={pct}
                    caption="aprobación"
                    ariaLabel={`Progreso de aprobación de tesis: ${pct}%`}
                />
                {/* La leyenda DESCIFRA el anillo (que color es cada cosa); no
                    repite sus cifras. Las tres que llevaba —elegibles, pendientes
                    y total— eran exactamente las tres tarjetas KPI de al lado,
                    reimpresas en cuerpo menor a 300px de distancia. */}
                <ul className="progress-legend">
                    <li className="progress-legend__row">
                        <span className="progress-legend__dot progress-legend__dot--ok" aria-hidden="true" />
                        <span className="progress-legend__label">{VOCAB.eligible}</span>
                    </li>
                    <li className="progress-legend__row">
                        <span className="progress-legend__dot progress-legend__dot--pending" aria-hidden="true" />
                        <span className="progress-legend__label">{VOCAB.notEligible}</span>
                    </li>
                </ul>
            </div>

            <p className="dash-widget__insight">
                {pct >= 70 ? <CheckCircle2 size={14} aria-hidden="true" /> : <TrendingUp size={14} aria-hidden="true" />}
                <span>{insight}</span>
            </p>
        </Card>
    );
};

// ─── 2. Próximas entregas (extensible) ───────────────────────────────────

export interface DeadlineItem {
    id: string;
    title: string;
    date: string;          // etiqueta ya formateada
    day: string;           // número de día
    month: string;         // mes corto
    urgent?: boolean;
}

export const DeadlinesWidget: React.FC<{ items?: DeadlineItem[] }> = ({ items = [] }) => (
    <Card padded className="dash-widget">
        <div className="dash-widget__head">
            <span className="ui-kicker">Próximas entregas</span>
        </div>

        {items.length === 0 ? (
            <div className="dash-widget__empty">
                <span className="dash-widget__empty-icon" aria-hidden="true">
                    <CalendarClock size={22} />
                </span>
                <p className="dash-widget__empty-title">Sin entregas programadas</p>
                <p className="dash-widget__empty-sub">
                    El calendario de hitos y entregas aparecerá aquí.
                </p>
            </div>
        ) : (
            <ul className="deadline-list">
                {items.map((d) => (
                    <li key={d.id} className="deadline-item">
                        <div className={`deadline-item__date${d.urgent ? ' deadline-item__date--urgent' : ''}`}>
                            <span className="deadline-item__month">{d.month}</span>
                            <span className="deadline-item__day">{d.day}</span>
                        </div>
                        <div className="deadline-item__body">
                            <p className="deadline-item__title">{d.title}</p>
                            <p className="deadline-item__sub">{d.date}</p>
                        </div>
                        {d.urgent && <Badge tone="warning" dot>Pronto</Badge>}
                    </li>
                ))}
            </ul>
        )}
    </Card>
);

// ─── 3. Actividad reciente (extensible) ──────────────────────────────────

export interface ActivityItem {
    id: string;
    text: React.ReactNode;
    time: string;
    tone?: 'primary' | 'success' | 'warning' | 'danger';
}

export const ActivityWidget: React.FC<{ items?: ActivityItem[] }> = ({ items = [] }) => (
    <Card padded className="dash-widget">
        <div className="dash-widget__head">
            <span className="ui-kicker">Actividad reciente</span>
        </div>

        {items.length === 0 ? (
            <div className="dash-widget__empty">
                <span className="dash-widget__empty-icon" aria-hidden="true">
                    <Activity size={22} />
                </span>
                <p className="dash-widget__empty-title">Todo tranquilo por aquí</p>
                <p className="dash-widget__empty-sub">
                    Los registros, evaluaciones y cambios recientes se listarán aquí.
                </p>
            </div>
        ) : (
            <ol className="timeline">
                {items.map((a) => (
                    <li key={a.id} className="timeline__item">
                        <span className={`timeline__dot timeline__dot--${a.tone ?? 'primary'}`} aria-hidden="true" />
                        <div className="timeline__body">
                            <p className="timeline__text">{a.text}</p>
                            <span className="timeline__time">{a.time}</span>
                        </div>
                    </li>
                ))}
            </ol>
        )}
    </Card>
);
