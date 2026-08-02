/**
 * async.ts
 *
 * Tipo genérico para representar el ciclo de vida de una operación
 * asíncrona (idle → loading → success | error).
 *
 * Evita repetir discriminated unions en cada página/hook.
 */

export type AsyncState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'success'; data: T };
