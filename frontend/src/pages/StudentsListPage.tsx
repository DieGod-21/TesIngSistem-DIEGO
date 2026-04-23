/**
 * StudentsListPage.tsx
 *
 * Listado de estudiantes.
 *
 * Dos modos:
 *   1. Default → GET /api/estudiantes (paginado, búsqueda server-side)
 *   2. Filtro por tesis → GET /api/tesis/aprobados | /api/tesis/reprobados
 *      activado con ?filter=aprobados|reprobados. No paginado (backend
 *      devuelve el total); búsqueda client-side con normalización de
 *      acentos/casing.
 *
 * Query params soportados:
 *   - filter=aprobados|reprobados  → modo tesis
 *   - search=<texto>               → búsqueda inicial (ambos modos)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
    Search, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight,
    RefreshCw, Users, X, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import AppShell from '../layout/AppShell';
import { useEstudiantesList } from '../hooks/useEstudiantesList';
import { initials } from '../utils/strings';
import { matchesText } from '../utils/text';
import type { Estudiante } from '../types/api';
import {
    getAprobadosTesis, getReprobadosTesis, type TesisEstudiante,
} from '../services/tesisService';
import '../styles/students-list.css';
import '../styles/student-new.css';
import '../styles/transitions.css';

const LIMIT_OPTIONS = [10, 20, 50, 100] as const;

type TesisFilter = 'aprobados' | 'reprobados';

/**
 * Acepta tanto ?status=approved|failed (preferido) como ?filter=aprobados|reprobados
 * (compatibilidad) y normaliza a un único valor interno.
 */
function parseQuery(search: string) {
    const qp = new URLSearchParams(search);
    const rawStatus = qp.get('status');
    const rawFilter = qp.get('filter');

    let filter: TesisFilter | null = null;
    if (rawStatus === 'approved' || rawFilter === 'aprobados') filter = 'aprobados';
    else if (rawStatus === 'failed' || rawFilter === 'reprobados') filter = 'reprobados';

    return {
        filter,
        search: qp.get('search') ?? qp.get('q') ?? '',
    };
}

const StudentsListPage: React.FC = () => {
    const history  = useHistory();
    const location = useLocation();
    const { filter, search: initialSearch } = useMemo(
        () => parseQuery(location.search),
        [location.search],
    );

    return (
        <AppShell>
            <div className="sl-body">
                <nav className="sn-breadcrumb" aria-label="Navegación secundaria">
                    <span className="sn-breadcrumb__item">Inicio</span>
                    <ChevronRight size={14} className="sn-breadcrumb__sep" />
                    <span className="sn-breadcrumb__item sn-breadcrumb__item--active">Estudiantes</span>
                </nav>

                <div className="sl-page-header">
                    <div className="sl-page-title-group">
                        <h1 className="sl-page-title">
                            <Users size={20} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 8 }} />
                            Estudiantes
                            {filter && <FilterPill filter={filter} />}
                        </h1>
                        <p className="sl-page-subtitle">
                            Consulta la información, notas y elegibilidad de tesis de los estudiantes registrados.
                        </p>
                    </div>
                </div>

                {filter && (
                    <FilterBanner
                        filter={filter}
                        onClear={() => history.replace('/students')}
                    />
                )}

                <div key={filter ?? 'default'} className="view-transition">
                    {filter
                        ? <TesisFilteredView filter={filter} initialSearch={initialSearch} />
                        : <DefaultStudentsView initialSearch={initialSearch} history={history} />}
                </div>
            </div>
        </AppShell>
    );
};

// ─── Vista default (paginada, server-side) ──────────────────────────────

const DefaultStudentsView: React.FC<{
    initialSearch: string;
    history: ReturnType<typeof useHistory>;
}> = ({ initialSearch, history }) => {
    const {
        estudiantes, pagination, search, loading, error,
        setSearch, setPage, setLimit, reload,
    } = useEstudiantesList({ limit: 20, search: initialSearch });

    // Sincroniza la búsqueda con el query param cuando cambia desde fuera
    // (p.ej. el buscador global en TopHeader).
    useEffect(() => {
        if (initialSearch !== search) setSearch(initialSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSearch]);

    const go = (est: Estudiante) => history.push(`/students/${est.id}`);

    return (
        <>
            <div className="sl-kpi-strip">
                <div className="sl-kpi-item">
                    <span className="sl-kpi-item__label">Total registrados</span>
                    <span className="sl-kpi-item__value">{pagination.total}</span>
                    <span className="sl-kpi-item__sub">En el sistema</span>
                </div>
                <div className="sl-kpi-item">
                    <span className="sl-kpi-item__label">Mostrando</span>
                    <span className="sl-kpi-item__value">{estudiantes.length}</span>
                    <span className="sl-kpi-item__sub">En esta página</span>
                </div>
                <div className="sl-kpi-item">
                    <span className="sl-kpi-item__label">Página</span>
                    <span className="sl-kpi-item__value">
                        {pagination.page}<span style={{ fontSize: '0.8em', color: '#94a3b8' }}> / {pagination.pages || 1}</span>
                    </span>
                    <span className="sl-kpi-item__sub">{pagination.limit} por página</span>
                </div>
            </div>

            <div className="sl-filters">
                <div className="sl-filter-search">
                    <Search size={14} className="sl-filter-search__icon" aria-hidden="true" />
                    <input
                        type="text"
                        className="sl-filter-search__input"
                        placeholder="Buscar por nombre o carnet…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Buscar estudiante"
                    />
                </div>
                <label className="sl-filter-count" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span>Por página:</span>
                    <select
                        value={pagination.limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="sl-status-tab"
                        style={{ padding: '6px 10px', cursor: 'pointer' }}
                        aria-label="Resultados por página"
                    >
                        {LIMIT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                </label>
                <button
                    type="button"
                    className="sn-btn-primary"
                    onClick={reload}
                    disabled={loading}
                    aria-label="Refrescar listado"
                >
                    <RefreshCw size={16} aria-hidden="true" />
                    Refrescar
                </button>
            </div>

            <div className="sl-table-wrap">
                <table className="sl-table" aria-label="Listado de estudiantes">
                    <thead>
                        <tr>
                            <th className="sl-table__th">Estudiante</th>
                            <th className="sl-table__th">Email</th>
                            <th className="sl-table__th">Carrera</th>
                            <th className="sl-table__th">Estado</th>
                            <th className="sl-table__th" aria-label="Acciones" />
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <TableSkeleton rows={Math.min(pagination.limit, 8)} cols={5} />}

                        {!loading && error && (
                            <tr>
                                <td colSpan={5} className="sl-table__td">
                                    <div className="sl-empty" role="alert" style={{ color: '#b91c1c' }}>
                                        <p className="sl-empty__title">No se pudieron cargar los estudiantes</p>
                                        <p className="sl-empty__sub">{error}</p>
                                        <button type="button" className="sn-btn-primary" onClick={reload} style={{ marginTop: 10 }}>
                                            Reintentar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {!loading && !error && estudiantes.length === 0 && (
                            <tr>
                                <td colSpan={5} className="sl-table__td">
                                    <div className="sl-empty">
                                        <p className="sl-empty__title">Sin resultados</p>
                                        <p className="sl-empty__sub">
                                            {search.trim()
                                                ? `No se encontró "${search}".`
                                                : 'Aún no hay estudiantes registrados.'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {!loading && !error && estudiantes.map((s) => (
                            <tr
                                key={s.id}
                                className="sl-table__tr sl-table__tr--clickable"
                                onClick={() => go(s)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(s); } }}
                                tabIndex={0}
                                role="link"
                                aria-label={`Ver detalle de ${s.nombre}`}
                            >
                                <td className="sl-table__td">
                                    <div className="sl-student-cell">
                                        <div className="sl-avatar" aria-hidden="true">{initials(s.nombre)}</div>
                                        <div>
                                            <p className="sl-student-name">{s.nombre}</p>
                                            <p className="sl-student-carnet">{s.carnet}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="sl-table__td">
                                    <span style={{ fontSize: '0.88rem', color: '#475569' }}>{s.email || '—'}</span>
                                </td>
                                <td className="sl-table__td">
                                    <span className="sl-phase-badge" style={{ background: '#f1f5f9', color: '#1e293b' }}>
                                        {s.carrera || '—'}
                                    </span>
                                </td>
                                <td className="sl-table__td">
                                    <span className={`sl-status-chip ${s.activo ? 'sl-status-chip--active' : 'sl-status-chip--inactive'}`}>
                                        <span className="sl-status-chip__dot" aria-hidden="true" />
                                        {s.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="sl-table__td sl-table__td--center">
                                    <ChevronRight size={18} aria-hidden="true" style={{ color: '#94a3b8' }} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {!loading && !error && estudiantes.length > 0 && (
                <Pager
                    page={pagination.page}
                    pages={pagination.pages}
                    total={pagination.total}
                    limit={pagination.limit}
                    onChange={setPage}
                />
            )}
        </>
    );
};

// ─── Vista filtrada por tesis (aprobados / reprobados) ────────────────

const TesisFilteredView: React.FC<{
    filter: TesisFilter;
    initialSearch: string;
}> = ({ filter, initialSearch }) => {
    const [all, setAll]         = useState<TesisEstudiante[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);
    const [query, setQuery]     = useState(initialSearch);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const resp = filter === 'aprobados' ? await getAprobadosTesis() : await getReprobadosTesis();
            setAll(resp.estudiantes);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo cargar el listado.');
            setAll([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [filter]);

    const filtered = useMemo(
        () => all.filter((s) => matchesText(s.nombre, query) || matchesText(s.carnet, query)),
        [all, query],
    );

    return (
        <>
            <div className="sl-kpi-strip">
                <div className="sl-kpi-item">
                    <span className="sl-kpi-item__label">Total {filter === 'aprobados' ? 'aprobados' : 'no aprobados'}</span>
                    <span className="sl-kpi-item__value">{all.length}</span>
                    <span className="sl-kpi-item__sub">{filter === 'aprobados' ? 'Cumplen tesis' : 'No cumplen tesis'}</span>
                </div>
                <div className="sl-kpi-item">
                    <span className="sl-kpi-item__label">Mostrando</span>
                    <span className="sl-kpi-item__value">{filtered.length}</span>
                    <span className="sl-kpi-item__sub">Resultados del filtro</span>
                </div>
            </div>

            <div className="sl-filters">
                <div className="sl-filter-search">
                    <Search size={14} className="sl-filter-search__icon" aria-hidden="true" />
                    <input
                        type="text"
                        className="sl-filter-search__input"
                        placeholder="Buscar por nombre o carnet…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Buscar estudiante"
                    />
                </div>
                <button
                    type="button"
                    className="sn-btn-primary"
                    onClick={load}
                    disabled={loading}
                    aria-label="Refrescar listado"
                >
                    <RefreshCw size={16} aria-hidden="true" />
                    Refrescar
                </button>
            </div>

            <div className="sl-table-wrap">
                <table className="sl-table" aria-label={`Estudiantes ${filter}`}>
                    <thead>
                        <tr>
                            <th className="sl-table__th">Estudiante</th>
                            <th className="sl-table__th">PG1 (043)</th>
                            <th className="sl-table__th">PG2 (049)</th>
                            <th className="sl-table__th">Resolución</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <TableSkeleton rows={6} cols={4} />}

                        {!loading && error && (
                            <tr>
                                <td colSpan={4} className="sl-table__td">
                                    <div className="sl-empty" role="alert" style={{ color: '#b91c1c' }}>
                                        <p className="sl-empty__title">No se pudo cargar el listado</p>
                                        <p className="sl-empty__sub">{error}</p>
                                        <button type="button" className="sn-btn-primary" onClick={load} style={{ marginTop: 10 }}>
                                            Reintentar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {!loading && !error && filtered.length === 0 && (
                            <tr>
                                <td colSpan={4} className="sl-table__td">
                                    <div className="sl-empty">
                                        <p className="sl-empty__title">Sin resultados</p>
                                        <p className="sl-empty__sub">
                                            {query.trim()
                                                ? `No se encontró "${query}".`
                                                : filter === 'aprobados'
                                                    ? 'Aún no hay estudiantes que aprueben tesis.'
                                                    : 'No hay estudiantes reprobados o pendientes.'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {!loading && !error && filtered.map((s) => (
                            <tr key={s.carnet} className="sl-table__tr">
                                <td className="sl-table__td">
                                    <div className="sl-student-cell">
                                        <div className="sl-avatar" aria-hidden="true">{initials(s.nombre)}</div>
                                        <div>
                                            <p className="sl-student-name">{s.nombre}</p>
                                            <p className="sl-student-carnet">{s.carnet}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="sl-table__td">{s.nota_grad1 ?? '—'}</td>
                                <td className="sl-table__td">{s.nota_grad2 ?? '—'}</td>
                                <td className="sl-table__td">
                                    <span className={`sl-status-chip ${filter === 'aprobados' ? 'sl-status-chip--active' : 'sl-status-chip--inactive'}`}>
                                        <span className="sl-status-chip__dot" aria-hidden="true" />
                                        {filter === 'aprobados' ? 'Aprueba tesis' : 'No cumple'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

// ─── Subcomponentes ──────────────────────────────────────────────────────

const FilterPill: React.FC<{ filter: TesisFilter }> = ({ filter }) => {
    const isApproved = filter === 'aprobados';
    return (
        <span
            className="sl-filter-pill"
            aria-label={`Filtro activo: ${isApproved ? 'aprobados' : 'no aprobados'}`}
        >
            <span className="sl-filter-pill__dot" aria-hidden="true" />
            {isApproved ? 'Aprobados' : 'No aprobados'}
        </span>
    );
};

const FilterBanner: React.FC<{ filter: TesisFilter; onClear: () => void }> = ({ filter, onClear }) => {
    const isApproved = filter === 'aprobados';
    return (
        <div
            role="status"
            className="sl-filter-banner"
            style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                background: isApproved ? '#ecfdf5' : '#fef2f2',
                color:      isApproved ? '#065f46' : '#991b1b',
                border: `1px solid ${isApproved ? '#a7f3d0' : '#fecaca'}`,
            }}
        >
            {isApproved
                ? <CheckCircle2 size={18} aria-hidden="true" />
                : <AlertTriangle size={18} aria-hidden="true" />}
            <span style={{ fontWeight: 600 }}>
                Filtro activo: {isApproved ? 'Aprueban tesis' : 'No aprueban tesis'}
            </span>
            <button
                type="button"
                onClick={onClear}
                aria-label="Limpiar filtro"
                style={{
                    marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'transparent', border: 0, cursor: 'pointer',
                    color: 'inherit', fontWeight: 600, padding: '4px 8px', borderRadius: 6,
                }}
            >
                <X size={14} aria-hidden="true" /> Limpiar
            </button>
        </div>
    );
};

const TableSkeleton: React.FC<{ rows: number; cols: number }> = ({ rows, cols }) => (
    <>
        {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="sl-table__tr">
                <td className="sl-table__td">
                    <div className="sl-student-cell">
                        <div className="skeleton skeleton--circle" />
                        <div>
                            <div className="skeleton skeleton--line skeleton--medium" />
                            <div className="skeleton skeleton--line skeleton--short" style={{ marginTop: 4 }} />
                        </div>
                    </div>
                </td>
                {Array.from({ length: cols - 1 }).map((_, j) => (
                    <td key={j} className="sl-table__td">
                        <div className="skeleton skeleton--line skeleton--medium" />
                    </td>
                ))}
            </tr>
        ))}
    </>
);

interface PagerProps {
    page: number;
    pages: number;
    total: number;
    limit: number;
    onChange: (page: number) => void;
}

const Pager: React.FC<PagerProps> = ({ page, pages, total, limit, onChange }) => {
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(total, page * limit);
    const canPrev = page > 1;
    const canNext = page < pages;

    return (
        <nav className="sl-pager" aria-label="Paginación">
            <span className="sl-pager__info">
                Mostrando <strong>{from}</strong>–<strong>{to}</strong> de <strong>{total}</strong>
            </span>
            <div className="sl-pager__controls" role="group" aria-label="Controles de página">
                <button type="button" className="sl-pager__btn" disabled={!canPrev} onClick={() => onChange(1)} aria-label="Primera página">
                    <ChevronsLeft size={16} aria-hidden="true" />
                </button>
                <button type="button" className="sl-pager__btn" disabled={!canPrev} onClick={() => onChange(page - 1)} aria-label="Página anterior">
                    <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <span className="sl-pager__current" aria-current="page">
                    {page} <span style={{ color: '#94a3b8' }}>/ {pages || 1}</span>
                </span>
                <button type="button" className="sl-pager__btn" disabled={!canNext} onClick={() => onChange(page + 1)} aria-label="Página siguiente">
                    <ChevronRight size={16} aria-hidden="true" />
                </button>
                <button type="button" className="sl-pager__btn" disabled={!canNext} onClick={() => onChange(pages)} aria-label="Última página">
                    <ChevronsRight size={16} aria-hidden="true" />
                </button>
            </div>
        </nav>
    );
};

export default StudentsListPage;
