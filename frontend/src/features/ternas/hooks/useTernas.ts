import { useCallback, useEffect, useState } from 'react';
import { listTernas } from '../../../services/ternasService';
import { isCancel } from '../../../services/apiClient';
import { userMessageFor } from '../../../services/errorMessages';
import type { TernaResumen, EstadoTerna } from '../../../types/api';

export function useTernas(estado?: EstadoTerna) {
    const [ternas, setTernas] = useState<TernaResumen[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            const data = await listTernas(estado, { signal });
            if (signal?.aborted) return;
            setTernas(data);
        } catch (e) {
            if (signal?.aborted || isCancel(e)) return;
            setError(userMessageFor(e));
            setTernas([]);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [estado]);

    useEffect(() => {
        const controller = new AbortController();
        reload(controller.signal);
        return () => controller.abort();
    }, [reload]);

    return { ternas, loading, error, reload: () => reload() };
}
