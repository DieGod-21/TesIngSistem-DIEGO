/**
 * TernasListPage.tsx
 *
 * Lista de ternas. El backend filtra automáticamente según rol:
 *   - admin     → todas
 *   - evaluador → sólo las que tiene asignadas
 */

import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { ClipboardList, Users, AlertTriangle, RefreshCw, Inbox, Plus } from 'lucide-react';
import TernaCard from '../components/TernaCard';
import NuevaTernaModal from '../components/NuevaTernaModal';
import { useTernas } from '../hooks/useTernas';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { PageHeader, Button, EmptyState, Skeleton } from '../../../components/ui';
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
                <Skeleton size="short" />
                <Skeleton size="medium" />
                <Skeleton size="medium" />
                <Skeleton size="short" />
            </div>
        ))}
    </div>
);

const TernasListPage: React.FC = () => {
    const history = useHistory();
    const { isAdmin, user } = useAuth();
    const { toast } = useToast();
    const [filter, setFilter] = useState<FilterValue>('all');
    const [altaAbierta, setAltaAbierta] = useState(false);

    const estado = filter === 'all' ? undefined : filter;
    const { ternas, loading, error, reload } = useTernas(estado);

    const counts = useMemo(() => ({
        total:      ternas.length,
        pendientes: ternas.filter((t) => t.estado === 'pendiente').length,
        progreso:   ternas.filter((t) => t.estado === 'en_progreso').length,
        completas:  ternas.filter((t) => t.estado === 'completada').length,
    }), [ternas]);

    const creada = (numero: number) => {
        setAltaAbierta(false);
        toast.success(`Terna #${numero} creada.`);
        reload();
    };

    return (
        <div className="ternas-page">
                <PageHeader
                    kicker="Evaluación"
                    icon={<ClipboardList size={22} />}
                    title="Ternas de Evaluación"
                    subtitle={
                        isAdmin
                            ? `Estás viendo todas las ternas como administrador (${counts.total}).`
                            : `Hola ${user?.nombre ?? ''}. Estas son las ternas que tienes asignadas.`
                    }
                    actions={
                        isAdmin ? (
                            <Button onClick={() => setAltaAbierta(true)}>
                                <Plus size={16} aria-hidden="true" />
                                Nueva terna
                            </Button>
                        ) : undefined
                    }
                />

                <div className="ui-toolbar ui-toolbar--bare" role="group" aria-label="Filtrar ternas">
                    {FILTERS.map((f) => (
                        <button
                            key={f.value}
                            type="button"
                            className={`ui-chip${filter === f.value ? ' ui-chip--active' : ''}`}
                            onClick={() => setFilter(f.value)}
                            aria-pressed={filter === f.value}
                        >
                            {f.label}
                        </button>
                    ))}
                    <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <Users size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {ternas.length} resultado{ternas.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {loading && <TernasSkeleton />}

                {!loading && error && (
                    <EmptyState
                        tone="danger"
                        icon={<AlertTriangle size={26} />}
                        title="No se pudieron cargar las ternas"
                        description={error}
                        action={
                            <Button variant="secondary" onClick={reload}>
                                <RefreshCw size={16} aria-hidden="true" /> Reintentar
                            </Button>
                        }
                    />
                )}

                {!loading && !error && ternas.length === 0 && (
                    <EmptyState
                        icon={<Inbox size={26} />}
                        title="No hay ternas que mostrar"
                        description={
                            isAdmin
                                ? 'Una terna se forma sobre un proyecto ya registrado y necesita entre dos y tres evaluadores.'
                                : 'No tienes ternas asignadas en este momento.'
                        }
                        action={
                            isAdmin ? (
                                <Button onClick={() => setAltaAbierta(true)}>
                                    <Plus size={16} aria-hidden="true" /> Crear la primera terna
                                </Button>
                            ) : undefined
                        }
                    />
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

                {isAdmin && (
                    <NuevaTernaModal
                        open={altaAbierta}
                        onClose={() => setAltaAbierta(false)}
                        onCreated={creada}
                    />
                )}
        </div>
    );
};

export default TernasListPage;
