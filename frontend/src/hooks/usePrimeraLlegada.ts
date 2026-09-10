import { useState } from 'react';

/**
 * ¿El conjunto que se está pintando es el PRIMERO que llegó?
 *
 * Escalonar la entrada guía la mirada cuando el contenido llega. Filtrar o
 * paginar no es llegar, y allí la cascada solo retrasa lo que el usuario acaba
 * de pedir; se reproduce igualmente porque las listas identifican por `id` y
 * los elementos que vuelven a encajar se montan de nuevo.
 *
 * La comparación ocurre durante el render, no en un efecto: los elementos
 * nuevos montan en este mismo commit, así que la respuesta tiene que estar
 * disponible ya.
 *
 * @param claves Identificadores de lo que se pinta, en orden. Vacío = todavía
 *               no ha llegado nada.
 * @returns `true` mientras se muestre el primer conjunto; luego `false` para
 *          siempre.
 */
export function usePrimeraLlegada(claves: ReadonlyArray<string | number>): boolean {
    const [primera, setPrimera] = useState<string | null>(null);
    const [cambio, setCambio] = useState(false);

    const actual = claves.length > 0 ? claves.join(',') : null;

    if (actual !== null) {
        if (primera === null) setPrimera(actual);
        else if (actual !== primera && !cambio) setCambio(true);
    }

    return !cambio;
}
