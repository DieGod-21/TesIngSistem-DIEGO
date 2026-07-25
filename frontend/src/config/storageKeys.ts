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

/**
 * Versión del ESQUEMA de almacenamiento local del workspace. Se incluye como
 * sufijo en las claves: al cambiar la forma persistida, se sube la versión y el
 * dato viejo (bajo la clave anterior) queda huérfano e ignorado sin migración.
 */
export const WORKSPACE_STORAGE_VERSION = 'v1';

/**
 * Ítems de la cola de trabajo marcados como "atendidos" por el coordinador.
 * Vive en localStorage (persiste entre pestañas/sesiones); es POR DISPOSITIVO
 * y no colaborativo (limitación documentada del descarte client-side).
 */
export const WORK_QUEUE_DISMISSED_KEY = `wq_dismissed_${WORKSPACE_STORAGE_VERSION}`;

/**
 * Snapshot de la última visita al workspace ("Desde tu última visita").
 * localStorage, POR DISPOSITIVO y no colaborativo (misma limitación documentada
 * que el descarte). Guarda solo el mínimo: user, timestamp, stage map, firma.
 */
export const WORK_QUEUE_SNAPSHOT_KEY = `wq_snapshot_${WORKSPACE_STORAGE_VERSION}`;
