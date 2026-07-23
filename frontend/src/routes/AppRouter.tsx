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

import React, { Suspense, lazy } from 'react';
import { Redirect, Route, Switch, useLocation } from 'react-router-dom';
import { IonRouterOutlet } from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import RoleRoute from './RoleRoute';
import AppShell from '../layout/AppShell';
import { Skeleton } from '../components/ui';

// ─── Rutas eager (primer pintado) ─────────────────────────────────────
// Login (pantalla de entrada del usuario no autenticado) y Dashboard
// (destino por defecto tras autenticar) se cargan de forma estática: son
// el primer render probable en cada estado y no deben esperar un chunk.
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';

// ─── Rutas diferidas (code-splitting por ruta) ────────────────────────
// Páginas secundarias, de detalle y administrativas: se dividen en chunks
// propios y se cargan bajo demanda, fuera del bundle inicial. El AppShell
// (sidebar + header) permanece montado; solo el área de contenido espera.
const StudentNewPage    = lazy(() => import('../pages/StudentNewPage'));
const StudentsListPage  = lazy(() => import('../pages/StudentsListPage'));
const StudentDetailPage = lazy(() => import('../pages/StudentDetailPage'));
const TernasListPage    = lazy(() => import('../features/ternas/pages/TernasListPage'));
const TernaDetailPage   = lazy(() => import('../features/ternas/pages/TernaDetailPage'));
const ReportesPage      = lazy(() => import('../features/reportes/pages/ReportesPage'));
const ReportDetailPage  = lazy(() => import('../features/reportes/pages/ReportDetailPage'));
const ProyectosListPage = lazy(() => import('../features/proyectos/pages/ProyectosListPage'));
const UsuariosPage      = lazy(() => import('../features/usuarios/pages/UsuariosPage'));

// ─── Spinner compartido ───────────────────────────────────────────────
const Spinner: React.FC = () => (
    <div
        style={{
            width: 40,
            height: 40,
            border: '3px solid var(--border)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
        }}
    >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

// ─── Auth loading screen ─────────────────────────────────────────────
const AuthLoadingScreen: React.FC = () => (
    <div
        style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'var(--surface-base)',
        }}
        aria-label="Verificando sesión…"
        role="status"
    >
        <Spinner />
    </div>
);

// ─── Fallback del área de contenido (carga de chunk de ruta) ──────────
// Cubre el hueco mientras se descarga el chunk de una página diferida.
// Esqueleto genérico (cabecera + filas) en el lenguaje de carga del DS: el
// contenido se percibe "llegando" en lugar de un spinner neutro.
const ContentFallback: React.FC = () => (
    <div
        style={{ padding: '8px 2px', maxWidth: 1280, margin: '0 auto', width: '100%' }}
        aria-label="Cargando módulo…"
        role="status"
    >
        {/* Cabecera de página */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            <Skeleton height={30} width={260} radius={8} />
            <Skeleton height={16} width={420} radius={8} />
        </div>
        {/* Filas / tarjetas de contenido */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height={56} radius={14} />
            ))}
        </div>
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
            {/* Suspense envuelve solo el área de contenido: las rutas diferidas
                muestran el fallback aquí mientras el sidebar/header persisten. */}
            <Suspense fallback={<ContentFallback />}>
                <Switch>
                    <Route path="/dashboard" exact><DashboardPage /></Route>
                    {/* /students/new must precede /students/:id to avoid partial match */}
                    <Route path="/students/new" exact><StudentNewPage /></Route>
                    <Route path="/students/:id" exact><StudentDetailPage /></Route>
                    <Route path="/students" exact><StudentsListPage /></Route>
                    <Route path="/proyectos" exact><ProyectosListPage /></Route>
                    <Route path="/ternas/:id" exact><TernaDetailPage /></Route>
                    <Route path="/ternas" exact><TernasListPage /></Route>
                    <RoleRoute path="/reports/:id" exact require="canViewReports"><ReportDetailPage /></RoleRoute>
                    <RoleRoute path="/reports" exact require="canViewReports"><ReportesPage /></RoleRoute>
                    <RoleRoute path="/usuarios" exact require="canManageUsers"><UsuariosPage /></RoleRoute>
                    <Route exact path="/evaluation"><Redirect to="/ternas" /></Route>
                    <Route exact path="/evaluation/:panelId"><Redirect to="/ternas" /></Route>
                    <Route exact path="/"><Redirect to="/dashboard" /></Route>
                    <Route><Redirect to="/dashboard" /></Route>
                </Switch>
            </Suspense>
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
