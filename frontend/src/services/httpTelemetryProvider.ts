/**
 * httpTelemetryProvider.ts
 *
 * Proveedor de telemetría de PRODUCCIÓN: placeholder de endpoint HTTP.
 *
 * NO integra Sentry ni ningún SDK externo. Solo hace POST de reportes ya
 * saneados (lista blanca de `ErrorReport`, sin JWT/PII/payloads — ver
 * telemetry.ts) a un endpoint HTTP configurable, listo para conectarse luego a
 * cualquier backend de observabilidad.
 *
 * Garantías:
 *   - Batching:  agrupa reportes y los envía por lotes (por tamaño o intervalo).
 *   - Retry:     reintenta el envío de un lote con backoff exponencial acotado.
 *   - Graceful:  si el envío falla definitivamente, se descarta el lote.
 *   - Never-throw: `report()` y el flush NUNCA lanzan; la telemetría jamás
 *                  puede romper la app.
 *
 * Activación: telemetry.ts lo usa en producción solo si `VITE_TELEMETRY_URL`
 * está definida; en caso contrario mantiene el proveedor no-op.
 */

import type { ErrorReport, TelemetryProvider } from './telemetry';

export interface HttpTelemetryOptions {
    /** Endpoint HTTP que recibirá `{ reports: ErrorReport[] }` por POST. */
    endpoint: string;
    /** Nº de reportes que dispara un flush inmediato (default 20). */
    maxBatchSize?: number;
    /** Intervalo de flush periódico en ms (default 5000). */
    flushIntervalMs?: number;
    /** Reintentos por lote ante fallo/red (default 3). */
    maxRetries?: number;
    /** Tope del buffer para evitar crecimiento ilimitado (default 200). */
    maxQueue?: number;
}

const DEFAULTS = {
    maxBatchSize: 20,
    flushIntervalMs: 5_000,
    maxRetries: 3,
    maxQueue: 200,
} as const;

/**
 * Crea un proveedor de telemetría que envía lotes de reportes a un endpoint
 * HTTP. Interfaz estable: puede conectarse a cualquier backend sin tocar a los
 * consumidores (que solo usan `reportError`).
 */
export function createHttpTelemetryProvider(options: HttpTelemetryOptions): TelemetryProvider {
    const cfg = { ...DEFAULTS, ...options };
    let buffer: ErrorReport[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    let sending = false;

    const backoff = (attempt: number): Promise<void> => {
        const ms = Math.min(1_000 * 2 ** attempt, 15_000);
        return new Promise((resolve) => setTimeout(resolve, ms));
    };

    const scheduleFlush = (): void => {
        if (timer != null) return;
        timer = setTimeout(() => {
            timer = null;
            void flush();
        }, cfg.flushIntervalMs);
    };

    async function postBatch(batch: ErrorReport[], attempt = 0): Promise<void> {
        try {
            const res = await fetch(cfg.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reports: batch }),
                keepalive: true,
            });
            if (!res.ok && attempt < cfg.maxRetries) {
                await backoff(attempt);
                return postBatch(batch, attempt + 1);
            }
            // 2xx, o reintentos agotados → se descarta el lote (graceful).
        } catch {
            if (attempt < cfg.maxRetries) {
                await backoff(attempt);
                return postBatch(batch, attempt + 1);
            }
            // Fallo definitivo de red: se descarta el lote. Nunca propaga.
        }
    }

    async function flush(): Promise<void> {
        if (sending || buffer.length === 0) return;
        sending = true;
        const batch = buffer.splice(0, cfg.maxBatchSize);
        try {
            await postBatch(batch);
        } finally {
            sending = false;
            if (buffer.length > 0) scheduleFlush();
        }
    }

    // Flush best-effort al ocultar/cerrar la pestaña. `sendBeacon` no bloquea ni
    // lanza; se envuelve por si la API no está disponible.
    if (typeof window !== 'undefined') {
        window.addEventListener('pagehide', () => {
            if (buffer.length === 0) return;
            try {
                navigator.sendBeacon?.(cfg.endpoint, JSON.stringify({ reports: buffer }));
                buffer = [];
            } catch {
                /* never throw */
            }
        });
    }

    return {
        report(report: ErrorReport): void {
            try {
                // Tope del buffer: descarta el reporte más antiguo si se llena.
                if (buffer.length >= cfg.maxQueue) buffer.shift();
                buffer.push(report);
                if (buffer.length >= cfg.maxBatchSize) void flush();
                else scheduleFlush();
            } catch {
                /* report() jamás lanza */
            }
        },
    };
}
