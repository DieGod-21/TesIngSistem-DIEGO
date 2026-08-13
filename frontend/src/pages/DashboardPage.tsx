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
import CohortTiles from '../components/dashboard/CohortTiles';
import { Button, Card, Skeleton, EmptyState } from '../components/ui';
import { formatLongDate } from '../utils/dates';
import { AcademicProgressCard } from '../components/dashboard/DashboardAside';
import WorkQueue from '../features/students-workspace/components/WorkQueue';
import EligibilityAudit from '../features/students-workspace/components/EligibilityAudit';
import { useStudentsPipeline } from '../features/students-workspace/hooks/useStudentsPipeline';
import { resolveWorkItemHref } from '../features/students-workspace/navigation';

import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../context/AuthContext';

import { VOCAB } from '../config/vocabulary';
import { routes } from '../config/routes';
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
const TOTAL_KPI_ID = 'kpi-total';

/**
 * Reconcilia la tarjeta «Estudiantes» con el padrón.
 *
 * `/api/tesis/resumen` devuelve `total_estudiantes` = aprobados + reprobados,
 * es decir SOLO quienes ya tienen ambas notas registradas. La tarjeta lo
 * mostraba bajo el rótulo «Estudiantes registrados en PG1/PG2» y al pulsarla
 * llevaba al padrón completo: con el conjunto de demostración anunciaba 21 y
 * abría una lista de 27, y contra el servidor real anuncia 31 y abre 32. El
 * número de la puerta no coincidía con lo que hay detrás.
 *
 * El padrón ya está cargado en esta pantalla —lo usa la cola de trabajo—, así
 * que corregirlo no cuesta ninguna petición. Si por lo que sea no llegó, se
 * conserva el valor del resumen antes que dejar la tarjeta vacía.
 */
function conciliarTotal(kpi: KpiData, padronTotal: number | null): KpiData {
    if (padronTotal == null) return kpi;
    return { ...kpi, value: String(padronTotal), description: 'En el padrón de PG1–PG2' };
}

/** Deriva las cifras del widget de progreso desde los KPIs reales del resumen. */
function extractProgress(kpis: KpiData[], padronTotal: number | null) {
    const num = (id: string) => {
        const k = kpis.find((x) => x.id === id);
        return k ? parseInt(k.value, 10) || 0 : 0;
    };
    const total = padronTotal ?? num(TOTAL_KPI_ID);
    const approved = num('kpi-approved');
    const notApproved = num('kpi-pending');
    /*
     * El porcentaje se recalcula sobre el padrón en vez de usar el
     * `porcentaje_aprobacion` del servidor, que es «de los evaluados, cuántos
     * pasaron». Esa cifra responde otra pregunta: con seis expedientes sin
     * notas, el anillo llegaba a declarar la cohorte al 96 % cuando aún faltaba
     * evaluar a una cuarta parte. Aquí el anillo dice cuánto falta para
     * terminar, que es lo que la sección promete.
     */
    const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { total, approved, notApproved, pct };
}

/** Saludo según la hora local, en español. */
function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
}

/*
 * Esqueleto de los indicadores.
 *
 * MEDIDO: con dos líneas medía 94px frente a los 101px de la ficha real, y al
 * llegar los datos toda la página daba un salto de 7px. Son tres filas —rótulo,
 * cifra y descripción—, las mismas que tiene la ficha, con los mismos tamaños;
 * así el hueco reservado es exactamente el que se va a ocupar.
 */
const KpiSkeleton: React.FC = () => (
    <div className="cohort-tiles" aria-busy="true" aria-label="Cargando indicadores…">
        {[0, 1, 2].map((i) => (
            <div key={i} className="cohort-tile">
                {/* Alturas explícitas = las de las tres líneas reales (rótulo
                    11px, cifra ~28px, descripción 12px). Con las alturas por
                    defecto del esqueleto la ficha se pasaba 13px. */}
                <Skeleton height={16} width="55%" />
                <Skeleton height={28} width="40%" />
                <Skeleton height={16} width="80%" />
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
    // Tamaño real del padrón, el mismo que cuenta la lente «Todos» del listado.
    const padronTotal = pipeline.lensCounts?.all ?? null;
    const progress = summary.status === 'success' ? extractProgress(summary.data.kpis, padronTotal) : null;

    return (
        <>
        <div className="dash-body">
                {/*
                  * DOS ZONAS, no una.
                  *
                  * El ciclo anterior metió los indicadores en la portada para que
                  * el trabajo pendiente subiera, y se pasó de frenada: el saludo
                  * y las cifras quedaron pegados y la bienvenida acabó pareciendo
                  * una ficha más. Aquí siguen compartiendo la aurora —que es lo
                  * que permite que las fichas sean de cristal de verdad— pero son
                  * zonas separadas y jerarquizadas:
                  *
                  *     bienvenida  →  (regla)  →  indicadores
                  *
                  * La bienvenida no lleva chrome de tarjeta: no hay borde, ni
                  * fondo, ni caja. Por eso no puede confundirse con un indicador,
                  * aunque compartan superficie.
                  */}
                <section className="ui-hero dash-hero dash-hero--work" aria-labelledby="dash-saludo">
                    <div className="dash-welcome">
                        <div className="dash-welcome__text">
                            <p className="dash-hero__kicker">Panel de Control · PG1–PG2</p>
                            <h1 id="dash-saludo" className="dash-hero__title">
                                {getGreeting()}, <strong>{firstName}</strong>
                            </h1>
                            <p className="dash-hero__subtitle">
                                {formatLongDate(new Date())} · Facultad de Ingeniería · Ciclo {currentYear}
                            </p>
                        </div>
                        <div className="dash-hero__actions">
                            <Button
                                variant="contrast"
                                onClick={() => history.push(routes.studentNew())}
                                aria-label="Registrar nuevo estudiante"
                            >
                                <Plus size={18} aria-hidden="true" />
                                Registrar Estudiante
                            </Button>
                        </div>
                    </div>

                    <div className="dash-cohorte" aria-labelledby="dash-cohorte-tit">
                        <p className="dash-cohorte__tit" id="dash-cohorte-tit">
                            Estado de la cohorte
                            <span className="dash-cohorte__hint"> · toca un indicador para ver el detalle</span>
                        </p>

                        {(summary.status === 'loading' || summary.status === 'idle') && <KpiSkeleton />}
                        {summary.status === 'success' && (
                            <CohortTiles
                                kpis={summary.data.kpis
                                    .filter((k) => k.id !== PROGRESS_KPI_ID)
                                    .map((k) => (KPI_LABEL[k.id] ? { ...k, label: KPI_LABEL[k.id] } : k))
                                    .map((k) => (k.id === TOTAL_KPI_ID ? conciliarTotal(k, padronTotal) : k))}
                            />
                        )}
                        {/* El error de los indicadores se resuelve DENTRO de su
                            zona: sacarlo fuera dejaba la portada anunciando una
                            sección vacía y el aviso huérfano más abajo. */}
                        {summary.status === 'error' && (
                            <div className="dash-cohorte__error" role="alert">
                                <AlertCircle size={18} aria-hidden="true" />
                                <div>
                                    <p className="dash-cohorte__error-tit">No se pudieron cargar los indicadores</p>
                                    <p className="dash-cohorte__error-msg">{summary.message}</p>
                                </div>
                                <Button variant="contrast" onClick={() => loadSummary()}>
                                    <RefreshCw size={15} aria-hidden="true" /> Reintentar
                                </Button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Comenta la cifra de elegibles que acaba de leerse arriba, y
                    solo aparece cuando el servidor se contradice a sí mismo. */}
                <EligibilityAudit auditoria={pipeline.auditoria} />

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
                            /*
                             * MEDIDO: este hueco valía 163px y la tarjeta real
                             * ocupa 267px, así que al llegar los datos la
                             * columna crecía 104px de golpe. La tarjeta es un
                             * anillo con dos filas de leyenda y un pie: el
                             * esqueleto reserva esa misma forma —círculo,
                             * leyenda, pie— en vez de dos rayas sueltas.
                             */
                            <Card padded className="dash-widget" aria-busy="true" aria-label="Cargando progreso académico…">
                                <span className="ui-kicker">Progreso académico</span>
                                {/* La tarjeta real pone el anillo y la leyenda EN FILA
                                    (.progress-widget es flex). Apilarlos aquí hacía el
                                    hueco 76px más alto que el contenido. */}
                                <div className="progress-widget">
                                    {/* 140px: el diámetro que dibuja ProgressRing. */}
                                    <Skeleton variant="circle" width={140} height={140} />
                                    <div className="dash-widget__skel-legend">
                                        <Skeleton height={14} width="70%" />
                                        <Skeleton height={14} width="60%" />
                                    </div>
                                </div>
                                <Skeleton height={14} width="85%" />
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
