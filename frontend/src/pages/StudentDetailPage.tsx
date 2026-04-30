import React, { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { ChevronLeft, Mail, IdCard, GraduationCap, ClipboardList, Pencil, Plus } from 'lucide-react';
import ThesisStatusBadge from '../components/thesis/ThesisStatusBadge';
import EditNotaModal from '../components/EditNotaModal';
import { getEstudianteById } from '../services/estudiantesService';
import { getReporteEstudiante } from '../services/reportesService';
import type { CursoNotaResumen, Estudiante, ReporteEstudiante } from '../types/api';
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
    loading: boolean;
    error: string | null;
}

interface EditModalState {
    open: boolean;
    curso: '043' | '049';
    notaActual: number | null;
}

const StudentDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const [state, setState] = useState<State>({
        student: null, reporte: null, loading: true, error: null,
    });
    const [refreshKey, setRefreshKey] = useState(0);
    const [editModal, setEditModal] = useState<EditModalState>({ open: false, curso: '043', notaActual: null });

    useEffect(() => {
        let canceled = false;
        const numId = Number(id);
        if (!Number.isFinite(numId)) {
            setState({ student: null, reporte: null, loading: false, error: 'ID inválido.' });
            return;
        }

        setState((s) => ({ ...s, loading: true, error: null }));

        (async () => {
            try {
                const student = await getEstudianteById(numId);
                if (canceled) return;
                const reporte = await getReporteEstudiante(student.carnet).catch(() => null);
                if (canceled) return;
                setState({ student, reporte, loading: false, error: null });
            } catch (e) {
                if (canceled) return;
                setState({
                    student: null, reporte: null, loading: false,
                    error: e instanceof Error ? e.message : 'No se pudo cargar el estudiante.',
                });
            }
        })();

        return () => { canceled = true; };
    }, [id, refreshKey]);

    const grads = state.reporte
        ? ([state.reporte.graduacion_1, state.reporte.graduacion_2].filter(Boolean) as CursoNotaResumen[])
        : [];

    const existingCursos = new Set(grads.map((g) => g.curso));
    const missingCursos = ALL_CURSOS.filter((c) => !existingCursos.has(c));

    const openEdit = (curso: '043' | '049', notaActual: number | null) =>
        setEditModal({ open: true, curso, notaActual });

    const handleSaved = () => {
        setEditModal((m) => ({ ...m, open: false }));
        setRefreshKey((k) => k + 1);
    };

    return (
        <div className="ternas-page">
            <button
                type="button"
                className="eval-btn eval-btn--secondary"
                onClick={() => history.goBack()}
                style={{ alignSelf: 'flex-start' }}
            >
                <ChevronLeft size={16} aria-hidden="true" />
                Volver
            </button>

            {state.loading && <StudentDetailSkeleton />}
            {!state.loading && state.error && <div className="terror" role="alert">{state.error}</div>}

            {!state.loading && !state.error && state.student && (
                <div className="view-transition" key={state.student.id}>
                    <header className="ternas-page__header">
                        <h1 className="ternas-page__title">{state.student.nombre}</h1>
                        <p className="ternas-page__subtitle">
                            <IdCard size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            {state.student.carnet}
                            {state.student.email && (
                                <>
                                    {' · '}
                                    <Mail size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                    {state.student.email}
                                </>
                            )}
                        </p>
                    </header>

                    <div className="terna-detail-grid">
                        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <article className="tdetail-card">
                                <h2 className="tdetail-card__title">
                                    <GraduationCap size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                    Notas registradas
                                </h2>

                                <div className="tdetail-evaluators">
                                    {grads.map((g) => (
                                        <div key={g.curso} className="tdetail-evaluator">
                                            <span className="tdetail-evaluator__name">
                                                {g.curso} · {CURSO_NAMES[g.curso] ?? g.curso}
                                                <small style={{ display: 'block', color: '#64748b', fontWeight: 400 }}>
                                                    {g.ciclo}
                                                </small>
                                            </span>
                                            <span className="tdetail-evaluator__score">{g.nota_final}</span>
                                            <span
                                                className={`tdetail-evaluator__estado ${
                                                    g.estado === 'APROBADO' ? 'eval-enviada'
                                                    : g.estado === 'NSP'    ? 'eval-empty'
                                                    : 'eval-borrador'
                                                }`}
                                            >
                                                {g.estado}
                                            </span>
                                            <button
                                                type="button"
                                                className="nota-edit-btn"
                                                onClick={() => openEdit(g.curso as '043' | '049', Number(g.nota_final))}
                                                aria-label={`Editar nota de ${CURSO_NAMES[g.curso] ?? g.curso}`}
                                            >
                                                <Pencil size={14} aria-hidden="true" />
                                            </button>
                                        </div>
                                    ))}

                                    {missingCursos.map((curso) => (
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

                        {state.reporte && (
                            <ThesisStatusBadge estado={state.reporte} title="Estado de Tesis (PG1 + PG2)" />
                        )}
                    </div>
                </div>
            )}

            {state.student && (
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
            <div className="skeleton skeleton--line" style={{ height: 26, width: '45%' }} />
            <div className="skeleton skeleton--line" style={{ height: 14, width: '35%' }} />
        </div>

        <div className="terna-detail-grid">
            <div className="tdetail-card">
                <div className="skeleton skeleton--line" style={{ height: 11, width: '30%' }} />
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="dash-skeleton-row">
                        <div className="dash-skeleton-row__lines" style={{ flex: 1 }}>
                            <div className="skeleton skeleton--line skeleton--medium" />
                            <div className="skeleton skeleton--line skeleton--short" />
                        </div>
                        <div className="skeleton skeleton--line" style={{ width: 36 }} />
                        <div className="skeleton skeleton--line" style={{ width: 60 }} />
                    </div>
                ))}
            </div>

            <div className="tdetail-card" style={{ gap: 16 }}>
                <div className="skeleton skeleton--line" style={{ height: 11, width: '55%' }} />
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="skeleton skeleton--box" />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div className="skeleton skeleton--line" style={{ height: 18, width: '70%' }} />
                        <div className="skeleton skeleton--line skeleton--short" />
                    </div>
                </div>
                {[...Array(2)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div className="skeleton skeleton--line skeleton--medium" />
                        <div className="skeleton skeleton--line" style={{ height: 8, width: '100%' }} />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export default StudentDetailPage;
