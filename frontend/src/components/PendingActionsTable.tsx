/**
 * PendingActionsTable.tsx
 *
 * Tabla de acciones pendientes del coordinador.
 * Muestra avatar con iniciales, nombre, carné, proyecto, fase,
 * tipo de acción y fecha límite.
 * Los datos vienen de dashboardService — sin data quemada aquí.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import type { PendingAction } from '../services/dashboardService';

interface PendingActionsTableProps {
    actions: PendingAction[];
}

const PendingActionsTable: React.FC<PendingActionsTableProps> = ({ actions }) => {
    const history = useHistory();

    return (
        <section className="dash-table-card">
            <div className="dash-table-card__header">
                <h4 className="dash-table-card__title">Acciones Pendientes</h4>
                <button
                    type="button"
                    className="dash-table-card__link"
                    onClick={() => history.push('/students')}
                >
                    Ver todos
                </button>
            </div>

            <div className="dash-table-wrapper">
                <table className="dash-table">
                    <thead className="dash-table__head">
                        <tr>
                            <th className="dash-table__th">Estudiante</th>
                            <th className="dash-table__th">Proyecto / Fase</th>
                            <th className="dash-table__th">Acción</th>
                            <th className="dash-table__th">Límite</th>
                        </tr>
                    </thead>
                    <tbody>
                        {actions.map((row) => (
                            <tr key={row.id} className="dash-table__row">
                                {/* Estudiante */}
                                <td className="dash-table__td">
                                    <div className="dash-table__student">
                                        <div
                                            className={`dash-avatar dash-avatar--${row.avatarVariant}`}
                                            aria-hidden="true"
                                        >
                                            {row.avatarInitials}
                                        </div>
                                        <div>
                                            <p className="dash-table__student-name">{row.studentName}</p>
                                            <p className="dash-table__student-id">{row.studentId}</p>
                                        </div>
                                    </div>
                                </td>

                                {/* Proyecto / Fase */}
                                <td className="dash-table__td">
                                    <p className="dash-table__project">{row.projectTitle}</p>
                                    <span className={`dash-badge dash-badge--phase-${row.phase.toLowerCase()}`}>
                                        {row.phase}
                                    </span>
                                </td>

                                {/* Acción */}
                                <td className="dash-table__td">
                                    <span
                                        className={`dash-badge dash-badge--status dash-badge--${row.actionVariant}`}
                                    >
                                        {row.actionLabel}
                                    </span>
                                </td>

                                {/* Límite */}
                                <td className="dash-table__td">
                                    <span
                                        className={`dash-table__deadline${row.deadlineUrgent ? ' dash-table__deadline--urgent' : ''}`}
                                    >
                                        {row.deadline}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default PendingActionsTable;
