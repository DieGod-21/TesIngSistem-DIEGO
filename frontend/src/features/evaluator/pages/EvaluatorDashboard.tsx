/**
 * EvaluatorDashboard.tsx — Inicio del EVALUADOR.
 *
 * ── LA PREGUNTA QUE CONTESTA ────────────────────────────────────────────────
 *
 *     ¿Qué tengo que hacer yo?
 *
 * No «cómo va la cohorte»: eso es trabajo del coordinador y aquí no pinta nada.
 * Este panel no pide —ni puede pedir— el padrón, el resumen de tesis ni el
 * reporte global. Sus dos únicas fuentes son `GET /api/ternas`, que el servidor
 * ya acota a las ternas asignadas, y el detalle de cada una.
 *
 * ── MISMO MATERIAL, DISTINTO CONTENIDO ──────────────────────────────────────
 *
 * Comparte con el panel del coordinador la portada con aurora, las fichas de
 * cristal, la rejilla y los tokens: es el mismo producto y debe notarse. Lo que
 * cambia es de qué hablan. Donde el coordinador lee «elegibles / no elegibles /
 * padrón», el evaluador lee «te toca / enviadas / asignadas», y las cifras son
 * suyas, no de terceros.
 */

import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { ArrowRight, AlertCircle, RefreshCw, Info } from 'lucide-react';

import AppFooter from '../../../components/AppFooter';
import CohortTiles from '../../../components/dashboard/CohortTiles';
import KpiSkeleton from '../../../components/dashboard/KpiSkeleton';
import { Button, Card, Alert } from '../../../components/ui';
import { formatLongDate } from '../../../utils/dates';
import ProgressRing from '../../../components/dashboard/ProgressRing';
import AssignmentQueue from '../components/AssignmentQueue';
import { useEvaluatorWorkspace } from '../hooks/useEvaluatorWorkspace';
import { useAuth } from '../../../context/AuthContext';
import { routes } from '../../../config/routes';
import type { KpiData } from '../../../services/dashboardService';

import '../../../styles/dashboard.css';
import '../styles/evaluator.css';

const currentYear = new Date().getFullYear();

/** Saludo según la hora local. Mismo criterio que el panel del coordinador. */
function saludo(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
}

const EvaluatorDashboard: React.FC = () => {
    const history = useHistory();
    const { user, usuarioId } = useAuth();
    const { state, reload } = useEvaluatorWorkspace(usuarioId);

    const nombre = (user?.nombre ?? '').trim();
    /*
     * «Ing. Roberto Méndez» → «Roberto». Se descarta el tratamiento porque el
     * saludo es personal, no protocolario; sin esto el panel abría con
     * «Buenos días, Ing.», que no saluda a nadie.
     */
    const primerNombre = nombre
        .split(' ')
        .find((p) => !/^(ing\.?|inga\.?|lic\.?|licda\.?|dr\.?|dra\.?|mtro\.?|mtra\.?)$/i.test(p))
        ?? 'Evaluador';

    const trabajo = state.status === 'success' ? state.data : null;

    const kpis: KpiData[] = useMemo(() => {
        const pendientes = trabajo?.pendientes.length ?? 0;
        const enviadas = trabajo?.enviadas.length ?? 0;
        const total = trabajo?.asignaciones.length ?? 0;

        return [
            {
                id: 'ev-pendientes',
                label: 'Te toca evaluar',
                value: String(pendientes),
                trend: '', trendPositive: false,
                description: pendientes === 1 ? 'Una evaluación por enviar' : 'Evaluaciones por enviar',
                iconName: 'Clock',
                // Rojo SOLO si hay trabajo: «0 pendientes» no es una alarma.
                iconVariant: pendientes > 0 ? 'red' : 'blue',
                navigateTo: pendientes > 0 ? `${routes.ternas()}?mias=pendiente` : undefined,
            },
            {
                id: 'ev-enviadas',
                label: 'Ya enviadas',
                value: String(enviadas),
                trend: '', trendPositive: true,
                description: 'Evaluaciones cerradas por ti',
                iconName: 'CheckCircle',
                iconVariant: 'blue',
                navigateTo: enviadas > 0 ? `${routes.ternas()}?mias=enviada` : undefined,
            },
            {
                id: 'ev-asignadas',
                label: 'Ternas asignadas',
                value: String(total),
                trend: '', trendPositive: true,
                description: 'Paneles en los que participas',
                iconName: 'ClipboardList',
                iconVariant: 'blue',
                navigateTo: total > 0 ? routes.ternas() : undefined,
            },
        ];
    }, [trabajo]);

    /** Siguiente pendiente: destino del botón principal de la portada. */
    const siguiente = trabajo?.pendientes[0] ?? null;

    const total = trabajo?.asignaciones.length ?? 0;
    const enviadas = trabajo?.enviadas.length ?? 0;
    const pct = total > 0 ? Math.round((enviadas / total) * 100) : 0;

    return (
        <>
            <div className="dash-body">
                <section className="ui-hero dash-hero dash-hero--work" aria-labelledby="ev-saludo">
                    <div className="dash-welcome">
                        <div className="dash-welcome__text">
                            <p className="dash-hero__kicker">Panel de evaluación · PG1–PG2</p>
                            <h1 id="ev-saludo" className="dash-hero__title">
                                {saludo()}, <strong>{primerNombre}</strong>
                            </h1>
                            <p className="dash-hero__subtitle">
                                {formatLongDate(new Date())} · Facultad de Ingeniería · Ciclo {currentYear}
                            </p>
                        </div>

                        {/* La acción principal es CONTINUAR, no crear: un
                            evaluador no da de alta nada. Si no debe ninguna
                            evaluación, no hay botón que ofrecer —y no ofrecer
                            ninguno es la respuesta correcta, no un hueco. */}
                        {siguiente && (
                            <div className="dash-hero__actions">
                                <Button
                                    variant="contrast"
                                    onClick={() => history.push(routes.ternaDetail(siguiente.terna.id))}
                                    aria-label={`Continuar con la evaluación de ${siguiente.terna.estudiante_nombre}`}
                                >
                                    Continuar evaluación
                                    <ArrowRight size={18} aria-hidden="true" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="dash-cohorte" aria-labelledby="ev-carga-tit">
                        <p className="dash-cohorte__tit" id="ev-carga-tit">
                            Tu carga de evaluación
                            <span className="dash-cohorte__hint"> · toca un indicador para filtrar tus ternas</span>
                        </p>

                        {(state.status === 'loading' || state.status === 'idle') && <KpiSkeleton />}

                        {state.status === 'success' && (
                            <CohortTiles
                                kpis={kpis}
                                groupLabel="Tu carga de evaluación"
                                destinoHint="Ver estas ternas."
                            />
                        )}

                        {state.status === 'error' && (
                            <div className="dash-cohorte__error" role="alert">
                                <AlertCircle size={18} aria-hidden="true" />
                                <div>
                                    <p className="dash-cohorte__error-tit">No se pudo cargar tu carga de trabajo</p>
                                    <p className="dash-cohorte__error-msg">{state.message}</p>
                                </div>
                                <Button variant="contrast" onClick={reload}>
                                    <RefreshCw size={15} aria-hidden="true" /> Reintentar
                                </Button>
                            </div>
                        )}
                    </div>
                </section>

                {/*
                 * El servidor no dice cuál de las filas de `evaluadores[]` es la
                 * del usuario. En vez de adivinarlo comparando nombres —que
                 * acabaría enseñando la nota de otra persona como propia—, el
                 * producto lo dice. No ofrece «Reintentar»: no es un fallo de
                 * carga, los datos llegaron bien; es un límite del contrato.
                 */}
                {trabajo?.identidadIndeterminada && (
                    <Alert
                        tone="info"
                        icon={<Info size={18} />}
                        title="No podemos marcar cuáles evaluaciones son tuyas"
                        className="ev-aviso"
                    >
                        <p>
                            El servidor devuelve los evaluadores de cada terna sin un identificador,
                            así que no es posible distinguir tu fila de la de tus compañeros. Tus
                            ternas siguen siendo estas y puedes evaluarlas con normalidad: al abrir
                            una verás tu propia evaluación.
                        </p>
                    </Alert>
                )}

                <div className="dash-flagship-grid">
                    <div className="dash-flagship-main">
                        <AssignmentQueue
                            titulo="Tu trabajo"
                            /* «evaluación(es)» no lo escribe nadie que hable
                               español. Son dos casos y se resuelven los dos. */
                            subtitulo={
                                trabajo && trabajo.pendientes.length > 0
                                    ? trabajo.pendientes.length === 1
                                        ? 'Una evaluación por enviar'
                                        : `${trabajo.pendientes.length} evaluaciones por enviar`
                                    : 'Ternas en las que participas'
                            }
                            asignaciones={trabajo?.asignaciones ?? null}
                            cargando={state.status === 'loading' || state.status === 'idle'}
                            error={state.status === 'error' ? state.message : null}
                            onReintentar={reload}
                            vacioTitulo="No tienes ternas asignadas"
                            vacioTexto="Cuando la coordinación te asigne a un panel de evaluación, aparecerá aquí."
                        />
                    </div>

                    <aside className="dash-aside" aria-label="Tu avance">
                        {state.status === 'error' ? (
                            <Card padded className="dash-widget">
                                <span className="ui-kicker">Tu avance</span>
                                <p className="dash-widget__unavailable">
                                    No disponible mientras no cargue tu trabajo.
                                </p>
                            </Card>
                        ) : trabajo ? (
                            <Card padded className="dash-widget">
                                <div className="dash-widget__head">
                                    <span className="ui-kicker">Tu avance</span>
                                </div>
                                <div className="progress-widget">
                                    <ProgressRing
                                        value={pct}
                                        caption="enviadas"
                                        ariaLabel={`Has enviado ${enviadas} de ${total} evaluaciones asignadas: ${pct}%`}
                                    />
                                    <ul className="progress-legend">
                                        <li className="progress-legend__row">
                                            <span className="progress-legend__dot progress-legend__dot--ok" aria-hidden="true" />
                                            <span className="progress-legend__label">Enviadas</span>
                                        </li>
                                        <li className="progress-legend__row">
                                            <span className="progress-legend__dot progress-legend__dot--pending" aria-hidden="true" />
                                            <span className="progress-legend__label">Te tocan</span>
                                        </li>
                                    </ul>
                                </div>
                                <p className="dash-widget__insight">
                                    <span>
                                        {total === 0
                                            ? 'Todavía no participas en ningún panel.'
                                            : pct === 100
                                                ? 'Has enviado todas tus evaluaciones.'
                                                : 'Te quedan evaluaciones por enviar.'}
                                    </span>
                                </p>
                            </Card>
                        ) : (
                            <Card padded className="dash-widget" aria-busy="true" aria-label="Cargando tu avance…">
                                <span className="ui-kicker">Tu avance</span>
                                <div className="progress-widget">
                                    <div className="ev-skel-ring" />
                                </div>
                            </Card>
                        )}
                    </aside>
                </div>
            </div>

            <AppFooter />
        </>
    );
};

export default EvaluatorDashboard;
