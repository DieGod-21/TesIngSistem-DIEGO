/**
 * RoleRoute.tsx
 *
 * Ruta protegida por capacidad. Si el usuario NO posee la capacidad requerida,
 * NO se redirige: se renderiza el estado "Acceso restringido" (AccessRestricted)
 * en lugar de la página, de modo que el usuario entienda por qué no tiene
 * acceso. Además, la página protegida no llega a montarse, evitando peticiones
 * a la API innecesarias.
 *
 * Se integra en un <Switch> igual que PublicRoute: expone `path`/`exact` para
 * que el Switch resuelva la coincidencia y delega el render a un <Route>.
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Capabilities } from '../config/permissions';
import AccessRestricted from '../components/AccessRestricted';

interface RoleRouteProps {
    path: string;
    exact?: boolean;
    /** Capacidad necesaria para acceder a la ruta. */
    require: keyof Capabilities;
    children: React.ReactElement;
}

const RoleRoute: React.FC<RoleRouteProps> = ({ path, exact, require, children }) => {
    const { capabilities } = useAuth();
    return (
        <Route
            path={path}
            exact={exact}
            render={() => (capabilities[require] ? children : <AccessRestricted />)}
        />
    );
};

export default RoleRoute;
