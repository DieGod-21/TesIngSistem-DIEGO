/**
 * DashboardPage.tsx
 *
 * Inicio — Panel de Control PG1-PG2
 * Los KPIs vienen de GET /api/tesis/resumen. El trabajo pendiente NO se pide
 * aquí: es la misma cola priorizada del workspace (deriveWorkQueue).
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { Plus, AlertCircle, RefreshCw, Users } from 'lucide-react';

import AppFooter from '../components/AppFooter';
import KpiCard from '../components/KpiCard';
import { Button, Card, Skeleton, EmptyState } from '../components/ui';
import { formatLongDate } from '../utils/dates';
import { AcademicProgressCard } from '../components/dashboard/DashboardAside';
import WorkQueue from '../features/students-workspace/components/WorkQueue';
import { useStudentsPipeline } from '../features/students-workspace/hooks/useStudentsPipeline';
import { resolveWorkItemHref } from '../features/students-workspace/navigation';

import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../context/AuthContext';

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
/* Tres esqueletos, tres tarjetas: el placeholder debe medir lo mismo que el
   contenido real para que la carga no provoque un salto de layout. */
const KpiSkeleton: React.FC = () => (
    <div className="dash-kpi-grid" aria-busy="true" aria-label="Cargando indicadores…">
        {[0, 1, 2].map((i) => (
            <div key={i} className="kpi-card kpi-skeleton">
                <Skeleton size="short" />
                <Skeleton size="large" />
                <Skeleton size="medium" />
            </div>
        ))}
    </div>
);

const DashboardPage: React.FC = () => {
    const history = useHistory();
    const { user, capabilities } = useAuth();
    const { summary, loadSummary } = useDashboardData();

    // MISMA fuente de trabajo que el workspace de estudiantes: un solo motor de
    // priorización, un solo vocabulario, una sola caché (los datasets son
    // compartidos, así que además queda templada para la pantalla siguiente).
    const pipeline = useStudentsPipeline(capabilities.canViewReports);

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
                            {formatLongDate(new Date())} · Facultad de Ingeniería · Ciclo {currentYear}
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
                    const cards = summary.data.kpis
                        .filter((k) => k.id !== PROGRESS_KPI_ID)
                        .map((k) => (KPI_LABEL[k.id] ? { ...k, label: KPI_LABEL[k.id] } : k));

                    return (
                        <section aria-labelledby="dash-cohort-title">
                            {/* El porcentaje de la cohorte se mostraba AQUÍ y otra vez
                                en el anillo de «Progreso académico»: el mismo 52 % dos
                                veces en cuerpo grande, en la misma pantalla. Se queda
                                en el anillo, que es donde va acompañado de su
                                composición (elegibles / pendientes / total). De paso,
                                este era el único `ui-section-head` del producto que
                                cargaba una métrica; el resto son título + subtítulo. */}
                            <div className="ui-section-head">
                                <div className="ui-section-head__text">
                                    <h2 id="dash-cohort-title" className="ui-section-head__title">
                                        Estado de la cohorte
                                    </h2>
                                    <p className="ui-section-head__subtitle">
                                        Avance de PG1–PG2 este ciclo. Toca un indicador para ver el detalle.
                                    </p>
                                </div>
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
                        {/* Una sola cola de trabajo en todo el producto.
                            Antes esta zona listaba "no elegibles" desde otro
                            endpoint, sin priorizar y con una acción idéntica en
                            todas las filas: una segunda respuesta, más pobre, a
                            la misma pregunta que responde el workspace. */}
                        {capabilities.canViewReports ? (
                            <WorkQueue
                                items={pipeline.result ? pipeline.result.items : null}
                                capabilities={capabilities}
                                loading={pipeline.loading}
                                error={pipeline.error}
                                onOpen={(item) => history.push(resolveWorkItemHref(item))}
                            />
                        ) : (
                            <section aria-labelledby="dash-work-title">
                                <div className="ui-section-head">
                                    <div className="ui-section-head__text">
                                        <h2 id="dash-work-title" className="ui-section-head__title">
                                            Tu trabajo
                                        </h2>
                                    </div>
                                </div>
                                {/* Un evaluador no coordina el padrón: su trabajo
                                    son las ternas que tiene asignadas. */}
                                <EmptyState
                                    icon={<Users size={26} />}
                                    title={`Tus ${VOCAB.committeePlural.toLowerCase()} asignadas`}
                                    description="Las evaluaciones que te corresponden se gestionan desde el módulo de ternas."
                                    action={
                                        <Button variant="secondary" onClick={() => history.push('/ternas')}>
                                            Ir a {VOCAB.committeePlural}
                                        </Button>
                                    }
                                />
                            </section>
                        )}
                    </div>

                    <aside className="dash-aside" aria-label="Progreso académico">
                        {progress ? (
                            <AcademicProgressCard
                                total={progress.total}
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
