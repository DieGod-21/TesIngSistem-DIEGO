import { describe, it, expect } from 'vitest';
import { parseLens, parseSearchTerm, lensToTesisFilter, buildLensUrl } from './lens';

describe('lens — parseo con compatibilidad hacia atrás', () => {
    it('lee ?status= (preferido)', () => {
        expect(parseLens('?status=approved')).toBe('approved');
        expect(parseLens('?status=failed')).toBe('failed');
        expect(parseLens('')).toBe('all');
    });

    it('lee el alias heredado ?filter=', () => {
        expect(parseLens('?filter=aprobados')).toBe('approved');
        expect(parseLens('?filter=reprobados')).toBe('failed');
    });

    it('status tiene prioridad y valores desconocidos caen a all', () => {
        expect(parseLens('?status=approved&filter=reprobados')).toBe('approved');
        expect(parseLens('?status=raro')).toBe('all');
    });

    it('extrae el término de búsqueda (search y alias q)', () => {
        expect(parseSearchTerm('?search=ana')).toBe('ana');
        expect(parseSearchTerm('?q=beto')).toBe('beto');
        expect(parseSearchTerm('?status=approved')).toBe('');
    });
});

describe('lens — mapeo al roster', () => {
    it('traduce la lente al filtro de tesis de las vistas', () => {
        expect(lensToTesisFilter('all')).toBeNull();
        expect(lensToTesisFilter('approved')).toBe('aprobados');
        expect(lensToTesisFilter('failed')).toBe('reprobados');
    });
});

describe('lens — construcción de URL (preserva estado, normaliza alias)', () => {
    it('setea ?status= y conserva ?search=', () => {
        expect(buildLensUrl('?search=ana', 'approved')).toBe('/students?search=ana&status=approved');
    });

    it('all limpia el filtro pero mantiene la búsqueda', () => {
        expect(buildLensUrl('?status=failed&search=ana', 'all')).toBe('/students?search=ana');
    });

    it('reescribe el alias heredado ?filter a ?status=', () => {
        expect(buildLensUrl('?filter=aprobados', 'failed')).toBe('/students?status=failed');
    });

    it('sin params → ruta base', () => {
        expect(buildLensUrl('', 'all')).toBe('/students');
    });
});
