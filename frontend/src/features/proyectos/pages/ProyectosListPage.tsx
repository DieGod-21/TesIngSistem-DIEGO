import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { FolderOpen, FolderPlus, Plus, AlertTriangle, RefreshCw, Search, SearchX } from 'lucide-react';
import { listProyectos } from '../../../services/proyectosService';
import { isCancel } from '../../../services/apiClient';
import { userMessageFor } from '../../../services/errorMessages';
import { matchesText } from '../../../utils/text';
import type { FaseProyecto, Proyecto } from '../../../types/api';
import ProyectoCard from '../components/ProyectoCard';
import NuevoProyectoModal from '../components/NuevoProyectoModal';
import { Button, PageHeader, EmptyState, Skeleton } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';
import '../styles/proyectos.css';

type FaseFilter = 'all' | FaseProyecto;

const FASES: { value: FaseFilter; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'PG1', label: 'PG1' },
    { value: 'PG2', label: 'PG2' },
];

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
    const history = useHistory();
    const location = useLocation();

    const [proyectos, setProyectos] = useState<Proyecto[]>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    /**
     * El proyecto recién creado.
     *
     * El aviso decía «creado» y la cuadrícula se repintaba con una tarjeta más:
     * entre doce, ninguna pista de cuál era. Se resalta un momento y se lleva a
     * la vista, que es lo que cierra el ciclo de la acción — intención,
     * interacción, proceso y RESULTADO localizable.
     */
    const [recienCreado, setRecienCreado] = useState<number | null>(null);

    /*
     * Los filtros viven en la URL, no en el estado del componente.
     *
     * No es purismo: al abrir un proyecto y volver, el filtro que se habia
     * elegido desaparecia y habia que reconstruirlo a mano. Con la URL como
     * fuente, «volver» lo restaura solo, el enlace es compartible y el boton
     * atras del navegador hace lo que se espera. Es ademas el patron que ya
     * sigue el padron de estudiantes.
     */
    const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const search = params.get('q') ?? '';
    const fase   = (params.get('fase') as FaseFilter) || 'all';

    const setParam = useCallback((clave: string, valor: string | null) => {
        const p = new URLSearchParams(location.search);
        if (valor && valor !== 'all' && valor !== '') p.set(clave, valor);
        else p.delete(clave);
        const qs = p.toString();
        history.replace(qs ? `/proyectos?${qs}` : '/proyectos');
    }, [history, location.search]);

    const setSearch = useCallback((v: string) => setParam('q', v), [setParam]);
    const setFase   = useCallback((v: FaseFilter) => setParam('fase', v), [setParam]);

    // Al abrir un detalle se lleva la URL actual, para que «volver» devuelva la
    // vista tal y como estaba.
    const abrirProyecto = useCallback((id: number) => {
        history.push(`/proyectos/${id}`, { desde: `${location.pathname}${location.search}` });
    }, [history, location.pathname, location.search]);

    const fetchProyectos = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            const data = await listProyectos({}, { signal });
            if (signal?.aborted) return;
            setProyectos(data);
        } catch (e) {
            if (signal?.aborted || isCancel(e)) return;
            setError(userMessageFor(e));
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchProyectos(controller.signal);
        return () => controller.abort();
    }, [fetchProyectos]);

    // El filtrado ocurre sobre el conjunto ya descargado: una cohorte de
    // graduación son decenas de proyectos y el resultado debe verse mientras se
    // teclea, no una petición después.
    const visibles = useMemo(() => {
        const q = search.trim();
        return proyectos.filter((p) => {
            if (fase !== 'all' && p.fase !== fase) return false;
            if (!q) return true;
            return matchesText(`${p.titulo} ${p.estudiante_nombre ?? ''} ${p.carnet ?? ''}`, q);
        });
    }, [proyectos, search, fase]);

    /**
     * Quiénes ya tienen proyecto. El API responde 409 si se registra un segundo
     * proyecto para la misma persona; ofrecerla en el selector sería invitar a
     * un error que ya sabemos de antemano.
     */
    const carnetsConProyecto = useMemo(
        () => new Set(proyectos.map((p) => p.carnet).filter((c): c is string => Boolean(c))),
        [proyectos],
    );

    const filtrando = search.trim() !== '' || fase !== 'all';

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

            {!loading && !error && proyectos.length > 0 && (
                <div className="ui-toolbar">
                    <div className="ui-search ui-toolbar__search">
                        <Search size={16} className="ui-search__icon" aria-hidden="true" />
                        <input
                            type="search"
                            className="ui-search__input"
                            placeholder="Buscar por título, estudiante o carné…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Buscar proyectos"
                        />
                    </div>

                    <div className="ui-toolbar__group" role="group" aria-label="Filtrar por fase">
                        {FASES.map((f) => (
                            <button
                                key={f.value}
                                type="button"
                                className={`ui-chip${fase === f.value ? ' ui-chip--active' : ''}`}
                                onClick={() => setFase(f.value)}
                                aria-pressed={fase === f.value}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {loading && <ProyectosSkeleton />}

            {!loading && error && (
                <EmptyState
                    tone="danger"
                    icon={<AlertTriangle size={26} />}
                    title="No se pudieron cargar los proyectos"
                    description={error}
                    action={
                        <Button variant="secondary" onClick={() => fetchProyectos()}>
                            <RefreshCw size={16} aria-hidden="true" /> Reintentar
                        </Button>
                    }
                />
            )}

            {!loading && !error && proyectos.length === 0 && (
                <EmptyState
                    icon={<FolderPlus size={26} />}
                    title="No hay proyectos registrados"
                    description="Cada proyecto pertenece a un estudiante y es lo que después se evalúa en terna."
                    action={
                        <Button onClick={() => setModalOpen(true)}>
                            <Plus size={16} aria-hidden="true" /> Nuevo Proyecto
                        </Button>
                    }
                />
            )}

            {/* Nada que mostrar POR EL FILTRO no es lo mismo que no haber nada:
                aquí la salida es limpiar el filtro, no crear un proyecto. */}
            {!loading && !error && proyectos.length > 0 && visibles.length === 0 && (
                <EmptyState
                    icon={<SearchX size={26} />}
                    title="Ningún proyecto coincide"
                    description={
                        search.trim()
                            ? `No hay proyectos que coincidan con «${search.trim()}»${fase !== 'all' ? ` en ${fase}` : ''}.`
                            : `No hay proyectos en ${fase}.`
                    }
                    action={
                        <Button variant="secondary" onClick={() => history.replace('/proyectos')}>
                            Quitar filtros
                        </Button>
                    }
                />
            )}

            {!loading && !error && visibles.length > 0 && (
                <>
                    {filtrando && (
                        <p className="proy-count" aria-live="polite">
                            {visibles.length} de {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''}
                        </p>
                    )}
                    <div className="proy-grid">
                        {visibles.map((p) => (
                            <ProyectoCard
                                key={p.id}
                                proyecto={p}
                                onOpen={abrirProyecto}
                                destacado={p.id === recienCreado}
                            />
                        ))}
                    </div>
                </>
            )}

            <NuevoProyectoModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                carnetsConProyecto={carnetsConProyecto}
                onCreated={(titulo, id) => {
                    setModalOpen(false);
                    toast.success(`Proyecto «${titulo}» creado.`);
                    setRecienCreado(id);
                    fetchProyectos();
                }}
            />
        </div>
    );
};

export default ProyectosListPage;
