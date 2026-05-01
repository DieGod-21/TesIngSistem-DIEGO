/**
 * AppRouter.tsx
 *
 * Arquitectura de layout persistente:
 *
 *   IonRouterOutlet
 *     Switch
 *       /login          → LoginPage           (layout propio, sin AppShell)
 *       /*              → AuthenticatedLayout (AppShell persiste)
 *                             Switch interno → contenido de cada ruta
 *
 * El AppShell (sidebar + header) se monta UNA sola vez y permanece
 * durante toda la sesión autenticada. Solo el área de contenido
 * re-anima al cambiar de ruta, eliminando el "remount" visual del sidebar.
 */

import React from 'react';
import { Redirect, Route, Switch, useLocation } from 'react-router-dom';
import { IonRouterOutlet } from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import AppShell from '../layout/AppShell';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import StudentNewPage from '../pages/StudentNewPage';
import StudentsListPage from '../pages/StudentsListPage';
import TernasListPage from '../features/ternas/pages/TernasListPage';
import TernaDetailPage from '../features/ternas/pages/TernaDetailPage';
import StudentDetailPage from '../pages/StudentDetailPage';
import ReportesPage from '../features/reportes/pages/ReportesPage';
import ReportDetailPage from '../features/reportes/pages/ReportDetailPage';
import ProyectosListPage from '../features/proyectos/pages/ProyectosListPage';
import UsuariosPage from '../features/usuarios/pages/UsuariosPage';

// ─── Auth loading screen ─────────────────────────────────────────────
const AuthLoadingScreen: React.FC = () => (
    <div
        style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#f1f5f9',
        }}
        aria-label="Verificando sesión…"
        role="status"
    >
        <div
            style={{
                width: 40,
                height: 40,
                border: '3px solid #e2e8f0',
                borderTopColor: '#003366',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

// ─── PublicRoute ──────────────────────────────────────────────────────
interface RouteGuardProps {
    children: React.ReactElement;
    path: string;
    exact?: boolean;
}

const PublicRoute: React.FC<RouteGuardProps> = ({ children, path, exact }) => {
    const { isAuthenticated, isAuthLoading } = useAuth();
    return (
        <Route
            path={path}
            exact={exact}
            render={() => {
                if (isAuthLoading) return <AuthLoadingScreen />;
                return isAuthenticated ? <Redirect to="/dashboard" /> : children;
            }}
        />
    );
};

// ─── AuthenticatedLayout ──────────────────────────────────────────────
// Single persistent AppShell for all authenticated routes.
// Auth check here avoids each page duplicating the guard logic.
const AuthenticatedLayout: React.FC = () => {
    const { isAuthenticated, isAuthLoading } = useAuth();
    const location = useLocation();

    if (isAuthLoading) return <AuthLoadingScreen />;
    if (!isAuthenticated) {
        return <Redirect to={{ pathname: '/login', state: { from: location } }} />;
    }

    return (
        <AppShell>
            <Switch>
                <Route path="/dashboard" exact><DashboardPage /></Route>
                {/* /students/new must precede /students/:id to avoid partial match */}
                <Route path="/students/new" exact><StudentNewPage /></Route>
                <Route path="/students/:id" exact><StudentDetailPage /></Route>
                <Route path="/students" exact><StudentsListPage /></Route>
                <Route path="/proyectos" exact><ProyectosListPage /></Route>
                <Route path="/ternas/:id" exact><TernaDetailPage /></Route>
                <Route path="/ternas" exact><TernasListPage /></Route>
                <Route path="/reports/:id" exact><ReportDetailPage /></Route>
                <Route path="/reports" exact><ReportesPage /></Route>
                <Route path="/usuarios" exact><UsuariosPage /></Route>
                <Route exact path="/evaluation"><Redirect to="/ternas" /></Route>
                <Route exact path="/evaluation/:panelId"><Redirect to="/ternas" /></Route>
                <Route exact path="/"><Redirect to="/dashboard" /></Route>
                <Route><Redirect to="/dashboard" /></Route>
            </Switch>
        </AppShell>
    );
};

// ─── AppRouter ────────────────────────────────────────────────────────
const AppRouter: React.FC = () => (
    <IonRouterOutlet>
        <Switch>
            <PublicRoute path="/login" exact>
                <LoginPage />
            </PublicRoute>

            {/* All other routes → persistent authenticated layout */}
            <Route>
                <AuthenticatedLayout />
            </Route>
        </Switch>
    </IonRouterOutlet>
);

export default AppRouter;
