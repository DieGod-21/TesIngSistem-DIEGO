import { describe, it, expect } from 'vitest';
import { VOCAB } from './vocabulary';
import { LENSES } from '../features/students-workspace/lens/lens';

/**
 * El vocabulario se rompió una vez por copia y pega: seis nombres para el mismo
 * conjunto y dos para el mismo objeto. Estos tests no comprueban textos bonitos;
 * comprueban que las superficies que el usuario recorre en un mismo salto
 * (KPI → lente → panel) sigan llamando igual a lo mismo.
 */
describe('vocabulario — una sola voz en todo el producto', () => {
    it('las lentes del listado usan los términos canónicos de conjunto', () => {
        const byId = Object.fromEntries(LENSES.map((l) => [l.id, l.label]));
        expect(byId.approved).toBe(VOCAB.eligible);
        expect(byId.failed).toBe(VOCAB.notEligible);
    });

    it('los términos de conjunto y los de estudiante son distintos', () => {
        // El conjunto nombra un grupo ("Pendientes de tesis"); el veredicto
        // nombra el motivo de una persona. Colapsarlos pierde información.
        expect(VOCAB.notEligible).not.toBe(VOCAB.verdictBelowMin);
        expect(VOCAB.notEligible).not.toBe(VOCAB.verdictMissing);
    });

    it('cada veredicto de estudiante es único y no vacío', () => {
        const verdicts = [VOCAB.verdictEligible, VOCAB.verdictBelowMin, VOCAB.verdictMissing];
        expect(new Set(verdicts).size).toBe(verdicts.length);
        verdicts.forEach((v) => expect(v.trim().length).toBeGreaterThan(0));
    });

    it('"No elegible" no se reutiliza como veredicto: colisiona con la etapa no_elegible', () => {
        // La etapa `no_elegible` del dominio significa "reprobado con ambos
        // cursos en regla". Usar el mismo texto para el veredicto general haría
        // que dos cosas distintas se llamaran igual en la misma pantalla.
        const verdicts = [VOCAB.verdictEligible, VOCAB.verdictBelowMin, VOCAB.verdictMissing];
        expect(verdicts).not.toContain('No elegible');
    });

    it('el comité se nombra "Terna": es el término de la ruta, el menú y el dominio', () => {
        expect(VOCAB.committee).toBe('Terna');
        expect(VOCAB.committeePlural).toBe('Ternas');
    });
});
