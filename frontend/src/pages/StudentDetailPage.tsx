import React, { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { ChevronLeft, Mail, IdCard, GraduationCap, ClipboardList, Pencil, Plus, Inbox, AlertTriangle } from 'lucide-react';
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
import type { CursoNotaResumen, EstadoTesis, Estudiante, Nota, ReporteEstudiante } from '../types/api';
import { Button, EmptyState, Skeleton } from '../components/ui';
import '../features/ternas/styles/ternas.css';
import '../styles/transitions.css';
import '../styles/student-detail.css';

const CURSO_NAMES: Record<string, string> = {
    '043': 'Proyecto de Graduación I',
    '049': 'Proyecto de Graduación II',
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
                <div className="view-transition" key={state.student.id}>
                    <header className="ternas-page__header sd-student-header">
                        <div className="sd-record__identity">
                            <p className="sd-record__kicker">Expediente académico · PG1–PG2</p>
                            <h1 className="sd-student-name">{state.student.nombre}</h1>
                            <div className="sd-student-meta">
                                <span className="sd-id-chip">
                                    <IdCard size={15} aria-hidden="true" />
                                    <span className="sd-id-chip__label">Carné</span>
                                    <span className="sd-id-chip__value">{state.student.carnet}</span>
                                </span>
                                {state.student.email && (
                                    <a className="sd-email" href={`mailto:${state.student.email}`}>
                                        <Mail size={15} aria-hidden="true" />
                                        {state.student.email}
                                    </a>
                                )}
                            </div>
                        </div>

                        {tesisInput && (
                            <div className="sd-record__status">
                                <span className="sd-record__status-label">Estado de tesis</span>
                                <ThesisStatusBadge estado={tesisInput} variant="badge" />
                                {tesisInput.promedio != null && (
                                    <span className="sd-record__avg">
                                        Promedio general
                                        <strong>{Number(tesisInput.promedio).toFixed(2)}</strong>
                                    </span>
                                )}
                            </div>
                        )}
                    </header>

                    <div className="terna-detail-grid sd-detail-grid">
                        <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <article className="tdetail-card">
                                <h2 className="tdetail-card__title">
                                    <GraduationCap size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                    Notas registradas
                                </h2>

                                <div className="tdetail-evaluators sd-grade-rows">
                                    {grads.length === 0 && missingCursos.length === ALL_CURSOS.length && (
                                        <div className="sd-empty-grades">
                                            <Inbox size={32} className="sd-empty-grades__icon" aria-hidden="true" />
                                            <p className="sd-empty-grades__msg">Sin notas registradas</p>
                                        </div>
                                    )}
                                    {grads.map((g) => {
                                        const rowMod = g.estado === 'APROBADO' ? 'sd-row--pass'
                                                     : g.estado === 'NSP'      ? 'sd-row--nsp'
                                                     : 'sd-row--fail';
                                        const chipMod = g.estado === 'APROBADO' ? 'eval-enviada'
                                                      : g.estado === 'NSP'      ? 'eval-empty'
                                                      : 'eval-borrador';
                                        return (
                                        <div key={g.curso} className={`tdetail-evaluator ${rowMod}`}>
                                            <span className="tdetail-evaluator__name">
                                                {g.curso} · {CURSO_NAMES[g.curso] ?? g.curso}
                                                <span className="sd-ciclo">{g.ciclo}</span>
                                            </span>
                                            <span className="tdetail-evaluator__score">{g.nota_final}</span>
                                            <span className={`tdetail-evaluator__estado ${chipMod}`}>
                                                {g.estado}
                                            </span>
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

                            {state.reporte?.terna && (
                                <article className="tdetail-card">
                                    <h2 className="tdetail-card__title">
                                        <ClipboardList size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                        Resultado de Terna
                                    </h2>
                                    <dl className="tdetail-meta">
                                        <dt>Terna</dt>
                                        <dd>#{String(state.reporte.terna.numero).padStart(2, '0')}</dd>
                                        <dt>Promedio</dt>
                                        <dd>
                                            {state.reporte.terna.promedio != null
                                                ? Number(state.reporte.terna.promedio).toFixed(2)
                                                : '— (pendiente)'}
                                        </dd>
                                        <dt>Resolución</dt>
                                        <dd>{RESOLUCION_LABEL[state.reporte.terna.resolucion] ?? state.reporte.terna.resolucion}</dd>
                                        <dt>Evaluaciones</dt>
                                        <dd>
                                            {state.reporte.terna.evaluaciones_enviadas} de{' '}
                                            {state.reporte.terna.total_evaluadores}
                                        </dd>
                                    </dl>
                                </article>
                            )}
                        </section>

                        <aside className="sd-detail-side">
                            {tesisInput && (
                                <ThesisStatusBadge estado={tesisInput} title="Estado de Tesis (PG1 + PG2)" />
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
    <div className="tdetail-skeleton" aria-busy="true" aria-label="Cargando información del estudiante">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height={26} width="45%" />
            <Skeleton height={14} width="35%" />
        </div>

        <div className="terna-detail-grid">
            <div className="tdetail-card">
                <Skeleton height={11} width="30%" />
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="dash-skeleton-row">
                        <div className="dash-skeleton-row__lines" style={{ flex: 1 }}>
                            <Skeleton size="medium" />
                            <Skeleton size="short" />
                        </div>
                        <Skeleton width={36} />
                        <Skeleton width={60} />
                    </div>
                ))}
            </div>

            <div className="tdetail-card" style={{ gap: 16 }}>
                <Skeleton height={11} width="55%" />
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Skeleton variant="box" />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Skeleton height={18} width="70%" />
                        <Skeleton size="short" />
                    </div>
                </div>
                {[...Array(2)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <Skeleton size="medium" />
                        <Skeleton height={8} width="100%" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export default StudentDetailPage;
