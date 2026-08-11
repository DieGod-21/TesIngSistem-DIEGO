/**
 * text.ts
 *
 * Utilidades de normalización de texto para búsqueda tolerante
 * (sin acentos, case-insensitive, con trim). Se usa tanto en filtros
 * client-side como en comparaciones de búsqueda de listados.
 */

/** Normaliza texto: minúsculas + quita diacríticos (á → a). */
export function normalizeText(input: string | null | undefined): string {
    return String(input ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim();
}

/**
 * True si `haystack` contiene todos los tokens de `needle`.
 * Tokens = palabras separadas por espacios (e.g. "oscar martinez" → ["oscar", "martinez"]).
 * Cada token se busca con includes() sobre el haystack normalizado,
 * por lo que "martinez" coincide con "Oscar David Alvarez Martinez".
 */
export function matchesText(haystack: string | null | undefined, needle: string | null | undefined): boolean {
    const tokens = normalizeText(needle).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;
    const h = normalizeText(haystack);
    return tokens.every((t) => h.includes(t));
}

/**
 * Tramos de `text` que coinciden con los tokens de `query`, en índices del
 * texto ORIGINAL.
 *
 * El problema no es buscar, es volver. `normalizeText` usa NFD, que descompone
 * 'á' en dos unidades de código: los índices del texto normalizado dejan de
 * corresponder con los del original y resaltar por esos índices desplaza el
 * subrayado. Aquí se normaliza CARÁCTER A CARÁCTER llevando un mapa de vuelta,
 * así "maria" resalta exactamente "María".
 *
 * Devuelve tramos disjuntos y ordenados.
 */
export function highlightRanges(
    text: string | null | undefined,
    query: string | null | undefined,
): Array<[number, number]> {
    const src = String(text ?? '');
    const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
    if (!src || tokens.length === 0) return [];

    let folded = '';
    const back: number[] = [];
    for (let i = 0; i < src.length; i++) {
        const f = src[i].normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
        for (const ch of f) { folded += ch; back.push(i); }
    }

    const hits: Array<[number, number]> = [];
    for (const t of tokens) {
        let from = 0;
        for (;;) {
            const at = folded.indexOf(t, from);
            if (at < 0) break;
            const start = back[at];
            const last = back[at + t.length - 1];
            if (start != null && last != null) hits.push([start, last + 1]);
            from = at + t.length;
        }
    }
    if (hits.length === 0) return [];

    hits.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [hits[0]];
    for (const [s, e] of hits.slice(1)) {
        const prev = merged[merged.length - 1];
        if (s <= prev[1]) prev[1] = Math.max(prev[1], e);
        else merged.push([s, e]);
    }
    return merged;
}
