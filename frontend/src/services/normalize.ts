/**
 * normalize.ts
 *
 * Capa ÚNICA de normalización de respuestas. Antes de este módulo, cada
 * servicio desenvolvía a mano su envoltura (`{ estudiante }`, `{ usuarios }`,
 * `{ terna }`, `{ reporte }`, `{ data }`…). Aquí se centraliza en funciones
 * puras que todos los servicios consumen.
 *
 * Contrato:
 *   - Una forma reconocida se desenvuelve sin ruido.
 *   - Una forma DESCONOCIDA nunca se traga en silencio ni lanza excepciones
 *     inesperadas: se reporta a telemetría (endpoint + forma + timestamp, sin
 *     datos) y se devuelve un valor seguro (el crudo para entidades, `[]` para
 *     colecciones).
 *
 * SEGURIDAD (regla dura): el diagnóstico solo incluye el endpoint y un
 * descriptor de la forma (tipo + nombres de claves). Nunca valores, tokens,
 * cabeceras ni datos personales.
 */

import { reportError } from './telemetry';

/**
 * Descriptor SEGURO de una forma desconocida: tipo y nombres de claves, sin
 * ningún valor. `{ token: 'abc', nombre: 'Ada' }` → `object{nombre,token}`.
 */
export function describeShape(raw: unknown): string {
    if (raw === null) return 'null';
    if (raw === undefined) return 'undefined';
    if (Array.isArray(raw)) return `array(${raw.length})`;
    const t = typeof raw;
    if (t !== 'object') return t;
    const keys = Object.keys(raw as object).sort();
    return `object{${keys.join(',')}}`;
}

/** Reporta una forma de respuesta no reconocida (solo diagnóstico, sin datos). */
export function reportUnknownShape(endpoint: string, raw: unknown): void {
    reportError(
        new Error(`Forma de respuesta no reconocida en ${endpoint}: ${describeShape(raw)}`),
        { source: 'envelope:unknown-shape' },
    );
}

/**
 * Extrae una entidad que puede venir directa (`{ id, ... }`) o envuelta bajo
 * una clave (`{ estudiante: { id, ... } }`). `apiData` ya desenvolvió `{ data }`
 * previamente, así que aquí solo tratamos la envoltura semántica del recurso.
 *
 * - objeto con la clave  → el valor de la clave.
 * - objeto sin la clave  → el objeto tal cual (forma directa).
 * - no-objeto (null/str) → forma inesperada: telemetría + se devuelve tal cual.
 */
export function unwrapEntity<T>(raw: unknown, key: string, endpoint: string): T {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        if (key in obj) return obj[key] as T;
        return raw as T;
    }
    reportUnknownShape(endpoint, raw);
    return raw as T;
}

/**
 * Extrae una colección que puede venir como array directo o bajo alguna de
 * varias claves conocidas (`{ ternas: [] }`, `{ data: [] }`…).
 *
 * - array directo               → el array.
 * - objeto con clave-lista       → esa lista.
 * - forma desconocida            → telemetría + `[]` (nunca lanza).
 */
export function unwrapCollection<T>(raw: unknown, keys: string[], endpoint: string): T[] {
    if (Array.isArray(raw)) return raw as T[];
    if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        for (const k of keys) {
            if (Array.isArray(obj[k])) return obj[k] as T[];
        }
    }
    reportUnknownShape(endpoint, raw);
    return [];
}

/**
 * Detección de truncamiento. NUNCA se asume `items.length == total`.
 * - Con metadata de paginación (`total`): truncado si se recibieron menos de
 *   los que el servidor declara.
 * - Sin metadata: heurística por límite solicitado (recibir exactamente el
 *   límite sugiere que hay más).
 */
export function detectTruncation(count: number, total?: number, requestedLimit?: number): boolean {
    if (typeof total === 'number' && Number.isFinite(total)) return count < total;
    if (typeof requestedLimit === 'number') return count >= requestedLimit;
    return false;
}

/**
 * Reporta un dataset truncado: telemetría (no bloqueante, sin datos) y, en
 * desarrollo, un warning visible. Nunca rompe la app ni abre un modal.
 */
export function reportTruncation(endpoint: string, count: number, total?: number): void {
    const detail = total != null ? `${count}/${total}` : `${count}+`;
    reportError(
        new Error(`Dataset truncado en ${endpoint}: recibidos ${detail}. Migrar a paginación server-side.`),
        { source: 'envelope:truncated' },
    );
    if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn(
            `[normalize] Dataset truncado en ${endpoint} (${detail}). ` +
            'La búsqueda/paginación local puede estar incompleta.',
        );
    }
}
