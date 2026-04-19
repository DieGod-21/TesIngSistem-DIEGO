/**
 * devBypass.ts — DEV ONLY
 *
 * Bypass de autenticación para desarrollo local sin backend.
 * Se activa únicamente cuando:
 *   - import.meta.env.DEV  === true  (Vite development mode)
 *   - VITE_DEV_AUTH_BYPASS === 'true'
 *
 * En producción (npm run build) import.meta.env.DEV es false,
 * por lo que isDevBypass() siempre retorna false sin importar
 * el valor de la variable de entorno.
 */

import type { User } from '../services/authService';

export const DEV_BYPASS_TOKEN = '__dev_bypass_token__';

export const DEV_MOCK_USER: User = {
    id:    'dev-user-001',
    email: 'dev@umg.edu.gt',
    name:  'Developer (Bypass)',
    role:  'admin',
};

/**
 * Retorna true solo si estamos en Vite dev mode Y la variable está activa.
 * En producción siempre retorna false (import.meta.env.DEV = false).
 */
export function isDevBypass(): boolean {
    return (
        import.meta.env.DEV === true &&
        import.meta.env.VITE_DEV_AUTH_BYPASS === 'true'
    );
}
