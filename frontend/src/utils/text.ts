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

/** True si `haystack` contiene `needle` (ambos normalizados). */
export function matchesText(haystack: string | null | undefined, needle: string | null | undefined): boolean {
    const n = normalizeText(needle);
    if (!n) return true;
    return normalizeText(haystack).includes(n);
}
