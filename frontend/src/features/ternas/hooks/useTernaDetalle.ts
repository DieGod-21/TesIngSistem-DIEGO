import { useCallback, useEffect, useState } from 'react';
import { getTernaById } from '../../../services/ternasService';
import { getNotasByCarnet } from '../../../services/notasService';
import { computeThesisEligibility, type ThesisEligibilityResult } from '../../../utils/thesisEligibility';
import type { TernaDetalle } from '../../../types/api';

export interface TernaDetalleState {
    terna: TernaDetalle | null;
    eligibility: ThesisEligibilityResult | null;
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
            // Cargamos notas del estudiante en paralelo si tenemos carnet
            let eligibility: ThesisEligibilityResult | null = null;
            if (terna?.carnet) {
                try {
                    const notas = await getNotasByCarnet(terna.carnet);
                    eligibility = computeThesisEligibility(notas.notas);
                } catch {
                    eligibility = computeThesisEligibility([]);
                }
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
