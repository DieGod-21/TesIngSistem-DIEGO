/**
 * TernasListPage.tsx
 *
 * Lista de ternas. El backend filtra automáticamente según rol:
 *   - admin     → todas
 *   - evaluador → sólo las que tiene asignadas
 */

import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { ClipboardList, Users } from 'lucide-react';
import TernaCard from '../components/TernaCard';
import { useTernas } from '../hooks/useTernas';
import { useAuth } from '../../../context/AuthContext';
import type { EstadoTerna } from '../../../types/api';
import '../styles/ternas.css';

type FilterValue = 'all' | EstadoTerna;

const FILTERS: { label: string; value: FilterValue }[] = [
    { label: 'Todas',         value: 'all' },
    { label: 'Pendientes',    value: 'pendiente' },
    { label: 'En progreso',   value: 'en_progreso' },
    { label: 'Completadas',   value: 'completada' },
];

const TernasSkeleton: React.FC = () => (
    <div className="ternas-grid" aria-busy="true" aria-label="Cargando ternas…">
        {[0, 1, 2, 3].map((i) => (
            <div key={i} className="terna-card" style={{ pointerEvents: 'none' }}>
                <div className="skeleton skeleton--line skeleton--short" />
                <div className="skeleton skeleton--line skeleton--medium" />
                <div className="skeleton skeleton--line skeleton--medium" />
                <div className="skeleton skeleton--line skeleton--short" />
            </div>
        ))}
    </div>
);

const TernasListPage: React.FC = () => {
    const history = useHistory();
    const { isAdmin, user } = useAuth();
    const [filter, setFilter] = useState<FilterValue>('all');

    const estado = filter === 'all' ? undefined : filter;
    const { ternas, loading, error } = useTernas(estado);

    const counts = useMemo(() => ({
        total:      ternas.length,
        pendientes: ternas.filter((t) => t.estado === 'pendiente').length,
        progreso:   ternas.filter((t) => t.estado === 'en_progreso').length,
        completas:  ternas.filter((t) => t.estado === 'completada').length,
    }), [ternas]);

    return (
        <div className="ternas-page">
                <header className="ternas-page__header">
                    <h1 className="ternas-page__title">
                        <ClipboardList size={22} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 8 }} />
                        Ternas de Evaluación
                    </h1>
                    <p className="ternas-page__subtitle">
                        {isAdmin
                            ? `Estás viendo todas las ternas como administrador (${counts.total}).`
                            : `Hola ${user?.nombre ?? ''}. Estas son las ternas que tienes asignadas.`}
                    </p>
                </header>

                <div className="ternas-toolbar" role="group" aria-label="Filtrar ternas">
                    {FILTERS.map((f) => (
                        <button
                            key={f.value}
                            type="button"
                            className={`ternas-chip${filter === f.value ? ' ternas-chip--active' : ''}`}
                            onClick={() => setFilter(f.value)}
                            aria-pressed={filter === f.value}
                        >
                            {f.label}
                        </button>
                    ))}
                    <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: '#64748b' }}>
                        <Users size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {ternas.length} resultado{ternas.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {loading && <TernasSkeleton />}

                {!loading && error && (
                    <div className="terror" role="alert">{error}</div>
                )}

                {!loading && !error && ternas.length === 0 && (
                    <div className="tempty">
                        <p style={{ margin: 0, fontWeight: 600 }}>No hay ternas que mostrar</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                            {isAdmin
                                ? 'Aún no se han creado ternas en el sistema.'
                                : 'No tienes ternas asignadas en este momento.'}
                        </p>
                    </div>
                )}

                {!loading && !error && ternas.length > 0 && (
                    <div className="ternas-grid">
                        {ternas.map((t) => (
                            <TernaCard
                                key={t.id}
                                terna={t}
                                onSelect={(id) => history.push(`/ternas/${id}`)}
                            />
                        ))}
                    </div>
                )}
        </div>
    );
};

export default TernasListPage;
