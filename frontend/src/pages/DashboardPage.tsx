/**
 * DashboardPage.tsx
 *
 * Inicio — Panel de Control PG1-PG2
 * Sólo consume endpoints reales (GET /api/tesis/resumen,
 * GET /api/tesis/reprobados, GET /api/estudiantes).
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { Plus, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

import AppFooter from '../components/AppFooter';
import KpiCard from '../components/KpiCard';
import PendingActionsTable from '../components/PendingActionsTable';
import { Button, Card, Skeleton, EmptyState } from '../components/ui';
import { AcademicProgressCard } from '../components/dashboard/DashboardAside';

import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../context/AuthContext';
import { THESIS_MIN_GRADE } from '../config/apiConfig';
import { VOCAB } from '../config/vocabulary';
import type { KpiData } from '../services/dashboardService';

import '../styles/dashboard.css';
import '../styles/students-list.css';

const currentYear = new Date().getFullYear();

/**
 * Vocabulario canónico de los KPIs.
 *
 * Las etiquetas nacen en `dashboardService` (deuda: son texto de interfaz
 * viviendo en la capa de datos). Como los servicios están congelados, se
 * reetiquetan aquí, en presentación, para que el nombre de la tarjeta que se
 * pulsa coincida con el nombre del filtro al que se llega.
 */
const KPI_LABEL: Record<string, string> = {
    'kpi-approved': VOCAB.eligible,
    'kpi-pending':  VOCAB.notEligible,
};

/**
 * "Completación" no es un indicador accionable: es `aprobados / total`, una
 * reformulación de las otras dos tarjetas. Era además la única sin destino, en
 * una sección cuyo subtítulo promete "toca un indicador para ver el detalle".
 * Se saca de la rejilla y pasa a ser el progreso de la propia sección.
 */
const PROGRESS_KPI_ID = 'kpi-completion';

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
                {summary.status === 'success' && (() => {
                    const completion = summary.data.kpis.find((k) => k.id === PROGRESS_KPI_ID);
                    const cards = summary.data.kpis
                        .filter((k) => k.id !== PROGRESS_KPI_ID)
                        .map((k) => (KPI_LABEL[k.id] ? { ...k, label: KPI_LABEL[k.id] } : k));

                    return (
                        <section aria-labelledby="dash-cohort-title">
                            <div className="ui-section-head">
                                <div className="ui-section-head__text">
                                    <h2 id="dash-cohort-title" className="ui-section-head__title">
                                        Estado de la cohorte
                                    </h2>
                                    <p className="ui-section-head__subtitle">
                                        Avance de PG1–PG2 este ciclo. Toca un indicador para ver el detalle.
                                    </p>
                                </div>
                                {completion?.progressValue != null && (
                                    <div className="dash-completion">
                                        <span className="dash-completion__value ui-tnum">
                                            {completion.value}
                                        </span>
                                        <span className="dash-completion__label">
                                            {completion.description}
                                        </span>
                                        <div
                                            className="dash-completion__track"
                                            role="progressbar"
                                            aria-valuenow={completion.progressValue}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-label={`Completación de la cohorte: ${completion.value}`}
                                        >
                                            <div
                                                className="dash-completion__fill"
                                                style={{ width: `${completion.progressValue}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="dash-kpi-grid">
                                {cards.map((kpi) => (
                                    <KpiCard key={kpi.id} data={kpi} />
                                ))}
                            </div>
                        </section>
                    );
                })()}

                <div className="dash-flagship-grid">
                    <div className="dash-flagship-main">
                        {/* El nombre accesible se toma del propio título: no puede
                            divergir de lo que se ve en pantalla. */}
                        <section aria-labelledby="dash-pending-title">
                            <div className="ui-section-head">
                                <div className="ui-section-head__text">
                                    <h2 id="dash-pending-title" className="ui-section-head__title">
                                        {VOCAB.notEligible}
                                    </h2>
                                    <p className="ui-section-head__subtitle">
                                        Aún no cumplen el requisito de tesis: nota por debajo de {THESIS_MIN_GRADE} o pendiente de registrar.
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
