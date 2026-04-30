import React, { useCallback, useEffect, useState } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { listProyectos } from '../../../services/proyectosService';
import type { Proyecto } from '../../../types/api';
import ProyectoCard from '../components/ProyectoCard';
import NuevoProyectoModal from '../components/NuevoProyectoModal';
import '../styles/proyectos.css';

const ProyectosSkeleton: React.FC = () => (
    <div className="proy-grid" aria-busy="true" aria-label="Cargando proyectos…">
        {[0, 1, 2, 3].map((i) => (
            <div key={i} className="proy-card" style={{ pointerEvents: 'none' }}>
                <div className="proy-card__top">
                    <div className="skeleton skeleton--line" style={{ height: 18, width: 40 }} />
                </div>
                <div className="skeleton skeleton--line" style={{ height: 16, width: '75%' }} />
                <div className="skeleton skeleton--line skeleton--medium" />
                <div className="skeleton skeleton--line skeleton--short" />
            </div>
        ))}
    </div>
);

const ProyectosListPage: React.FC = () => {
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
            setError(e instanceof Error ? e.message : 'Error al cargar los proyectos.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchProyectos(); }, [fetchProyectos]);

    return (
        <div className="proy-page">
            <header className="proy-page__header">
                <div>
                    <h1 className="proy-page__title">
                        <FolderOpen size={22} aria-hidden="true" />
                        Proyectos
                    </h1>
                    {!loading && !error && (
                        <p className="proy-page__subtitle">
                            {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''} registrado{proyectos.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    className="proy-btn proy-btn--primary"
                    onClick={() => setModalOpen(true)}
                >
                    <Plus size={16} aria-hidden="true" />
                    Nuevo Proyecto
                </button>
            </header>

            {loading && <ProyectosSkeleton />}

            {!loading && error && (
                <div className="proy-error" role="alert">{error}</div>
            )}

            {!loading && !error && proyectos.length === 0 && (
                <div className="proy-empty">
                    <p style={{ margin: 0, fontWeight: 600 }}>No hay proyectos registrados</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                        Crea el primer proyecto con el botón "Nuevo Proyecto".
                    </p>
                </div>
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
                onCreated={() => {
                    setModalOpen(false);
                    fetchProyectos();
                }}
            />
        </div>
    );
};

export default ProyectosListPage;
