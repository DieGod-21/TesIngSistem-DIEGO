/**
 * telemetry.ts
 *
 * Capa ligera y REEMPLAZABLE de reporte de errores de runtime.
 *
 * Proveedor por entorno (sin dependencias externas, sin Sentry hardcodeado):
 *   - desarrollo → console.error con contexto diagnóstico.
 *   - producción → proveedor HTTP por lotes si `VITE_TELEMETRY_URL` está
 *     definida; en caso contrario, no-op silencioso.
 * El proveedor puede sustituirse en runtime con `setTelemetryProvider(...)`.
 *
 * SEGURIDAD (regla dura): un reporte SOLO contiene información diagnóstica
 * (mensaje, stack, ruta, nivel del boundary, versión, timestamp, origen).
 * Nunca incluye tokens/JWT, cabeceras Authorization, sessionStorage,
 * localStorage, cuerpos de petición ni datos personales del usuario. El objeto
 * de reporte se construye por lista blanca de campos, de modo que ningún dato
 * sensible pueda filtrarse aunque un llamador lo pasara por error.
 */

import { createHttpTelemetryProvider } from './httpTelemetryProvider';

/** Nivel del origen del error. */
export type BoundaryLevel = 'app' | 'content' | 'global';

/** Contexto opcional que acompaña a un error. Solo campos diagnósticos. */
export interface ErrorContext {
    /** Ruta actual (pathname); si se omite se toma de window.location. */
    route?: string;
    /** Nivel del boundary/origen del error. */
    boundary?: BoundaryLevel;
    /** Origen técnico del evento (p. ej. 'window.onerror'). */
    source?: string;
}

/** Reporte normalizado que recibe el proveedor. Lista blanca de campos. */
export interface ErrorReport {
    message: string;
    stack?: string;
    route: string;
    boundary: BoundaryLevel;
    source?: string;
    version?: string;
    timestamp: string;
}

/** Contrato de proveedor: intercambiable sin tocar a los consumidores. */
export interface TelemetryProvider {
    report(report: ErrorReport): void;
}

/** Versión de la app si está disponible; nunca se inventa ni se hardcodea. */
const APP_VERSION: string | undefined =
    typeof import.meta.env.VITE_APP_VERSION === 'string'
        ? import.meta.env.VITE_APP_VERSION
        : undefined;

/** Proveedor de desarrollo: log legible, solo diagnóstico. */
const devProvider: TelemetryProvider = {
    report(report) {
        // eslint-disable-next-line no-console
        console.error(`[telemetry:${report.boundary}] ${report.message}`, report);
    },
};

/** Proveedor de producción por defecto: silencioso. */
const noopProvider: TelemetryProvider = {
    report() {
        /* no-op */
    },
};

/**
 * Selecciona el proveedor por defecto según el entorno:
 *   - dev                       → devProvider (console.error).
 *   - prod + VITE_TELEMETRY_URL → proveedor HTTP por lotes.
 *   - prod sin endpoint         → no-op (comportamiento previo intacto).
 */
function selectDefaultProvider(): TelemetryProvider {
    if (import.meta.env.DEV) return devProvider;
    const endpoint = import.meta.env.VITE_TELEMETRY_URL;
    if (endpoint) return createHttpTelemetryProvider({ endpoint });
    return noopProvider;
}

let provider: TelemetryProvider = selectDefaultProvider();

/** Sustituye el proveedor de telemetría (permite integrar otro backend). */
export function setTelemetryProvider(next: TelemetryProvider): void {
    provider = next;
}

/** Extrae mensaje y stack de un valor desconocido, sin exponer más. */
function normalizeError(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
        return { message: error.message, stack: error.stack };
    }
    if (typeof error === 'string') {
        return { message: error };
    }
    try {
        return { message: String(error) };
    } catch {
        return { message: 'Error desconocido' };
    }
}

/** Ruta actual sin query ni hash, para no filtrar parámetros. */
function currentRoute(): string {
    try {
        return window.location.pathname;
    } catch {
        return 'unknown';
    }
}

/**
 * Punto único de reporte. Construye un reporte por lista blanca y lo envía al
 * proveedor activo. Nunca lanza: la telemetría jamás debe romper la app.
 */
export function reportError(error: unknown, context: ErrorContext = {}): void {
    const normalized = normalizeError(error);
    const report: ErrorReport = {
        message: normalized.message,
        stack: normalized.stack,
        route: context.route ?? currentRoute(),
        boundary: context.boundary ?? 'global',
        source: context.source,
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
    };
    try {
        provider.report(report);
    } catch {
        /* Un fallo de telemetría nunca debe propagarse. */
    }
}

let globalHandlersRegistered = false;

/**
 * Registra captura global de errores no manejados (una sola vez).
 * Usa addEventListener (no sobrescribe window.onerror) y no llama a
 * preventDefault: no interrumpe el comportamiento existente.
 */
export function registerGlobalErrorHandlers(): void {
    if (globalHandlersRegistered || typeof window === 'undefined') return;
    globalHandlersRegistered = true;

    window.addEventListener('error', (event: ErrorEvent) => {
        reportError(event.error ?? event.message, {
            boundary: 'global',
            source: 'window.onerror',
        });
    });

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        reportError(event.reason, {
            boundary: 'global',
            source: 'window.onunhandledrejection',
        });
    });
}
