/**
 * TernasListPage.tsx
 *
 * Lista de ternas. El backend filtra automáticamente según rol:
 *   - admin     → todas
 *   - evaluador → sólo las que tiene asignadas
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { ClipboardList, AlertTriangle, RefreshCw, Inbox, Plus } from 'lucide-react';
import TernaCard from '../components/TernaCard';
import NuevaTernaModal from '../components/NuevaTernaModal';
import { useTernas } from '../hooks/useTernas';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { PageHeader, Button, EmptyState, Skeleton, ListCount } from '../../../components/ui';
import type { EstadoTerna } from '../../../types/api';
import { routes } from '../../../config/routes';
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
    const { isAdmin } = useAuth();
    const { toast } = useToast();
    const [filter, setFilter] = useState<FilterValue>('all');
    const [altaAbierta, setAltaAbierta] = useState(false);
    /* Cuál es la recién creada. El aviso decía «Terna #6 creada» y la
       cuadrícula se repintaba con una tarjeta más, sin señalar cuál. */
    const [recienCreada, setRecienCreada] = useState<number | null>(null);

    const estado = filter === 'all' ? undefined : filter;
    const { ternas, loading, error, reload } = useTernas(estado);

    /*
     * Cargar por primera vez y refrescar no son lo mismo.
     *
     * El filtro de ternas se resuelve en el servidor, así que cada chip volvía
     * a poner `loading` y el esqueleto BORRABA lo que se estaba mirando.
     * MEDIDO: pulsar un chip hacía desaparecer la cuadrícula entera y
     * aparecer cuatro cajas grises, para una acción que ocurre dentro de la
     * misma pantalla y que casi siempre vuelve en un suspiro.
     *
     * Se conserva lo que hay y se atenúa. El atenuado llega con retardo (ver
     * `.ui-refrescando`), de modo que una respuesta rápida —la norma— no
     * produce ni un parpadeo. A cambio, durante ese instante lo que se ve
     * pertenece al filtro anterior; por eso la zona se marca `aria-busy` y no
     * se presenta como resultado definitivo.
     */
    const cargaInicial = loading && ternas.length === 0;
    const refrescando  = loading && ternas.length > 0;

    const creada = (numero: number) => {
        setAltaAbierta(false);
        toast.success(`Terna #${numero} creada.`);
        setRecienCreada(numero);
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
                            ? 'Paneles de evaluación sobre proyectos ya registrados.'
                            : 'Las ternas de evaluación que tienes asignadas.'
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
                </div>

                {/* Bajo la barra de filtros, en el mismo sitio que en Proyectos,
                    Reportes y Usuarios. Estaba alineado al final de la propia
                    barra: adyacente a los controles igual, pero una cuarta
                    colocación para un mismo elemento en cuatro pantallas.

                    Durante la primera carga se calla. Anunciar «0 ternas» para
                    corregirlo a «5» un instante después es peor que no decir
                    nada; al REFRESCAR sí se mantiene, porque entonces la cifra
                    anterior sigue siendo cierta. */}
                {!cargaInicial && (
                    <ListCount showing={ternas.length} noun={['terna', 'ternas']} />
                )}

                {cargaInicial && <TernasSkeleton />}

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

                {!cargaInicial && !error && ternas.length === 0 && (
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

                {!cargaInicial && !error && ternas.length > 0 && (
                    <div
                        className={`ternas-grid${refrescando ? ' ui-refrescando' : ''}`}
                        aria-busy={refrescando || undefined}
                    >
                        {ternas.map((t) => (
                            <TernaCard
                                key={t.id}
                                terna={t}
                                onSelect={(id) => history.push(routes.ternaDetail(id))}
                                destacado={t.numero === recienCreada}
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
