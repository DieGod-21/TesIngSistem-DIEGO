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
import { getCapabilities, isAdminRole, type Capabilities } from '../config/permissions';

// ─── Tipos ────────────────────────────────────────────────────────────

interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    /** Capacidades de autorización derivadas del rol (fuente única de verdad). */
    capabilities: Capabilities;
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
            setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        setLoading(true);
        try {
            await authService.logout();
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
