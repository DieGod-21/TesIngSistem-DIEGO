/**
 * routeChunks.ts — Los trozos de código de cada ruta, en un solo sitio.
 *
 * ── POR QUÉ EXISTE ──────────────────────────────────────────────────────
 *
 * MEDIDO en el navegador, grabando fotograma a fotograma qué ocupa el área de
 * contenido al pulsar un módulo de la barra lateral por primera vez:
 *
 *     Usuarios:  CHUNK@136 → esqueleto@441 → contenido@595
 *     Proyectos: CHUNK@131 → esqueleto@438 → contenido@584
 *
 * Dos esqueletos distintos, uno detrás de otro, para un solo clic: primero el
 * genérico que cubre la descarga del módulo y después el propio del módulo
 * mientras pide sus datos. La pantalla se reconstruye dos veces y ninguna de
 * las dos formas se parece a la siguiente. Y eso es en local: el primer tramo
 * es descarga, así que en una red de verdad es el que más crece.
 *
 * El segundo esqueleto está bien —los datos aún no han llegado—. El primero es
 * evitable: cuando el puntero se posa en «Usuarios», o el foco llega ahí con el
 * teclado, hay cientos de milisegundos muertos antes del clic. Se aprovechan
 * para traer el módulo, de modo que al pulsar ya esté.
 *
 * `import()` lo memoriza el propio empaquetador: pedirlo aquí y volver a
 * pedirlo en `lazy()` descarga UNA vez. Por eso los cargadores viven en este
 * archivo y los usan los dos lados; dos listas paralelas se separarían.
 *
 * No es precarga especulativa de todo: solo se trae aquello sobre lo que el
 * usuario ya ha manifestado interés.
 */

import type { ComponentType } from 'react';

type Cargador = () => Promise<{ default: ComponentType }>;

/** Ruta → módulo. La clave es la misma que usa la barra lateral en `to`. */
export const CHUNKS: Record<string, Cargador> = {
    '/students/new': () => import('../pages/StudentNewPage'),
    '/students':     () => import('../pages/StudentsListPage'),
    '/proyectos':    () => import('../features/proyectos/pages/ProyectosListPage'),
    '/ternas':       () => import('../features/ternas/pages/TernasListPage'),
    '/reports':      () => import('../features/reportes/pages/ReportesPage'),
    '/usuarios':     () => import('../features/usuarios/pages/UsuariosPage'),
};

/** Rutas ya pedidas. Evita repetir el trabajo en cada pasada del puntero. */
const pedidas = new Set<string>();

/**
 * ¿Quiere este dispositivo que gastemos datos por adelantado?
 *
 * `saveData` lo activa el usuario a propósito. Traer de más justo ahí sería
 * gastarle megas en algo que quizá no llegue a abrir. La API es experimental y
 * no existe en todos los navegadores: sin ella, se precarga.
 */
function ahorrandoDatos(): boolean {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    return nav.connection?.saveData === true;
}

/**
 * Trae el módulo de una ruta si aún no está. Silencioso a propósito: si la
 * descarga falla, no ha pasado nada —el usuario todavía no ha pedido ir— y
 * `lazy()` volverá a intentarlo al navegar de verdad, que es cuando un fallo
 * sí tiene que verse.
 */
export function prefetchRuta(ruta: string): void {
    if (pedidas.has(ruta) || ahorrandoDatos()) return;
    const cargar = CHUNKS[ruta];
    if (!cargar) return;
    pedidas.add(ruta);
    cargar().catch(() => pedidas.delete(ruta));
}
