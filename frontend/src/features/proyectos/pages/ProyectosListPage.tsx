import React, { useCallback, useEffect, useState } from 'react';
import { FolderOpen, FolderPlus, Plus, AlertTriangle, RefreshCw } from 'lucide-react';
import { listProyectos } from '../../../services/proyectosService';
import type { Proyecto } from '../../../types/api';
import ProyectoCard from '../components/ProyectoCard';
import NuevoProyectoModal from '../components/NuevoProyectoModal';
import { Button, PageHeader, EmptyState, Skeleton } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';
import '../styles/proyectos.css';

const ProyectosSkeleton: React.FC = () => (
    <div className="proy-grid" aria-busy="true" aria-label="Cargando proyectos…">
        {[0, 1, 2, 3].map((i) => (
            <div key={i} className="proy-card" style={{ pointerEvents: 'none' }}>
                <div className="proy-card__top">
                    <Skeleton height={18} width={40} />
                </div>
                <Skeleton height={16} width="75%" />
                <Skeleton size="medium" />
                <Skeleton size="short" />
            </div>
        ))}
    </div>
);

const ProyectosListPage: React.FC = () => {
    const { toast } = useToast();
    const [proyectos, setProyectos] = useState<Proyecto[]>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const fetchProyectos = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listProyectos();
            setProyectos(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No pudimos cargar los proyectos. Revisa tu conexión e inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchProyectos(); }, [fetchProyectos]);

    return (
        <div className="proy-page">
            <PageHeader
                kicker="Gestión académica"
                icon={<FolderOpen size={22} />}
                title="Proyectos"
                subtitle={
                    !loading && !error
                        ? `${proyectos.length} proyecto${proyectos.length !== 1 ? 's' : ''} registrado${proyectos.length !== 1 ? 's' : ''}`
                        : 'Anteproyectos y trabajos de graduación'
                }
                actions={
                    <Button onClick={() => setModalOpen(true)}>
                        <Plus size={16} aria-hidden="true" />
                        Nuevo Proyecto
                    </Button>
                }
            />

            {loading && <ProyectosSkeleton />}

            {!loading && error && (
                <EmptyState
                    tone="danger"
                    icon={<AlertTriangle size={26} />}
                    title="No se pudieron cargar los proyectos"
                    description={error}
                    action={
                        <Button variant="secondary" onClick={fetchProyectos}>
                            <RefreshCw size={16} aria-hidden="true" /> Reintentar
                        </Button>
                    }
                />
            )}

            {!loading && !error && proyectos.length === 0 && (
                <EmptyState
                    icon={<FolderPlus size={26} />}
                    title="No hay proyectos registrados"
                    description="Crea el primer proyecto de graduación para comenzar el seguimiento."
                    action={
                        <Button onClick={() => setModalOpen(true)}>
                            <Plus size={16} aria-hidden="true" /> Nuevo Proyecto
                        </Button>
                    }
                />
            )}

            {!loading && !error && proyectos.length > 0 && (
                <div className="proy-grid">
                    {proyectos.map((p) => (
                        <ProyectoCard key={p.id} proyecto={p} />
                    ))}
                </div>
            )}

            <NuevoProyectoModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={(titulo) => {
                    setModalOpen(false);
                    toast.success(`Proyecto «${titulo}» creado.`);
                    fetchProyectos();
                }}
            />
        </div>
    );
};

export default ProyectosListPage;
