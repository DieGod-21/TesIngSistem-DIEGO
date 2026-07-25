import { describe, it, expect } from 'vitest';
import { pruneDismissed, withDismissed, withoutDismissed } from './dismissals';

describe('dismissals — lógica pura', () => {
    it('withDismissed añade (idempotente)', () => {
        expect(withDismissed([], 'a')).toEqual(['a']);
        expect(withDismissed(['a'], 'a')).toEqual(['a']);
        expect(withDismissed(['a'], 'b')).toEqual(['a', 'b']);
    });

    it('withoutDismissed quita', () => {
        expect(withoutDismissed(['a', 'b'], 'a')).toEqual(['b']);
        expect(withoutDismissed(['a'], 'z')).toEqual(['a']);
    });

    it('pruneDismissed conserva solo los ids presentes (GC)', () => {
        // "b" ya no existe → se olvida su descarte; si "b" reaparece luego, no queda suprimido.
        expect(pruneDismissed(['a', 'b', 'c'], ['a', 'c'])).toEqual(['a', 'c']);
    });

    it('pruneDismissed deduplica y preserva orden estable', () => {
        expect(pruneDismissed(['a', 'a', 'b'], ['a', 'b'])).toEqual(['a', 'b']);
    });

    it('pruneDismissed con conjunto vacío de presentes → vacío', () => {
        expect(pruneDismissed(['a', 'b'], [])).toEqual([]);
    });
});
