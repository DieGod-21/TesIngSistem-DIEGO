/**
 * useCopyToClipboard.ts — Copiar un dato y acusar recibo, con vuelta sola.
 *
 * MOTIVO: la vista rápida marcaba `copied` y NUNCA lo revertía; el acuse
 * quedaba fijo hasta cambiar de estudiante. Un acuse permanente deja de ser
 * acuse: no se puede distinguir "acabo de copiar" de "copié hace diez minutos".
 *
 * El temporizador se limpia al desmontar y se reinicia en cada copia, de modo
 * que copiar dos veces seguidas no deja un acuse huérfano.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** Ventana del acuse. Suficiente para verlo, corta para no mentir. */
const FEEDBACK_MS = 1600;

export function useCopyToClipboard(resetKey?: unknown) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };

    useEffect(() => clear, []);
    // Cambiar de registro invalida cualquier acuse anterior.
    useEffect(() => { clear(); setCopied(false); }, [resetKey]);

    const copy = useCallback(async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            /* Sin portapapeles (contexto no seguro): el dato sigue visible y
               seleccionable. No se finge un acuse que no ocurrió. */
            return false;
        }
        clear();
        setCopied(true);
        timer.current = setTimeout(() => setCopied(false), FEEDBACK_MS);
        return true;
    }, []);

    return { copied, copy };
}
