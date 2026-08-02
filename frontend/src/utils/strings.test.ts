import { describe, it, expect } from 'vitest';
import { initials } from './strings';

/**
 * `initials` es ahora la ÚNICA regla de monograma del producto: la usan el
 * listado, el buscador global, el expediente, el alta manual y el encabezado.
 * Antes había cinco implementaciones y dos daban resultados distintos para el
 * mismo estudiante. Estos casos fijan la regla para que no vuelva a divergir.
 */
describe('initials — regla única de monograma', () => {
    it('toma las iniciales de los dos primeros nombres', () => {
        expect(initials('Juan Pérez')).toBe('JP');
        expect(initials('Ana María Gil Soto')).toBe('AM');
    });

    it('tolera espacios múltiples y bordes: el dato de la API no siempre viene limpio', () => {
        expect(initials('  Ana   María Gil  ')).toBe('AM');
        expect(initials('\tJuan\nPérez')).toBe('JP');
    });

    it('devuelve una sola letra con un solo nombre', () => {
        expect(initials('Cher')).toBe('C');
    });

    it('nunca revienta con ausencia de dato', () => {
        expect(initials('')).toBe('');
        expect(initials('   ')).toBe('');
        expect(initials(null)).toBe('');
        expect(initials(undefined)).toBe('');
    });

    it('normaliza a mayúsculas y conserva los diacríticos del nombre', () => {
        expect(initials('óscar álvarez')).toBe('ÓÁ');
    });
});
