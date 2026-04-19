import React from 'react';
import type { Evaluator } from '../types/evaluation';

interface EvaluatorListProps {
    evaluators: Evaluator[];
}

const EvaluatorList: React.FC<EvaluatorListProps> = ({ evaluators }) => (
    <div className="ev-evaluators">
        <p className="ev-evaluators__title">Evaluadores</p>
        <ul className="ev-evaluators__list" aria-label="Lista de evaluadores">
            {evaluators.map((ev) => (
                <li
                    key={ev.id}
                    className={[
                        'ev-evaluator',
                        `ev-evaluator--${ev.hasSubmitted ? 'submitted' : 'pending'}`,
                        ev.isCurrentUser ? 'ev-evaluator--current' : '',
                    ].join(' ').trim()}
                >
                    <span className="ev-evaluator__dot" aria-hidden="true" />
                    <span className="ev-evaluator__name">{ev.name}</span>
                    {ev.isCurrentUser && (
                        <span className="ev-evaluator__you-tag" aria-label="Tú">Tú</span>
                    )}
                    <span className="ev-evaluator__status">
                        {ev.hasSubmitted ? 'Enviado' : 'Pendiente'}
                    </span>
                </li>
            ))}
        </ul>
    </div>
);

export default EvaluatorList;
