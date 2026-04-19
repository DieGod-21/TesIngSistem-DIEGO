import { useEffect, useState } from 'react';
import { getPanels } from '../services/evaluationService';
import type { Panel } from '../types/evaluation';

export function usePanels() {
    const [panels,  setPanels ] = useState<Panel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError  ] = useState<string | null>(null);

    useEffect(() => {
        let canceled = false;
        setLoading(true);
        setError(null);

        getPanels()
            .then((data) => {
                if (!canceled) { setPanels(data); setLoading(false); }
            })
            .catch((err) => {
                if (!canceled) {
                    setError(err instanceof Error ? err.message : 'Error al cargar los paneles');
                    setLoading(false);
                }
            });

        return () => { canceled = true; };
    }, []);

    return { panels, loading, error } as const;
}
