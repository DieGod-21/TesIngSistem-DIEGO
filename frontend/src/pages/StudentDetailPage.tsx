import React, { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { ChevronLeft, Mail, IdCard, GraduationCap } from 'lucide-react';
import ThesisStatusBadge from '../components/thesis/ThesisStatusBadge';
import { getEstudianteById } from '../services/estudiantesService';
import { getTesisEstadoByCarnet } from '../services/tesisService';
import type { Estudiante, EstadoTesis } from '../types/api';
import '../features/ternas/styles/ternas.css';
import '../styles/transitions.css';

const CURSO_NAMES: Record<string, string> = {
    '043': 'Proyecto de Graduación I',
    '049': 'Proyecto de Graduación II',
};

interface State {
    student: Estudiante | null;
    tesisEstado: EstadoTesis | null;
    loading: boolean;
    error: string | null;
}

const StudentDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const [state, setState] = useState<State>({
        student: null, tesisEstado: null, loading: true, error: null,
    });

    useEffect(() => {
        let canceled = false;
        const numId = Number(id);
        if (!Number.isFinite(numId)) {
            setState({ student: null, tesisEstado: null, loading: false, error: 'ID inválido.' });
            return;
        }

        (async () => {
            try {
                const student = await getEstudianteById(numId);
                if (canceled) return;
                const tesisEstado = await getTesisEstadoByCarnet(student.carnet).catch(() => null);
                if (canceled) return;
                setState({ student, tesisEstado, loading: false, error: null });
            } catch (e) {
                if (canceled) return;
                setState({
                    student: null, tesisEstado: null, loading: false,
                    error: e instanceof Error ? e.message : 'No se pudo cargar el estudiante.',
                });
            }
        })();

        return () => { canceled = true; };
    }, [id]);

    const grads = state.tesisEstado
        ? [state.tesisEstado.graduacion_1, state.tesisEstado.graduacion_2].filter(Boolean)
        : [];

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
                            <article className="tdetail-card">
                                <h2 className="tdetail-card__title">
                                    <GraduationCap size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                    Notas registradas
                                </h2>

                                {grads.length === 0 ? (
                                    <div className="eval-locked">
                                        Aún no hay notas registradas para este estudiante.
                                    </div>
                                ) : (
                                    <div className="tdetail-evaluators">
                                        {grads.map((g) => (
                                            <div key={g!.curso} className="tdetail-evaluator">
                                                <span className="tdetail-evaluator__name">
                                                    {g!.curso} · {CURSO_NAMES[g!.curso] ?? g!.curso}
                                                    <small style={{ display: 'block', color: '#64748b', fontWeight: 400 }}>
                                                        {g!.ciclo}
                                                    </small>
                                                </span>
                                                <span className="tdetail-evaluator__score">{g!.nota_final}</span>
                                                <span
                                                    className={`tdetail-evaluator__estado ${
                                                        g!.estado === 'APROBADO' ? 'eval-enviada'
                                                        : g!.estado === 'NSP'     ? 'eval-empty'
                                                        : 'eval-borrador'
                                                    }`}
                                                >
                                                    {g!.estado}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </article>

                            {state.tesisEstado && (
                                <ThesisStatusBadge estado={state.tesisEstado} title="Estado de Tesis (PG1 + PG2)" />
                            )}
                        </div>
                    </div>
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
