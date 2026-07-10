/**
 * ReportesPage.tsx (solo admin)
 *
 * Resumen global de ternas + listado con resolución visual por estado.
 * GET /api/reportes/ternas
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { BarChart3, Search, RefreshCw, ChevronRight, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getGlobalTernasReport } from '../../../services/reportesService';
import { isCancel } from '../../../services/apiClient';
import type { ReporteTernasGlobal, ResolucionTerna, ReporteTernaItem } from '../../../types/api';
import { matchesText } from '../../../utils/text';
import { Button, PageHeader, EmptyState, Skeleton } from '../../../components/ui';
import AccessRestricted from '../../../components/AccessRestricted';
import '../styles/reportes.css';
import '../../../styles/transitions.css';

const RES_LABEL: Record<ResolucionTerna, string> = {
    aprueba_tesis: 'Aprueba Tesis',
    aprueba_curso: 'Aprueba Curso',
    reprobado:     'Reprobado',
    pendiente:     'Pendiente',
};

type Filter = 'all' | ResolucionTerna;

const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all',           label: 'Todos' },
    { value: 'aprueba_tesis', label: 'Aprueba Tesis' },
    { value: 'aprueba_curso', label: 'Aprueba Curso' },
    { value: 'reprobado',     label: 'Reprobado' },
    { value: 'pendiente',     label: 'Pendiente' },
];

const ReportesPage: React.FC = () => {
    const { capabilities } = useAuth();
    const history = useHistory();
    const [data, setData] = useState<ReporteTernasGlobal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');

    const load = async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            const report = await getGlobalTernasReport({ signal });
            if (signal?.aborted) return;
            setData(report);
        } catch (e) {
            if (signal?.aborted || isCancel(e)) return;
            setError(e instanceof Error ? e.message : 'No se pudo cargar el reporte.');
            setData(null);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const ternas: ReporteTernaItem[] = data?.ternas ?? [];

    const filtered = useMemo(() => {
        return ternas.filter((t) => {
            if (filter !== 'all' && t.resolucion !== filter) return false;
            if (!query.trim()) return true;
            return (
                matchesText(t.estudiante, query) ||
                matchesText(t.carnet, query) ||
                matchesText(t.titulo, query)
            );
        });
    }, [ternas, filter, query]);

    // Defensa en profundidad: aunque la ruta ya está protegida por RoleRoute,
    // la página vuelve a verificar la capacidad antes de mostrar datos.
    if (!capabilities.canViewReports) {
        return <AccessRestricted />;
    }

    const r = data?.resumen;
    const total = r?.total ?? 0;
    const pct = (n?: number) => (total > 0 && n != null ? Math.round((n / total) * 100) : 0);

    return (
        <div className="reportes-page">
            <PageHeader
                    kicker="Analítica"
                    icon={<BarChart3 size={22} />}
                    title="Reportes de Ternas"
                    subtitle="Resultado ponderado de todas las ternas del sistema, con resolución final por estudiante."
                />

                {!loading && !error && (
                    <section className="reportes-summary" aria-label="Resumen global">
                        <StatCard label="Total ternas"   value={r?.total ?? 0}             variant="total" />
                        <StatCard label="Aprueba Tesis"  value={r?.aprueba_tesis ?? 0}     variant="aprueba-tesis"  pct={pct(r?.aprueba_tesis)} />
                        <StatCard label="Aprueba Curso"  value={r?.aprueba_curso ?? 0}     variant="aprueba-curso"  pct={pct(r?.aprueba_curso)} />
                        <StatCard label="Reprobados"     value={r?.reprobados ?? 0}        variant="reprobado"      pct={pct(r?.reprobados)} />
                        <StatCard label="Pendientes"     value={r?.pendientes ?? 0}        variant="pendiente"      pct={pct(r?.pendientes)} />
                    </section>
                )}

                <div className="reportes-toolbar" style={loading ? { display: 'none' } : undefined}>
                    <div className="ui-search" style={{ flex: 1, minWidth: 220 }}>
                        <Search size={15} className="ui-search__icon" aria-hidden="true" />
                        <input
                            type="text"
                            className="ui-search__input"
                            placeholder="Buscar por estudiante, carnet o proyecto…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            aria-label="Buscar en reporte"
                        />
                    </div>
                    <div role="group" aria-label="Filtrar por resolución" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {FILTERS.map((f) => (
                            <button
                                key={f.value}
                                type="button"
                                className={`ternas-chip${filter === f.value ? ' ternas-chip--active' : ''}`}
                                onClick={() => setFilter(f.value)}
                                aria-pressed={filter === f.value}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <Button variant="secondary" onClick={() => load()} disabled={loading} aria-label="Refrescar reporte">
                        <RefreshCw size={16} aria-hidden="true" />
                        Refrescar
                    </Button>
                </div>

                {loading && <ReportesSkeleton />}
                {!loading && error && (
                    <EmptyState
                        tone="danger"
                        icon={<AlertTriangle size={26} />}
                        title="No se pudo cargar el reporte"
                        description={error}
                        action={
                            <Button variant="secondary" onClick={() => load()}>
                                <RefreshCw size={16} aria-hidden="true" /> Reintentar
                            </Button>
                        }
                    />
                )}
                {!loading && !error && filtered.length === 0 && (
                    <EmptyState
                        icon={<BarChart3 size={26} />}
                        title={ternas.length === 0 ? 'No hay ternas registradas' : 'Sin resultados'}
                        description={ternas.length === 0
                            ? 'El reporte global está vacío.'
                            : 'Prueba ajustar la búsqueda o el filtro de resolución.'}
                    />
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div key={filter} className="reportes-table-card view-transition">
                        <table className="reportes-table" aria-label="Reporte de ternas">
                            <thead>
                                <tr>
                                    <th scope="col">#</th>
                                    <th scope="col">Estudiante</th>
                                    <th scope="col">Proyecto</th>
                                    <th scope="col">Promedio</th>
                                    <th scope="col">Resolución</th>
                                    <th scope="col" aria-label="Acciones" />
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((t) => (
                                    <tr
                                        key={t.terna_id}
                                        tabIndex={0}
                                        onClick={() => history.push(`/reports/${t.terna_id}`)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                history.push(`/reports/${t.terna_id}`);
                                            }
                                        }}
                                    >
                                        <td><span className="rep-numero">{String(t.numero).padStart(2, '0')}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <strong>{t.estudiante}</strong>
                                                <span className="rep-carnet">{t.carnet}</span>
                                            </div>
                                        </td>
                                        <td style={{ maxWidth: 320 }}>{t.titulo || '—'}</td>
                                        <td>
                                            {t.promedio != null ? (
                                                <span className="rep-promedio">{Number(t.promedio).toFixed(2)}</span>
                                            ) : (
                                                <span className="rep-promedio rep-promedio--none">—</span>
                                            )}
                                        </td>
                                        <td><ResolutionBadge value={t.resolucion} /></td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                                            <ChevronRight size={16} aria-hidden="true" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
        </div>
    );
};

// ─── Subcomponentes ──────────────────────────────────────────────────────

const ReportesSkeleton: React.FC = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Stat cards skeleton */}
        <div className="reportes-summary">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="rep-stat" style={{ pointerEvents: 'none' }}>
                    <Skeleton size="short" style={{ marginBottom: 10 }} />
                    <Skeleton size="large" />
                    <Skeleton size="medium" style={{ marginTop: 8 }} />
                </div>
            ))}
        </div>
        {/* Table skeleton */}
        <div className="reportes-table-card" style={{ overflow: 'hidden' }}>
            {[...Array(6)].map((_, i) => (
                <div key={i} className="dash-skeleton-row">
                    <Skeleton width={28} height={28} radius={6} style={{ flexShrink: 0 }} />
                    <div className="dash-skeleton-row__lines">
                        <Skeleton size="medium" />
                        <Skeleton size="short" />
                    </div>
                    <Skeleton width={70} />
                    <Skeleton width={90} />
                </div>
            ))}
        </div>
    </div>
);

const StatCard: React.FC<{ label: string; value: number; variant: string; pct?: number }> = ({ label, value, variant, pct }) => (
    <article className={`rep-stat rep-stat--${variant}`}>
        <p className="rep-stat__label">{label}</p>
        <p className="rep-stat__value">{value}</p>
        {pct != null && <p className="rep-stat__pct">{pct}% del total</p>}
    </article>
);

export const ResolutionBadge: React.FC<{ value: ResolucionTerna }> = ({ value }) => (
    <span className={`rep-res rep-res--${value}`}>
        <span className="rep-res__dot" aria-hidden="true" />
        {RES_LABEL[value] ?? value}
    </span>
);

export default ReportesPage;
