import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Users, User } from 'lucide-react';
import { listUsuarios } from '../../../services/usuariosService';
import type { Usuario } from '../../../types/api';
import NuevoUsuarioModal from '../components/NuevoUsuarioModal';
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
            <header className="usr-page__header">
                <div>
                    <h1 className="usr-page__title">
                        <Users size={22} aria-hidden="true" />
                        Usuarios
                    </h1>
                    {!loading && !error && (
                        <p className="usr-page__subtitle">
                            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    className="usr-btn usr-btn--primary"
                    onClick={() => setModalOpen(true)}
                >
                    <Plus size={16} aria-hidden="true" />
                    Nuevo Usuario
                </button>
            </header>

            {loading && <UsuariosSkeleton />}

            {!loading && error && (
                <div className="usr-error" role="alert">{error}</div>
            )}

            {!loading && !error && usuarios.length === 0 && (
                <div className="usr-empty">
                    <p style={{ margin: 0, fontWeight: 600 }}>No hay usuarios registrados</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                        Crea el primer usuario con el botón "Nuevo Usuario".
                    </p>
                </div>
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
                            <span className={`usr-badge usr-badge--${u.rol}`}>
                                {ROL_LABEL[u.rol] ?? u.rol}
                            </span>
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
