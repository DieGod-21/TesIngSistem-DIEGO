import { describe, it, expect } from 'vitest';
import { deriveGradStatus, deriveStage } from './stage';
import type { StageSignals, TernaSignals } from './types';

// ─── Base de señales sanas para variar campo por campo en cada caso ──────────
function baseSignals(over: Partial<StageSignals> = {}): StageSignals {
    return {
        tesisAprobado: false,
        tesisReprobado: false,
        grad1: 'desconocido',
        grad2: 'desconocido',
        terna: null,
        resolucion: null,
        ...over,
    };
}

function terna(over: Partial<TernaSignals> = {}): TernaSignals {
    return {
        id: 1,
        estado: 'en_progreso',
        evaluacionesEnviadas: 0,
        totalEvaluadores: 3,
        fechaEvaluacion: null,
        ...over,
    };
}

describe('deriveGradStatus', () => {
    it('mapea los estados conocidos (case/espacios tolerantes)', () => {
        expect(deriveGradStatus(90, 'APROBADO')).toBe('ok');
        expect(deriveGradStatus(40, ' reprobado ')).toBe('reprobado');
        expect(deriveGradStatus(null, 'NSP')).toBe('nsp');
    });

    it('sin estado y sin nota → faltante', () => {
        expect(deriveGradStatus(null, null)).toBe('faltante');
        expect(deriveGradStatus(undefined, undefined)).toBe('faltante');
    });

    it('con nota pero sin estado reconocible → desconocido', () => {
        expect(deriveGradStatus(75, '')).toBe('desconocido');
        expect(deriveGradStatus(75, 'RARO')).toBe('desconocido');
    });
});

describe('deriveStage — con terna (la fase más avanzada manda)', () => {
    it('terna completada → resuelto', () => {
        expect(deriveStage(baseSignals({ terna: terna({ estado: 'completada' }) }))).toBe('resuelto');
    });

    it('resolución terminal (aun sin completar) → resuelto', () => {
        expect(deriveStage(baseSignals({ terna: terna(), resolucion: 'aprueba_tesis' }))).toBe('resuelto');
    });

    it('en progreso con evaluaciones pendientes → terna_estancada', () => {
        expect(deriveStage(baseSignals({ terna: terna({ evaluacionesEnviadas: 1, totalEvaluadores: 3 }) })))
            .toBe('terna_estancada');
    });

    it('en progreso ya completo (enviadas === total) → en_terna', () => {
        expect(deriveStage(baseSignals({ terna: terna({ evaluacionesEnviadas: 3, totalEvaluadores: 3 }) })))
            .toBe('en_terna');
    });

    it('pendiente (aún sin arrancar) → en_terna, no estancada', () => {
        expect(deriveStage(baseSignals({ terna: terna({ estado: 'pendiente', evaluacionesEnviadas: 0 }) })))
            .toBe('en_terna');
    });

    it('la terna manda por encima de la elegibilidad de tesis', () => {
        expect(deriveStage(baseSignals({ tesisAprobado: true, terna: terna({ estado: 'completada' }) })))
            .toBe('resuelto');
    });
});

describe('deriveStage — sin terna', () => {
    it('en aprobados → elegible_sin_caso', () => {
        expect(deriveStage(baseSignals({ tesisAprobado: true }))).toBe('elegible_sin_caso');
    });

    it('en reprobados con PG1 faltante → pg1_pendiente', () => {
        expect(deriveStage(baseSignals({ tesisReprobado: true, grad1: 'faltante', grad2: 'desconocido' })))
            .toBe('pg1_pendiente');
    });

    it('en reprobados con PG1 ok y PG2 faltante → pg2_pendiente', () => {
        expect(deriveStage(baseSignals({ tesisReprobado: true, grad1: 'ok', grad2: 'nsp' })))
            .toBe('pg2_pendiente');
    });

    it('en reprobados con ambos cursos ok (otro motivo) → no_elegible', () => {
        expect(deriveStage(baseSignals({ tesisReprobado: true, grad1: 'ok', grad2: 'ok' })))
            .toBe('no_elegible');
    });

    it('sin rastro en ninguna fuente → sin_datos', () => {
        expect(deriveStage(baseSignals())).toBe('sin_datos');
    });
});
