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
import { ChevronLeft, FileText, GraduationCap, AlertTriangle, RefreshCw, ClipboardList } from 'lucide-react';
import ThesisStatusBadge from '../../../components/thesis/ThesisStatusBadge';
import EvaluationForm from '../components/EvaluationForm';
import { useTernaDetalle } from '../hooks/useTernaDetalle';
import type { EvaluadorTerna } from '../../../types/api';
import { Badge, Button, EmptyState, Skeleton, PageHeader } from '../../../components/ui';
import { TERNA_ESTADO_LABEL, TERNA_ESTADO_TONE, evaluacionEstado } from '../../../utils/ternaStatus';
import { formatDateTime } from '../../../utils/dates';
import '../styles/ternas.css';

const RESOLUCION_LABEL = {
    aprueba_tesis: 'Aprueba tesis',
    aprueba_curso: 'Aprueba curso',
    reprobado:     'Reprobado',
    pendiente:     'Pendiente',
} as const;

const TernaDetailSkeleton: React.FC = () => (
    <div className="terna-detail-grid" aria-busy="true" aria-label="Cargando terna…">
        {[0, 1].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[0, 1, 2].map((j) => (
                    <div key={j} className="tdetail-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <Skeleton size="short" />
                        <Skeleton size="medium" />
                        <Skeleton size="short" />
                    </div>
                ))}
            </div>
        ))}
    </div>
);

const TernaDetailPage: React.FC = () => {
    const history = useHistory();
    const { id } = useParams<{ id: string }>();
    const ternaId = Number(id);
    const { terna, eligibility, loading, error, reload } = useTernaDetalle(
        Number.isFinite(ternaId) ? ternaId : null,
    );

    return (
        <div className="ternas-page">
                <Button
                    variant="secondary"
                    onClick={() => history.push('/ternas')}
                    style={{ alignSelf: 'flex-start' }}
                >
                    <ChevronLeft size={16} aria-hidden="true" />
                    Volver a Ternas
                </Button>

                {loading && <TernaDetailSkeleton />}
                {!loading && error && (
                    <EmptyState
                        tone="danger"
                        icon={<AlertTriangle size={26} />}
                        title="No se pudo cargar la terna"
                        description={error}
                        action={
                            <Button variant="secondary" onClick={reload}>
                                <RefreshCw size={16} aria-hidden="true" /> Reintentar
                            </Button>
                        }
                    />
                )}
                {!loading && !error && !terna && (
                    <EmptyState
                        icon={<FileText size={26} />}
                        title="Terna no encontrada"
                        description="No se encontró la terna solicitada."
                    />
                )}

                {!loading && !error && terna && (
                    <>
                        <PageHeader
                            kicker="Evaluación"
                            icon={<ClipboardList size={22} />}
                            title={
                                <span className="ui-title-inline">
                                    Terna #{String(terna.numero).padStart(2, '0')}
                                    <Badge tone={TERNA_ESTADO_TONE[terna.estado]}>
                                        {TERNA_ESTADO_LABEL[terna.estado]}
                                    </Badge>
                                </span>
                            }
                            subtitle={terna.titulo || 'Sin título de proyecto'}
                        />

                        <div className="terna-detail-grid">
                            {/* Columna izquierda: estudiante + evaluadores + form */}
                            <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                                        {/* El valor llega crudo del API (ISO 8601). Se formatea
                                            con el formateador del producto; si no es una fecha
                                            válida, `formatDateTime` devuelve null y la fila
                                            entera se omite en lugar de imprimir el ISO. */}
                                        {formatDateTime(terna.fecha_evaluacion) && (
                                            <>
                                                <dt>Fecha</dt>
                                                <dd>{formatDateTime(terna.fecha_evaluacion)}</dd>
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
                            <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {eligibility && (
                                    <ThesisStatusBadge estado={eligibility} title="Elegibilidad de tesis (PG1 + PG2)" />
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
    const estado = evaluacionEstado(evaluator.eval_estado);

    return (
        <div className="tdetail-evaluator">
            <span className="tdetail-evaluator__name">{evaluator.nombre}</span>
            <span className="tdetail-evaluator__score">
                {evaluator.calificacion != null ? evaluator.calificacion : '—'}
            </span>
            <Badge tone={estado.tone}>{estado.label}</Badge>
        </div>
    );
};

export default TernaDetailPage;
