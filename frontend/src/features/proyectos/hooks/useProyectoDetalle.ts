/**
 * useProyectoDetalle.ts
 *
 * Carga un proyecto y el estado de tesis de su autor.
 *
 * El proyecto por sí solo no responde la pregunta que se hace quien lo abre.
 * «Sistema web de control de inventarios, de María José Ramírez» no dice si esa
 * persona puede defenderlo. El estado de tesis sí, y viene de la misma fuente
 * oficial que usa el resto del producto (`GET /api/tesis/estado/{carnet}`), no
 * de una regla recalculada aquí.
 *
 * El estado de tesis es CONTEXTO, no el asunto de la pantalla: si falla, el
 * proyecto se sigue mostrando. Un fallo de contexto no debe tumbar el contenido.
 */

import { useCallback, useEffect, useState } from 'react';
import { getProyectoById } from '../../../services/proyectosService';
import { getTesisEstadoByCarnet } from '../../../services/tesisService';
import { isCancel } from '../../../services/apiClient';
import { userMessageFor } from '../../../services/errorMessages';
import type { EstadoTesis, Proyecto } from '../../../types/api';

interface Estado {
    proyecto: Proyecto | null;
    tesis: EstadoTesis | null;
    loading: boolean;
    error: string | null;
}

const VACIO: Estado = { proyecto: null, tesis: null, loading: false, error: null };

export function useProyectoDetalle(id: string | number | null) {
    const [estado, setEstado] = useState<Estado>(VACIO);
    const [recarga, setRecarga] = useState(0);

    useEffect(() => {
        if (id == null || id === '') { setEstado(VACIO); return; }
        const numId = Number(id);
        if (!Number.isFinite(numId)) {
            setEstado({ ...VACIO, error: 'Identificador de proyecto inválido.' });
            return;
        }

        const controller = new AbortController();
        const { signal } = controller;
        setEstado((s) => ({ ...s, loading: true, error: null }));

        (async () => {
            try {
                const proyecto = await getProyectoById(numId, { signal });
                if (signal.aborted) return;

                const tesis = proyecto.carnet
                    ? await getTesisEstadoByCarnet(proyecto.carnet, { signal }).catch(() => null)
                    : null;
                if (signal.aborted) return;

                setEstado({ proyecto, tesis, loading: false, error: null });
            } catch (e) {
                if (signal.aborted || isCancel(e)) return;
                setEstado({ ...VACIO, error: userMessageFor(e) });
            }
        })();

        return () => controller.abort();
    }, [id, recarga]);

    const reload = useCallback(() => setRecarga((n) => n + 1), []);

    return { ...estado, reload } as const;
}
