/**
 * useEvaluatorWorkspace.ts — Estado del workspace del evaluador.
 *
 * ── LA REGLA QUE ESTE HOOK EXISTE PARA CUMPLIR ──────────────────────────────
 *
 *     TODA carga termina en `success`, `empty` o `error`. Nunca en `loading`.
 *
 * El panel del evaluador se quedaba cargando para siempre, y la causa no era
 * una petición colgada: era que NADIE resolvía su estado. El panel pedía datos
 * de coordinación (padrón, resumen de tesis, cola de trabajo del coordinador),
 * el evaluador no tiene esas capacidades, la carga se saltaba… y la vista se
 * quedaba con el esqueleto puesto porque solo sabía salir de él cuando llegaban
 * unos datos que jamás iban a pedirse.
 *
 * Aquí el estado es una máquina explícita y cerrada. `success` con la lista
 * vacía es un resultado legítimo —«no tienes nada asignado»—, no una espera.
 */

import { useCallback, useEffect, useState } from 'react';
import { getEvaluatorAssignments } from '../data/evaluatorData';
import { userMessageFor } from '../../../services/errorMessages';
import { isCancel } from '../../../services/apiClient';
import type { TrabajoEvaluador } from '../domain/assignments';
import type { AsyncState } from '../../../types/async';

export interface EvaluatorWorkspace {
    state: AsyncState<TrabajoEvaluador>;
    /** Vuelve a pedir los datos (botón de reintento y tras evaluar). */
    reload: () => void;
}

export function useEvaluatorWorkspace(usuarioId: number | null): EvaluatorWorkspace {
    const [state, setState] = useState<AsyncState<TrabajoEvaluador>>({ status: 'idle' });
    /** Cambiar este contador fuerza una recarga desde el efecto. */
    const [nonce, setNonce] = useState(0);

    const reload = useCallback(() => setNonce((n) => n + 1), []);

    useEffect(() => {
        let vivo = true;
        setState({ status: 'loading' });

        getEvaluatorAssignments(usuarioId)
            .then((trabajo) => {
                if (!vivo) return;
                // Lista vacía = éxito con cero asignaciones. La vista decide si
                // eso se dibuja como estado vacío; el hook no se queda esperando.
                setState({ status: 'success', data: trabajo });
            })
            .catch((e) => {
                if (!vivo || isCancel(e)) return;
                setState({ status: 'error', message: userMessageFor(e) });
            });

        return () => { vivo = false; };
    }, [usuarioId, nonce]);

    return { state, reload };
}
