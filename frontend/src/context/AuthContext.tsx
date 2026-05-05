/**
 * AuthContext.tsx
 *
 * Contexto global de autenticación JWT.
 * Lee la sesión persistida en sessionStorage al montar y la verifica
 * contra /api/usuarios/yo para mantener el perfil actualizado.
 *
 * DEV bypass:
 *   Si import.meta.env.DEV && VITE_DEV_AUTH_BYPASS === 'true' y no hay sesión
 *   persistida, se ejecuta un auto-login usando authService.login() que retorna
 *   el usuario mock sin llamar a la API real.
 */

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import * as authService from '../services/authService';
import type { User } from '../services/authService';
import { isDevBypass } from '../config/devBypass';

// ─── Tipos ────────────────────────────────────────────────────────────

interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
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
                // ── DEV bypass auto-login ──────────────────────────────
                // Strictly guarded: import.meta.env.DEV is always false in
                // production builds (Vite strips it at compile time).
                if (import.meta.env.DEV && isDevBypass()) {
                    try {
                        // login() detects bypass and persists mock tokens to
                        // sessionStorage without calling the real API.
                        const bypassUser = await authService.login('', '');
                        if (!canceled) setUser(bypassUser);
                    } catch {
                        // Should never throw in bypass mode; fail silently.
                    } finally {
                        if (!canceled) setAuthLoading(false);
                    }
                    return;
                }

                if (!canceled) setAuthLoading(false);
                return;
            }

            // Optimista: mostramos usuario persistido y verificamos en background
            if (!canceled) setUser(session.user);
            try {
                const verified = await authService.verifySession();
                if (!canceled) {
                    if (verified) setUser(verified);
                    else { await authService.logout(); setUser(null); }
                }
            } catch {
                // Error de red: mantenemos sesión optimista
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

    const value: AuthContextValue = {
        user,
        isAuthenticated: user !== null,
        isAdmin: user?.role === 'admin',
        usuarioId: user ? user.usuarioId : null,
        isAuthLoading,
        loading,
        error,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
    return ctx;
};

export default AuthContext;
