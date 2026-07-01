/**
 * ProgressRing.tsx — Anillo de progreso (data-viz).
 *
 * SVG con arco de gradiente aurora que se rellena al montar.
 * Accesible (role=img + aria-label) y respeta prefers-reduced-motion.
 */

import React, { useEffect, useState } from 'react';

interface ProgressRingProps {
    /** Valor 0–100. */
    value: number;
    size?: number;
    stroke?: number;
    /** Texto bajo el porcentaje central. */
    caption?: string;
    /** aria-label descriptivo. */
    ariaLabel?: string;
}

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const ProgressRing: React.FC<ProgressRingProps> = ({
    value,
    size = 140,
    stroke = 13,
    caption,
    ariaLabel,
}) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;

    // Anima el relleno desde 0 al montar.
    const [progress, setProgress] = useState(prefersReducedMotion() ? clamped : 0);
    useEffect(() => {
        if (prefersReducedMotion()) { setProgress(clamped); return; }
        const id = requestAnimationFrame(() => setProgress(clamped));
        return () => cancelAnimationFrame(id);
    }, [clamped]);

    const offset = circumference - (progress / 100) * circumference;

    return (
        <div
            className="ring"
            style={{ width: size, height: size }}
            role="img"
            aria-label={ariaLabel ?? `${clamped}% completado`}
        >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
                <defs>
                    <linearGradient id="ring-aurora" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--aurora-1)" />
                        <stop offset="55%" stopColor="var(--aurora-2)" />
                        <stop offset="100%" stopColor="var(--aurora-3)" />
                    </linearGradient>
                </defs>
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke="var(--border)" strokeWidth={stroke}
                />
                <circle
                    className="ring__arc"
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke="url(#ring-aurora)" strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </svg>
            <div className="ring__center">
                <span className="ring__value">{clamped}<span className="ring__pct">%</span></span>
                {caption && <span className="ring__caption">{caption}</span>}
            </div>
        </div>
    );
};

export default ProgressRing;
