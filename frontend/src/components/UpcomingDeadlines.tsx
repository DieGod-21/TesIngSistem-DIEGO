/**
 * UpcomingDeadlines.tsx
 *
 * Lista de próximas entregas con bloque de fecha (mes + número de día).
 * Los datos vienen de dashboardService.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import type { Deadline } from '../services/dashboardService';

interface UpcomingDeadlinesProps {
    deadlines: Deadline[];
}

const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({ deadlines }) => {
    const history = useHistory();
    return (
        <section className="dash-deadlines">
            <h4 className="dash-deadlines__title">Próximas Entregas</h4>

            <ul className="dash-deadlines__list">
                {deadlines.map((item) => (
                    <li key={item.id} className="dash-deadlines__item">
                        {/* Bloque de fecha */}
                        <div className="dash-deadlines__date-box" aria-label={`${item.month} ${item.day}`}>
                            <span className="dash-deadlines__month">{item.month}</span>
                            <span className="dash-deadlines__day">{item.day}</span>
                        </div>

                        {/* Descripción */}
                        <div className="dash-deadlines__info">
                            <p className="dash-deadlines__event-title">{item.title}</p>
                            <p className="dash-deadlines__event-sub">{item.subtitle}</p>
                        </div>
                    </li>
                ))}
            </ul>

            <button className="dash-deadlines__btn" onClick={() => history.push('/calendar')}>
                Gestionar Calendario
            </button>
        </section>
    );
};

export default UpcomingDeadlines;
