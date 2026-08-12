/**
 * ProgressRing.tsx — Anillo de progreso (data-viz).
 *
 * El arco se pinta con los MISMOS colores semanticos que nombra su leyenda:
 * relleno = cumple (verde), pista = no cumple (ambar). Antes era un degradado
 * aurora indigo-cian mientras la leyenda de al lado mostraba puntos verde y
 * ambar: dos puntos de color que no correspondian a nada en pantalla, en un
 * elemento cuyo unico trabajo es representar una composicion. El anillo era
 * decorativo y decia ser una leyenda.
 *
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
                {/* Pista = la porcion que NO cumple; arco = la que si. */}
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke="var(--ring-track)" strokeWidth={stroke}
                />
                <circle
                    className="ring__arc"
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke="var(--color-success)" strokeWidth={stroke}
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
