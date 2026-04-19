import React from 'react';
import type { EvaluationCriteria } from '../types/evaluation';

interface CriteriaItemProps {
    criterion: EvaluationCriteria;
    score: number;
    onChange: (criterionId: string, value: number) => void;
}

const scoreLevel = (s: number): string =>
    s === 0 ? 'zero' : s < 40 ? 'low' : s < 70 ? 'medium' : 'high';

const CriteriaItem: React.FC<CriteriaItemProps> = ({ criterion, score, onChange }) => (
    <div className="ev-criterion" data-level={scoreLevel(score)}>
        <div className="ev-criterion__header">
            <h4 className="ev-criterion__name">{criterion.name}</h4>
            <span className="ev-criterion__score" aria-label={`Puntaje: ${score}`}>
                {score}
            </span>
        </div>
        <p className="ev-criterion__desc">{criterion.description}</p>
        <input
            type="range"
            className="ev-criterion__slider"
            min={0}
            max={100}
            step={1}
            value={score}
            aria-label={`Puntaje para ${criterion.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={score}
            style={{ '--ev-fill': `${score}%` } as React.CSSProperties}
            onChange={(e) => onChange(criterion.id, Number(e.target.value))}
        />
        <div className="ev-criterion__labels" aria-hidden="true">
            <span>0</span>
            <span>50</span>
            <span>100</span>
        </div>
    </div>
);

export default CriteriaItem;
