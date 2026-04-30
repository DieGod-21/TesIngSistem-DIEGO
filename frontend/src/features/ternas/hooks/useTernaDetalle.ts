import { useCallback, useEffect, useState } from 'react';
import { getTernaById } from '../../../services/ternasService';
import { getTesisEstadoByCarnet } from '../../../services/tesisService';
import type { EstadoTesis, TernaDetalle } from '../../../types/api';

export interface TernaDetalleState {
    terna: TernaDetalle | null;
    eligibility: EstadoTesis | null;
    loading: boolean;
    error: string | null;
}

export function useTernaDetalle(id: number | null) {
    const [state, setState] = useState<TernaDetalleState>({
        terna: null, eligibility: null, loading: true, error: null,
    });

    const reload = useCallback(async () => {
        if (id == null || Number.isNaN(id)) return;
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const terna = await getTernaById(id);
            let eligibility: EstadoTesis | null = null;
            if (terna?.carnet) {
                eligibility = await getTesisEstadoByCarnet(terna.carnet).catch(() => null);
            }
            setState({ terna, eligibility, loading: false, error: null });
        } catch (e) {
            setState({
                terna: null,
                eligibility: null,
                loading: false,
                error: e instanceof Error ? e.message : 'No se pudo cargar la terna.',
            });
        }
    }, [id]);

    useEffect(() => { reload(); }, [reload]);

    return { ...state, reload };
}
