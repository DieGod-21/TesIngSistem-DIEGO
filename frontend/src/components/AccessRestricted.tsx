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
import { useHistory } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { EmptyState, Button } from './ui';
import { routes } from '../config/routes';

interface AccessRestrictedProps {
    /** Mensaje contextual; por defecto, el usado históricamente en Reportes. */
    description?: string;
}

const AccessRestricted: React.FC<AccessRestrictedProps> = ({
    description = 'Esta sección es solo para administradores.',
}) => {
    const history = useHistory();

    return (
        <div className="reportes-page">
            <EmptyState
                tone="neutral"
                icon={<Lock size={26} />}
                title="Acceso restringido"
                description={description}
                /*
                 * Era el ÚNICO final del producto sin salida: los vacíos
                 * ofrecen «Limpiar filtros» y los errores «Reintentar», pero
                 * aquí no había más camino que la barra lateral. El panel de
                 * control es el destino seguro para cualquier rol —los dos
                 * tienen el suyo— y no toca nada de la autorización: esto se
                 * pinta DESPUÉS de que el guard ya decidió.
                 */
                action={
                    <Button variant="secondary" onClick={() => history.push(routes.dashboard())}>
                        Ir al inicio
                    </Button>
                }
            />
        </div>
    );
};

export default AccessRestricted;
