import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Users, User, UserPlus, AlertTriangle, RefreshCw } from 'lucide-react';
import { listUsuarios } from '../../../services/usuariosService';
import type { Usuario } from '../../../types/api';
import NuevoUsuarioModal from '../components/NuevoUsuarioModal';
import { Button, Badge, PageHeader, EmptyState } from '../../../components/ui';
import '../styles/usuarios.css';

const ROL_LABEL: Record<string, string> = {
    admin:     'Admin',
    evaluador: 'Evaluador',
};

const UsuariosSkeleton: React.FC = () => (
    <div className="usr-skeleton" aria-busy="true" aria-label="Cargando usuarios…">
        {[0, 1, 2].map((i) => (
            <div key={i} className="usr-skeleton-row">
                <div className="skeleton skeleton--box" style={{ width: 38, height: 38, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="skeleton skeleton--line skeleton--medium" />
                    <div className="skeleton skeleton--line skeleton--short" />
                </div>
                <div className="skeleton skeleton--line" style={{ width: 72, height: 22, borderRadius: 20 }} />
            </div>
        ))}
    </div>
);

const UsuariosPage: React.FC = () => {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const fetchUsuarios = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listUsuarios();
            setUsuarios(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al cargar los usuarios.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

    return (
        <div className="usr-page">
            <PageHeader
                kicker="Administración"
                icon={<Users size={22} />}
                title="Usuarios"
                subtitle={
                    !loading && !error
                        ? `${usuarios.length} usuario${usuarios.length !== 1 ? 's' : ''} registrado${usuarios.length !== 1 ? 's' : ''}`
                        : 'Gestiona el acceso de evaluadores y administradores'
                }
                actions={
                    <Button onClick={() => setModalOpen(true)}>
                        <Plus size={16} aria-hidden="true" />
                        Nuevo Usuario
                    </Button>
                }
            />

            {loading && <UsuariosSkeleton />}

            {!loading && error && (
                <EmptyState
                    tone="danger"
                    icon={<AlertTriangle size={26} />}
                    title="No se pudieron cargar los usuarios"
                    description={error}
                    action={
                        <Button variant="secondary" onClick={fetchUsuarios}>
                            <RefreshCw size={16} aria-hidden="true" /> Reintentar
                        </Button>
                    }
                />
            )}

            {!loading && !error && usuarios.length === 0 && (
                <EmptyState
                    icon={<UserPlus size={26} />}
                    title="No hay usuarios registrados"
                    description="Crea el primer usuario para dar acceso a evaluadores y administradores."
                    action={
                        <Button onClick={() => setModalOpen(true)}>
                            <Plus size={16} aria-hidden="true" /> Nuevo Usuario
                        </Button>
                    }
                />
            )}

            {!loading && !error && usuarios.length > 0 && (
                <div className="usr-list">
                    {usuarios.map((u) => (
                        <div key={u.id} className="usr-list-item">
                            <div className="usr-avatar" aria-hidden="true">
                                <User size={18} />
                            </div>
                            <div className="usr-info">
                                <p className="usr-info__name">{u.nombre}</p>
                                <p className="usr-info__email">{u.email}</p>
                            </div>
                            <Badge tone={u.rol === 'admin' ? 'primary' : 'success'}>
                                {ROL_LABEL[u.rol] ?? u.rol}
                            </Badge>
                        </div>
                    ))}
                </div>
            )}

            <NuevoUsuarioModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={() => {
                    setModalOpen(false);
                    fetchUsuarios();
                }}
            />
        </div>
    );
};

export default UsuariosPage;
