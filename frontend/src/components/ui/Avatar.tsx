/**
 * Avatar.tsx — Monograma de identidad del sistema de diseño.
 *
 * Fuente única para representar a una persona. Sustituye a dash-avatar,
 * sl-avatar, sd-avatar y usr-avatar, que resolvían lo mismo con cuatro
 * geometrías, cuatro paletas y cuatro tamaños distintos.
 *
 * El relleno es siempre sólido con texto claro: el contraste queda garantizado
 * en ambos temas sin overrides por clase.
 *
 * Ejemplos:
 *   <Avatar name="Juan Pérez López" />
 *   <Avatar name={u.nombre} tone="success" />           // rol evaluador
 *   <Avatar name={s.nombre} size="xl" shape="square" /> // cabecera de perfil
 */

import React from 'react';
import { initials } from '../../utils/strings';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AvatarTone = 'brand' | 'success';

export interface AvatarProps {
    /**
     * Nombre del que se derivan las iniciales.
     *
     * Es la ÚNICA entrada admitida: no existe una vía para inyectar un
     * monograma ya calculado. Ese escape era precisamente por donde entró la
     * divergencia —la cabecera del expediente calculaba el suyo y mostraba un
     * monograma distinto al del listado para el mismo estudiante—. La regla
     * vive en `utils/strings.initials` y no se puede sortear.
     */
    name: string;
    size?: AvatarSize;
    /** `square` para cabeceras de perfil; `circle` para listas y tablas. */
    shape?: 'circle' | 'square';
    tone?: AvatarTone;
    className?: string;
}

const SIZE_CLASS: Record<AvatarSize, string> = {
    sm: 'ui-avatar--sm',
    md: '',
    lg: 'ui-avatar--lg',
    xl: 'ui-avatar--xl',
};

const Avatar: React.FC<AvatarProps> = ({
    name,
    size = 'md',
    shape = 'circle',
    tone = 'brand',
    className,
}) => {
    const classes = [
        'ui-avatar',
        SIZE_CLASS[size],
        shape === 'square' ? 'ui-avatar--square' : '',
        tone !== 'brand' ? `ui-avatar--${tone}` : '',
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        // Decorativo: el nombre siempre está en el texto adyacente de la fila.
        <span className={classes} aria-hidden="true">
            {initials(name)}
        </span>
    );
};

export default Avatar;
