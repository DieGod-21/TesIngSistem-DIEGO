import { describe, it, expect } from 'vitest';
import { initials, formatCarrera } from './strings';

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

describe('formatCarrera', () => {
    /*
     * El API real devuelve un CÓDIGO en `carrera` («1890» en los 32 expedientes
     * del servidor). El producto lo pintaba desnudo bajo el nombre del
     * estudiante, donde un número suelto se lee como un dato roto.
     */
    it('etiqueta el código para que se entienda qué es', () => {
        expect(formatCarrera('1890')).toBe('Carrera 1890');
    });

    it('deja intacto un nombre de carrera, si algún día llega uno', () => {
        expect(formatCarrera('Ingeniería en Sistemas')).toBe('Ingeniería en Sistemas');
    });

    it('no inventa texto cuando no hay dato', () => {
        expect(formatCarrera('')).toBe('');
        expect(formatCarrera('   ')).toBe('');
        expect(formatCarrera(null)).toBe('');
        expect(formatCarrera(undefined)).toBe('');
    });
});
