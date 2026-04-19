/**
 * strings.ts
 *
 * Utilidades de texto reutilizables.
 * Elimina duplicación de funciones como initials() que estaban
 * repetidas en DashboardPage y StudentsListPage.
 */

/**
 * Extrae las iniciales (máx. 2 letras) de un nombre completo.
 * @example initials('Juan Pérez') → 'JP'
 */
export function initials(name: string): string {
    return name
        .split(' ')
        .map((w) => w[0] ?? '')
        .slice(0, 2)
        .join('')
        .toUpperCase();
}
