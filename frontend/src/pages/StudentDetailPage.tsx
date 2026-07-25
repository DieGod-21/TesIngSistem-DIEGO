import React, { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { ChevronLeft, Mail, GraduationCap, Users, Pencil, Plus, Inbox, AlertTriangle, IdCard, Clock, CircleDot, ArrowRight } from 'lucide-react';
import ThesisStatusBadge from '../components/thesis/ThesisStatusBadge';
import EditNotaModal from '../components/EditNotaModal';
import { getEstudianteById } from '../services/estudiantesService';
import { getReporteEstudiante } from '../services/reportesService';
import { getNotasByEstudianteId } from '../services/notasService';
import { isCancel } from '../services/apiClient';
import { userMessageFor } from '../services/errorMessages';
import {
    buildCursosResumen,
    computeEstadoTesis,
    extractGradesFromNotas,
    extractGradesFromReporte,
    mergeGrades,
} from '../utils/thesisStatus';
import { THESIS_MIN_GRADE } from '../config/apiConfig';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import type { CursoNotaResumen, EstadoTerna, EstadoTesis, Estudiante, Nota, ReporteEstudiante } from '../types/api';
import { Button, EmptyState, Skeleton } from '../components/ui';
import '../features/ternas/styles/ternas.css';
import '../styles/transitions.css';
import '../styles/student-detail.css';

const CURSO_NAMES: Record<string, string> = {
    '043': 'Proyecto de Graduación I',
    '049': 'Proyecto de Graduación II',
};

const CURSO_SHORT: Record<string, string> = {
    '043': 'PG1',
    '049': 'PG2',
};

const RESOLUCION_LABEL: Record<string, string> = {
    aprueba_tesis: 'Aprueba tesis',
    aprueba_curso: 'Aprueba curso',
    reprobado:     'Reprobado',
    pendiente:     'Pendiente',
};

const ALL_CURSOS: Array<'043' | '049'> = ['043', '049'];

const TERNA_ESTADO_LABEL: Record<EstadoTerna, string> = {
    pendiente:   'Pendiente',
    en_progreso: 'En progreso',
    completada:  'Completada',
};

/** Iniciales del estudiante para el monograma del encabezado (solo presentación). */
function buildMonogram(nombre: string): string {
    const parts = nombre.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Fecha corta localizada; null si la entrada no es una fecha válida. */
function formatShortDate(iso?: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface State {
    student: Estudiante | null;
    reporte: ReporteEstudiante | null;
    notas:   Nota[] | null;
    loading: boolean;
    error:   string | null;
}

interface EditModalState {
    open: boolean;
    curso: '043' | '049';
    notaActual: number | null;
}

const StudentDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const { toast } = useToast();
    const { capabilities } = useAuth();
    const [state, setState] = useState<State>({
        student: null, reporte: null, notas: null, loading: true, error: null,
    });
    const [refreshKey, setRefreshKey] = useState(0);
    const [editModal, setEditModal] = useState<EditModalState>({ open: false, curso: '043', notaActual: null });

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;
        const numId = Number(id);
        if (!Number.isFinite(numId)) {
            setState({ student: null, reporte: null, notas: null, loading: false, error: 'ID inválido.' });
            return;
        }

        setState((s) => ({ ...s, loading: true, error: null }));

        (async () => {
            try {
                // Cadena por dependencia: el reporte necesita el carné del
                // estudiante y las notas son una carga condicional. La señal se
                // propaga a la red para cancelar de verdad al navegar.
                const student = await getEstudianteById(numId, { signal });
                if (signal.aborted) return;
                const reporte = await getReporteEstudiante(student.carnet, { signal }).catch(() => null);
                if (signal.aborted) return;

                const fromReporte = extractGradesFromReporte(reporte);
                let notas: Nota[] | null = null;
                if (fromReporte.pg1 == null || fromReporte.pg2 == null) {
                    const notasResp = await getNotasByEstudianteId(numId, { signal }).catch(() => null);
                    if (signal.aborted) return;
                    notas = notasResp?.notas ?? null;
                }

                setState({ student, reporte, notas, loading: false, error: null });
            } catch (e) {
                // Cancelación: nunca es un error de UI.
                if (signal.aborted || isCancel(e)) return;
                setState({
                    student: null, reporte: null, notas: null, loading: false,
                    error: userMessageFor(e),
                });
            }
        })();

        return () => controller.abort();
    }, [id, refreshKey]);

    const grads: CursoNotaResumen[] = buildCursosResumen(state.reporte, state.notas);
    const existingCursos = new Set(grads.map((g) => g.curso));
    const missingCursos = ALL_CURSOS.filter((c) => !existingCursos.has(c));

    const pgGrades = mergeGrades(
        extractGradesFromReporte(state.reporte),
        extractGradesFromNotas(state.notas),
    );
    const tesisResult = computeEstadoTesis(pgGrades);

    const tesisInput: EstadoTesis | null = state.student
        ? {
            carnet:        state.student.carnet,
            nombre:        state.student.nombre,
            email:         state.student.email,
            aprueba_tesis: tesisResult.aprobado,
            razon:         tesisResult.estado === 'APROBADO'
                ? `Cumple con la nota mínima (${THESIS_MIN_GRADE}) en PG1 y PG2.`
                : tesisResult.estado === 'PENDIENTE'
                    ? 'Faltan notas de PG1 y/o PG2.'
                    : `No alcanza la nota mínima (${THESIS_MIN_GRADE}) en PG1 y/o PG2.`,
            nota_minima:   THESIS_MIN_GRADE,
            promedio:      state.reporte?.promedio ?? null,
            graduacion_1:  grads.find((g) => g.curso === '043') ?? null,
            graduacion_2:  grads.find((g) => g.curso === '049') ?? null,
        }
        : null;

    // ── Valores derivados de presentación (sin lógica de negocio nueva) ──
    const terna = state.reporte?.terna ?? null;
    const promedioGeneral = state.reporte?.promedio ?? null;
    const monogram = state.student ? buildMonogram(state.student.nombre) : '';
    const ternaPct = terna && terna.total_evaluadores > 0
        ? Math.round((terna.evaluaciones_enviadas / terna.total_evaluadores) * 100)
        : 0;
    // "Última actividad": la nota más reciente si existe; si no, el alta del expediente.
    const lastActivity = ((): { label: string; value: string } | null => {
        let latest = 0;
        if (Array.isArray(state.notas)) {
            for (const n of state.notas) {
                const t = n?.updated_at ? Date.parse(n.updated_at) : NaN;
                if (!Number.isNaN(t) && t > latest) latest = t;
            }
        }
        if (latest > 0) {
            const v = formatShortDate(new Date(latest).toISOString());
            if (v) return { label: 'Última nota', value: v };
        }
        const created = formatShortDate(state.student?.created_at);
        if (created) return { label: 'Registrado', value: created };
        return null;
    })();

    // Fecha de última actualización de una nota concreta (si /notas la trae).
    const notaUpdatedByCurso = (curso: string): string | null => {
        if (!Array.isArray(state.notas)) return null;
        const n = state.notas.find((x) => x?.curso_codigo === curso && x?.updated_at);
        return n?.updated_at ? formatShortDate(n.updated_at) : null;
    };

    // Estado vacío de terna consciente del prerrequisito (deriva del estado de tesis real).
    const ternaHint = ((): { title: string; msg: string; step: string } => {
        if (tesisResult.estado === 'APROBADO') {
            return {
                title: 'Elegible · sin terna',
                msg:   'Cumple el requisito de tesis (PG1 + PG2).',
                step:  'Siguiente paso: conformar el comité evaluador (3 evaluadores).',
            };
        }
        if (tesisResult.estado === 'REPROBADO') {
            return {
                title: 'Terna no disponible',
                msg:   'No se alcanza la nota mínima en PG1 y/o PG2.',
                step:  'Se asigna al recuperar la elegibilidad de tesis.',
            };
        }
        return {
            title: 'Terna pendiente',
            msg:   'Faltan notas de PG1 y/o PG2 para evaluar la elegibilidad.',
            step:  'Registra las notas para habilitar la asignación de terna.',
        };
    })();

    const openEdit = (curso: '043' | '049', notaActual: number | null) =>
        setEditModal({ open: true, curso, notaActual });

    const handleSaved = () => {
        setEditModal((m) => ({ ...m, open: false }));
        setRefreshKey((k) => k + 1);
        toast.success('Nota guardada correctamente.');
    };

    return (
        <div className="ternas-page">
            <Button
                variant="secondary"
                onClick={() => history.goBack()}
                style={{ alignSelf: 'flex-start' }}
            >
                <ChevronLeft size={16} aria-hidden="true" />
                Volver
            </Button>

            {state.loading && <StudentDetailSkeleton />}
            {!state.loading && state.error && (
                <EmptyState
                    tone="danger"
                    icon={<AlertTriangle size={26} />}
                    title="No se pudo cargar el estudiante"
                    description={state.error}
                />
            )}

            {!state.loading && !state.error && state.student && (
                <div className="view-transition sd-record" key={state.student.id}>
                    {/* ── Resumen ejecutivo: identidad + veredicto + promedio ─ */}
                    <header className="sd-hero">
                        <div className="sd-hero__identity">
                            <span className="sd-avatar" aria-hidden="true">{monogram}</span>
                            <div className="sd-hero__headings">
                                <p className="sd-hero__kicker">Expediente académico</p>
                                <h1 className="sd-hero__name">{state.student.nombre}</h1>
                                <div className="sd-hero__sub">
                                    {state.student.carrera && (
                                        <span className="sd-hero__career">{state.student.carrera}</span>
                                    )}
                                    {state.student.carrera && state.student.email && (
                                        <span className="sd-hero__dot" aria-hidden="true">·</span>
                                    )}
                                    {state.student.email && (
                                        <a className="sd-hero__email" href={`mailto:${state.student.email}`}>
                                            <Mail size={13} aria-hidden="true" />
                                            {state.student.email}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {tesisInput && (
                            <div className="sd-hero__verdict">
                                <span className="sd-hero__verdict-label">Estado de tesis</span>
                                <ThesisStatusBadge estado={tesisInput} variant="badge" />
                                {promedioGeneral != null && (
                                    <span className="sd-hero__avg">
                                        Promedio
                                        <strong>{Number(promedioGeneral).toFixed(2)}</strong>
                                    </span>
                                )}
                            </div>
                        )}
                    </header>

                    {/* ── KPIs del expediente: datos reales, con jerarquía ──── */}
                    <div className="sd-kpis">
                        <div className="sd-kpi">
                            <span className="sd-kpi__icon"><IdCard size={18} aria-hidden="true" /></span>
                            <div className="sd-kpi__body">
                                <span className="sd-kpi__label">Carné</span>
                                <span className="sd-kpi__value sd-kpi__value--mono">{state.student.carnet}</span>
                            </div>
                        </div>
                        <div className={`sd-kpi ${state.student.activo ? 'sd-kpi--ok' : 'sd-kpi--muted'}`}>
                            <span className="sd-kpi__icon"><CircleDot size={18} aria-hidden="true" /></span>
                            <div className="sd-kpi__body">
                                <span className="sd-kpi__label">Estado</span>
                                <span className="sd-kpi__value">{state.student.activo ? 'Activo' : 'Inactivo'}</span>
                            </div>
                        </div>
                        <div className="sd-kpi">
                            <span className="sd-kpi__icon"><Users size={18} aria-hidden="true" /></span>
                            <div className="sd-kpi__body">
                                <span className="sd-kpi__label">Terna</span>
                                <span className={`sd-kpi__value ${terna ? '' : 'sd-kpi__value--soft'}`}>
                                    {terna ? `#${String(terna.numero).padStart(2, '0')}` : 'Sin asignar'}
                                </span>
                            </div>
                        </div>
                        <div className="sd-kpi">
                            <span className="sd-kpi__icon"><Clock size={18} aria-hidden="true" /></span>
                            <div className="sd-kpi__body">
                                <span className="sd-kpi__label">{lastActivity?.label ?? 'Actividad'}</span>
                                <span className={`sd-kpi__value ${lastActivity ? '' : 'sd-kpi__value--soft'}`}>
                                    {lastActivity?.value ?? 'Sin registro'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Cuerpo del expediente: progreso + notas · terna ──── */}
                    <div className="sd-layout">
                        <div className="sd-main">
                            {tesisInput && (
                                <ThesisStatusBadge estado={tesisInput} title="Progreso académico · PG1 + PG2" />
                            )}

                            <article className="tdetail-card sd-card">
                                <h2 className="tdetail-card__title">
                                    <GraduationCap size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                    Notas registradas
                                </h2>

                                <div className="sd-notes">
                                    {grads.length === 0 && missingCursos.length === ALL_CURSOS.length && (
                                        <div className="sd-empty-grades">
                                            <Inbox size={32} className="sd-empty-grades__icon" aria-hidden="true" />
                                            <p className="sd-empty-grades__msg">Sin notas registradas</p>
                                        </div>
                                    )}
                                    {grads.map((g) => {
                                        const tone = g.estado === 'APROBADO' ? 'pass'
                                                   : g.estado === 'NSP'      ? 'nsp'
                                                   : 'fail';
                                        const updated = notaUpdatedByCurso(g.curso);
                                        return (
                                        <div key={g.curso} className={`sd-note sd-note--${tone}`}>
                                            <span className="sd-note__code">{CURSO_SHORT[g.curso] ?? g.curso}</span>
                                            <div className="sd-note__info">
                                                <span className="sd-note__course">{CURSO_NAMES[g.curso] ?? g.curso}</span>
                                                <span className="sd-note__meta">
                                                    {g.curso} · Ciclo {g.ciclo}{updated ? ` · Act. ${updated}` : ''}
                                                </span>
                                            </div>
                                            <div className="sd-note__grade">
                                                <span className="sd-note__score">{g.nota_final}</span>
                                                <span className={`sd-note__status sd-note__status--${tone}`}>
                                                    {g.estado}
                                                </span>
                                            </div>
                                            {capabilities.canEditGrades && (
                                                <button
                                                    type="button"
                                                    className="nota-edit-btn"
                                                    onClick={() => openEdit(g.curso as '043' | '049', Number(g.nota_final))}
                                                    aria-label={`Editar nota de ${CURSO_NAMES[g.curso] ?? g.curso}`}
                                                >
                                                    <Pencil size={14} aria-hidden="true" />
                                                </button>
                                            )}
                                        </div>
                                        );
                                    })}

                                    {capabilities.canEditGrades && missingCursos.map((curso) => (
                                        <div key={curso} className="nota-add-row">
                                            <span className="nota-add-row__label">
                                                {curso} · {CURSO_NAMES[curso]}
                                            </span>
                                            <button
                                                type="button"
                                                className="nota-add-btn"
                                                onClick={() => openEdit(curso, null)}
                                            >
                                                <Plus size={12} aria-hidden="true" />
                                                Registrar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        </div>

                        <aside className="sd-rail">
                            {terna ? (
                                <article className="tdetail-card sd-card sd-terna">
                                    <h2 className="tdetail-card__title">
                                        <Users size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                        Terna asignada
                                    </h2>

                                    <div className="sd-terna__head">
                                        <span className="sd-terna__num">#{String(terna.numero).padStart(2, '0')}</span>
                                        <span className={`sd-terna-state sd-terna-state--${terna.estado}`}>
                                            {TERNA_ESTADO_LABEL[terna.estado]}
                                        </span>
                                    </div>

                                    <dl className="sd-kv">
                                        <div>
                                            <dt>Resolución</dt>
                                            <dd>{RESOLUCION_LABEL[terna.resolucion] ?? terna.resolucion}</dd>
                                        </div>
                                        <div>
                                            <dt>Promedio de terna</dt>
                                            <dd>
                                                {terna.promedio != null
                                                    ? Number(terna.promedio).toFixed(2)
                                                    : '— pendiente'}
                                            </dd>
                                        </div>
                                    </dl>

                                    <div className="sd-terna__progress">
                                        <div className="sd-terna__progress-head">
                                            <span>Evaluaciones</span>
                                            <span>{terna.evaluaciones_enviadas} / {terna.total_evaluadores}</span>
                                        </div>
                                        <div
                                            className="sd-progressbar"
                                            role="img"
                                            aria-label={`${terna.evaluaciones_enviadas} de ${terna.total_evaluadores} evaluaciones enviadas`}
                                        >
                                            <div
                                                className="sd-progressbar__fill"
                                                style={{ '--pct': `${ternaPct}%` } as React.CSSProperties}
                                            />
                                        </div>
                                    </div>
                                </article>
                            ) : (
                                <article className="tdetail-card sd-card sd-terna sd-terna--empty">
                                    <h2 className="tdetail-card__title">
                                        <Users size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                        Terna asignada
                                    </h2>
                                    <div className="sd-terna__empty">
                                        <span className="sd-terna__empty-icon">
                                            <Users size={20} aria-hidden="true" />
                                        </span>
                                        <div className="sd-terna__empty-text">
                                            <p className="sd-terna__empty-title">{ternaHint.title}</p>
                                            <p className="sd-terna__empty-msg">{ternaHint.msg}</p>
                                        </div>
                                    </div>
                                    <p className="sd-terna__empty-step">
                                        <ArrowRight size={13} aria-hidden="true" />
                                        {ternaHint.step}
                                    </p>
                                </article>
                            )}
                        </aside>
                    </div>
                </div>
            )}

            {state.student && capabilities.canEditGrades && (
                <EditNotaModal
                    open={editModal.open}
                    carnet={state.student.carnet}
                    initialCurso={editModal.curso}
                    initialNota={editModal.notaActual}
                    onClose={() => setEditModal((m) => ({ ...m, open: false }))}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
};

const StudentDetailSkeleton: React.FC = () => (
    <div className="sd-record" aria-busy="true" aria-label="Cargando información del estudiante">
        <div className="sd-hero">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                <Skeleton variant="box" width={56} height={56} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <Skeleton height={11} width="28%" />
                    <Skeleton height={22} width="55%" />
                    <Skeleton height={12} width="42%" />
                </div>
            </div>
            <Skeleton height={26} width={112} />
        </div>

        <div className="sd-kpis">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="sd-kpi">
                    <Skeleton variant="box" width={38} height={38} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                        <Skeleton height={9} width="55%" />
                        <Skeleton height={15} width="78%" />
                    </div>
                </div>
            ))}
        </div>

        <div className="sd-layout">
            <div className="sd-main">
                <div className="tdetail-card sd-card" style={{ gap: 12 }}>
                    <Skeleton height={11} width="45%" />
                    {[...Array(2)].map((_, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <Skeleton size="medium" />
                            <Skeleton height={8} width="100%" />
                        </div>
                    ))}
                </div>
                <div className="tdetail-card sd-card" style={{ gap: 10 }}>
                    <Skeleton height={11} width="30%" />
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="sd-note">
                            <Skeleton variant="box" width={42} height={38} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                                <Skeleton size="medium" />
                                <Skeleton size="short" />
                            </div>
                            <Skeleton width={40} height={26} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="sd-rail">
                <div className="tdetail-card sd-card" style={{ gap: 12 }}>
                    <Skeleton height={11} width="50%" />
                    <Skeleton height={28} width="40%" />
                    <Skeleton height={12} width="100%" />
                    <Skeleton height={8} width="100%" />
                </div>
            </div>
        </div>
    </div>
);

export default StudentDetailPage;
