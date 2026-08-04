import React, { useState } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { ChevronLeft, Mail, GraduationCap, Users, Pencil, Plus, Inbox, AlertTriangle, ArrowRight } from 'lucide-react';
import ThesisStatusBadge from '../components/thesis/ThesisStatusBadge';
import EditNotaModal from '../components/EditNotaModal';
import { THESIS_MIN_GRADE } from '../config/apiConfig';
import { useStudentDossier } from '../hooks/useStudentDossier';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import type { CursoNotaResumen, EstadoTesis, Estudiante, Nota, ReporteEstudiante } from '../types/api';
import { Avatar, Badge, Button, EmptyState, Skeleton } from '../components/ui';
import { TERNA_ESTADO_LABEL, TERNA_ESTADO_TONE } from '../utils/ternaStatus';
import { formatShortDate } from '../utils/dates';
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
    const location = useLocation();

    // `location.key` solo existe si se llegó por una navegación interna. Sin él
    // (enlace directo, recarga, vuelta desde otra app) `goBack()` sacaría al
    // usuario del producto: se ofrece el listado como destino explícito.
    const cameFromApp = Boolean(location.key);
    const goBack = () => {
        if (cameFromApp) history.goBack();
        else history.push('/students');
    };
    const { toast } = useToast();
    const { capabilities } = useAuth();
    const [editModal, setEditModal] = useState<EditModalState>({ open: false, curso: '043', notaActual: null });

    // Misma carga y mismos derivados que el panel de inspección rápida del
    // listado: una sola fuente de verdad sobre el estado de tesis.
    const dossier = useStudentDossier(id);
    const state: State = {
        student: dossier.student,
        reporte: dossier.reporte,
        notas:   dossier.notas,
        loading: dossier.loading,
        error:   dossier.error,
    };

    const grads: CursoNotaResumen[] = dossier.grades;
    const tesisResult = dossier.tesis;
    const tesisInput: EstadoTesis | null = dossier.tesisInput;

    // ── Valores derivados de presentación (sin lógica de negocio nueva) ──
    const terna = dossier.terna;
    const promedioGeneral = dossier.promedio;
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
        dossier.reload();
        toast.success('Nota guardada correctamente.');
    };

    return (
        <div className="ternas-page">
            <Button
                variant="secondary"
                onClick={goBack}
                style={{ alignSelf: 'flex-start' }}
            >
                <ChevronLeft size={16} aria-hidden="true" />
                {cameFromApp ? 'Volver' : 'Ir al listado'}
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
                    {/* ── Encabezado de perfil: quién es · veredicto · stats ─ */}
                    <header className="sd-hero">
                        <div className="sd-hero__top">
                            <div className="sd-hero__identity">
                                <Avatar name={state.student.nombre} size="xl" shape="square" />
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
                                </div>
                            )}
                        </div>

                        {/* Stats integradas al encabezado (sin cajas, una sola superficie) */}
                        <dl className="sd-hero__stats">
                            <div className="sd-stat">
                                <dt className="sd-stat__label">Carné</dt>
                                <dd className="sd-stat__value sd-stat__value--mono">{state.student.carnet}</dd>
                            </div>
                            <div className="sd-stat">
                                <dt className="sd-stat__label">Estado</dt>
                                <dd className="sd-stat__value">
                                    <span className={`sd-state ${state.student.activo ? 'sd-state--on' : 'sd-state--off'}`}>
                                        <span className="sd-state__dot" aria-hidden="true" />
                                        {state.student.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </dd>
                            </div>
                            <div className="sd-stat">
                                <dt className="sd-stat__label">Promedio</dt>
                                <dd className="sd-stat__value sd-stat__value--num">
                                    {promedioGeneral != null ? Number(promedioGeneral).toFixed(2) : '—'}
                                </dd>
                            </div>
                            <div className="sd-stat">
                                <dt className="sd-stat__label">Terna</dt>
                                <dd className={`sd-stat__value ${terna ? '' : 'sd-stat__value--soft'}`}>
                                    {terna ? `#${String(terna.numero).padStart(2, '0')}` : 'Sin asignar'}
                                </dd>
                            </div>
                            <div className="sd-stat">
                                <dt className="sd-stat__label">{lastActivity?.label ?? 'Actividad'}</dt>
                                <dd className={`sd-stat__value ${lastActivity ? '' : 'sd-stat__value--soft'}`}>
                                    {lastActivity?.value ?? 'Sin registro'}
                                </dd>
                            </div>
                        </dl>
                    </header>

                    {/* ── Cuerpo del expediente: progreso + notas · terna ──── */}
                    <div className="sd-layout">
                        <div className="sd-main">
                            <section className="sd-surface">
                                <header className="sd-surface__head">
                                    <h2 className="sd-surface__title">
                                        <GraduationCap size={15} aria-hidden="true" />
                                        Notas de graduación
                                    </h2>
                                    <span className="sd-surface__hint">Mínimo para tesis · {THESIS_MIN_GRADE}</span>
                                </header>

                                {grads.length === 0 && !capabilities.canEditGrades && (
                                    <div className="sd-empty-grades">
                                        <Inbox size={30} className="sd-empty-grades__icon" aria-hidden="true" />
                                        <p className="sd-empty-grades__msg">Sin notas registradas</p>
                                    </div>
                                )}

                                <ol className="sd-timeline">
                                    {ALL_CURSOS.map((curso) => {
                                        const g = grads.find((x) => x.curso === curso);
                                        if (g) {
                                            const tone = g.estado === 'APROBADO' ? 'pass'
                                                       : g.estado === 'NSP'      ? 'nsp'
                                                       : 'fail';
                                            const updated = notaUpdatedByCurso(curso);
                                            const pct = Math.max(0, Math.min(100, Number(g.nota_final) || 0));
                                            return (
                                                <li key={curso} className={`sd-rec sd-rec--${tone}`}>
                                                    <span className="sd-rec__node" aria-hidden="true" />
                                                    <div className="sd-rec__main">
                                                        <div className="sd-rec__line">
                                                            <span className="sd-rec__code">{CURSO_SHORT[curso] ?? curso}</span>
                                                            <span className="sd-rec__title">{CURSO_NAMES[curso] ?? curso}</span>
                                                            <span className="sd-rec__period">
                                                                Ciclo {g.ciclo}{updated ? ` · ${updated}` : ''}
                                                            </span>
                                                        </div>
                                                        <div
                                                            className="sd-meter"
                                                            role="img"
                                                            aria-label={`Nota ${g.nota_final} de 100 · mínimo ${THESIS_MIN_GRADE}`}
                                                        >
                                                            <span className="sd-meter__fill" style={{ width: `${pct}%` }} />
                                                            <span className="sd-meter__tick" style={{ left: `${THESIS_MIN_GRADE}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="sd-rec__grade">
                                                        <span className="sd-rec__score">{g.nota_final}</span>
                                                        <span className="sd-rec__status">{g.estado}</span>
                                                    </div>
                                                    {capabilities.canEditGrades && (
                                                        <button
                                                            type="button"
                                                            className="nota-edit-btn"
                                                            onClick={() => openEdit(curso, Number(g.nota_final))}
                                                            aria-label={`Editar nota de ${CURSO_NAMES[curso] ?? curso}`}
                                                        >
                                                            <Pencil size={14} aria-hidden="true" />
                                                        </button>
                                                    )}
                                                </li>
                                            );
                                        }
                                        if (capabilities.canEditGrades) {
                                            return (
                                                <li key={curso} className="sd-rec sd-rec--empty">
                                                    <span className="sd-rec__node" aria-hidden="true" />
                                                    <div className="sd-rec__main">
                                                        <div className="sd-rec__line">
                                                            <span className="sd-rec__code sd-rec__code--muted">{CURSO_SHORT[curso] ?? curso}</span>
                                                            <span className="sd-rec__title">{CURSO_NAMES[curso] ?? curso}</span>
                                                            <span className="sd-rec__period">Sin registrar</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="nota-add-btn"
                                                        onClick={() => openEdit(curso, null)}
                                                    >
                                                        <Plus size={12} aria-hidden="true" />
                                                        Registrar
                                                    </button>
                                                </li>
                                            );
                                        }
                                        return null;
                                    })}
                                </ol>
                            </section>
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
                                        <Badge tone={TERNA_ESTADO_TONE[terna.estado]}>
                                            {TERNA_ESTADO_LABEL[terna.estado]}
                                        </Badge>
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
            <div className="sd-hero__top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 15, flex: 1, minWidth: 0 }}>
                    <Skeleton variant="box" width={56} height={56} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                        <Skeleton height={10} width="26%" />
                        <Skeleton height={21} width="52%" />
                        <Skeleton height={12} width="40%" />
                    </div>
                </div>
                <Skeleton height={24} width={104} />
            </div>
            <div className="sd-hero__stats">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="sd-stat">
                        <Skeleton height={9} width={44} />
                        <Skeleton height={15} width={62} />
                    </div>
                ))}
            </div>
        </div>

        <div className="sd-layout">
            <div className="sd-main">
                <div className="sd-surface" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Skeleton height={13} width="42%" />
                    {[...Array(2)].map((_, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <Skeleton variant="box" width={10} height={10} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                                <Skeleton size="medium" />
                                <Skeleton height={6} width="100%" />
                            </div>
                            <Skeleton width={44} height={30} />
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
