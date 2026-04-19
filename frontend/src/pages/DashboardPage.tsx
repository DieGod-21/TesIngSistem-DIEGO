/**
 * DashboardPage.tsx
 *
 * Inicio — Panel de Control PG1-PG2
 * Sistema de Gestión de Proyectos de Graduación
 * Facultad de Ingeniería en Sistemas de Información
 * Universidad Mariano Gálvez de Guatemala
 *
 * Lógica de datos delegada a:
 *   - useDashboardData  → summary + pending actions + search
 *   - useStudentsDashboard → estudiantes + KPIs + filtro rápido
 *
 * TODO: Integrar API de eventos académicos del calendario semestral
 * TODO: Integrar servicio de notificaciones por correo institucional
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import {
    Plus, Users, CheckCircle2, Clock, Upload,
    AlertCircle, RefreshCw, ArrowRight, GraduationCap,
} from 'lucide-react';

import AppShell from '../layout/AppShell';
import AppFooter from '../components/AppFooter';
import KpiCard from '../components/KpiCard';
import PendingActionsTable from '../components/PendingActionsTable';
import MiniCalendar from '../components/MiniCalendar';
import FacultyResources from '../components/FacultyResources';
import StatusBadge from '../components/students/StatusBadge';

import { useDashboardData } from '../hooks/useDashboardData';
import { useStudentsDashboard } from '../hooks/useStudentsDashboard';
import { initials } from '../utils/strings';

import '../styles/dashboard.css';
import '../styles/students-list.css';   // sl-badge, sl-avatar reutilizados

// ─── Año actual dinámico ─────────────────────────────────────────────
const currentYear = new Date().getFullYear();

// ─── Skeletons ───────────────────────────────────────────────────────

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

// ─── Componente Principal ─────────────────────────────────────────────

const DashboardPage: React.FC = () => {
    const history = useHistory();

    // Datos del servicio dashboard (KPIs, acciones pendientes, deadlines)
    const { summary, tableState, searchQuery, loadSummary, loadActions } =
        useDashboardData();

    // Datos de estudiantes desde localStorage (KPIs + filtro rápido)
    const {
        studentKpis,
        filteredRecent,
        dashStudentQuery,
        setDashStudentQuery,
        dashStatusFilter,
        setDashStatusFilter,
    } = useStudentsDashboard();

    return (
        <AppShell>
            <div className="dash-body">

                {/* ── Encabezado institucional ─────────────────── */}
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
                        aria-label="Registrar nuevo estudiante de proyecto de graduación"
                    >
                        <Plus size={18} aria-hidden="true" />
                        Registrar Estudiante
                    </button>
                </div>

                {/* ── Indicadores de Gestión (KPI Cards del servicio) ── */}
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

                {/* ── Resumen de Estudiantes + Gestión Académica ── */}
                <div className="dash-quick-row">

                    {/* Resumen de estudiantes registrados (localStorage) */}
                    <section className="dash-student-kpis" aria-label="Resumen de estudiantes registrados">
                        <h2 className="dash-section-title">Estudiantes Registrados en el Sistema</h2>
                        <div className="dash-student-kpi-grid">
                            <div className="dash-skpi dash-skpi--total">
                                <GraduationCap size={18} className="dash-skpi__icon" aria-hidden="true" />
                                <div>
                                    <p className="dash-skpi__value">{studentKpis.total}</p>
                                    <p className="dash-skpi__label">Total de Expedientes</p>
                                </div>
                            </div>
                            <div className="dash-skpi dash-skpi--approved">
                                <CheckCircle2 size={18} className="dash-skpi__icon" aria-hidden="true" />
                                <div>
                                    <p className="dash-skpi__value">{studentKpis.approved}</p>
                                    <p className="dash-skpi__label">Con Aprobación</p>
                                </div>
                            </div>
                            <div className="dash-skpi dash-skpi--pending">
                                <Clock size={18} className="dash-skpi__icon" aria-hidden="true" />
                                <div>
                                    <p className="dash-skpi__value">{studentKpis.pending}</p>
                                    <p className="dash-skpi__label">Pendientes de Revisión</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Gestión Académica — acciones de acceso rápido */}
                    <section className="dash-quick-actions" aria-label="Gestión académica — accesos directos">
                        <h2 className="dash-section-title">Gestión Académica</h2>
                        <div className="dash-qa-grid">
                            <button
                                className="dash-qa-card"
                                onClick={() => history.push('/students/new')}
                                aria-label="Registrar nuevo estudiante de proyecto de graduación"
                            >
                                <Plus size={22} className="dash-qa-card__icon" aria-hidden="true" />
                                <span className="dash-qa-card__label">Registrar Estudiante</span>
                                <ArrowRight size={14} className="dash-qa-card__arrow" aria-hidden="true" />
                            </button>
                            <button
                                className="dash-qa-card"
                                onClick={() => history.push('/students')}
                                aria-label="Ver listado completo de estudiantes"
                            >
                                <Users size={22} className="dash-qa-card__icon" aria-hidden="true" />
                                <span className="dash-qa-card__label">Listado de Estudiantes</span>
                                <ArrowRight size={14} className="dash-qa-card__arrow" aria-hidden="true" />
                            </button>
                            <button
                                className="dash-qa-card"
                                onClick={() => history.push('/students/new')}
                                aria-label="Importar listado de estudiantes desde archivo"
                            >
                                <Upload size={22} className="dash-qa-card__icon" aria-hidden="true" />
                                <span className="dash-qa-card__label">Importar Listado Académico</span>
                                <ArrowRight size={14} className="dash-qa-card__arrow" aria-hidden="true" />
                            </button>
                        </div>
                    </section>
                </div>

                {/* ── Expedientes con Acciones Pendientes + Panel lateral ── */}
                <div className="dash-content-grid">
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
                                    : 'No hay expedientes con acciones pendientes en este momento.'}
                            </p>
                        </div>
                    ) : tableState.status === 'success' ? (
                        <PendingActionsTable actions={tableState.data} />
                    ) : null}

                    {/* Panel derecho */}
                    <aside className="dash-sidebar-right" aria-label="Panel de actividad académica">

                        {/* ── Actividad Reciente con filtro rápido ─── */}
                        <div className="dash-recent-card">
                            <div className="dash-recent-card__header">
                                <p className="dash-section-title">Actividad Reciente</p>
                                <button
                                    className="dash-recent-card__link"
                                    onClick={() => history.push('/students')}
                                    aria-label="Ver listado completo de estudiantes"
                                >
                                    Ver todos
                                </button>
                            </div>
                            {/* Filtro rápido */}
                            <div className="dash-recent-filter">
                                <input
                                    type="text"
                                    className="dash-recent-filter__input"
                                    placeholder="Buscar estudiante…"
                                    value={dashStudentQuery}
                                    onChange={(e) => setDashStudentQuery(e.target.value)}
                                    aria-label="Filtrar actividad reciente por nombre o carné"
                                />
                                <div className="dash-recent-filter__tabs" role="group" aria-label="Filtrar por estado">
                                    {(['all', 'approved', 'pending'] as const).map((v) => (
                                        <button
                                            key={v}
                                            className={`dash-recent-filter__tab${dashStatusFilter === v ? ' dash-recent-filter__tab--active' : ''}`}
                                            onClick={() => setDashStatusFilter(v)}
                                            aria-pressed={dashStatusFilter === v}
                                            title={v === 'all' ? 'Todos' : v === 'approved' ? 'Aprobados' : 'Pendientes'}
                                        >
                                            {v === 'all' ? 'Todos' : v === 'approved' ? '✓' : '○'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Lista */}
                            <ul className="dash-recent-list" aria-label="Estudiantes con actividad reciente">
                                {filteredRecent.length === 0 && (
                                    <li className="dash-recent-list__empty" role="status">
                                        Sin registros que coincidan con el filtro
                                    </li>
                                )}
                                {filteredRecent.map((s) => (
                                    <li key={s.id} className="dash-recent-item">
                                        <div className="sl-avatar sl-avatar--sm" aria-hidden="true">
                                            {initials(s.nombreCompleto)}
                                        </div>
                                        <div className="dash-recent-item__info">
                                            <p className="dash-recent-item__name">{s.nombreCompleto}</p>
                                            <p className="dash-recent-item__carnet">{s.carnetId} · {s.phaseDescription ?? s.phaseName ?? s.faseAcademica}</p>
                                        </div>
                                        <StatusBadge approved={s.approved} />
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Mini Calendario y Recursos de Facultad */}
                        <MiniCalendar />
                        {summary.status === 'success' && (
                            <FacultyResources resources={summary.data.resources} />
                        )}
                    </aside>
                </div>
            </div>

            {/* Footer institucional */}
            <AppFooter />
        </AppShell>
    );
};

export default DashboardPage;
