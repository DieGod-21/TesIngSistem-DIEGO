/**
 * storageKeys.ts
 *
 * Claves de almacenamiento de sesión, en un ÚNICO lugar. Antes estaban
 * duplicadas literalmente en apiClient.ts y authService.ts (con el comentario
 * "deben coincidir"), lo que era deuda de arquitectura: cualquier cambio en una
 * copia rompía silenciosamente la otra. Ambos módulos importan de aquí.
 *
 * Los tokens viven en sessionStorage (se limpian al cerrar la pestaña).
 */

export const ACCESS_TOKEN_KEY  = 'auth_access_token';
export const REFRESH_TOKEN_KEY = 'auth_refresh_token';
export const EXPIRES_AT_KEY    = 'auth_expires_at';
export const USER_KEY          = 'auth_user';

/** Mensaje de sesión expirada que muestra LoginForm tras un redirect. */
export const SESSION_MSG_KEY   = 'auth_session_msg';
