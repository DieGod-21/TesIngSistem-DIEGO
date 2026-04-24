/**
 * ReportDetailPage.tsx (admin)
 *
 * Detalle completo del reporte de una terna:
 * estudiante, proyecto, evaluadores con nota y comentarios, promedio y resolución.
 * GET /api/reportes/ternas/{id}
 */

import React, { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { ChevronLeft, FileText, Users } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getTernaReport, type ReporteTernaDetalle } from '../../../services/reportesService';
import { ResolutionBadge } from './ReportesPage';
import '../styles/reportes.css';
import '../../ternas/styles/ternas.css';

const ReportDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const { isAdmin } = useAuth();
    const [report, setReport] = useState<ReporteTernaDetalle | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const numId = Number(id);
        if (!Number.isFinite(numId)) {
            setError('ID de terna inválido.');
            setLoading(false);
            return;
        }
        (async () => {
            setLoading(true);
            setError(null);
            try {
                setReport(await getTernaReport(numId));
            } catch (e) {
                setError(e instanceof Error ? e.message : 'No se pudo cargar el reporte.');
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    if (!isAdmin) {
        return (
            <div className="reportes-page">
                <div className="terror" role="alert">Esta sección es solo para administradores.</div>
            </div>
        );
    }

    return (
        <div className="reportes-page">
                <button
                    type="button"
                    className="eval-btn eval-btn--secondary"
                    onClick={() => history.push('/reports')}
                    style={{ alignSelf: 'flex-start' }}
                >
                    <ChevronLeft size={16} aria-hidden="true" />
                    Volver a reportes
                </button>

                {loading && <div className="tloading">Cargando reporte…</div>}
                {!loading && error && <div className="terror" role="alert">{error}</div>}

                {!loading && !error && report && (
                    <>
                        <header className="ternas-page__header">
                            <h1 className="ternas-page__title">
                                Reporte Terna #{String(report.numero).padStart(2, '0')}
                                {' '}
                                <ResolutionBadge value={report.resultado?.resolucion ?? 'pendiente'} />
                            </h1>
                            <p className="ternas-page__subtitle">
                                <FileText size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                {report.proyecto?.titulo || 'Sin título'}
                                {report.proyecto?.fase && <span style={{ marginLeft: 8 }}>· {report.proyecto.fase}</span>}
                            </p>
                        </header>

                        <div className="report-detail-grid">
                            <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <article className="report-card">
                                    <h2 className="report-card__title">Estudiante</h2>
                                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                                        {report.estudiante?.nombre}
                                    </p>
                                    <p style={{ margin: 0, color: '#64748b' }}>
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

                            <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <article className="report-card">
                                    <h2 className="report-card__title">Resultado ponderado</h2>
                                    <dl className="tdetail-meta">
                                        <dt>Promedio</dt>
                                        <dd style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
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
                                        <p style={{ margin: 0, color: '#334155', lineHeight: 1.5 }}>
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
