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

/** Type guard: ¿el estado contiene datos cargados? */
export function isSuccess<T>(state: AsyncState<T>): state is { status: 'success'; data: T } {
    return state.status === 'success';
}

/** Type guard: ¿el estado es un error? */
export function isError<T>(state: AsyncState<T>): state is { status: 'error'; message: string } {
    return state.status === 'error';
}
