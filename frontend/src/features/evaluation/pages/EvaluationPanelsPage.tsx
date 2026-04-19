import React from 'react';
import { useHistory } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import AppShell from '../../../layout/AppShell';
import PanelList from '../components/PanelList';
import { usePanels } from '../hooks/usePanels';
import '../styles/evaluation.css';

const PanelsSkeleton: React.FC = () => (
    <div className="ev-skeleton-grid" aria-busy="true" aria-label="Cargando paneles…">
        {[0, 1, 2].map((i) => (
            <div key={i} className="ev-skeleton-card">
                <div className="skeleton skeleton--line skeleton--medium" />
                <div className="skeleton skeleton--line skeleton--short" />
                <div className="skeleton skeleton--line skeleton--medium" />
            </div>
        ))}
    </div>
);

const EvaluationPanelsPage: React.FC = () => {
    const history = useHistory();
    const { panels, loading, error } = usePanels();

    const handleSelectPanel = (panelId: string) => {
        history.push(`/evaluation/${panelId}`);
    };

    const totalPanels  = panels.length;
    const activePanels = panels.filter(p => p.status !== 'completed').length;
    const donePanels   = panels.filter(p => p.status === 'completed').length;

    return (
        <AppShell>
            <div className="ev-panels-page">
                <div className="ev-panels-page__header">
                    <h1 className="ev-panels-page__title">
                        <ClipboardList size={22} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                        Ternas de Evaluación
                    </h1>
                    <p className="ev-panels-page__subtitle">
                        Selecciona una terna para iniciar o continuar la evaluación
                    </p>
                    {!loading && !error && totalPanels > 0 && (
                        <div className="ev-panels-page__stats">
                            <span className="ev-stat-chip ev-stat-chip--total">
                                <span className="ev-stat-chip__dot" aria-hidden="true" />
                                <span className="ev-stat-chip__value">{totalPanels}</span>
                                Total
                            </span>
                            <span className="ev-stat-chip ev-stat-chip--active">
                                <span className="ev-stat-chip__dot" aria-hidden="true" />
                                <span className="ev-stat-chip__value">{activePanels}</span>
                                Activos
                            </span>
                            <span className="ev-stat-chip ev-stat-chip--done">
                                <span className="ev-stat-chip__dot" aria-hidden="true" />
                                <span className="ev-stat-chip__value">{donePanels}</span>
                                Completados
                            </span>
                        </div>
                    )}
                </div>

                {loading && <PanelsSkeleton />}

                {!loading && error && (
                    <p className="ev-error" role="alert">{error}</p>
                )}

                {!loading && !error && (
                    <PanelList panels={panels} onSelectPanel={handleSelectPanel} />
                )}
            </div>
        </AppShell>
    );
};

export default EvaluationPanelsPage;
