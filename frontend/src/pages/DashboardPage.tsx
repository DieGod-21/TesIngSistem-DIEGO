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
    AlertCircle, RefreshCw, ArrowRight, CheckCircle2,
} from 'lucide-react';

import AppFooter from '../components/AppFooter';
import KpiCard from '../components/KpiCard';
import PendingActionsTable from '../components/PendingActionsTable';
import { Button, Card, Skeleton, EmptyState } from '../components/ui';
import { AcademicProgressCard } from '../components/dashboard/DashboardAside';

import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../context/AuthContext';
import { THESIS_MIN_GRADE } from '../config/apiConfig';
import type { KpiData } from '../services/dashboardService';

import '../styles/dashboard.css';
import '../styles/students-list.css';

const currentYear = new Date().getFullYear();

/** Deriva las cifras del widget de progreso desde los KPIs reales del resumen. */
function extractProgress(kpis: KpiData[]) {
    const num = (id: string) => {
        const k = kpis.find((x) => x.id === id);
        return k ? parseInt(k.value, 10) || 0 : 0;
    };
    const total = num('kpi-total');
    const approved = num('kpi-approved');
    const notApproved = num('kpi-pending');
    const completion = kpis.find((k) => k.id === 'kpi-completion');
    const pct = completion?.progressValue ?? (total > 0 ? Math.round((approved / total) * 100) : 0);
    return { total, approved, notApproved, pct };
}

/** Saludo según la hora local, en español. */
function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
}

/** Fecha larga capitalizada (es-ES). */
function formatToday(): string {
    const s = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
}

const KpiSkeleton: React.FC = () => (
    <div className="dash-kpi-grid" aria-busy="true" aria-label="Cargando indicadores…">
        {[0, 1, 2, 3].map((i) => (
            <div key={i} className="kpi-card kpi-skeleton">
                <Skeleton size="short" />
                <Skeleton size="large" />
                <Skeleton size="medium" />
            </div>
        ))}
    </div>
);

const TableSkeleton: React.FC = () => (
    <div className="dash-table-card" aria-busy="true" aria-label="Cargando expedientes…">
        <div className="dash-table-card__header">
            <Skeleton size="medium" />
        </div>
        <div className="dash-skeleton-rows">
            {[0, 1, 2].map((i) => (
                <div key={i} className="dash-skeleton-row">
                    <Skeleton variant="circle" />
                    <div className="dash-skeleton-row__lines">
                        <Skeleton size="medium" />
                        <Skeleton size="short" />
                    </div>
                    <Skeleton size="medium" />
                    <Skeleton size="short" />
                </div>
            ))}
        </div>
    </div>
);

const DashboardPage: React.FC = () => {
    const history = useHistory();
    const { user } = useAuth();
    const { summary, tableState, searchQuery, loadSummary, loadActions } =
        useDashboardData();

    const firstName = (user?.nombre ?? '').trim().split(' ')[0] || 'Coordinador';
    const progress = summary.status === 'success' ? extractProgress(summary.data.kpis) : null;

    return (
        <>
        <div className="dash-body">
                <section className="ui-hero dash-hero" aria-label="Bienvenida">
                    <div>
                        <p className="dash-hero__kicker">Panel de Control · PG1–PG2</p>
                        <h1 className="dash-hero__title">
                            {getGreeting()}, <strong>{firstName}</strong>
                        </h1>
                        <p className="dash-hero__subtitle">
                            {formatToday()} · Facultad de Ingeniería · Ciclo {currentYear}
                        </p>
                    </div>
                    <div className="dash-hero__actions">
                        <Button
                            variant="contrast"
                            onClick={() => history.push('/students/new')}
                            aria-label="Registrar nuevo estudiante"
                        >
                            <Plus size={18} aria-hidden="true" />
                            Registrar Estudiante
                        </Button>
                    </div>
                </section>

                {(summary.status === 'loading' || summary.status === 'idle') && <KpiSkeleton />}
                {summary.status === 'error' && (
                    <EmptyState
                        tone="danger"
                        icon={<AlertCircle size={26} />}
                        title="No se pudieron cargar los indicadores"
                        description={summary.message}
                        action={
                            <Button variant="secondary" onClick={() => loadSummary()}>
                                <RefreshCw size={16} aria-hidden="true" /> Reintentar
                            </Button>
                        }
                    />
                )}
                {summary.status === 'success' && (
                    <section aria-label="Indicadores de gestión académica">
                        <div className="ui-section-head">
                            <div className="ui-section-head__text">
                                <h2 className="ui-section-head__title">Estado de la cohorte</h2>
                                <p className="ui-section-head__subtitle">
                                    Una lectura rápida de cómo avanza PG1–PG2 este ciclo. Toca un indicador para ver el detalle.
                                </p>
                            </div>
                        </div>
                        <div className="dash-kpi-grid">
                            {summary.data.kpis.map((kpi) => (
                                <KpiCard key={kpi.id} data={kpi} />
                            ))}
                        </div>
                    </section>
                )}

                <div className="dash-flagship-grid">
                    <div className="dash-flagship-main">
                        <section className="dash-quick-actions" aria-label="Gestión académica">
                            <div className="ui-section-head">
                                <div className="ui-section-head__text">
                                    <h2 className="ui-section-head__title">Gestión Académica</h2>
                                    <p className="ui-section-head__subtitle">
                                        Accesos directos a las tareas más frecuentes de la coordinación.
                                    </p>
                                </div>
                            </div>
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

                        <section aria-label="Expedientes que requieren atención">
                            <div className="ui-section-head">
                                <div className="ui-section-head__text">
                                    <h2 className="ui-section-head__title">Requieren atención</h2>
                                    <p className="ui-section-head__subtitle">
                                        Estudiantes que aún no cumplen el requisito de tesis: alguna nota por debajo de {THESIS_MIN_GRADE} o pendiente de registrar.
                                    </p>
                                </div>
                            </div>
                            {tableState.status === 'loading' ? (
                                <TableSkeleton />
                            ) : tableState.status === 'error' ? (
                                <EmptyState
                                    tone="danger"
                                    icon={<AlertCircle size={26} />}
                                    title="No se pudieron cargar los expedientes"
                                    description={tableState.message}
                                    action={
                                        <Button variant="secondary" onClick={() => loadActions(searchQuery)}>
                                            <RefreshCw size={16} aria-hidden="true" /> Reintentar
                                        </Button>
                                    }
                                />
                            ) : tableState.status === 'success' && tableState.data.length === 0 ? (
                                <EmptyState
                                    tone={searchQuery ? 'neutral' : 'success'}
                                    icon={searchQuery ? <AlertCircle size={26} /> : <CheckCircle2 size={26} />}
                                    title={searchQuery ? `Sin expedientes para "${searchQuery}"` : 'Todo al día'}
                                    description={searchQuery
                                        ? 'Prueba con otro término de búsqueda.'
                                        : 'No hay estudiantes reprobados. Los expedientes con pendientes aparecerán aquí.'}
                                />
                            ) : tableState.status === 'success' ? (
                                <PendingActionsTable actions={tableState.data} />
                            ) : null}
                        </section>
                    </div>

                    <aside className="dash-aside" aria-label="Progreso académico">
                        {progress ? (
                            <AcademicProgressCard
                                total={progress.total}
                                approved={progress.approved}
                                notApproved={progress.notApproved}
                                pct={progress.pct}
                            />
                        ) : (
                            <Card padded className="dash-widget" aria-busy="true">
                                <span className="ui-kicker">Progreso académico</span>
                                <Skeleton size="large" />
                                <Skeleton size="medium" />
                            </Card>
                        )}
                    </aside>
                </div>
            </div>

            <AppFooter />
        </>
    );
};

export default DashboardPage;
