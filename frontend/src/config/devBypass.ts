/**
 * devBypass.ts — DEV ONLY
 *
 * Bypass de autenticación para desarrollo local sin tener un usuario real.
 * Activo cuando:
 *   - import.meta.env.DEV  === true  (Vite development mode)
 *   - VITE_DEV_AUTH_BYPASS === 'true'
 *
 * En producción (npm run build) import.meta.env.DEV es false,
 * por lo que isDevBypass() siempre retorna false.
 */

import type { User } from '../services/authService';

/** ID por defecto que coincide con un admin típico en seeders del API. */
export const DEV_BYPASS_USER_ID = Number(import.meta.env.VITE_DEV_USUARIO_ID ?? 1);

export const DEV_MOCK_USER: User = {
    id:        String(DEV_BYPASS_USER_ID),
    usuarioId: DEV_BYPASS_USER_ID,
    nombre:    'Developer (Bypass)',
    email:     'dev@umg.edu.gt',
    role:      'admin',
    fotoUrl:   null,
};

export function isDevBypass(): boolean {
    return (
        import.meta.env.DEV === true &&
        import.meta.env.VITE_DEV_AUTH_BYPASS === 'true'
    );
}

// Compat: nombre antiguo, por si algún archivo importa el token simbólico
export const DEV_BYPASS_TOKEN = '__dev_bypass_token__';
