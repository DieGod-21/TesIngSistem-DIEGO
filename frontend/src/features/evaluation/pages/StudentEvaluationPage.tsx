import React from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import AppShell from '../../../layout/AppShell';
import StudentInfoCard from '../components/StudentInfoCard';
import EvaluatorList from '../components/EvaluatorList';
import CriteriaItem from '../components/CriteriaItem';
import ObservationBox from '../components/ObservationBox';
import ActionButtons from '../components/ActionButtons';
import { useEvaluationForm } from '../hooks/useEvaluationForm';
import '../styles/evaluation.css';

const EvalSkeleton: React.FC = () => (
    <div className="ev-eval-layout" aria-busy="true" aria-label="Cargando evaluación…">
        <div className="ev-eval-layout__left">
            <div className="ev-skeleton-card" style={{ height: 280 }}>
                <div className="skeleton skeleton--circle" style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 0.5rem' }} />
                <div className="skeleton skeleton--line skeleton--medium" />
                <div className="skeleton skeleton--line skeleton--short" />
            </div>
            <div className="ev-skeleton-card" style={{ height: 140 }}>
                <div className="skeleton skeleton--line skeleton--medium" />
                <div className="skeleton skeleton--line skeleton--medium" />
                <div className="skeleton skeleton--line skeleton--short" />
            </div>
        </div>
        <div className="ev-eval-layout__right">
            <div className="ev-skeleton-card" style={{ height: 260 }}>
                <div className="skeleton skeleton--line skeleton--medium" />
                <div className="skeleton skeleton--line skeleton--medium" />
                <div className="skeleton skeleton--line skeleton--medium" />
            </div>
            <div className="ev-skeleton-card" style={{ height: 140 }} />
            <div className="ev-skeleton-card" style={{ height: 100 }} />
        </div>
    </div>
);

const StudentEvaluationPage: React.FC = () => {
    const { panelId } = useParams<{ panelId: string }>();
    const history = useHistory();

    const {
        student, criteria, evaluators,
        loading, error,
        scores, observations,
        submitting, saving,
        submitted, draftSaved,
        setScore, setObservations,
        handleSubmit, handleSaveDraft,
    } = useEvaluationForm(panelId);

    return (
        <AppShell>
            <div className="ev-eval-page">
                <div className="ev-eval-page__header">
                    <nav className="ev-breadcrumb" aria-label="Ruta de navegación">
                        <button
                            type="button"
                            className="ev-breadcrumb__item"
                            onClick={() => history.push('/evaluation')}
                        >
                            Ternas
                        </button>
                        <span className="ev-breadcrumb__sep" aria-hidden="true">›</span>
                        <span className="ev-breadcrumb__current">
                            Terna {panelId.replace('panel-', '').padStart(2, '0')}
                        </span>
                    </nav>
                    <div className="ev-eval-page__title-row">
                        <button
                            type="button"
                            className="ev-eval-page__back"
                            onClick={() => history.push('/evaluation')}
                            aria-label="Volver a ternas"
                        >
                            <ChevronLeft size={16} aria-hidden="true" />
                            Volver
                        </button>
                        <h1 className="ev-eval-page__title">
                            Terna {panelId.replace('panel-', '').padStart(2, '0')}
                        </h1>
                    </div>
                </div>

                {loading && <EvalSkeleton />}

                {!loading && error && (
                    <p className="ev-error" role="alert">{error}</p>
                )}

                {!loading && !error && student && (
                    <div className="ev-eval-layout">

                        {/* ── Columna izquierda ── */}
                        <aside className="ev-eval-layout__left" aria-label="Información del estudiante">
                            <StudentInfoCard student={student} />
                            <EvaluatorList evaluators={evaluators} />
                        </aside>

                        {/* ── Columna derecha ── */}
                        <section className="ev-eval-layout__right" aria-label="Formulario de evaluación">
                            <div className="ev-section">
                                <h2 className="ev-section__title">Criterios de Evaluación</h2>
                                {criteria.map((c) => (
                                    <CriteriaItem
                                        key={c.id}
                                        criterion={c}
                                        score={scores[c.id] ?? 0}
                                        onChange={setScore}
                                    />
                                ))}
                            </div>

                            <ObservationBox
                                value={observations}
                                onChange={setObservations}
                            />

                            <ActionButtons
                                onSubmit={handleSubmit}
                                onSaveDraft={handleSaveDraft}
                                submitting={submitting}
                                saving={saving}
                                submitted={submitted}
                                draftSaved={draftSaved}
                            />
                        </section>
                    </div>
                )}
            </div>
        </AppShell>
    );
};

export default StudentEvaluationPage;
