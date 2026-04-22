/**
 * StudentsListPage.tsx
 *
 * Listado de estudiantes contra GET /api/estudiantes.
 * Muestra: carnet · nombre · email · carrera · estado (activo/inactivo).
 * Paginación server-side + búsqueda con debounce (query param `search`).
 * Click en fila → /students/:id.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { Search, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, RefreshCw, Users } from 'lucide-react';
import AppShell from '../layout/AppShell';
import { useEstudiantesList } from '../hooks/useEstudiantesList';
import { initials } from '../utils/strings';
import type { Estudiante } from '../types/api';
import '../styles/students-list.css';
import '../styles/student-new.css';

const LIMIT_OPTIONS = [10, 20, 50, 100] as const;

const StudentsListPage: React.FC = () => {
    const history = useHistory();
    const {
        estudiantes, pagination, search, loading, error,
        setSearch, setPage, setLimit, reload,
    } = useEstudiantesList({ limit: 20 });

    const go = (est: Estudiante) => history.push(`/students/${est.id}`);

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
                        </h1>
                        <p className="sl-page-subtitle">
                            Consulta la información, notas y elegibilidad de tesis de los estudiantes registrados.
                        </p>
                    </div>
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
                            {loading && <TableSkeleton rows={Math.min(pagination.limit, 8)} />}

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
            </div>
        </AppShell>
    );
};

// ─── Subcomponentes ──────────────────────────────────────────────────────

const TableSkeleton: React.FC<{ rows: number }> = ({ rows }) => (
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
                {[1, 2, 3, 4].map((j) => (
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
