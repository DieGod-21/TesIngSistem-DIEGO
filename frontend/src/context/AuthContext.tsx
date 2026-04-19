/**
 * AuthContext.tsx
 *
 * Contexto global de autenticación, robusto y API-ready.
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  FLUJO DE INICIALIZACIÓN                                │
 * │                                                         │
 * │  1. isAuthLoading = true  (estado inicial)              │
 * │  2. useEffect lee localStorage vía readPersistedSession │
 * │  3. Si hay sesión → verifyToken() en background         │
 * │     - válido → setUser(user), isAuthLoading = false     │
 * │     - inválido → clearUser, isAuthLoading = false       │
 * │  4. Si no hay sesión → isAuthLoading = false            │
 * │                                                         │
 * │  ProtectedRoute espera a isAuthLoading = false          │
 * │  antes de decidir redirigir → NUNCA logout falso        │
 * └─────────────────────────────────────────────────────────┘
 *
 * Para API real: solo reemplaza las funciones en authService.ts.
 * Este contexto no cambia.
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
    /** true mientras se verifica la sesión persistida tras recarga */
    isAuthLoading: boolean;
    /** true durante login/logout (spinner en formulario) */
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setAuthLoading] = useState(true); // ← CLAVE
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Rehidratación al montar: lee la sesión guardada en localStorage
     * y verifica que el token siga siendo válido.
     * No hace logout si hay error de red — solo si el token es inválido.
     */
    useEffect(() => {
        let canceled = false;

        const hydrate = async () => {
            const session = authService.readPersistedSession();

            if (!session) {
                if (!canceled) setAuthLoading(false);
                return;
            }

            try {
                const valid = await authService.verifyToken(session.token);
                if (!canceled) {
                    if (valid) {
                        setUser(session.user);
                    } else {
                        // Token expirado o inválido: limpiar sin disparar logout()
                        await authService.logout();
                    }
                }
            } catch {
                // Error de red durante la verificación: mantener sesión en caso
                // de que sea algo temporal. No hacemos logout aquí.
                if (!canceled) setUser(session.user);
            } finally {
                if (!canceled) setAuthLoading(false);
            }
        };

        hydrate();
        return () => { canceled = true; };
    }, []);

    // ─── Acciones ─────────────────────────────────────────────────────

    const login = useCallback(async (email: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            const loggedUser = await authService.login(email, password);
            setUser(loggedUser);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
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

    // ─── Valor del contexto ───────────────────────────────────────────

    const value: AuthContextValue = {
        user,
        isAuthenticated: user !== null,
        isAuthLoading,
        loading,
        error,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};

// ─── Hook ────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
    return ctx;
};

export default AuthContext;
