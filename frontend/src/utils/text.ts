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
