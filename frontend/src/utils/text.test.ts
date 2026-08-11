import { describe, it, expect } from 'vitest';
import { highlightRanges, matchesText, normalizeText } from './text';

/** Aplica los tramos para poder afirmar sobre TEXTO, no sobre índices. */
const marcar = (texto: string, q: string) => {
    const r = highlightRanges(texto, q);
    let out = '';
    let cur = 0;
    for (const [s, e] of r) {
        out += texto.slice(cur, s) + '[' + texto.slice(s, e) + ']';
        cur = e;
    }
    return out + texto.slice(cur);
};

describe('highlightRanges', () => {
    it('resalta una coincidencia simple', () => {
        expect(marcar('Ana Coc', 'ana')).toBe('[Ana] Coc');
    });

    /**
     * El caso que motiva la función: la búsqueda ignora acentos, así que "maria"
     * encuentra "María". Si los tramos se calculan sobre el texto normalizado en
     * NFD, 'í' ocupa DOS unidades y el resaltado sale corrido un carácter.
     */
    it('devuelve índices del texto original aunque haya diacríticos', () => {
        expect(marcar('María José', 'maria')).toBe('[María] José');
        expect(marcar('José Chávez', 'chavez')).toBe('José [Chávez]');
    });

    it('resalta cada token por separado', () => {
        expect(marcar('Ana Lucía Morales', 'ana morales')).toBe('[Ana] Lucía [Morales]');
    });

    it('fusiona tramos que se solapan', () => {
        expect(highlightRanges('aaaa', 'aa')).toEqual([[0, 4]]);
    });

    it('no resalta nada sin consulta ni sin coincidencia', () => {
        expect(highlightRanges('Ana Coc', '')).toEqual([]);
        expect(highlightRanges('Ana Coc', 'zzz')).toEqual([]);
        expect(highlightRanges('', 'ana')).toEqual([]);
        expect(highlightRanges(null, 'ana')).toEqual([]);
    });

    it('es coherente con matchesText: si hay coincidencia, hay tramo', () => {
        const nombre = 'María de los Ángeles Xitumul';
        for (const q of ['maria', 'ANGELES', 'xitumul', 'maria xitumul']) {
            expect(matchesText(nombre, q)).toBe(true);
            expect(highlightRanges(nombre, q).length).toBeGreaterThan(0);
        }
    });

    it('normalizeText sigue quitando acentos y bajando a minúsculas', () => {
        expect(normalizeText('  ÁÉÍÓÚ  ')).toBe('aeiou');
    });
});
