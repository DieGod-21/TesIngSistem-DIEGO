/**
 * cache.ts
 *
 * Caché compartida y ligera para recursos de SOLO LECTURA (padrón de
 * estudiantes, catálogos, listas de referencia). Vive a nivel de módulo:
 * NO es estado global de la aplicación, NO usa Context ni Redux, y no impone
 * ningún ciclo de vida de React a los consumidores.
 *
 * Responsabilidades:
 *   - Almacenar valores con TTL configurable.
 *   - Deduplicar peticiones en vuelo por clave (misma clave → una sola carga).
 *   - Invalidación explícita por clave/prefijo tras escrituras.
 *
 * Diseño:
 *   - Funciones puras sobre dos Map de módulo (sin estado mutable oculto en
 *     los consumidores). Se testea de forma independiente.
 *   - Las claves usan `recurso:sub` (p. ej. `estudiantes:registry`) para que
 *     `invalidate('estudiantes')` limpie todo el recurso.
 */

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

/** TTL por defecto (ms). Suficientemente corto para no servir datos rancios. */
export const DEFAULT_TTL_MS = 60_000;

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

/** Devuelve el valor cacheado si existe y no expiró; si no, `undefined`. */
export function getCached<T>(key: string): T | undefined {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
    }
    return entry.value as T;
}

/** Guarda un valor con TTL. */
export function setCached<T>(key: string, value: T, ttl: number = DEFAULT_TTL_MS): void {
    store.set(key, { value, expiresAt: Date.now() + ttl });
}

/**
 * Invalida por clave exacta o por prefijo de recurso: `invalidate('estudiantes')`
 * limpia `estudiantes` y cualquier `estudiantes:*`. También cancela la
 * deduplicación en vuelo para que la próxima lectura vuelva al origen.
 */
export function invalidate(prefix: string): void {
    for (const key of Array.from(store.keys())) {
        if (key === prefix || key.startsWith(`${prefix}:`)) store.delete(key);
    }
    for (const key of Array.from(inflight.keys())) {
        if (key === prefix || key.startsWith(`${prefix}:`)) inflight.delete(key);
    }
}

/** Vacía toda la caché (útil en logout o en tests). */
export function clear(): void {
    store.clear();
    inflight.clear();
}

/**
 * Lectura con caché + deduplicación:
 *   1. Si hay valor vigente en caché → lo devuelve (cache hit).
 *   2. Si hay una carga en vuelo con la misma clave → se engancha a ella
 *      (deduplicación; una sola petición de red para N consumidores).
 *   3. Si no → ejecuta `loader`, cachea el resultado y lo devuelve.
 *
 * El `loader` NO debe recibir la señal de aborto de un consumidor individual:
 * la carga compartida beneficia a todos y no debe cancelarse porque uno se
 * desmonte. Cada consumidor evita renders obsoletos con su propio AbortSignal.
 */
export async function cached<T>(
    key: string,
    loader: () => Promise<T>,
    ttl: number = DEFAULT_TTL_MS,
): Promise<T> {
    const hit = getCached<T>(key);
    if (hit !== undefined) return hit;

    const existing = inflight.get(key);
    if (existing) return existing as Promise<T>;

    const promise = loader()
        .then((value) => {
            setCached(key, value, ttl);
            return value;
        })
        .finally(() => {
            inflight.delete(key);
        });

    inflight.set(key, promise);
    return promise;
}
