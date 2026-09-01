import { useState } from 'react';

/**
 * usePrimeraLlegada — ¿lo que se está pintando es el PRIMER conjunto que llegó?
 *
 * ── QUÉ PROBLEMA RESUELVE ───────────────────────────────────────────────
 *
 * Escalonar la entrada tiene sentido cuando el contenido LLEGA: guía la mirada
 * por algo que no estaba. Filtrar, buscar o paginar no es llegar —es la misma
 * lista mostrando otra cosa— y ahí la cascada solo retrasa lo que el usuario
 * acaba de pedir.
 *
 * El escalonado se reproducía igualmente porque las listas identifican sus
 * elementos por `id`: al filtrar, los que dejan de encajar se desmontan, y al
 * volver se montan de nuevo con su animación de entrada intacta. MEDIDO en el
 * navegador: quitar el filtro de fase en Proyectos rearrancaba las ocho
 * tarjetas, y volver a «Todos» en Usuarios seis filas.
 *
 * ── CÓMO ────────────────────────────────────────────────────────────────
 *
 * Se compara la identidad del conjunto pintado con la del primero que se vio.
 * En cuanto cambia, deja de ser una llegada para siempre.
 *
 * El ajuste ocurre DURANTE el render —el patrón que React documenta para
 * reaccionar a un cambio de datos— y no en un efecto. No es un detalle de
 * estilo: los elementos nuevos montan en ESTE commit, así que la respuesta
 * tiene que estar disponible ya. Un efecto llegaría un fotograma tarde, con la
 * cascada arrancada, que es justo lo que se quiere evitar.
 *
 * Tampoco sirve mirar la bandera de carga: cuando la respuesta se resuelve
 * dentro del mismo lote de React, ningún render llega a verla en `true`.
 *
 * @param claves Identificadores de los elementos que se están pintando, en
 *               orden. Vacío significa «todavía no ha llegado nada» y no
 *               cuenta como llegada.
 * @returns `true` mientras se muestre el primer conjunto; `false` en cuanto
 *          cambie, y ya para siempre.
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
