import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Users, UserPlus, AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { listUsuarios } from '../../../services/usuariosService';
import { isCancel } from '../../../services/apiClient';
import { userMessageFor } from '../../../services/errorMessages';
import type { Usuario } from '../../../types/api';
import NuevoUsuarioModal from '../components/NuevoUsuarioModal';
import { Avatar, Button, Badge, PageHeader, EmptyState, Skeleton } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';

import { matchesText } from '../../../utils/text';
import { usePrimeraLlegada } from '../../../hooks/usePrimeraLlegada';
import '../styles/usuarios.css';

const ROL_LABEL: Record<string, string> = {
    admin:     'Admin',
    evaluador: 'Evaluador',
};

type RoleFilter = 'all' | 'admin' | 'evaluador';

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
    { value: 'all',       label: 'Todos' },
    { value: 'admin',     label: 'Administradores' },
    { value: 'evaluador', label: 'Evaluadores' },
];

const UsuariosSkeleton: React.FC = () => (
    <div className="usr-skeleton" aria-busy="true" aria-label="Cargando usuarios…">
        {[0, 1, 2].map((i) => (
            <div key={i} className="usr-skeleton-row">
                <Skeleton variant="box" width={44} height={44} radius="50%" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Skeleton size="medium" />
                    <Skeleton size="short" />
                </div>
                <Skeleton width={72} height={22} radius={20} />
            </div>
        ))}
    </div>
);

const UsuariosPage: React.FC = () => {
    const { toast } = useToast();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch]       = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    /*
     * El usuario recién creado. Crear cerraba el diálogo, mostraba un aviso y
     * recargaba la lista: el nuevo aparecía en algún sitio sin decir cuál.
     * Proyectos y ternas ya señalaban el suyo; este era el único alta de los
     * tres que no lo hacía.
     */
    const [recienCreado, setRecienCreado] = useState<number | null>(null);

    const fetchUsuarios = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            const data = await listUsuarios(undefined, { signal });
            if (signal?.aborted) return;
            setUsuarios(data);
        } catch (e) {
            if (signal?.aborted || isCancel(e)) return;
            setError(userMessageFor(e));
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchUsuarios(controller.signal);
        return () => controller.abort();
    }, [fetchUsuarios]);

    const roleCounts = useMemo(() => ({
        admin:     usuarios.filter((u) => u.rol === 'admin').length,
        evaluador: usuarios.filter((u) => u.rol === 'evaluador').length,
    }), [usuarios]);

    const filtered = useMemo(
        () => usuarios.filter((u) =>
            (roleFilter === 'all' || u.rol === roleFilter) &&
            matchesText(`${u.nombre ?? ''} ${u.email ?? ''}`, search),
        ),
        [usuarios, roleFilter, search],
    );

    /*
     * Cargar por primera vez y refrescar no son lo mismo.
     *
     * Los dos ponían `loading`, así que los dos enseñaban el esqueleto. MEDIDO
     * al crear un usuario: la lista desaparecía entera y volvía a montarse.
     * Un esqueleto contesta «¿hay algo?»; cuando ya hay algo en pantalla la
     * pregunta es «¿está al día?», y esa se contesta sin quitar nada.
     */
    const cargaInicial = loading && usuarios.length === 0;
    const refrescando  = loading && usuarios.length > 0;

    /*
     * La entrada escalonada, solo la primera vez. MEDIDO: al volver a «Todos»
     * rearrancaban seis filas, y tras un alta las nueve. Ver
     * `usePrimeraLlegada`.
     */
    const primeraLlegada = usePrimeraLlegada(filtered.map((u) => u.id));

    const clearFilters = () => { setSearch(''); setRoleFilter('all'); };

    return (
        <div className="usr-page">
            <PageHeader
                kicker="Administración"
                icon={<Users size={22} />}
                title="Usuarios"
                subtitle="El acceso se otorga por invitación. Administra evaluadores y administradores del sistema."
                actions={
                    <Button onClick={() => setModalOpen(true)}>
                        <Plus size={16} aria-hidden="true" />
                        Nuevo Usuario
                    </Button>
                }
            />

            {cargaInicial && <UsuariosSkeleton />}

            {!loading && error && (
                <EmptyState
                    tone="danger"
                    icon={<AlertTriangle size={26} />}
                    title="No se pudieron cargar los usuarios"
                    description={error}
                    action={
                        <Button variant="secondary" onClick={() => fetchUsuarios()}>
                            <RefreshCw size={16} aria-hidden="true" /> Reintentar
                        </Button>
                    }
                />
            )}

            {!cargaInicial && !error && usuarios.length === 0 && (
                <EmptyState
                    icon={<UserPlus size={26} />}
                    title="Aún no hay usuarios"
                    description="Crea el primer usuario para dar acceso a evaluadores y administradores."
                    action={
                        <Button onClick={() => setModalOpen(true)}>
                            <Plus size={16} aria-hidden="true" /> Nuevo Usuario
                        </Button>
                    }
                />
            )}

            {!cargaInicial && !error && usuarios.length > 0 && (
                <>
                    <div className="ui-stat-grid">
                        <div className="ui-stat">
                            <span className="ui-stat__label">Usuarios</span>
                            <span className="ui-stat__value">{usuarios.length}</span>
                            <span className="ui-stat__sub">Total registrados</span>
                        </div>
                        <div className="ui-stat" style={{ '--stat-accent': 'var(--color-primary)' } as React.CSSProperties}>
                            <span className="ui-stat__label">Administradores</span>
                            <span className="ui-stat__value">{roleCounts.admin}</span>
                            <span className="ui-stat__sub">Acceso completo</span>
                        </div>
                        <div className="ui-stat" style={{ '--stat-accent': 'var(--color-success)' } as React.CSSProperties}>
                            <span className="ui-stat__label">Evaluadores</span>
                            <span className="ui-stat__value">{roleCounts.evaluador}</span>
                            <span className="ui-stat__sub">Evalúan ternas</span>
                        </div>
                    </div>

                    <div className="ui-toolbar">
                        <div className="ui-search ui-toolbar__search">
                            <Search size={15} className="ui-search__icon" aria-hidden="true" />
                            <input
                                type="text"
                                className="ui-search__input"
                                placeholder="Buscar por nombre o correo…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Buscar usuarios"
                            />
                        </div>
                        <div className="ui-toolbar__group" role="group" aria-label="Filtrar por rol">
                            {ROLE_FILTERS.map((f) => (
                                <button
                                    key={f.value}
                                    type="button"
                                    className={`ui-chip${roleFilter === f.value ? ' ui-chip--active' : ''}`}
                                    onClick={() => setRoleFilter(f.value)}
                                    aria-pressed={roleFilter === f.value}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <EmptyState
                            icon={<Search size={26} />}
                            title="Sin resultados"
                            description="Ningún usuario coincide con la búsqueda o el filtro seleccionado."
                            action={
                                <Button variant="secondary" onClick={clearFilters}>
                                    Limpiar filtros
                                </Button>
                            }
                        />
                    ) : (
                        <div
                            className={`usr-list${primeraLlegada ? '' : ' usr-list--sin-cascada'}${refrescando ? ' ui-refrescando' : ''}`}
                            aria-busy={refrescando || undefined}
                        >
                            {filtered.map((u) => (
                                <div
                                    key={u.id}
                                    className={`usr-list-item ui-scroll-anchor${u.id === recienCreado ? ' usr-list-item--nuevo' : ''}`}
                                    ref={(el) => {
                                        // `nearest`: si ya está a la vista no se
                                        // mueve nada, que es el caso normal.
                                        if (u.id === recienCreado && el) el.scrollIntoView({ block: 'nearest' });
                                    }}
                                >
                                    <Avatar
                                        name={u.nombre}
                                        size="lg"
                                        tone={u.rol === 'admin' ? 'brand' : 'success'}
                                    />
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
                </>
            )}

            <NuevoUsuarioModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={(nombre, id) => {
                    setModalOpen(false);
                    setRecienCreado(id);
                    toast.success(`${nombre} ya tiene acceso al sistema.`);
                    fetchUsuarios();
                }}
            />
        </div>
    );
};

export default UsuariosPage;
