import React from 'react';
import { Users, ArrowRight, CheckCircle } from 'lucide-react';
import type { Panel } from '../types/evaluation';

interface PanelCardProps {
    panel: Panel;
    onEnter: (panelId: string) => void;
}

const STATUS_LABEL: Record<Panel['status'], string> = {
    available:   'Disponible',
    in_progress: 'En Progreso',
    completed:   'Completado',
};

const PanelCard: React.FC<PanelCardProps> = ({ panel, onEnter }) => {
    const isCompleted = panel.status === 'completed';
    const pct = panel.evaluatorsTotal > 0
        ? Math.round((panel.evaluatorsConnected / panel.evaluatorsTotal) * 100)
        : 0;

    return (
        <article className={`ev-card ev-card--${panel.status}`}>
            <div className="ev-card__header">
                <h3 className="ev-card__name">{panel.name}</h3>
                <span className={`ev-badge ev-badge--${panel.status}`}>
                    {STATUS_LABEL[panel.status]}
                </span>
            </div>

            <p className="ev-card__description">{panel.description}</p>

            <div className="ev-card__progress-wrap">
                <div className="ev-card__progress-label">
                    <span className="ev-card__progress-text">
                        <Users size={11} aria-hidden="true" />
                        {panel.evaluatorsConnected}/{panel.evaluatorsTotal} evaluadores
                    </span>
                    <span className="ev-card__progress-pct">{pct}%</span>
                </div>
                <div className="ev-card__progress-track">
                    <div
                        className="ev-card__progress-bar"
                        style={{ '--ev-progress': `${pct}%` } as React.CSSProperties}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${pct}% de evaluadores conectados`}
                    />
                </div>
            </div>

            <div className="ev-card__footer">
                <button
                    type="button"
                    className={`ev-card__btn ev-card__btn--${panel.status}`}
                    onClick={() => !isCompleted && onEnter(panel.id)}
                    disabled={isCompleted}
                    aria-label={isCompleted ? 'Terna completada' : `Entrar a ${panel.name}`}
                >
                    {isCompleted ? (
                        <>
                            <CheckCircle size={13} aria-hidden="true" />
                            Completado
                        </>
                    ) : panel.status === 'in_progress' ? (
                        <>
                            Continuar
                            <ArrowRight size={13} aria-hidden="true" />
                        </>
                    ) : (
                        <>
                            Entrar
                            <ArrowRight size={13} aria-hidden="true" />
                        </>
                    )}
                </button>
            </div>
        </article>
    );
};

export default PanelCard;
