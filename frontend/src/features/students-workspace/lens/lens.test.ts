import { describe, it, expect } from 'vitest';
import {
    parseLens, parseSearchTerm, lensToTesisFilter, buildLensUrl,
    parsePage, parsePerPage, buildListUrl, DEFAULT_PER_PAGE,
    parsePreview, buildPreviewUrl,
} from './lens';

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

    it('cambiar de lente descarta la página: el conjunto ya no es el mismo', () => {
        expect(buildLensUrl('?page=4', 'approved')).toBe('/students?status=approved');
    });
});

describe('lens — paginación en la URL (preservación de contexto)', () => {
    it('parsePage: por defecto 1; rechaza valores inválidos', () => {
        expect(parsePage('')).toBe(1);
        expect(parsePage('?page=4')).toBe(4);
        expect(parsePage('?page=0')).toBe(1);
        expect(parsePage('?page=-3')).toBe(1);
        expect(parsePage('?page=abc')).toBe(1);
        expect(parsePage('?page=2.5')).toBe(1);
    });

    it('parsePerPage: solo acepta los tamaños que ofrece la UI', () => {
        expect(parsePerPage('')).toBe(DEFAULT_PER_PAGE);
        expect(parsePerPage('?per=50')).toBe(50);
        expect(parsePerPage('?per=17')).toBe(DEFAULT_PER_PAGE);
        expect(parsePerPage('?per=abc')).toBe(DEFAULT_PER_PAGE);
    });

    it('buildListUrl conserva lente y búsqueda al cambiar de página', () => {
        expect(buildListUrl('?status=failed&search=ana', { page: 3 }))
            .toBe('/students?status=failed&search=ana&page=3');
    });

    it('los valores por defecto no se serializan: la URL limpia es la canónica', () => {
        expect(buildListUrl('?page=3', { page: 1 })).toBe('/students');
        expect(buildListUrl('?per=50', { per: DEFAULT_PER_PAGE })).toBe('/students');
    });

    it('cambiar el tamaño de página vuelve a la primera', () => {
        expect(buildListUrl('?page=7', { per: 50, page: null })).toBe('/students?per=50');
    });

    it('search vacío limpia también el alias heredado ?q', () => {
        expect(buildListUrl('?q=ana&page=2', { search: '   ' })).toBe('/students?page=2');
    });
});

describe('lens — inspección rápida (?preview=)', () => {
    it('parsePreview: null si falta o está vacío', () => {
        expect(parsePreview('')).toBeNull();
        expect(parsePreview('?preview=')).toBeNull();
        expect(parsePreview('?preview=42')).toBe('42');
    });

    it('abrir el panel no altera el contexto del listado', () => {
        expect(buildPreviewUrl('?status=failed&search=ana&page=3', '42'))
            .toBe('/students?status=failed&search=ana&page=3&preview=42');
    });

    it('cerrar el panel devuelve exactamente el listado previo', () => {
        expect(buildPreviewUrl('?status=failed&page=3&preview=42', null))
            .toBe('/students?status=failed&page=3');
    });

    it('recorrer con ↑/↓ solo sustituye el estudiante inspeccionado', () => {
        expect(buildPreviewUrl('?page=3&preview=42', '43')).toBe('/students?page=3&preview=43');
    });

    it('cambiar de lente cierra el panel: el expediente puede salir del alcance', () => {
        expect(buildLensUrl('?preview=42&page=2', 'approved')).toBe('/students?status=approved');
    });
});
