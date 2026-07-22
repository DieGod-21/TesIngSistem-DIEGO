/**
 * errorMessages.ts
 *
 * Mapeador ÚNICO de errores a mensajes para el usuario. La clasificación de red
 * ya existe (`ApiError.kind` en apiClient); aquí se traduce a un texto en
 * español, claro y accionable, reutilizable por EmptyStates y Toasts.
 *
 * Regla: las páginas NUNCA muestran mensajes HTTP crudos ("Error HTTP 429").
 * Se muestran mensajes del backend SOLO cuando son explícitos (campo de error o
 * lista de validación); el mensaje sintético de fallback se sustituye por el
 * texto amigable correspondiente al tipo de error.
 */

import { ApiError, isCancel, type NetworkErrorKind } from './apiClient';

/** Texto amigable por cada tipo de error de red clasificado. */
const MESSAGES: Record<NetworkErrorKind, string> = {
    cancelled:    '',
    timeout:      'La solicitud tardó demasiado. Verifica tu conexión e intenta de nuevo.',
    offline:      'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.',
    unauthorized: 'Tu sesión expiró o no tienes acceso. Inicia sesión de nuevo.',
    forbidden:    'No tienes permisos para realizar esta acción.',
    notFound:     'No se encontró el recurso solicitado.',
    conflict:     'La operación entra en conflicto con el estado actual. Actualiza y vuelve a intentar.',
    validation:   'Revisa los datos ingresados e intenta de nuevo.',
    rateLimited:  'Demasiadas solicitudes en poco tiempo. Espera un momento y vuelve a intentar.',
    server:       'El servidor tuvo un problema. Intenta de nuevo en unos minutos.',
    unavailable:  'El servicio no está disponible temporalmente. Intenta más tarde.',
    unknown:      'Ocurrió un error inesperado. Intenta de nuevo.',
};

/** Detecta el mensaje sintético "Error HTTP <status>" para no mostrarlo crudo. */
const SYNTHETIC_HTTP = /^Error HTTP \d+$/i;

/**
 * Traduce cualquier error a un mensaje para el usuario.
 *   - Cancelación         → '' (no es un error visible).
 *   - Validación (422)    → mensajes explícitos del backend si los hay.
 *   - Mensaje explícito   → se respeta (no el sintético "Error HTTP N").
 *   - Resto de ApiError   → texto amigable por `kind`.
 *   - Error genérico      → su mensaje (ya suele ser amigable de la app).
 */
export function userMessageFor(err: unknown): string {
    if (isCancel(err)) return '';

    if (err instanceof ApiError) {
        if (err.kind === 'validation' && err.errors && err.errors.length > 0) {
            return err.errors.join(' ');
        }
        if (err.message && !SYNTHETIC_HTTP.test(err.message)) {
            return err.message;
        }
        return MESSAGES[err.kind] ?? MESSAGES.unknown;
    }

    if (err instanceof Error && err.message) return err.message;
    return MESSAGES.unknown;
}
