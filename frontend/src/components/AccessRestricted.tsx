/**
 * AccessRestricted.tsx
 *
 * Estado de acceso denegado reutilizable. Renderiza el mismo EmptyState
 * "Acceso restringido" que ya usaban Reportes y su detalle, para que el
 * usuario entienda POR QUÉ no ve la sección en lugar de sufrir un redirect
 * silencioso.
 *
 * Lo usan tanto el guard de rutas (RoleRoute) como las páginas que aplican
 * una verificación de capacidad a nivel de contenido (defensa en profundidad).
 */

import React from 'react';
import { Lock } from 'lucide-react';
import { EmptyState } from './ui';

interface AccessRestrictedProps {
    /** Mensaje contextual; por defecto, el usado históricamente en Reportes. */
    description?: string;
}

const AccessRestricted: React.FC<AccessRestrictedProps> = ({
    description = 'Esta sección es solo para administradores.',
}) => (
    <div className="reportes-page">
        <EmptyState
            tone="neutral"
            icon={<Lock size={26} />}
            title="Acceso restringido"
            description={description}
        />
    </div>
);

export default AccessRestricted;
