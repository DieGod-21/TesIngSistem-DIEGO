/**
 * AppRouter.tsx
 *
 * Rutas protegidas con guarda robusta de autenticación.
 *
 * ProtectedRoute espera a que AuthContext termine de leer
 * la sesión persistida (isAuthLoading) antes de decidir.
 * Esto evita el "logout falso" en recargas de página.
 *
 * PublicRoute redirige al dashboard si el usuario ya está autenticado.
 */

import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { IonRouterOutlet } from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import StudentNewPage from '../pages/StudentNewPage';
import StudentsListPage from '../pages/StudentsListPage';
import CalendarPage from '../pages/CalendarPage';
import AcademicPhasesPage from '../pages/AcademicPhasesPage';

// ─── Tipos ───────────────────────────────────────────────────────────

interface RouteGuardProps {
    children: React.ReactElement;
    path: string;
    exact?: boolean;
}

// ─── Spinner de espera de autenticación inicial ──────────────────────
// Se muestra mientras AuthContext lee localStorage (≈ 0-200ms).
// Evita el parpadeo de redirigir a /login y volver.
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

// ─── ProtectedRoute ──────────────────────────────────────────────────

/**
 * Bloquea el acceso hasta que:
 *  1. AuthContext termina de leer localStorage (isAuthLoading = false)
 *  2. Si está autenticado → muestra el children
 *  3. Si no → redirige a /login (con `from` para volver después del login)
 */
const ProtectedRoute: React.FC<RouteGuardProps> = ({ children, path, exact }) => {
    const { isAuthenticated, isAuthLoading } = useAuth();

    return (
        <Route
            path={path}
            exact={exact}
            render={({ location }) => {
                if (isAuthLoading) return <AuthLoadingScreen />;
                return isAuthenticated
                    ? children
                    : <Redirect to={{ pathname: '/login', state: { from: location } }} />;
            }}
        />
    );
};

// ─── PublicRoute ─────────────────────────────────────────────────────

/**
 * Si el usuario ya está autenticado, redirige al dashboard.
 * También espera a que AuthContext termine.
 */
const PublicRoute: React.FC<RouteGuardProps> = ({ children, path, exact }) => {
    const { isAuthenticated, isAuthLoading } = useAuth();

    return (
        <Route
            path={path}
            exact={exact}
            render={() => {
                if (isAuthLoading) return <AuthLoadingScreen />;
                return isAuthenticated
                    ? <Redirect to="/dashboard" />
                    : children;
            }}
        />
    );
};

// ─── AppRouter ───────────────────────────────────────────────────────

/**
 * Componente raíz de rutas.
 *
 * Rutas registradas:
 *  /login         → LoginPage         (pública)
 *  /dashboard     → DashboardPage     (protegida)
 *  /students      → StudentsListPage  (protegida)
 *  /students/new  → StudentNewPage    (protegida)
 *  /              → Redirige según autenticación
 */
const AppRouter: React.FC = () => (
    <IonRouterOutlet>
        <Switch>
            <PublicRoute path="/login" exact>
                <LoginPage />
            </PublicRoute>

            <ProtectedRoute path="/dashboard" exact>
                <DashboardPage />
            </ProtectedRoute>

            <ProtectedRoute path="/students" exact>
                <StudentsListPage />
            </ProtectedRoute>

            <ProtectedRoute path="/students/new" exact>
                <StudentNewPage />
            </ProtectedRoute>

            <ProtectedRoute path="/calendar" exact>
                <CalendarPage />
            </ProtectedRoute>

            <ProtectedRoute path="/academic-phases" exact>
                <AcademicPhasesPage />
            </ProtectedRoute>

            <Route exact path="/">
                <RootRedirect />
            </Route>

            <Route>
                <Redirect to="/" />
            </Route>
        </Switch>
    </IonRouterOutlet>
);

// ─── RootRedirect ─────────────────────────────────────────────────────

const RootRedirect: React.FC = () => {
    const { isAuthenticated, isAuthLoading } = useAuth();
    if (isAuthLoading) return <AuthLoadingScreen />;
    return <Redirect to={isAuthenticated ? '/dashboard' : '/login'} />;
};

export default AppRouter;
