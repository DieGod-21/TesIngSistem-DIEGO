/**
 * routes.ts — Construcción CENTRALIZADA de rutas del frontend.
 *
 * Única fuente de verdad para las URLs de navegación de la app. Antes los
 * literales (`/students/${id}`, `/ternas/${id}`, …) estaban dispersos por
 * páginas y helpers, acoplados a AppRouter sin contrato compartido: cambiar una
 * ruta rompía enlaces en silencio (sin error de compilación). Aquí se centralizan
 * como builders tipados; los consumidores nunca escriben el literal.
 *
 * Estas rutas deben mantenerse en sincronía con las declaradas en AppRouter.
 */

export const routes = {
    dashboard: () => '/dashboard',

    students: () => '/students',
    /** Roster filtrado por término (fallback de "enrutar, no fingir"). */
    studentsSearch: (term: string) => `/students?search=${encodeURIComponent(term)}`,
    studentNew: () => '/students/new',
    studentDetail: (id: number | string) => `/students/${id}`,

    proyectos: () => '/proyectos',
    proyectoDetail: (id: number | string) => `/proyectos/${id}`,

    ternas: () => '/ternas',
    ternaDetail: (id: number | string) => `/ternas/${id}`,

    reports: () => '/reports',
    reportDetail: (id: number | string) => `/reports/${id}`,

    usuarios: () => '/usuarios',
} as const;
