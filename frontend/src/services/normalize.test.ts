import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { describeShape, unwrapEntity, unwrapCollection, detectTruncation } from './normalize';
import { setTelemetryProvider, type ErrorReport } from './telemetry';

const NOOP = { report: () => {} };

function captureTelemetry(): ErrorReport[] {
    const reports: ErrorReport[] = [];
    setTelemetryProvider({ report: (r) => reports.push(r) });
    return reports;
}

describe('normalize — describeShape (sin fugas de valores)', () => {
    it('describe tipo + nombres de claves, nunca valores', () => {
        expect(describeShape({ token: 'secreto', nombre: 'Ada' })).toBe('object{nombre,token}');
        expect(describeShape([1, 2, 3])).toBe('array(3)');
        expect(describeShape(null)).toBe('null');
        expect(describeShape('x')).toBe('string');
        // El descriptor jamás debe contener el valor sensible.
        expect(describeShape({ token: 'secreto' })).not.toContain('secreto');
    });
});

describe('normalize — unwrapEntity', () => {
    let reports: ErrorReport[];
    beforeEach(() => { reports = captureTelemetry(); });
    afterEach(() => { setTelemetryProvider(NOOP); });

    it('objeto con la clave → valor de la clave', () => {
        expect(unwrapEntity({ estudiante: { id: 1 } }, 'estudiante', '/x')).toEqual({ id: 1 });
        expect(reports).toHaveLength(0);
    });

    it('objeto sin la clave → forma directa', () => {
        expect(unwrapEntity({ id: 2 }, 'estudiante', '/x')).toEqual({ id: 2 });
        expect(reports).toHaveLength(0);
    });

    it('no-objeto (null) → telemetría de forma desconocida + valor tal cual', () => {
        expect(unwrapEntity(null, 'estudiante', '/estudiantes/1')).toBeNull();
        expect(reports).toHaveLength(1);
        expect(reports[0].message).toContain('/estudiantes/1');
    });
});

describe('normalize — unwrapCollection', () => {
    let reports: ErrorReport[];
    beforeEach(() => { reports = captureTelemetry(); });
    afterEach(() => { setTelemetryProvider(NOOP); });

    it('array directo', () => {
        expect(unwrapCollection([1, 2], ['ternas'], '/x')).toEqual([1, 2]);
        expect(reports).toHaveLength(0);
    });

    it('objeto con alguna clave-lista conocida', () => {
        expect(unwrapCollection({ ternas: [1] }, ['ternas', 'data'], '/x')).toEqual([1]);
        expect(unwrapCollection({ data: [9] }, ['ternas', 'data'], '/x')).toEqual([9]);
        expect(reports).toHaveLength(0);
    });

    it('forma desconocida → telemetría + [] (nunca lanza)', () => {
        expect(unwrapCollection({ foo: 1 }, ['ternas'], '/reportes')).toEqual([]);
        expect(reports).toHaveLength(1);
        expect(reports[0].message).toContain('/reportes');
    });
});

describe('normalize — detectTruncation (nunca asume length == total)', () => {
    it('con metadata: truncado si count < total', () => {
        expect(detectTruncation(50, 200, 1000)).toBe(true);
        expect(detectTruncation(200, 200, 1000)).toBe(false);
    });

    it('sin metadata: heurística por límite solicitado', () => {
        expect(detectTruncation(1000, undefined, 1000)).toBe(true);
        expect(detectTruncation(30, undefined, 1000)).toBe(false);
    });

    it('sin metadata ni límite: no truncado', () => {
        expect(detectTruncation(30)).toBe(false);
    });
});
