/**
 * TernaDetailPage.tsx
 *
 * Detalle de una terna: estudiante, proyecto, evaluadores y formulario de evaluación.
 * - Calcula la elegibilidad de tesis en frontend a partir de las notas del carnet.
 * - Permite al evaluador autenticado guardar borrador / enviar evaluación.
 * - El admin puede reabrir evaluaciones enviadas.
 */

import React from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { ChevronLeft, FileText, GraduationCap } from 'lucide-react';
import ThesisStatusBadge from '../../../components/thesis/ThesisStatusBadge';
import EvaluationForm from '../components/EvaluationForm';
import { useTernaDetalle } from '../hooks/useTernaDetalle';
import type { EvaluadorTerna } from '../../../types/api';
import '../styles/ternas.css';

const ESTADO_LABEL = {
    pendiente:   'Pendiente',
    en_progreso: 'En progreso',
    completada:  'Completada',
} as const;

const RESOLUCION_LABEL = {
    aprueba_tesis: 'Aprueba tesis',
    aprueba_curso: 'Aprueba curso',
    reprobado:     'Reprobado',
    pendiente:     'Pendiente',
} as const;

const TernaDetailPage: React.FC = () => {
    const history = useHistory();
    const { id } = useParams<{ id: string }>();
    const ternaId = Number(id);
    const { terna, eligibility, loading, error, reload } = useTernaDetalle(
        Number.isFinite(ternaId) ? ternaId : null,
    );

    return (
        <div className="ternas-page">
                <button
                    type="button"
                    className="eval-btn eval-btn--secondary"
                    onClick={() => history.push('/ternas')}
                    style={{ alignSelf: 'flex-start' }}
                >
                    <ChevronLeft size={16} aria-hidden="true" />
                    Volver a Ternas
                </button>

                {loading && <div className="tloading">Cargando terna…</div>}
                {!loading && error && <div className="terror" role="alert">{error}</div>}

                {!loading && !error && terna && (
                    <>
                        <header className="ternas-page__header">
                            <h1 className="ternas-page__title">
                                Terna #{String(terna.numero).padStart(2, '0')}{' '}
                                <span className={`terna-card__estado estado-${terna.estado}`} style={{ marginLeft: 8 }}>
                                    {ESTADO_LABEL[terna.estado]}
                                </span>
                            </h1>
                            <p className="ternas-page__subtitle">
                                <FileText size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                {terna.titulo || 'Sin título de proyecto'}
                            </p>
                        </header>

                        <div className="terna-detail-grid">
                            {/* Columna izquierda: estudiante + evaluadores + form */}
                            <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <article className="tdetail-card">
                                    <h2 className="tdetail-card__title">Estudiante y proyecto</h2>
                                    <p className="tdetail-student-name">{terna.estudiante_nombre}</p>
                                    <dl className="tdetail-meta">
                                        <dt>Carnet</dt>
                                        <dd style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                                            {terna.carnet}
                                        </dd>
                                        <dt>Proyecto</dt>
                                        <dd>{terna.titulo || '—'}</dd>
                                        {terna.fase && (
                                            <>
                                                <dt>Fase</dt>
                                                <dd>{terna.fase}</dd>
                                            </>
                                        )}
                                        {terna.fecha_evaluacion && (
                                            <>
                                                <dt>Fecha</dt>
                                                <dd>{terna.fecha_evaluacion}</dd>
                                            </>
                                        )}
                                    </dl>
                                </article>

                                <article className="tdetail-card">
                                    <h2 className="tdetail-card__title">Evaluadores</h2>
                                    <div className="tdetail-evaluators">
                                        {terna.evaluadores?.length === 0 && (
                                            <div className="eval-locked">Sin evaluadores asignados.</div>
                                        )}
                                        {terna.evaluadores?.map((e, idx) => (
                                            <EvaluatorRow key={(e.id ?? e.usuario_id ?? idx).toString()} evaluator={e} />
                                        ))}
                                    </div>
                                </article>

                                <article className="tdetail-card">
                                    <h2 className="tdetail-card__title">Mi evaluación</h2>
                                    <EvaluationForm terna={terna} onChanged={reload} />
                                </article>
                            </section>

                            {/* Columna derecha: tesis + resultado */}
                            <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {eligibility && (
                                    <ThesisStatusBadge result={eligibility} title="Elegibilidad de tesis (PG1 + PG2)" />
                                )}

                                <article className="tdetail-card">
                                    <h2 className="tdetail-card__title">
                                        <GraduationCap size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                        Resultado ponderado de la terna
                                    </h2>
                                    <dl className="tdetail-meta">
                                        <dt>Promedio</dt>
                                        <dd>
                                            {terna.resultado?.promedio != null
                                                ? Number(terna.resultado.promedio).toFixed(2)
                                                : '— (faltan evaluaciones)'}
                                        </dd>
                                        <dt>Resolución</dt>
                                        <dd>{RESOLUCION_LABEL[terna.resultado?.resolucion ?? 'pendiente']}</dd>
                                        <dt>Enviadas</dt>
                                        <dd>
                                            {terna.resultado?.evaluaciones_enviadas ?? 0} de{' '}
                                            {terna.resultado?.total_evaluadores ?? terna.evaluadores?.length ?? 0}
                                        </dd>
                                    </dl>
                                </article>
                            </section>
                        </div>
                    </>
                )}
        </div>
    );
};

const EvaluatorRow: React.FC<{ evaluator: EvaluadorTerna }> = ({ evaluator }) => {
    const estadoClass =
        evaluator.eval_estado === 'enviada'  ? 'eval-enviada'
        : evaluator.eval_estado === 'borrador' ? 'eval-borrador'
        : 'eval-empty';
    const estadoLabel =
        evaluator.eval_estado === 'enviada'  ? 'Enviada'
        : evaluator.eval_estado === 'borrador' ? 'Borrador'
        : 'Pendiente';

    return (
        <div className="tdetail-evaluator">
            <span className="tdetail-evaluator__name">{evaluator.nombre}</span>
            <span className="tdetail-evaluator__score">
                {evaluator.calificacion != null ? evaluator.calificacion : '—'}
            </span>
            <span className={`tdetail-evaluator__estado ${estadoClass}`}>{estadoLabel}</span>
        </div>
    );
};

export default TernaDetailPage;
