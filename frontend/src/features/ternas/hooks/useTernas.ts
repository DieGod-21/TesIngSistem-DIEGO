import { useCallback, useEffect, useState } from 'react';
import { listTernas } from '../../../services/ternasService';
import type { TernaResumen, EstadoTerna } from '../../../types/api';

export function useTernas(estado?: EstadoTerna) {
    const [ternas, setTernas] = useState<TernaResumen[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listTernas(estado);
            setTernas(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudieron cargar las ternas.');
            setTernas([]);
        } finally {
            setLoading(false);
        }
    }, [estado]);

    useEffect(() => { reload(); }, [reload]);

    return { ternas, loading, error, reload };
}
