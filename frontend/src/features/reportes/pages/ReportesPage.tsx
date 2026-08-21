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
import { userMessageFor } from '../../../services/errorMessages';
import type { ReporteTernasGlobal, ResolucionTerna, ReporteTernaItem } from '../../../types/api';
import { matchesText } from '../../../utils/text';
import { useCountUp } from '../../../hooks/useCountUp';
import { Badge, Button, PageHeader, EmptyState, Skeleton } from '../../../components/ui';
import AccessRestricted from '../../../components/AccessRestricted';
import { RESOLUCION_LABEL, RESOLUCION_TONE } from '../../../utils/ternaStatus';
import '../styles/reportes.css';
import '../../../styles/transitions.css';
import { routes } from '../../../config/routes';


type Filter = 'all' | ResolucionTerna;

const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all',           label: 'Todos' },
    { value: 'aprueba_tesis', label: RESOLUCION_LABEL.aprueba_tesis },
    { value: 'aprueba_curso', label: RESOLUCION_LABEL.aprueba_curso },
    { value: 'reprobado',     label: RESOLUCION_LABEL.reprobado },
    { value: 'pendiente',     label: RESOLUCION_LABEL.pendiente },
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
            setError(userMessageFor(e));
            setData(null);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();

    }, []);

    /* `data?.ternas ?? []` fabricaba un array nuevo en cada render, así que el
       filtro de abajo se recalculaba entero cada vez aunque no cambiara nada:
       el `useMemo` estaba escrito pero no memorizaba. */
    const ternas: ReporteTernaItem[] = useMemo(() => data?.ternas ?? [], [data]);

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

    // Resultado institucional (protagonista de la pantalla). Todo derivado de
    // datos ya presentes: nada se calcula ni se pide de más.
    const r = data?.resumen;
    const total = r?.total ?? 0;
    const counts: Record<string, number> = {
        'aprueba-tesis': r?.aprueba_tesis ?? 0,
        'aprueba-curso': r?.aprueba_curso ?? 0,
        'reprobado':     r?.reprobados ?? 0,
        'pendiente':     r?.pendientes ?? 0,
    };
    const aprobadas = counts['aprueba-tesis'] + counts['aprueba-curso'];
    const approvalPct = total > 0 ? Math.round((aprobadas / total) * 100) : 0;
    // Reutiliza el count-up del sistema (respeta prefers-reduced-motion).
    const animatedPct = useCountUp(approvalPct);

    // Defensa en profundidad: aunque la ruta ya está protegida por RoleRoute,
    // la página vuelve a verificar la capacidad antes de mostrar datos.
    if (!capabilities.canViewReports) {
        return <AccessRestricted />;
    }

    return (
        <div className="reportes-page">
            <PageHeader
                    kicker="Analítica"
                    icon={<BarChart3 size={22} />}
                    title="Reportes de Ternas"
                    subtitle="Resultado ponderado de todas las ternas del sistema, con resolución final por estudiante."
                />

                {!loading && !error && total > 0 && (
                    <ReportesHero total={total} counts={counts} aprobadas={aprobadas} animatedPct={animatedPct} />
                )}

                <div className="ui-toolbar ui-toolbar--bare" style={loading ? { display: 'none' } : undefined}>
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
                                className={`ui-chip${filter === f.value ? ' ui-chip--active' : ''}`}
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
                                        onClick={() => history.push(routes.reportDetail(t.terna_id))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                history.push(routes.reportDetail(t.terna_id));
                                            }
                                        }}
                                    >
                                        <td><span className="rep-numero">{String(t.numero).padStart(2, '0')}</span></td>
                                        <td>
                                            <div className="rep-estudiante">
                                                <strong>{t.estudiante}</strong>
                                                <span className="rep-carnet">{t.carnet}</span>
                                            </div>
                                        </td>
                                        <td><div className="rep-proyecto">{t.titulo || '—'}</div></td>
                                        <td>
                                            {t.promedio != null ? (
                                                <span className="rep-promedio">{Number(t.promedio).toFixed(2)}</span>
                                            ) : (
                                                <span className="rep-promedio rep-promedio--none">—</span>
                                            )}
                                        </td>
                                        <td><ResolutionBadge value={t.resolucion} /></td>
                                        <td className="rep-acciones">
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
        {/* Hero skeleton (misma silueta que el resultado institucional) */}
        <div className="reportes-hero" style={{ pointerEvents: 'none' }}>
            <Skeleton width={160} height={52} />
            <Skeleton height={14} radius={999} />
            <Skeleton size="short" />
        </div>
        {/* Table skeleton */}
        <div className="reportes-table-card" style={{ overflow: 'hidden' }}>
            {[...Array(6)].map((_, i) => (
                <div key={i} className="ui-skeleton-row">
                    <Skeleton width={28} height={28} radius={6} style={{ flexShrink: 0 }} />
                    <div className="ui-skeleton-row__lines">
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

/* La etiqueta la pone el mapa único; aquí solo se declara el ORDEN de la barra
   y el modificador de color. Era la tercera copia literal de los mismos cuatro
   textos dentro de este archivo. */
const HERO_CATS: { key: ResolucionTerna; variant: string }[] = [
    { key: 'aprueba_tesis', variant: 'aprueba-tesis' },
    { key: 'aprueba_curso', variant: 'aprueba-curso' },
    { key: 'reprobado',     variant: 'reprobado' },
    { key: 'pendiente',     variant: 'pendiente' },
];

/**
 * Resultado institucional: un solo centro de gravedad. La cifra de aprobación
 * domina; la barra descompone; la leyenda detalla. Todo con datos ya presentes.
 */
const ReportesHero: React.FC<{
    total: number;
    counts: Record<string, number>;
    aprobadas: number;
    animatedPct: number;
}> = ({ total, counts, aprobadas, animatedPct }) => {
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    return (
        <section className="reportes-hero" aria-label="Resultado institucional">
            <div className="reportes-hero__head">
                <p className="reportes-hero__figure">
                    <span className="reportes-hero__num">{animatedPct}</span>
                    <span className="reportes-hero__unit">%</span>
                </p>
                <div className="reportes-hero__caption">
                    <p className="reportes-hero__title">Aprobación global</p>
                    <p className="reportes-hero__sub">
                        {aprobadas} de {total} ternas aprobadas · {counts['pendiente']} pendientes
                    </p>
                </div>
            </div>

            <div
                className="reportes-bar"
                role="img"
                aria-label={HERO_CATS.map((c) => `${RESOLUCION_LABEL[c.key]}: ${counts[c.variant]}`).join(', ')}
            >
                {HERO_CATS.map((c) => {
                    const w = pct(counts[c.variant]);
                    return w > 0 ? (
                        <span
                            key={c.key}
                            className={`reportes-bar__seg reportes-bar__seg--${c.variant}`}
                            style={{ width: `${w}%` }}
                        />
                    ) : null;
                })}
            </div>

            <ul className="reportes-legend">
                {HERO_CATS.map((c) => (
                    <li key={c.key} className="reportes-legend__item">
                        <span className={`reportes-legend__dot reportes-legend__dot--${c.variant}`} aria-hidden="true" />
                        <span className="reportes-legend__label">{RESOLUCION_LABEL[c.key]}</span>
                        <span className="reportes-legend__count">{counts[c.variant]}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
};

/**
 * Resolución de una terna, con el MISMO chip de estado que el resto del
 * producto.
 *
 * Antes era una píldora propia (`.rep-res`) con la paleta esmeralda/ámbar de
 * Tailwind: el mismo objeto semántico —un estado— se veía distinto aquí que en
 * Estudiantes, Ternas o la vista rápida. El usuario no lee "otro estilo", lee
 * "otra aplicación". Ahora se deriva el tono del sistema de diseño y el chrome
 * lo aporta `Badge`.
 */

export const ResolutionBadge: React.FC<{ value: ResolucionTerna }> = ({ value }) => (
    <Badge tone={RESOLUCION_TONE[value] ?? 'neutral'} dot>
        {RESOLUCION_LABEL[value] ?? value}
    </Badge>
);

export default ReportesPage;
