/**
 * KpiCard.tsx
 *
 * Tarjeta KPI reutilizable del dashboard.
 * Si `data.navigateTo` existe, la tarjeta actúa como enlace (button) y
 * navega al hacer click.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { resolveIcon } from '../utils/iconRegistry';
import type { KpiData } from '../services/dashboardService';
import { useCountUp } from '../hooks/useCountUp';

interface KpiCardProps {
    data: KpiData;
}

function toNumeric(val: string | number): number | null {
    const n = Number(val);
    return Number.isFinite(n) && String(val).trim() !== '' ? n : null;
}

const AnimatedValue: React.FC<{ value: number }> = ({ value }) => {
    const animated = useCountUp(value);
    return <>{animated}</>;
};

const KpiCard: React.FC<KpiCardProps> = ({ data }) => {
    const history = useHistory();
    const IconComponent = resolveIcon(data.iconName);
    const numericValue = toNumeric(data.value);
    const clickable = !!data.navigateTo;

    const content = (
        <>
            <div className="kpi-card__top">
                <div className="kpi-card__meta">
                    <p className="kpi-card__label">{data.label}</p>
                    <h3 className="kpi-card__value">
                        {numericValue !== null
                            ? <AnimatedValue value={numericValue} />
                            : data.value
                        }{' '}
                        <span
                            className={`kpi-card__trend${data.trendPositive ? ' kpi-card__trend--up' : ' kpi-card__trend--down'}`}
                        >
                            {data.trend}
                        </span>
                    </h3>
                </div>
                {IconComponent && (
                    <div className={`kpi-card__icon-box kpi-card__icon-box--${data.iconVariant}`}>
                        <IconComponent size={24} />
                    </div>
                )}
            </div>

            {data.progressValue !== undefined ? (
                <div
                    className="kpi-card__progress-track"
                    role="progressbar"
                    aria-valuenow={data.progressValue}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${data.label}: ${data.progressValue}%`}
                >
                    <div
                        className="kpi-card__progress-bar"
                        style={{ '--kpi-progress': `${data.progressValue}%` } as React.CSSProperties}
                    />
                </div>
            ) : (
                <p className="kpi-card__description">{data.description}</p>
            )}
        </>
    );

    const className = `kpi-card kpi-card--${data.iconVariant} kpi-card--appear${clickable ? ' kpi-card--clickable' : ''}`;

    if (clickable) {
        return (
            <button
                type="button"
                className={className}
                onClick={() => history.push(data.navigateTo!)}
                aria-label={`${data.label}: ${data.value}. Ver detalle.`}
            >
                {content}
            </button>
        );
    }

    return <article className={className}>{content}</article>;
};

export default KpiCard;
