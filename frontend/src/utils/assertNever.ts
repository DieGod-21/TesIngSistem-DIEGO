/**
 * assertNever.ts — Exhaustividad en tiempo de compilación.
 *
 * Se coloca tras un `switch` sobre un tipo unión finito. Si el `switch` deja de
 * cubrir un caso, el argumento deja de ser `never` y TypeScript falla la
 * compilación. En runtime nunca debería ejecutarse; si lo hace, lanza con un
 * descriptor seguro (sin datos sensibles).
 */
export function assertNever(x: never): never {
    throw new Error(`Caso no manejado: ${String(x)}`);
}
