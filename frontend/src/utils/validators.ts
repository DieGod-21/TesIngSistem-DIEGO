/**
 * validators.ts
 *
 * Capa de validación centralizada.
 * Cada validador es una función pura: string → string | null.
 * Retorna null si el valor es válido, o un mensaje de error.
 *
 * Usado por LoginForm, StudentManualForm y BulkUploadCard.
 */

import { ALLOWED_EMAIL_DOMAINS } from '../services/studentsService';

// ─── Validadores atómicos ────────────────────────────────────────────

export const validators = {
    required: (label: string) => (v: string) =>
        !v.trim() ? `${label} es requerido.` : null,

    email: {
        /** Formato básico de correo electrónico */
        format: (v: string) =>
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
                ? 'Ingresa un correo electrónico válido.'
                : null,

        /** Debe ser dominio institucional UMG */
        institutional: (v: string) =>
            !ALLOWED_EMAIL_DOMAINS.some((d) => v.toLowerCase().trim().endsWith(d))
                ? `Debe usar dominio ${ALLOWED_EMAIL_DOMAINS.join(' o ')}.`
                : null,
    },

    select: (label: string) => (v: string) =>
        !v ? `Selecciona ${label}.` : null,
} as const;

// ─── Runner ──────────────────────────────────────────────────────────

type ValidatorFn = (value: string) => string | null;

/**
 * Ejecuta una cadena de validadores en orden.
 * Retorna el primer error encontrado, o null si todo es válido.
 *
 * @example
 * runValidators(email, validators.required('Correo'), validators.email.format, validators.email.institutional)
 */
export function runValidators(value: string, ...fns: ValidatorFn[]): string | null {
    for (const fn of fns) {
        const err = fn(value);
        if (err) return err;
    }
    return null;
}

/**
 * Comprueba si un correo pertenece a un dominio institucional permitido.
 * Útil para validaciones inline (ej. preview de BulkUploadCard).
 */
export function isInstitutionalEmail(email: string): boolean {
    return ALLOWED_EMAIL_DOMAINS.some((d) => email.toLowerCase().trim().endsWith(d));
}
