/**
 * strings.ts
 *
 * Utilidades de texto reutilizables.
 */

/**
 * Monograma de una persona: las iniciales de sus dos primeros nombres.
 *
 * REGLA ÚNICA del producto. Antes convivían cinco variantes (Avatar, cabecera
 * del expediente, alta manual, avatar del encabezado y dashboardService) y dos
 * de ellas devolvían monogramas DISTINTOS para el mismo estudiante: el listado
 * mostraba uno y el expediente otro. Aquí vive la única definición.
 *
 * Limitación conocida (documentada, no resuelta): con nombres compuestos
 * españoles —"José de Jesús Pérez"— los dos primeros tokens no siempre son la
 * elección onomástica ideal. Resolverlo bien exige distinguir nombres de
 * apellidos y de partículas, algo que el dato disponible no permite. Se prefiere
 * una regla consistente en todo el producto sobre cinco reglas discrepantes.
 *
 * @example initials('Juan Pérez')        → 'JP'
 * @example initials('  Ana   María Gil') → 'AM'   (tolera espacios múltiples)
 * @example initials('')                  → ''
 */
export function initials(name: string | null | undefined): string {
    return String(name ?? '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0] ?? '')
        .join('')
        .toUpperCase();
}
