import { describe, it, expect } from 'vitest';
import { formatShortDate, formatDateTime, formatLongDate } from './dates';

/**
 * El caso que motiva este módulo: la ficha de terna imprimía en pantalla el
 * valor crudo del API. La garantía que se prueba aquí es que NINGÚN formateador
 * puede devolver un ISO, "Invalid Date" ni "undefined": ante una entrada que no
 * es una fecha, devuelven `null` y quien llama decide.
 */
describe('formateadores de fecha', () => {
    const ISO = '2025-10-01T15:30:00.000Z';

    it('formatea una fecha ISO sin dejar rastro del formato de origen', () => {
        const out = formatShortDate(ISO);
        expect(out).not.toBeNull();
        expect(out).not.toContain('T');
        expect(out).not.toContain('Z');
        expect(out).toMatch(/2025/);
    });

    it('formatDateTime incluye la hora; formatShortDate no', () => {
        expect(formatDateTime(ISO)).toMatch(/\d{1,2}:\d{2}/);
        expect(formatShortDate(ISO)).not.toMatch(/\d{1,2}:\d{2}/);
    });

    it('formatLongDate capitaliza la inicial (el navegador la devuelve en minúscula)', () => {
        const out = formatLongDate(ISO);
        expect(out).not.toBeNull();
        expect(out![0]).toBe(out![0].toUpperCase());
    });

    it.each([null, undefined, '', 'no es una fecha', '2025-13-45'])(
        'devuelve null ante una entrada no formateable: %p',
        (input) => {
            expect(formatShortDate(input as string | null)).toBeNull();
            expect(formatDateTime(input as string | null)).toBeNull();
            expect(formatLongDate(input as string | null)).toBeNull();
        },
    );

    it('acepta un Date, no solo un string', () => {
        expect(formatShortDate(new Date(ISO))).toBe(formatShortDate(ISO));
    });
});
