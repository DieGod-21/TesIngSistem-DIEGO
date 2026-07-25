/**
 * WorkQueue.tsx — Cola de trabajo (Wave 3).
 *
 * Capa de RENDER DELGADA sobre `deriveWorkQueue().items`. No deriva etapas, no
 * genera trabajo, no prioriza: todo eso lo decidió el dominio. Aquí solo se
 * aplica la POLÍTICA de la cola (visibilidad + autorización, en queuePolicy) y
 * el DESCARTE de ítems no auto-limpiables, y se dibuja.
 *
 * Conceptos independientes (invariante):
 *   - Visibilidad (queuePolicy)  → qué tipos se muestran.
 *   - selfClearing (dominio)     → si se limpia solo con el dato o necesita descarte.
 *   - Capacidad (queuePolicy)    → si el usuario puede ejecutar la acción.
 *
 * "Enrutar, no fingir": cada fila navega a una ruta real vía `onOpen`.
 * "Cola vacía = recompensa".
 */

import React, { useMemo } from 'react';
import {
    GraduationCap, AlertTriangle, FolderPlus, Clock, CheckCircle2,
    ChevronRight, Check, Inbox, type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '../../../components/ui';
import type { Capabilities } from '../../../config/permissions';
import type { WorkItem, WorkItemKind } from '../domain/types';
import { isVisibleInQueue, canActOnKind } from '../queuePolicy';
import { useDismissals } from '../hooks/useDismissals';
import '../styles/work-queue.css';

/** Máximo de ítems mostrados: la cola sugiere "lo siguiente", no todo el backlog. */
const CAP = 8;

/** Texto de la acción por tipo. */
const KIND_CTA: Record<WorkItemKind, string> = {
    registrar_nota_pg1: 'Registrar nota',
    registrar_nota_pg2: 'Registrar nota',
    revisar_no_elegible: 'Revisar',
    crear_caso: 'Crear caso',
    terna_estancada: 'Abrir terna',
    cerrar_resolucion: 'Cerrar',
};

const KIND_ICON: Record<WorkItemKind, LucideIcon> = {
    registrar_nota_pg1: GraduationCap,
    registrar_nota_pg2: GraduationCap,
    revisar_no_elegible: AlertTriangle,
    crear_caso: FolderPlus,
    terna_estancada: Clock,
    cerrar_resolucion: CheckCircle2,
};

interface WorkQueueProps {
    /** Salida del dominio (todos los ítems). null = aún sin cargar / sin permiso. */
    items: WorkItem[] | null;
    capabilities: Capabilities;
    loading: boolean;
    error: string | null;
    onOpen: (item: WorkItem) => void;
}

const WorkQueue: React.FC<WorkQueueProps> = ({ items, capabilities, loading, error, onOpen }) => {
    // Política: visibles + accionables por el usuario. (Selección de presentación
    // sobre la salida del dominio, no reglas de negocio.)
    const enabled = useMemo(
        () => (items ?? []).filter(isVisibleInQueue).filter((i) => canActOnKind(i.kind, capabilities)),
        [items, capabilities],
    );

    // Ids presentes para el GC del descarte (null mientras carga: no podar).
    const currentIds = useMemo(() => (items ? enabled.map((i) => i.id) : null), [items, enabled]);
    const { isDismissed, dismiss } = useDismissals(currentIds);

    // Los self-clearing nunca se descartan (bajan con el dato); el resto, si no
    // fue descartado.
    const shown = useMemo(
        () => enabled.filter((i) => i.selfClearing || !isDismissed(i.id)),
        [enabled, isDismissed],
    );

    const visible = shown.slice(0, CAP);
    const overflow = shown.length - visible.length;
    const loaded = items !== null;

    return (
        <section className="wq" aria-label="Cola de trabajo">
            <header className="wq__head">
                <h2 className="wq__title">Tu trabajo</h2>
                <p className="wq__subtitle">Lo siguiente por resolver</p>
            </header>

            {loading && (
                <ul className="wq__list" aria-hidden="true">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <li key={i} className="wq__item wq__item--skeleton">
                            <Skeleton variant="circle" />
                            <div style={{ flex: 1 }}>
                                <Skeleton size="medium" />
                                <Skeleton size="short" style={{ marginTop: 4 }} />
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {!loading && error && (
                <p className="wq__note" role="status">No se pudo cargar la cola de trabajo.</p>
            )}

            {!loading && !error && loaded && shown.length === 0 && (
                <div className="wq__reward" role="status">
                    <Inbox size={26} aria-hidden="true" />
                    <p className="wq__reward-title">Sin trabajo pendiente</p>
                    <p className="wq__reward-sub">Todo al día.</p>
                </div>
            )}

            {!loading && !error && visible.length > 0 && (
                <>
                    <ul className="wq__list">
                        {visible.map((item) => {
                            const Icon = KIND_ICON[item.kind];
                            return (
                                <li key={item.id} className="wq__item">
                                    <button
                                        type="button"
                                        className="wq__main"
                                        onClick={() => onOpen(item)}
                                        aria-label={`${KIND_CTA[item.kind]} — ${item.nombre}`}
                                    >
                                        <span className={`wq__icon wq__icon--${item.kind}`}>
                                            <Icon size={16} aria-hidden="true" />
                                        </span>
                                        <span className="wq__body">
                                            <span className="wq__name">{item.nombre}</span>
                                            <span className="wq__reason">{item.reason}</span>
                                        </span>
                                        <span className="wq__cta">
                                            {KIND_CTA[item.kind]}
                                            <ChevronRight size={16} aria-hidden="true" />
                                        </span>
                                    </button>
                                    {!item.selfClearing && (
                                        <button
                                            type="button"
                                            className="wq__dismiss"
                                            onClick={() => dismiss(item.id)}
                                            aria-label={`Marcar como atendido: ${item.nombre}`}
                                            title="Marcar como atendido"
                                        >
                                            <Check size={15} aria-hidden="true" />
                                            <span className="wq__dismiss-label">Hecho</span>
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    {overflow > 0 && (
                        <p className="wq__overflow">
                            y <strong>{overflow}</strong> {overflow === 1 ? 'ítem más' : 'ítems más'} en cola
                        </p>
                    )}
                </>
            )}
        </section>
    );
};

export default WorkQueue;
