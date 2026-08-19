import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import * as authService from '../services/authService';
import type { User } from '../services/authService';
import { getCapabilities, getWorkspace, isAdminRole, type Capabilities, type Workspace } from '../config/permissions';
import { userMessageFor } from '../services/errorMessages';
import { useEvaluationStore } from '../stores/evaluationStore';
import { SESSION_MSG_KEY } from '../services/apiClient';

// ─── Tipos ────────────────────────────────────────────────────────────

interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    /** Capacidades de autorización derivadas del rol (fuente única de verdad). */
    capabilities: Capabilities;
    /** Espacio de trabajo del usuario: decide navegación, inicio y contenidos. */
    workspace: Workspace;
    /** Compatibilidad: derivado del módulo de permisos, no de comparación directa. */
    isAdmin: boolean;
    /** Numérico — mantenido para compatibilidad con componentes existentes. */
    usuarioId: number | null;
    /** true mientras se verifica la sesión persistida tras recarga */
    isAuthLoading: boolean;
    /** true durante login/logout */
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setAuthLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let canceled = false;
        const hydrate = async () => {
            const session = authService.readPersistedSession();

            if (!session) {
                if (!canceled) setAuthLoading(false);
                return;
            }

            // Optimista: mostramos usuario persistido y verificamos en background
            if (!canceled) setUser(session.user);
            try {
                const result = await authService.verifySession();
                if (!canceled) {
                    if (result.status === 'authenticated') {
                        setUser(result.user);
                    } else if (result.status === 'unauthenticated') {
                        // Rechazo explícito de autenticación → cerrar sesión.
                        await authService.logout();
                        /*
                         * Y DECIR POR QUÉ.
                         *
                         * Comprobado en el navegador: con la sesión caducada, el
                         * usuario aparecía de golpe en la pantalla de acceso sin
                         * ninguna explicación —había estado trabajando hace un
                         * segundo—. El aviso ya existía y el formulario de acceso
                         * ya sabe mostrarlo; simplemente esta rama, la de la
                         * verificación al arrancar, no lo dejaba escrito. La otra
                         * ruta de expiración (el interceptor 401 de apiClient) sí
                         * lo hacía, así que el mensaje aparecía o no según por
                         * dónde se hubiera caído la sesión.
                         */
                        try {
                            sessionStorage.setItem(
                                SESSION_MSG_KEY,
                                'Tu sesión expiró. Por favor inicia sesión nuevamente.',
                            );
                        } catch { /* sin almacenamiento: se pierde el aviso, no la sesión */ }
                        setUser(null);
                    }
                    // 'unknown' (red/timeout): se conserva la sesión optimista.
                }
            } catch {
                // Salvaguarda: cualquier error inesperado mantiene la sesión optimista.
            } finally {
                if (!canceled) setAuthLoading(false);
            }
        };
        hydrate();
        return () => { canceled = true; };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            const u = await authService.login(email, password);
            setUser(u);
        } catch (err) {
            setError(userMessageFor(err) || 'No se pudo iniciar sesión. Inténtalo de nuevo.');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        setLoading(true);
        try {
            await authService.logout();
            /*
             * Lo que una persona dejó escrito sin guardar no es de la siguiente
             * que entre en esta pestaña. `authService.logout` ya purga la cache
             * compartida de servidor; esto purga el estado de proceso, que vive
             * en memoria y no pasa por ahi.
             */
            useEvaluationStore.getState().limpiar();
            setUser(null);
            setError(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Valor memoizado: `useAuth` lo consumen Sidebar, TopHeader, RoleRoute y
    // todas las páginas. Sin memoizar, cualquier re-render del provider (p. ej.
    // ThemeProvider al alternar tema, que re-renderiza toda la pila) crea un
    // objeto nuevo y cascadea un re-render a TODOS los consumidores. Depende de
    // primitivos + callbacks estables (login/logout ya son useCallback).
    const value = useMemo<AuthContextValue>(() => ({
        user,
        isAuthenticated: user !== null,
        capabilities: getCapabilities(user?.role),
        workspace: getWorkspace(user?.role),
        isAdmin: isAdminRole(user?.role),
        usuarioId: user ? user.usuarioId : null,
        isAuthLoading,
        loading,
        error,
        login,
        logout,
    }), [user, isAuthLoading, loading, error, login, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
    return ctx;
};

export default AuthContext;
