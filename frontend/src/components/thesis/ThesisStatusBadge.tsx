import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import type { EstadoTesis, CursoNotaResumen, EstadoNota } from '../../types/api';
import './thesis-status.css';

interface Props {
    estado: EstadoTesis;
    variant?: 'badge' | 'card';
    title?: string;
}

type VisualStatus = 'eligible' | 'partial' | 'not_eligible' | 'pending';

interface GradeRow {
    label: 'PG1' | 'PG2';
    name: string;
    score: number | null;
    passes: boolean;
    estado: EstadoNota | null;
}

const STATUS_META: Record<VisualStatus, { label: string; headline: string; Icon: React.ElementType; modifier: string }> = {
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
};

const CURSO_META: Record<string, { label: 'PG1' | 'PG2'; name: string }> = {
    '043': { label: 'PG1', name: 'Proyecto de Graduación I' },
    '049': { label: 'PG2', name: 'Proyecto de Graduación II' },
};

function deriveStatus(estado: EstadoTesis): VisualStatus {
    if (estado.aprueba_tesis) return 'eligible';
    const g1 = estado.graduacion_1;
    const g2 = estado.graduacion_2;
    if (!g1 && !g2) return 'pending';
    const min = estado.nota_minima;
    const passes1 = g1 != null && g1.nota_final >= min && g1.estado !== 'NSP';
    const passes2 = g2 != null && g2.nota_final >= min && g2.estado !== 'NSP';
    if (passes1 || passes2) return 'partial';
    return 'not_eligible';
}

function toGradeRow(g: CursoNotaResumen | null | undefined, nota_minima: number, fallbackLabel: 'PG1' | 'PG2'): GradeRow {
    if (!g) {
        const meta = CURSO_META[fallbackLabel === 'PG1' ? '043' : '049'];
        return { label: meta.label, name: meta.name, score: null, passes: false, estado: null };
    }
    const meta = CURSO_META[g.curso] ?? { label: fallbackLabel, name: g.curso };
    return {
        label:  meta.label,
        name:   meta.name,
        score:  g.nota_final,
        passes: g.nota_final >= nota_minima && g.estado !== 'NSP',
        estado: g.estado,
    };
}

const ThesisStatusBadge: React.FC<Props> = ({ estado, variant = 'card', title }) => {
    const status = deriveStatus(estado);
    const meta = STATUS_META[status];
    const { Icon } = meta;

    if (variant === 'badge') {
        return (
            <span className={`tsb-pill ${meta.modifier}`} aria-label={meta.label}>
                <Icon size={14} aria-hidden="true" />
                <span>{meta.label}</span>
            </span>
        );
    }

    const pg1 = toGradeRow(estado.graduacion_1, estado.nota_minima, 'PG1');
    const pg2 = toGradeRow(estado.graduacion_2, estado.nota_minima, 'PG2');

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
                        Mínimo requerido: <strong>{estado.nota_minima}</strong> en cada curso
                    </p>
                </div>
            </header>

            <div className="tsb-card__grades">
                <CourseProgressRow grade={pg1} minScore={estado.nota_minima} />
                <CourseProgressRow grade={pg2} minScore={estado.nota_minima} />
            </div>

            <footer className="tsb-card__footer">
                {estado.promedio != null && (
                    <span className="tsb-card__avg">
                        Promedio: <strong>{Number(estado.promedio).toFixed(2)}</strong>
                    </span>
                )}
                <p className="tsb-card__reason">{estado.razon}</p>
            </footer>
        </article>
    );
};

const CourseProgressRow: React.FC<{ grade: GradeRow; minScore: number }> = ({ grade, minScore }) => {
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
