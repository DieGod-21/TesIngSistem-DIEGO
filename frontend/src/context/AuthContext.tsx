/**
 * AuthContext.tsx
 *
 * Contexto global de autenticación.
 *
 * El API Control de Notas autentica vía header `X-Usuario-Id` (no JWT).
 * Este contexto:
 *   - Lee el ID persistido en localStorage al montar
 *   - Verifica contra /api/usuarios/yo para obtener perfil + rol
 *   - Expone `loginByUserId`, `logout`, `isAdmin`, `usuarioId`
 *   - Mantiene la firma legacy `login(email, password)` por compatibilidad
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

// ─── Tipos ───────────────────────────────────────────────────────────

interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    /** ID numérico para enviar en X-Usuario-Id */
    usuarioId: number | null;
    /** true mientras se verifica la sesión persistida tras recarga */
    isAuthLoading: boolean;
    /** true durante login/logout (spinner en formulario) */
    loading: boolean;
    error: string | null;
    /** Login real (recibe ID numérico). */
    loginByUserId: (usuarioId: number) => Promise<void>;
    /** Compat: el LoginForm legacy todavía pasa email/password. */
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────

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
            // Optimista: mostramos el usuario persistido y verificamos en background
            if (!canceled) setUser(session.user);
            try {
                const verified = await authService.verifySession();
                if (!canceled) {
                    if (verified) setUser(verified);
                    else { await authService.logout(); setUser(null); }
                }
            } catch {
                // error de red: mantenemos sesión optimista
            } finally {
                if (!canceled) setAuthLoading(false);
            }
        };
        hydrate();
        return () => { canceled = true; };
    }, []);

    const loginByUserId = useCallback(async (usuarioId: number) => {
        setLoading(true);
        setError(null);
        try {
            const u = await authService.loginByUserId(usuarioId);
            setUser(u);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            const u = await authService.login(email, password);
            setUser(u);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
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
        usuarioId: user?.usuarioId ?? null,
        isAuthLoading,
        loading,
        error,
        loginByUserId,
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
