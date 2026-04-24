/**
 * ThesisStatusBadge.tsx
 *
 * Componente visual para el estado de elegibilidad de tesis.
 * Calculado en frontend a partir de las notas (regla: PG1 ≥ 70 AND PG2 ≥ 70).
 *
 * Variantes:
 *   - 'badge'   → píldora compacta (ideal para listas)
 *   - 'card'    → tarjeta con notas, promedio, razón y barra de progreso (default)
 */

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import type { ThesisEligibilityResult } from '../../utils/thesisEligibility';
import './thesis-status.css';

interface Props {
    result: ThesisEligibilityResult;
    variant?: 'badge' | 'card';
    /** Texto opcional encima de la tarjeta (ej. "Estado de Tesis"). */
    title?: string;
}

const STATUS_META = {
    eligible: {
        label:    'Apto para Tesis',
        headline: 'Cumple requisito de tesis',
        Icon:     CheckCircle2,
        modifier: 'tsb--eligible',
    },
    partial: {
        label:    'Parcial',
        headline: 'No cumple requisito aún',
        Icon:     AlertTriangle,
        modifier: 'tsb--partial',
    },
    not_eligible: {
        label:    'No Apto',
        headline: 'No cumple requisito',
        Icon:     XCircle,
        modifier: 'tsb--not-eligible',
    },
    pending: {
        label:    'Sin notas',
        headline: 'Pendiente',
        Icon:     HelpCircle,
        modifier: 'tsb--pending',
    },
} as const;

const ThesisStatusBadge: React.FC<Props> = ({ result, variant = 'card', title }) => {
    const meta = STATUS_META[result.status];
    const { Icon } = meta;

    if (variant === 'badge') {
        return (
            <span className={`tsb-pill ${meta.modifier}`} aria-label={meta.label}>
                <Icon size={14} aria-hidden="true" />
                <span>{meta.label}</span>
            </span>
        );
    }

    const { pg1, pg2, average, reason, minScore } = result;

    return (
        <article className={`tsb-card ${meta.modifier}`} aria-label={`Estado de tesis: ${meta.label}`}>
            {title && <h3 className="tsb-card__heading">{title}</h3>}

            <header className="tsb-card__header">
                <span className="tsb-card__icon-wrap" aria-hidden="true">
                    <Icon size={22} />
                </span>
                <div>
                    <p className="tsb-card__headline">{meta.headline}</p>
                    <p className="tsb-card__status-label">{meta.label}</p>
                    <p className="tsb-card__min">
                        Mínimo requerido: <strong>{minScore}</strong> en cada curso
                    </p>
                </div>
            </header>

            <div className="tsb-card__grades">
                <CourseProgressRow grade={pg1} minScore={minScore} />
                <CourseProgressRow grade={pg2} minScore={minScore} />
            </div>

            <footer className="tsb-card__footer">
                {average != null && (
                    <span className="tsb-card__avg">
                        Promedio: <strong>{average.toFixed(2)}</strong>
                    </span>
                )}
                <p className="tsb-card__reason">{reason}</p>
            </footer>
        </article>
    );
};

const CourseProgressRow: React.FC<{ grade: ThesisEligibilityResult['pg1']; minScore: number }> = ({ grade, minScore }) => {
    const score = grade.score;
    const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
    const state = score == null ? 'pending' : grade.passes ? 'pass' : 'fail';

    return (
        <div className={`tsb-grade tsb-grade--${state}`}>
            <div className="tsb-grade__head">
                <span className="tsb-grade__label">{grade.label}</span>
                <span className="tsb-grade__name">{grade.name}</span>
                <span className="tsb-grade__score">
                    {score == null ? '—' : score}
                    {grade.estado === 'NSP' && <small> · NSP</small>}
                </span>
            </div>
            <div
                className="tsb-grade__bar"
                role="img"
                aria-label={`${grade.label}: ${score ?? 'sin nota'} de 100 (mínimo ${minScore})`}
            >
                <div className="tsb-grade__fill" style={{ '--bar-fill': `${pct}%` } as React.CSSProperties} />
                <div className="tsb-grade__threshold" style={{ left: `${minScore}%` }} aria-hidden="true">
                    <span className="tsb-grade__threshold-label">{minScore}</span>
                </div>
            </div>
        </div>
    );
};

export default ThesisStatusBadge;
