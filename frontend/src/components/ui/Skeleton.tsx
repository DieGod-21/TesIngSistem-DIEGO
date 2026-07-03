/**
 * Skeleton.tsx — Placeholder de carga (shimmer) del sistema de diseño.
 *
 * Reemplaza los <div className="skeleton …"> ad-hoc dispersos por las páginas.
 * Reproduce las mismas clases (.skeleton + modificadores, definidas en ui.css)
 * para mantener un único lenguaje visual de carga en toda la app.
 *
 *   <Skeleton />                                  // línea por defecto
 *   <Skeleton size="medium" />                    // ancho preestablecido
 *   <Skeleton variant="circle" />
 *   <Skeleton variant="box" width={38} height={38} radius="50%" />
 */
import React from 'react';

export interface SkeletonProps {
    /** Forma base. 'line' por defecto. */
    variant?: 'line' | 'circle' | 'box';
    /** Ancho preestablecido para líneas. */
    size?: 'short' | 'medium' | 'large';
    width?: number | string;
    height?: number | string;
    radius?: number | string;
    className?: string;
    style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({
    variant = 'line', size, width, height, radius, className, style,
}) => {
    const cls = [
        'skeleton',
        `skeleton--${variant}`,
        size ? `skeleton--${size}` : '',
        className ?? '',
    ].filter(Boolean).join(' ');

    const inline: React.CSSProperties = { ...style };
    if (width  != null) inline.width = width;
    if (height != null) inline.height = height;
    if (radius != null) inline.borderRadius = radius;

    return (
        <div
            className={cls}
            style={Object.keys(inline).length ? inline : undefined}
            aria-hidden="true"
        />
    );
};

export default Skeleton;
