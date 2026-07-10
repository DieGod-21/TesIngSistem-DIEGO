/**
 * ReportDetailPage.tsx (admin)
 *
 * Detalle completo del reporte de una terna:
 * estudiante, proyecto, evaluadores con nota y comentarios, promedio y resolución.
 * GET /api/reportes/ternas/{id}
 */

import React, { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { ChevronLeft, FileText, Users, AlertTriangle, RefreshCw, BarChart3 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getTernaReport, type ReporteTernaDetalle } from '../../../services/reportesService';
import { ResolutionBadge } from './ReportesPage';
import { Button, EmptyState, Skeleton, PageHeader } from '../../../components/ui';
import AccessRestricted from '../../../components/AccessRestricted';
import '../styles/reportes.css';
import '../../ternas/styles/ternas.css';

const ReportDetailSkeleton: React.FC = () => (
    <div className="report-detail-grid" aria-busy="true" aria-label="Cargando reporte…">
        {[0, 1].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="report-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Skeleton size="short" />
                    <Skeleton size="medium" />
                    <Skeleton size="short" />
                </div>
                <div className="report-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Skeleton size="medium" />
                    <Skeleton size="medium" />
                    <Skeleton size="short" />
                </div>
            </div>
        ))}
    </div>
);

const ReportDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const { capabilities } = useAuth();
    const [report, setReport] = useState<ReporteTernaDetalle | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = React.useCallback(async (numId: number) => {
        setLoading(true);
        setError(null);
        try {
            setReport(await getTernaReport(numId));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo cargar el reporte.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const numId = Number(id);
        if (!Number.isFinite(numId)) {
            setError('ID de terna inválido.');
            setLoading(false);
            return;
        }
        load(numId);
    }, [id, load]);

    // Defensa en profundidad: la ruta ya está protegida por RoleRoute; la página
    // reconfirma la capacidad antes de renderizar el detalle.
    if (!capabilities.canViewReports) {
        return <AccessRestricted />;
    }

    return (
        <div className="reportes-page">
                <Button
                    variant="secondary"
                    onClick={() => history.push('/reports')}
                    style={{ alignSelf: 'flex-start' }}
                >
                    <ChevronLeft size={16} aria-hidden="true" />
                    Volver a reportes
                </Button>

                {loading && <ReportDetailSkeleton />}
                {!loading && error && (
                    <EmptyState
                        tone="danger"
                        icon={<AlertTriangle size={26} />}
                        title="No se pudo cargar el reporte"
                        description={error}
                        action={
                            <Button
                                variant="secondary"
                                onClick={() => { const n = Number(id); if (Number.isFinite(n)) load(n); }}
                            >
                                <RefreshCw size={16} aria-hidden="true" /> Reintentar
                            </Button>
                        }
                    />
                )}
                {!loading && !error && !report && (
                    <EmptyState
                        icon={<FileText size={26} />}
                        title="Reporte no encontrado"
                        description="No se encontró el reporte solicitado."
                    />
                )}

                {!loading && !error && report && (
                    <>
                        <PageHeader
                            kicker="Analítica"
                            icon={<BarChart3 size={22} />}
                            title={
                                <span className="ui-title-inline">
                                    Reporte Terna #{String(report.numero).padStart(2, '0')}
                                    <ResolutionBadge value={report.resultado?.resolucion ?? 'pendiente'} />
                                </span>
                            }
                            subtitle={`${report.proyecto?.titulo || 'Sin título'}${report.proyecto?.fase ? ` · ${report.proyecto.fase}` : ''}`}
                        />

                        <div className="report-detail-grid">
                            <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <article className="report-card">
                                    <h2 className="report-card__title">Estudiante</h2>
                                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {report.estudiante?.nombre}
                                    </p>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                                        <span className="rep-carnet">{report.estudiante?.carnet}</span>
                                        {report.estudiante?.email && <> · {report.estudiante.email}</>}
                                    </p>
                                </article>

                                <article className="report-card">
                                    <h2 className="report-card__title">
                                        <Users size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                        Evaluadores ({report.evaluadores?.length ?? 0})
                                    </h2>
                                    {(report.evaluadores?.length ?? 0) === 0 ? (
                                        <div className="eval-locked">Sin evaluadores.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {report.evaluadores.map((ev, idx) => {
                                                const estadoClass = ev.estado === 'enviada'
                                                    ? 'eval-enviada'
                                                    : ev.estado === 'borrador'
                                                    ? 'eval-borrador'
                                                    : 'eval-empty';
                                                return (
                                                    <div key={`${ev.nombre}-${idx}`} className="report-evaluator">
                                                        <span className="report-evaluator__name">{ev.nombre}</span>
                                                        <span className="report-evaluator__score">
                                                            {ev.calificacion != null ? Number(ev.calificacion).toFixed(2) : '—'}
                                                        </span>
                                                        <span className={`tdetail-evaluator__estado ${estadoClass}`}>
                                                            {ev.estado || 'pendiente'}
                                                        </span>
                                                        {ev.comentarios && (
                                                            <p className="report-evaluator__comment">“{ev.comentarios}”</p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </article>
                            </section>

                            <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <article className="report-card">
                                    <h2 className="report-card__title">Resultado ponderado</h2>
                                    <dl className="tdetail-meta">
                                        <dt>Promedio</dt>
                                        <dd style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {report.resultado?.promedio != null
                                                ? Number(report.resultado.promedio).toFixed(2)
                                                : '— (faltan evaluaciones)'}
                                        </dd>
                                        <dt>Resolución</dt>
                                        <dd><ResolutionBadge value={report.resultado?.resolucion ?? 'pendiente'} /></dd>
                                        <dt>Enviadas</dt>
                                        <dd>
                                            {report.resultado?.evaluaciones_enviadas ?? 0} de{' '}
                                            {report.resultado?.total_evaluadores ?? 0}
                                        </dd>
                                        <dt>Estado terna</dt>
                                        <dd>{report.estado}</dd>
                                    </dl>
                                </article>

                                {report.razon && (
                                    <article className="report-card">
                                        <h2 className="report-card__title">Conclusión</h2>
                                        <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                            {report.razon}
                                        </p>
                                    </article>
                                )}
                            </section>
                        </div>
                    </>
                )}
        </div>
    );
};

export default ReportDetailPage;
