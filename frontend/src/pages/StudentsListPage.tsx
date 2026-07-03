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
    RefreshCw, Users, AlertTriangle, Upload,
} from 'lucide-react';
import { useEstudiantesList } from '../hooks/useEstudiantesList';
import { initials } from '../utils/strings';
import { matchesText } from '../utils/text';
import type { Estudiante } from '../types/api';
import {
    getAprobadosTesis, getReprobadosTesis, type TesisEstudiante,
} from '../services/tesisService';
import ImportModal from '../components/ImportModal';
import { Button, Badge, EmptyState, Skeleton, PageHeader } from '../components/ui';
import '../styles/students-list.css';
import '../styles/student-new.css';
import '../styles/transitions.css';

const LIMIT_OPTIONS = [10, 20, 50, 100] as const;

type TesisFilter = 'aprobados' | 'reprobados';

/** Segmentos de alcance del módulo: filtro nativo de estudiantes por estado de tesis. */
const SCOPES: { label: string; match: TesisFilter | null; status: 'approved' | 'failed' | null }[] = [
    { label: 'Todos',          match: null,         status: null },
    { label: 'Aprueban tesis', match: 'aprobados',  status: 'approved' },
    { label: 'No aprueban',    match: 'reprobados',  status: 'failed' },
];

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
    const [importOpen, setImportOpen] = useState(false);

    /** Cambia el alcance conservando la búsqueda activa; normaliza el alias heredado `filter`. */
    const buildScopeTo = (status: 'approved' | 'failed' | null): string => {
        const qp = new URLSearchParams(location.search);
        qp.delete('filter');
        if (status) qp.set('status', status);
        else qp.delete('status');
        const q = qp.toString();
        return q ? `/students?${q}` : '/students';
    };

    return (
        <div className="sl-body">
                <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />

                <nav className="sn-breadcrumb" aria-label="Navegación secundaria">
                    <button
                        type="button"
                        className="sn-breadcrumb__item sn-breadcrumb__link"
                        onClick={() => history.push('/')}
                    >
                        Inicio
                    </button>
                    <ChevronRight size={14} className="sn-breadcrumb__sep" />
                    <span className="sn-breadcrumb__item sn-breadcrumb__item--active">Estudiantes</span>
                </nav>

                <PageHeader
                    kicker="Gestión académica"
                    icon={<Users size={22} />}
                    title="Estudiantes"
                    subtitle="Consulta la información, notas y elegibilidad de tesis de los estudiantes registrados."
                    actions={
                        <Button onClick={() => setImportOpen(true)}>
                            <Upload size={16} aria-hidden="true" />
                            Importar
                        </Button>
                    }
                />

                <div className="sl-scope" role="group" aria-label="Filtrar estudiantes por estado de tesis">
                    <span className="sl-scope__label">Ver</span>
                    <div className="sl-status-tabs">
                        {SCOPES.map((s) => (
                            <button
                                key={s.label}
                                type="button"
                                className={`sl-status-tab${filter === s.match ? ' sl-status-tab--active' : ''}`}
                                aria-pressed={filter === s.match}
                                onClick={() => history.push(buildScopeTo(s.status))}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div key={filter ?? 'default'} className="view-transition">
                    {filter
                        ? <TesisFilteredView filter={filter} initialSearch={initialSearch} />
                        : <DefaultStudentsView initialSearch={initialSearch} history={history} />}
                </div>
        </div>
    );
};

// ─── Vista default (paginada, server-side) ──────────────────────────────

const DefaultStudentsView: React.FC<{
    initialSearch: string;
    history: ReturnType<typeof useHistory>;
}> = ({ initialSearch, history }) => {
    const {
        estudiantes, pagination, totalAll, atLimit, search, loading, error,
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
            <div className="ui-stat-grid">
                <div className="ui-stat">
                    <span className="ui-stat__label">Total registrados</span>
                    <span className="ui-stat__value">{totalAll}</span>
                    <span className="ui-stat__sub">En el sistema</span>
                </div>
                <div className="ui-stat">
                    <span className="ui-stat__label">{search.trim() ? 'Coincidencias' : 'Mostrando'}</span>
                    <span className="ui-stat__value">{pagination.total}</span>
                    <span className="ui-stat__sub">{search.trim() ? `Para "${search.trim()}"` : 'En el listado'}</span>
                </div>
                <div className="ui-stat">
                    <span className="ui-stat__label">Página</span>
                    <span className="ui-stat__value">
                        {pagination.page}<span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}> / {pagination.pages || 1}</span>
                    </span>
                    <span className="ui-stat__sub">{pagination.limit} por página</span>
                </div>
            </div>

            <div className="sl-filters">
                <label className="sl-filter-count" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
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
                <Button
                    variant="secondary"
                    onClick={reload}
                    disabled={loading}
                    aria-label="Refrescar listado"
                >
                    <RefreshCw size={16} aria-hidden="true" />
                    Refrescar
                </Button>
            </div>

            {atLimit && !loading && !error && (
                <div
                    role="status"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 14px', marginBottom: 16, borderRadius: 10,
                        fontSize: '0.82rem',
                        color: 'var(--color-warning)',
                        background: 'color-mix(in oklch, var(--color-warning) 12%, transparent)',
                        border: '1px solid color-mix(in oklch, var(--color-warning) 30%, transparent)',
                    }}
                >
                    <AlertTriangle size={15} aria-hidden="true" />
                    <span>
                        Se cargaron los primeros {totalAll} estudiantes. Si falta alguien, refina la búsqueda;
                        el listado completo requerirá búsqueda en servidor.
                    </span>
                </div>
            )}

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
                                    <EmptyState
                                        tone="danger"
                                        icon={<AlertTriangle size={26} />}
                                        title="No se pudieron cargar los estudiantes"
                                        description={error}
                                        action={
                                            <Button variant="secondary" onClick={reload}>
                                                <RefreshCw size={16} aria-hidden="true" /> Reintentar
                                            </Button>
                                        }
                                    />
                                </td>
                            </tr>
                        )}

                        {!loading && !error && estudiantes.length === 0 && (
                            <tr>
                                <td colSpan={5} className="sl-table__td">
                                    <EmptyState
                                        icon={search.trim() ? <Search size={26} /> : <Users size={26} />}
                                        title="Sin resultados"
                                        description={search.trim()
                                            ? `No se encontró "${search}".`
                                            : 'Aún no hay estudiantes registrados.'}
                                    />
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
                                    <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{s.email || '—'}</span>
                                </td>
                                <td className="sl-table__td">
                                    <Badge tone="neutral">{s.carrera || '—'}</Badge>
                                </td>
                                <td className="sl-table__td">
                                    <Badge tone={s.activo ? 'success' : 'neutral'} dot>
                                        {s.activo ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </td>
                                <td className="sl-table__td sl-table__td--center">
                                    <ChevronRight size={18} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
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
        () => all.filter((s) => matchesText(`${s.nombre ?? ''} ${s.carnet ?? ''}`, initialSearch)),
        [all, initialSearch],
    );

    return (
        <>
            <div className="ui-stat-grid">
                <div className="ui-stat">
                    <span className="ui-stat__label">Total {filter === 'aprobados' ? 'aprobados' : 'no aprobados'}</span>
                    <span className="ui-stat__value">{all.length}</span>
                    <span className="ui-stat__sub">{filter === 'aprobados' ? 'Cumplen tesis' : 'No cumplen tesis'}</span>
                </div>
                <div className="ui-stat">
                    <span className="ui-stat__label">Mostrando</span>
                    <span className="ui-stat__value">{filtered.length}</span>
                    <span className="ui-stat__sub">Resultados del filtro</span>
                </div>
            </div>

            <div className="sl-filters">
                <Button
                    variant="secondary"
                    onClick={load}
                    disabled={loading}
                    aria-label="Refrescar listado"
                    style={{ marginLeft: 'auto' }}
                >
                    <RefreshCw size={16} aria-hidden="true" />
                    Refrescar
                </Button>
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
                                    <EmptyState
                                        tone="danger"
                                        icon={<AlertTriangle size={26} />}
                                        title="No se pudo cargar el listado"
                                        description={error}
                                        action={
                                            <Button variant="secondary" onClick={load}>
                                                <RefreshCw size={16} aria-hidden="true" /> Reintentar
                                            </Button>
                                        }
                                    />
                                </td>
                            </tr>
                        )}

                        {!loading && !error && filtered.length === 0 && (
                            <tr>
                                <td colSpan={4} className="sl-table__td">
                                    <EmptyState
                                        icon={initialSearch.trim() ? <Search size={26} /> : <Users size={26} />}
                                        title="Sin resultados"
                                        description={initialSearch.trim()
                                            ? `No se encontró "${initialSearch}".`
                                            : filter === 'aprobados'
                                                ? 'Aún no hay estudiantes que aprueben tesis.'
                                                : 'No hay estudiantes reprobados o pendientes.'}
                                    />
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
                                    <Badge tone={filter === 'aprobados' ? 'success' : 'danger'} dot>
                                        {filter === 'aprobados' ? 'Aprueba tesis' : 'No cumple'}
                                    </Badge>
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

const TableSkeleton: React.FC<{ rows: number; cols: number }> = ({ rows, cols }) => (
    <>
        {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="sl-table__tr">
                <td className="sl-table__td">
                    <div className="sl-student-cell">
                        <Skeleton variant="circle" />
                        <div>
                            <Skeleton size="medium" />
                            <Skeleton size="short" style={{ marginTop: 4 }} />
                        </div>
                    </div>
                </td>
                {Array.from({ length: cols - 1 }).map((_, j) => (
                    <td key={j} className="sl-table__td">
                        <Skeleton size="medium" />
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
                    {page} <span style={{ color: 'var(--text-muted)' }}>/ {pages || 1}</span>
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
