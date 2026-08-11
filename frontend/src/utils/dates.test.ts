import { describe, it, expect } from 'vitest';
import { formatShortDate, formatDateTime, formatLongDate, formatAgo, DAY_MS } from './dates';

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

/**
 * `formatAgo` nace de una duplicación real: la cola de trabajo escribía
 * «hace 314 d» y la tira de cambios «hace 2 días». Lo que se prueba aquí es que
 * la escala NO se queda en días, que es lo que hacía ilegible el caso de 314.
 */
describe('formatAgo', () => {
    const dias = (n: number) => n * DAY_MS;

    it.each([
        [0, 'hace un momento'],
        [30_000, 'hace un momento'],
        [60_000, 'hace 1 min'],
        [59 * 60_000, 'hace 59 min'],
        [60 * 60_000, 'hace 1 h'],
        [23 * 3_600_000, 'hace 23 h'],
    ])('por debajo de un dia: %p -> %p', (ms, esperado) => {
        expect(formatAgo(ms as number)).toBe(esperado);
    });

    it('singular y plural de dia', () => {
        expect(formatAgo(dias(1))).toBe('hace 1 dia'.replace('dia', 'día'));
        expect(formatAgo(dias(2))).toBe('hace 2 días');
        expect(formatAgo(dias(30))).toBe('hace 30 días');
    });

    it('a partir de un mes deja de contar en dias', () => {
        expect(formatAgo(dias(31))).toBe('hace 1 mes');
        expect(formatAgo(dias(60))).toBe('hace 2 meses');
        // El caso que motivo el cambio.
        expect(formatAgo(dias(314))).toBe('hace 10 meses');
    });

    it('a partir de un ano cuenta en anos', () => {
        expect(formatAgo(dias(365))).toBe('hace 1 año');
        expect(formatAgo(dias(800))).toBe('hace 2 años');
    });

    it('nunca escupe NaN ni negativos', () => {
        expect(formatAgo(Number.NaN)).toBe('hace un momento');
        expect(formatAgo(-5000)).toBe('hace un momento');
        expect(formatAgo(Number.POSITIVE_INFINITY)).toBe('hace un momento');
    });

    it('la escala es monotona: mas tiempo nunca produce una unidad menor', () => {
        const orden = ['min', 'h', 'día', 'mes', 'año'];
        const rango = (s: string) => orden.findIndex((u) => s.includes(u));
        const muestras = [60_000, 3_600_000, dias(1), dias(40), dias(400)];
        const rangos = muestras.map((m) => rango(formatAgo(m)));
        expect(rangos).toEqual([...rangos].sort((a, b) => a - b));
    });
});
