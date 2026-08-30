/**
 * StudentsListPage.tsx
 *
 * Listado de estudiantes.
 *
 * Dos modos (según la LENTE compartida, ver features/students-workspace/lens):
 *   1. Default → GET /api/estudiantes (paginado, búsqueda server-side)
 *   2. Filtro por tesis → GET /api/tesis/aprobados | /api/tesis/reprobados.
 *      No paginado (backend devuelve el total); búsqueda client-side con
 *      normalización de acentos/casing.
 *
 * La lente vive en la banda de progreso (ProgressBand), que además muestra el
 * pulso del pipeline derivado del dominio (deriveWorkQueue).
 *
 * Query params soportados (compatibilidad hacia atrás):
 *   - status=approved|failed        → lente (preferido)
 *   - filter=aprobados|reprobados   → alias heredado equivalente
 *   - search=<texto> | q=<texto>    → búsqueda inicial (ambos modos)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
    Search, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight,
    RefreshCw, Users, AlertTriangle, Upload,
} from 'lucide-react';
import { useEstudiantesList } from '../hooks/useEstudiantesList';

import { matchesText } from '../utils/text';
import type { Estudiante } from '../types/api';
import {
    getAprobadosTesis, getReprobadosTesis, type TesisEstudiante,
} from '../services/tesisService';
import { isCancel } from '../services/apiClient';
import { getEstudiantesRegistry } from '../services/estudiantesService';
import { auditarElegibilidad } from '../features/students-workspace/domain/eligibility';
import { userMessageFor } from '../services/errorMessages';
import ImportModal from '../components/ImportModal';
import { useAuth } from '../context/AuthContext';
import { Alert, Avatar, Button, Badge, EmptyState, Skeleton, PageHeader } from '../components/ui';
import type { BadgeTone } from '../components/ui';
import { VOCAB } from '../config/vocabulary';
import ProgressBand, { STAGE_LABEL } from '../features/students-workspace/components/ProgressBand';
import StudentQuickView from '../features/students-workspace/components/StudentQuickView';
import WorkQueue from '../features/students-workspace/components/WorkQueue';
import SinceLastVisit from '../features/students-workspace/components/SinceLastVisit';
import { useStudentsPipeline } from '../features/students-workspace/hooks/useStudentsPipeline';
import type { VerdictByCarnet } from '../features/students-workspace/hooks/useStudentsPipeline';
import { useSinceLastVisit } from '../features/students-workspace/hooks/useSinceLastVisit';
import { resolveWorkItemHref } from '../features/students-workspace/navigation';
import type { PipelineStage } from '../features/students-workspace/domain/types';
import {
    parseLens, parseSearchTerm, lensToTesisFilter, buildLensUrl,
    parsePage, parsePerPage, buildListUrl, PER_PAGE_OPTIONS,
    parsePreview, buildPreviewUrl, parseStage, buildStageUrl,
    type LensId,
} from '../features/students-workspace/lens/lens';
import { routes } from '../config/routes';
import '../styles/students-list.css';
import '../styles/transitions.css';

type TesisFilter = 'aprobados' | 'reprobados';

/* Mismas palabras y mismos tonos que la vista rapida y el expediente: el
   coordinador ve «Elegible a tesis» en la lista, en el panel y en la ficha. */
const VERDICT_LABEL: Record<'APROBADO' | 'REPROBADO' | 'PENDIENTE', string> = {
    APROBADO:  VOCAB.verdictEligible,
    REPROBADO: VOCAB.verdictBelowMin,
    PENDIENTE: VOCAB.verdictMissing,
};
const VERDICT_TONE: Record<'APROBADO' | 'REPROBADO' | 'PENDIENTE', BadgeTone> = {
    APROBADO:  'success',
    REPROBADO: 'danger',
    PENDIENTE: 'warning',
};

/**
 * ¿El sistema pide menos movimiento? Un desplazamiento suave es justo el tipo
 * de animación que esa preferencia existe para desactivar.
 */
const PREFIERE_MENOS_MOVIMIENTO = (): boolean =>
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const StudentsListPage: React.FC = () => {
    const history  = useHistory();
    const location = useLocation();
    const { capabilities, usuarioId } = useAuth();
    const activeLens: LensId = useMemo(() => parseLens(location.search), [location.search]);
    const initialSearch = useMemo(() => parseSearchTerm(location.search), [location.search]);
    const filter = useMemo<TesisFilter | null>(() => lensToTesisFilter(activeLens), [activeLens]);
    const [importOpen, setImportOpen] = useState(false);

    // Panorama del pipeline (banda de progreso): única fuente de verdad = dominio.
    // Gated por canViewReports; se recarga cuando cambia la lente para reflejar
    // escrituras recientes sin pelear con la caché.
    const pipeline = useStudentsPipeline(capabilities.canViewReports);

    // "Desde tu última visita": diff calculado en el dominio, per-usuario.
    const sinceDiff = useSinceLastVisit(
        pipeline.result,
        usuarioId != null ? String(usuarioId) : null,
    );

    const goLens = (lens: LensId) => history.push(buildLensUrl(location.search, lens));

    // Acotamiento de la cola por etapa del pipeline. En la URL, como el resto
    // del estado del espacio de trabajo: se comparte, se recarga y el Atrás lo
    // deshace. `replace` porque afinar el alcance no es un destino.
    const activeStage = useMemo(() => parseStage(location.search), [location.search]);
    const goStage = (stage: PipelineStage | null) =>
        history.replace(buildStageUrl(location.search, stage));

    // Búsqueda local integrada con el alcance: escribe en ?search= (URL compartible
    // y sincronizada con el buscador global del TopHeader). Ambas vistas hijas ya
    // consumen `initialSearch` desde la URL, por lo que responden a este input.
    const [searchInput, setSearchInput] = useState(initialSearch);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { setSearchInput(initialSearch); }, [initialSearch]);
    useEffect(() => () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); }, []);

    const onSearchChange = (value: string) => {
        setSearchInput(value);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            // Una búsqueda nueva define un conjunto nuevo: la página vuelve a 1
            // para que la URL nunca describa una página que ya no existe.
            history.replace(buildListUrl(location.search, { search: value, page: null }));
        }, 250);
    };

    return (
        <div className="sl-body">
                {capabilities.canImportStudents && (
                    <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
                )}

                <nav className="ui-breadcrumb" aria-label="Navegación secundaria">
                    <button
                        type="button"
                        className="ui-breadcrumb__item ui-breadcrumb__link"
                        onClick={() => history.push(routes.dashboard())}
                    >
                        Inicio
                    </button>
                    <ChevronRight size={14} className="ui-breadcrumb__sep" aria-hidden="true" />
                    <span className="ui-breadcrumb__item ui-breadcrumb__item--active">Estudiantes</span>
                </nav>

                <PageHeader
                    kicker="Gestión académica"
                    icon={<Users size={22} />}
                    title="Estudiantes"
                    subtitle="Consulta la información, notas y elegibilidad de tesis de los estudiantes registrados."
                    actions={
                        capabilities.canImportStudents ? (
                            <Button onClick={() => setImportOpen(true)}>
                                <Upload size={16} aria-hidden="true" />
                                Importar
                            </Button>
                        ) : undefined
                    }
                />

                <div className="ui-toolbar">
                    <div className="ui-search ui-toolbar__search">
                        <Search size={15} className="ui-search__icon" aria-hidden="true" />
                        <input
                            type="text"
                            className="ui-search__input"
                            placeholder="Buscar por nombre, carné o correo…"
                            value={searchInput}
                            onChange={(e) => onSearchChange(e.target.value)}
                            aria-label="Buscar estudiantes"
                        />
                    </div>
                </div>

                {capabilities.canViewReports && <SinceLastVisit diff={sinceDiff} />}

                {capabilities.canViewReports && (
                    <WorkQueue
                        items={pipeline.result ? pipeline.result.items : null}
                        capabilities={capabilities}
                        loading={pipeline.loading}
                        error={pipeline.error}
                        onOpen={(item) => history.push(resolveWorkItemHref(item))}
                        stage={activeStage}
                        stageLabel={activeStage ? STAGE_LABEL[activeStage] : undefined}
                        onClearStage={() => goStage(null)}
                    />
                )}

                <ProgressBand
                    activeLens={activeLens}
                    onSelectLens={goLens}
                    result={pipeline.result}
                    lensCounts={pipeline.lensCounts}
                    loading={pipeline.loading}
                    error={pipeline.error}
                    activeStage={activeStage}
                    onSelectStage={capabilities.canViewReports ? goStage : undefined}
                />

                <div key={filter ?? 'default'} className="view-transition">
                    {filter
                        ? <TesisFilteredView filter={filter} initialSearch={initialSearch} />
                        : <DefaultStudentsView
                            verdictByCarnet={pipeline.verdictByCarnet}
                            initialSearch={initialSearch}
                            history={history}
                            locationSearch={location.search}
                        />}
                </div>
        </div>
    );
};

// ─── Vista default (paginada, server-side) ──────────────────────────────

const DefaultStudentsView: React.FC<{
    initialSearch: string;
    history: ReturnType<typeof useHistory>;
    locationSearch: string;
    /** Veredicto de tesis por carne, derivado del mismo lote que la cola. */
    verdictByCarnet: VerdictByCarnet | null;
}> = ({ initialSearch, history, locationSearch, verdictByCarnet }) => {
    const urlPage = parsePage(locationSearch);
    const urlPerPage = parsePerPage(locationSearch);

    const {
        estudiantes, pagination, totalAll, atLimit, search, loading, error,
        setSearch, setPage, setLimit, reload,
    } = useEstudiantesList({ limit: urlPerPage, search: initialSearch });

    // Sincroniza la búsqueda con el query param cuando cambia desde fuera
    // (p.ej. el buscador global en TopHeader).
    useEffect(() => {
        if (initialSearch !== search) setSearch(initialSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSearch]);

    // La URL es la fuente de verdad de la paginación: así el estado sobrevive
    // a la ida y vuelta al expediente, al recargar y al compartir el enlace.
    // Flujo único URL → hook; las interacciones solo escriben en la URL.
    useEffect(() => {
        if (urlPage !== pagination.page) setPage(urlPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlPage]);

    useEffect(() => {
        if (urlPerPage !== pagination.limit) setLimit(urlPerPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlPerPage]);

    const goToPage = (p: number) => history.push(buildListUrl(locationSearch, { page: p }));
    const changePerPage = (n: number) =>
        history.replace(buildListUrl(locationSearch, { per: n, page: null }));

    // ── Inspección rápida ──
    // Abrir usa push → el botón Atrás cierra el panel. Recorrer con ↑/↓ usa
    // replace → veinte expedientes revisados siguen siendo un solo Atrás.
    const previewId = parsePreview(locationSearch);
    const previewIndex = previewId
        ? estudiantes.findIndex((e) => String(e.id) === previewId)
        : -1;

    /*
     * Cuando se llega SEÑALANDO a alguien —desde el aviso de expedientes por
     * revisar, o por un enlace compartido— la fila puede estar por debajo del
     * pliegue: la página abre su inspección pero el listado de detrás sigue
     * mostrando el principio, y al cerrar el panel no queda ni rastro de a
     * quién se estaba mirando.
     *
     * Se desplaza UNA sola vez por fila y solo si de verdad hace falta
     * (`nearest` no mueve nada cuando ya se ve). Si el panel se recorre con
     * ↑/↓ no se vuelve a intervenir sobre la misma fila, para no pelear con el
     * desplazamiento del usuario.
     */
    const filaLlevadaAVista = useRef<string | null>(null);
    useEffect(() => {
        if (!previewId || loading) return;
        if (filaLlevadaAVista.current === previewId) return;
        if (previewIndex < 0) return;
        const fila = document.querySelector<HTMLElement>(`[data-student-row="${previewId}"]`);
        if (!fila) return;
        filaLlevadaAVista.current = previewId;
        fila.scrollIntoView({ block: 'nearest', behavior: PREFIERE_MENOS_MOVIMIENTO() ? 'auto' : 'smooth' });
    }, [previewId, previewIndex, loading]);

    const openPreview = (est: Estudiante) =>
        history.push(buildPreviewUrl(locationSearch, String(est.id)));
    const closePreview = () => history.replace(buildPreviewUrl(locationSearch, null));
    const stepPreview = (delta: number) => {
        const next = estudiantes[previewIndex + delta];
        if (next) history.replace(buildPreviewUrl(locationSearch, String(next.id)));
    };

    return (
        <>
            <div className="sl-listbar">
                <p className="sl-listbar__count">
                    <strong>{totalAll}</strong>{' '}
                    {totalAll === 1 ? 'estudiante registrado' : 'estudiantes registrados'}
                    {search.trim() && (
                        <span className="sl-listbar__filtered">
                            {' '}· {pagination.total}{' '}
                            {pagination.total === 1 ? 'coincidencia' : 'coincidencias'}
                        </span>
                    )}
                </p>
                <div className="sl-listbar__utils">
                    <label className="sl-listbar__perpage">
                        <span>Por página</span>
                        <select
                            className="ui-control"
                            value={pagination.limit}
                            onChange={(e) => changePerPage(Number(e.target.value))}
                            aria-label="Resultados por página"
                        >
                            {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
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
            </div>

            {atLimit && !loading && !error && (
                <Alert tone="warning" icon={<AlertTriangle size={15} />}>
                    Se cargaron los primeros {totalAll} estudiantes. Si falta alguien, refina la búsqueda;
                    el listado completo requerirá búsqueda en servidor.
                </Alert>
            )}

            <div className="sl-table-wrap">
                <table className="sl-table" aria-label="Listado de estudiantes">
                    <thead>
                        <tr>
                            <th className="sl-table__th">Estudiante</th>
                            <th className="sl-table__th">Email</th>
                            {/* «Carrera» cede el sitio al ESTADO DE TESIS. La lente de
                                arriba filtra por elegibilidad y la tabla no la mostraba:
                                habia que filtrar o abrir cada ficha para saber quien
                                cumple, en el producto cuyo objeto es precisamente eso.
                                La carrera sigue en el expediente, que es donde se
                                consulta la identidad del alumno. */}
                            <th className="sl-table__th">Tesis</th>
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
                                className={`sl-table__tr sl-table__tr--clickable ui-scroll-anchor${previewId === String(s.id) ? ' sl-table__tr--previewing' : ''}`}
                                data-student-row={s.id}
                                // La fila inspecciona; Enter/clic abren el panel.
                                // El expediente completo es la acción secundaria,
                                // disponible desde el propio panel.
                                onClick={() => openPreview(s)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPreview(s); } }}
                                tabIndex={0}
                                role="button"
                                aria-haspopup="dialog"
                                aria-expanded={previewId === String(s.id)}
                                aria-label={`Vista rápida de ${s.nombre}`}
                            >
                                <td className="sl-table__td">
                                    <div className="sl-student-cell">
                                        <Avatar name={s.nombre} />
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
                                    {(() => {
                                        const v = verdictByCarnet?.get(s.carnet);
                                        if (!v) return <span className="sl-verdict-none">—</span>;
                                        return <Badge tone={VERDICT_TONE[v]} dot>{VERDICT_LABEL[v]}</Badge>;
                                    })()}
                                </td>
                                <td className="sl-table__td">
                                    {/* «Activo» es el estado por defecto de casi todo el
                                        padron: como pildora verde competia con la de
                                        tesis —dos verdes contiguos con significados
                                        distintos— y anulaba el valor de escaneo de la
                                        columna que de verdad importa. El color queda
                                        reservado al veredicto; aqui solo destaca la
                                        EXCEPCION, que es estar inactivo. */}
                                    {s.activo
                                        ? <span className="sl-estado-activo">Activo</span>
                                        : <Badge tone="neutral" dot>Inactivo</Badge>}
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
                    onChange={goToPage}
                />
            )}

            <StudentQuickView
                studentId={previewId}
                onClose={closePreview}
                onOpenFull={(sid) => history.push(routes.studentDetail(sid))}
                onPrev={previewIndex > 0 ? () => stepPreview(-1) : undefined}
                onNext={
                    previewIndex >= 0 && previewIndex < estudiantes.length - 1
                        ? () => stepPreview(1)
                        : undefined
                }
                position={
                    previewIndex >= 0
                        ? { index: previewIndex + 1, total: estudiantes.length }
                        : undefined
                }
            />
        </>
    );
};

// ─── Vista filtrada por tesis (aprobados / reprobados) ────────────────

const TesisFilteredView: React.FC<{
    filter: TesisFilter;
    initialSearch: string;
}> = ({ filter, initialSearch }) => {
    const history = useHistory();
    const [all, setAll]         = useState<TesisEstudiante[]>([]);
    const [notaMinima, setNotaMinima] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    /*
     * Carné → id del padrón.
     *
     * Las listas de tesis identifican por CARNÉ y la ruta del expediente va por
     * id, así que sin este puente las filas no podían abrirse: se llegaba desde
     * el indicador «Elegibles» del panel a una tabla donde no se podía pulsar a
     * nadie, justo al final del camino que el panel invita a recorrer.
     *
     * El padrón es la misma tabla cacheada que ya usan el panel y el listado
     * completo; aquí no cuesta ninguna petición nueva.
     */
    const [idPorCarnet, setIdPorCarnet] = useState<Map<string, number>>(new Map());
    useEffect(() => {
        let vivo = true;
        getEstudiantesRegistry()
            .then((r) => {
                if (vivo) setIdPorCarnet(new Map(r.estudiantes.map((e) => [e.carnet, e.id])));
            })
            .catch(() => { /* sin padrón las filas no navegan, pero la tabla sirve */ });
        return () => { vivo = false; };
    }, []);

    // Cancelación real: al cambiar de filtro rápidamente, la petición anterior
    // se aborta y su respuesta (potencialmente obsoleta) se ignora. Reutiliza
    // la infraestructura existente (AbortController + isCancel).
    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            const resp = filter === 'aprobados'
                ? await getAprobadosTesis({ signal })
                : await getReprobadosTesis({ signal });
            if (signal?.aborted) return;
            setAll(resp.estudiantes);
            setNotaMinima(resp.nota_minima);
        } catch (e) {
            if (signal?.aborted || isCancel(e)) return;
            setError(userMessageFor(e));
            setAll([]);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
    }, [load]);

    const filtered = useMemo(
        () => all.filter((s) => matchesText(`${s.nombre ?? ''} ${s.carnet ?? ''}`, initialSearch)),
        [all, initialSearch],
    );

    /*
     * Qué expedientes de esta lista NO están respaldados por la evidencia que
     * viaja con ellos. Solo aplica al listado de aprobados: es ahí donde el
     * veredicto afirma algo que las notas adjuntas pueden desmentir.
     */
    const sinRespaldo = useMemo(() => {
        if (filter !== 'aprobados') return new Set<string>();
        const a = auditarElegibilidad({ total: all.length, nota_minima: notaMinima, estudiantes: all });
        return new Set(a.observados.map((o) => o.carnet));
    }, [filter, all, notaMinima]);

    const abrir = useCallback((carnet: string) => {
        const id = idPorCarnet.get(carnet);
        if (id != null) history.push(routes.studentDetail(id));
    }, [idPorCarnet, history]);

    return (
        <>
            <div className="sl-listbar">
                <p className="sl-listbar__count">
                    <strong>{all.length}</strong>{' '}
                    {filter === 'aprobados' ? 'aprueban tesis' : 'no aprueban tesis'}
                    {initialSearch.trim() && (
                        <span className="sl-listbar__filtered">
                            {' '}· {filtered.length}{' '}
                            {filtered.length === 1 ? 'coincidencia' : 'coincidencias'}
                        </span>
                    )}
                </p>
                <div className="sl-listbar__utils">
                    <Button
                        variant="secondary"
                        onClick={() => load()}
                        disabled={loading}
                        aria-label="Refrescar listado"
                    >
                        <RefreshCw size={16} aria-hidden="true" />
                        Refrescar
                    </Button>
                </div>
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
                                            <Button variant="secondary" onClick={() => load()}>
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

                        {!loading && !error && filtered.map((s) => {
                            const navegable = idPorCarnet.has(s.carnet);
                            const observado = sinRespaldo.has(s.carnet);
                            return (
                                <tr
                                    key={s.carnet}
                                    className={`sl-table__tr${navegable ? ' sl-table__tr--clickable' : ''}`}
                                    {...(navegable ? {
                                        tabIndex: 0,
                                        role: 'button',
                                        'aria-label': `Abrir el expediente de ${s.nombre}`,
                                        onClick: () => abrir(s.carnet),
                                        onKeyDown: (e: React.KeyboardEvent) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                abrir(s.carnet);
                                            }
                                        },
                                    } : {})}
                                >
                                    <td className="sl-table__td">
                                        <div className="sl-student-cell">
                                            <Avatar name={s.nombre} />
                                            <div>
                                                <p className="sl-student-name">{s.nombre}</p>
                                                <p className="sl-student-carnet">{s.carnet}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="sl-table__td">{s.nota_grad1 ?? '—'}</td>
                                    <td className="sl-table__td">{s.nota_grad2 ?? '—'}</td>
                                    <td className="sl-table__td">
                                        {/* La fila no puede afirmar «Aprueba tesis» cuando las
                                            notas que la acompañan no lo sostienen: es el mismo
                                            expediente que el panel señala arriba, y decir aquí
                                            lo contrario rompería el único hilo que los une.
                                            La palabra es la MISMA que usa el aviso del panel
                                            («revisión»), para que se reconozcan como una sola
                                            cosa al saltar de una pantalla a otra. */}
                                        {observado ? (
                                            <Badge tone="warning" dot>Revisar</Badge>
                                        ) : (
                                            <Badge tone={filter === 'aprobados' ? 'success' : 'danger'} dot>
                                                {filter === 'aprobados' ? 'Aprueba tesis' : 'No cumple'}
                                            </Badge>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
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
