/**
 * dismissals.ts — Descarte ("marcar como atendido") de ítems no auto-limpiables.
 *
 * Los ítems que NO se limpian con el dato (crear caso, terna estancada, cerrar
 * resolución) necesitan una forma de bajar de la cola. Como el backend es caja
 * negra y no hay mutación de "cierre", el descarte es CLIENT-SIDE: localStorage,
 * por dispositivo, no colaborativo (limitación documentada).
 *
 * Lógica pura y testeable (sin React ni storage). El hook la envuelve.
 *
 * GC (recolección): al conocer los ítems presentes, se podan los descartes que
 * ya no existen. Semántica limpia: descartar oculta AHORA; si el trabajo se
 * resuelve (el ítem desaparece), el descarte se olvida; si el MISMO trabajo
 * reaparece más tarde, no queda suprimido por un descarte rancio.
 */

import { WORK_QUEUE_DISMISSED_KEY } from '../../config/storageKeys';

/** Poda los ids descartados a los que aún están presentes (dedup + orden estable). */
export function pruneDismissed(stored: readonly string[], currentIds: Iterable<string>): string[] {
    const present = new Set(currentIds);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of stored) {
        if (present.has(id) && !seen.has(id)) {
            seen.add(id);
            out.push(id);
        }
    }
    return out;
}

/** Añade un id (idempotente). */
export function withDismissed(stored: readonly string[], id: string): string[] {
    return stored.includes(id) ? stored.slice() : [...stored, id];
}

/** Quita un id. */
export function withoutDismissed(stored: readonly string[], id: string): string[] {
    return stored.filter((x) => x !== id);
}

// ─── Persistencia segura (tolerante a modo privado / storage deshabilitado) ──

export function readDismissed(): string[] {
    try {
        const raw = localStorage.getItem(WORK_QUEUE_DISMISSED_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

export function writeDismissed(ids: readonly string[]): void {
    try {
        localStorage.setItem(WORK_QUEUE_DISMISSED_KEY, JSON.stringify(ids));
    } catch {
        /* storage no disponible: el descarte simplemente no persiste */
    }
}
