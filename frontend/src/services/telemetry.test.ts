import { describe, it, expect } from 'vitest';
import {
    reportError,
    setTelemetryProvider,
    type ErrorReport,
    type TelemetryProvider,
} from './telemetry';

/** Proveedor de captura para inspeccionar los reportes emitidos. */
function makeCapture() {
    const reports: ErrorReport[] = [];
    const provider: TelemetryProvider = { report: (r) => { reports.push(r); } };
    return { reports, provider };
}

/** Campos permitidos en un reporte: SOLO diagnóstico, nada sensible. */
const ALLOWED_KEYS = [
    'boundary', 'message', 'route', 'source', 'stack', 'timestamp', 'version',
].sort();

describe('reportError', () => {
    it('reenvía un reporte estructurado al proveedor activo', () => {
        const { reports, provider } = makeCapture();
        setTelemetryProvider(provider);

        reportError(new Error('boom'), { boundary: 'content', route: '/students/1' });

        expect(reports).toHaveLength(1);
        const r = reports[0];
        expect(r.message).toBe('boom');
        expect(r.boundary).toBe('content');
        expect(r.route).toBe('/students/1');
        expect(typeof r.timestamp).toBe('string');
        expect(typeof r.stack).toBe('string');
    });

    it('solo incluye campos diagnósticos en lista blanca (sin datos sensibles)', () => {
        const { reports, provider } = makeCapture();
        setTelemetryProvider(provider);

        reportError(new Error('x'), { boundary: 'app' });

        expect(Object.keys(reports[0]).sort()).toEqual(ALLOWED_KEYS);
    });

    it('normaliza valores no-Error sin exponer más de lo necesario', () => {
        const { reports, provider } = makeCapture();
        setTelemetryProvider(provider);

        reportError('texto plano');
        reportError({ nope: true });

        expect(reports[0].message).toBe('texto plano');
        expect(reports[0].stack).toBeUndefined();
        expect(typeof reports[1].message).toBe('string');
    });

    it('usa boundary "global" por defecto', () => {
        const { reports, provider } = makeCapture();
        setTelemetryProvider(provider);

        reportError(new Error('e'));

        expect(reports[0].boundary).toBe('global');
    });

    it('nunca lanza aunque el proveedor falle (no rompe la app)', () => {
        setTelemetryProvider({ report() { throw new Error('provider down'); } });
        expect(() => reportError(new Error('e'))).not.toThrow();
    });
});
