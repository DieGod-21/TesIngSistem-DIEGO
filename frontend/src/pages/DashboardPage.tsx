/**
 * DashboardPage.tsx
 *
 * Inicio — Panel de Control PG1-PG2
 * Sólo consume endpoints reales (GET /api/tesis/resumen,
 * GET /api/tesis/reprobados, GET /api/estudiantes).
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import {
    Plus, Users, Upload,
    AlertCircle, RefreshCw, ArrowRight,
} from 'lucide-react';

import AppFooter from '../components/AppFooter';
import KpiCard from '../components/KpiCard';
import PendingActionsTable from '../components/PendingActionsTable';

import { useDashboardData } from '../hooks/useDashboardData';

import '../styles/dashboard.css';
import '../styles/students-list.css';

const currentYear = new Date().getFullYear();

const KpiSkeleton: React.FC = () => (
    <div className="dash-kpi-grid" aria-busy="true" aria-label="Cargando indicadores…">
        {[0, 1, 2, 3].map((i) => (
            <div key={i} className="kpi-card kpi-skeleton">
                <div className="skeleton skeleton--line skeleton--short" />
                <div className="skeleton skeleton--line skeleton--large" />
                <div className="skeleton skeleton--line skeleton--medium" />
            </div>
        ))}
    </div>
);

const TableSkeleton: React.FC = () => (
    <div className="dash-table-card" aria-busy="true" aria-label="Cargando expedientes…">
        <div className="dash-table-card__header">
            <div className="skeleton skeleton--line skeleton--medium" />
        </div>
        <div className="dash-skeleton-rows">
            {[0, 1, 2].map((i) => (
                <div key={i} className="dash-skeleton-row">
                    <div className="skeleton skeleton--circle" />
                    <div className="dash-skeleton-row__lines">
                        <div className="skeleton skeleton--line skeleton--medium" />
                        <div className="skeleton skeleton--line skeleton--short" />
                    </div>
                    <div className="skeleton skeleton--line skeleton--medium" />
                    <div className="skeleton skeleton--line skeleton--short" />
                </div>
            ))}
        </div>
    </div>
);

const DashboardPage: React.FC = () => {
    const history = useHistory();
    const { summary, tableState, searchQuery, loadSummary, loadActions } =
        useDashboardData();

    return (
        <>
        <div className="dash-body">
                <div className="dash-page-header">
                    <div>
                        <h1 className="dash-page-title">Inicio — Panel de Control PG1-PG2</h1>
                        <p className="dash-page-subtitle">
                            Seguimiento de Proyectos de Graduación · Facultad de Ingeniería · Ciclo {currentYear}
                        </p>
                    </div>
                    <button
                        className="dash-btn-primary"
                        onClick={() => history.push('/students/new')}
                        aria-label="Registrar nuevo estudiante"
                    >
                        <Plus size={18} aria-hidden="true" />
                        Registrar Estudiante
                    </button>
                </div>

                {(summary.status === 'loading' || summary.status === 'idle') && <KpiSkeleton />}
                {summary.status === 'error' && (
                    <div className="dash-error-block" role="alert">
                        <AlertCircle size={20} className="dash-error-block__icon" aria-hidden="true" />
                        <p className="dash-error-block__msg">{summary.message}</p>
                        <button className="dash-error-block__btn" onClick={loadSummary}>
                            <RefreshCw size={14} aria-hidden="true" /> Reintentar
                        </button>
                    </div>
                )}
                {summary.status === 'success' && (
                    <section aria-label="Indicadores de gestión académica">
                        <div className="dash-kpi-grid">
                            {summary.data.kpis.map((kpi) => (
                                <KpiCard key={kpi.id} data={kpi} />
                            ))}
                        </div>
                    </section>
                )}

                <section className="dash-quick-actions" aria-label="Gestión académica">
                    <h2 className="dash-section-title">Gestión Académica</h2>
                    <div className="dash-qa-grid">
                        <button
                            className="dash-qa-card"
                            onClick={() => history.push('/students/new')}
                            aria-label="Registrar nuevo estudiante"
                        >
                            <Plus size={22} className="dash-qa-card__icon" aria-hidden="true" />
                            <span className="dash-qa-card__label">Registrar Estudiante</span>
                            <ArrowRight size={14} className="dash-qa-card__arrow" aria-hidden="true" />
                        </button>
                        <button
                            className="dash-qa-card"
                            onClick={() => history.push('/students')}
                            aria-label="Listado de estudiantes"
                        >
                            <Users size={22} className="dash-qa-card__icon" aria-hidden="true" />
                            <span className="dash-qa-card__label">Listado de Estudiantes</span>
                            <ArrowRight size={14} className="dash-qa-card__arrow" aria-hidden="true" />
                        </button>
                        <button
                            className="dash-qa-card"
                            onClick={() => history.push('/ternas')}
                            aria-label="Ver ternas de evaluación"
                        >
                            <Upload size={22} className="dash-qa-card__icon" aria-hidden="true" />
                            <span className="dash-qa-card__label">Ternas de Evaluación</span>
                            <ArrowRight size={14} className="dash-qa-card__arrow" aria-hidden="true" />
                        </button>
                    </div>
                </section>

                <div className="dash-content-grid dash-content-grid--full">
                    {tableState.status === 'loading' ? (
                        <TableSkeleton />
                    ) : tableState.status === 'error' ? (
                        <div className="dash-error-block" role="alert">
                            <AlertCircle size={20} className="dash-error-block__icon" aria-hidden="true" />
                            <p className="dash-error-block__msg">{tableState.message}</p>
                            <button className="dash-error-block__btn"
                                onClick={() => loadActions(searchQuery)}>
                                <RefreshCw size={14} aria-hidden="true" /> Reintentar
                            </button>
                        </div>
                    ) : tableState.status === 'success' && tableState.data.length === 0 ? (
                        <div className="dash-empty-block" role="status">
                            <p className="dash-empty-block__msg">
                                {searchQuery
                                    ? <><span>Sin expedientes para </span><strong>"{searchQuery}"</strong></>
                                    : 'No hay estudiantes reprobados en este momento.'}
                            </p>
                        </div>
                    ) : tableState.status === 'success' ? (
                        <PendingActionsTable actions={tableState.data} />
                    ) : null}
                </div>
            </div>

            <AppFooter />
        </>
    );
};

export default DashboardPage;
