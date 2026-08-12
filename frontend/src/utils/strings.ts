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

/**
 * Presenta el campo `carrera` del padrón.
 *
 * El API real devuelve un CÓDIGO, no un nombre: todos los expedientes traen
 * `"carrera": "1890"`. El producto lo pintaba tal cual bajo el nombre del
 * estudiante y en las sugerencias del buscador, donde un número suelto no dice
 * nada: se lee como un dato roto, no como una carrera.
 *
 * No existe endpoint de catálogo de carreras, así que no se puede traducir el
 * código a su nombre sin inventarlo. Lo que sí se puede es decir qué es.
 *
 * @example formatCarrera('1890')                   → 'Carrera 1890'
 * @example formatCarrera('Ingeniería en Sistemas') → 'Ingeniería en Sistemas'
 * @example formatCarrera('')                       → ''
 */
export function formatCarrera(carrera: string | null | undefined): string {
    const v = String(carrera ?? '').trim();
    if (!v) return '';
    return /^\d+$/.test(v) ? `Carrera ${v}` : v;
}

/**
 * Presenta el campo `ciclo` de una nota o de un curso.
 *
 * El catálogo real ya devuelve el valor con su prefijo («Ciclo 1-2025»), y el
 * expediente lo imprimía como `Ciclo {ciclo}`: en pantalla se leía «Ciclo Ciclo
 * 1-2025». El prefijo se añade solo si falta, para que ambas formas del dato
 * produzcan la misma línea.
 *
 * @example formatCiclo('Ciclo 1-2025') → 'Ciclo 1-2025'
 * @example formatCiclo('1-2025')       → 'Ciclo 1-2025'
 * @example formatCiclo('')             → ''
 */
export function formatCiclo(ciclo: string | null | undefined): string {
    const v = String(ciclo ?? '').trim();
    if (!v) return '';
    return /^ciclo\b/i.test(v) ? v : `Ciclo ${v}`;
}
