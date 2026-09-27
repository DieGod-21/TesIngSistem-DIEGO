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
 *   - Avisar a quien esté mirando una clave cuando se invalida (`subscribe`),
 *     para que una vista montada no se quede con la copia de antes.
 *
 * Diseño:
 *   - Estado en Map de módulo (valores, cargas en vuelo y suscriptores), sin
 *     nada oculto en los consumidores. Se testea de forma independiente.
 *   - Las claves usan `recurso:sub` (p. ej. `estudiantes:registry`) para que
 *     `invalidate('estudiantes')` limpie todo el recurso.
 */

import { reportError } from './telemetry';

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

/** TTL por defecto (ms). Suficientemente corto para no servir datos rancios. */
export const DEFAULT_TTL_MS = 60_000;

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<() => void>>();

/** ¿La clave pertenece al recurso? `estudiantes` cubre `estudiantes:*`. */
function afecta(key: string, prefix: string): boolean {
    return key === prefix || key.startsWith(`${prefix}:`);
}

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
 * deduplicación en vuelo para que la próxima lectura vuelva al origen, y avisa
 * a los suscriptores de las claves afectadas.
 */
export function invalidate(prefix: string): void {
    for (const key of Array.from(store.keys())) {
        if (afecta(key, prefix)) store.delete(key);
    }
    for (const key of Array.from(inflight.keys())) {
        if (afecta(key, prefix)) inflight.delete(key);
    }
    for (const [key, set] of Array.from(listeners)) {
        if (afecta(key, prefix)) Array.from(set).forEach(avisarSinPropagar);
    }
}

/*
 * `invalidate` se llama justo después de una escritura que el servidor ya
 * aceptó: si un suscriptor falla, no debe parecer que falló la escritura ni
 * dejar sin aviso a los demás.
 */
function avisarSinPropagar(avisar: () => void): void {
    try {
        avisar();
    } catch (e) {
        reportError(e, { source: 'cache:suscriptor' });
    }
}

/**
 * Vacía toda la caché (logout o tests).
 *
 * NO avisa a los suscriptores, a propósito: es el fin de la sesión y las vistas
 * se desmontan. Avisar haría que una vista volviera a pedir sus datos ya sin
 * token, y el 401 resultante acabaría en «Tu sesión expiró» justo al salir.
 */
export function clear(): void {
    store.clear();
    inflight.clear();
}

/**
 * Avisa cuando `invalidate()` afecta a `key`. Devuelve la baja.
 *
 * Solo avisa: no entrega datos. Quien escucha decide si vuelve a leer, así que
 * la caché sigue sin saber nada de React ni de quién la consume.
 */
export function subscribe(key: string, listener: () => void): () => void {
    let set = listeners.get(key);
    if (!set) {
        set = new Set();
        listeners.set(key, set);
    }
    set.add(listener);
    return () => {
        const actual = listeners.get(key);
        if (!actual) return;
        actual.delete(listener);
        if (actual.size === 0) listeners.delete(key);
    };
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
 *
 * Solo guarda su resultado y limpia el registro si sigue siendo la carga
 * vigente de su clave. Una carga retirada por `invalidate()` o `clear()` trae
 * datos anteriores a la escritura o al logout: se entregan a quien la pidió,
 * pero no se guardan ni pisan a la carga nueva.
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

    const vigente = () => inflight.get(key) === promise;
    const promise: Promise<T> = loader()
        .then((value) => {
            if (vigente()) setCached(key, value, ttl);
            return value;
        })
        .finally(() => {
            if (vigente()) inflight.delete(key);
        });

    inflight.set(key, promise);
    return promise;
}
