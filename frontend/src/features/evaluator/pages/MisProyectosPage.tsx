/**
 * MisProyectosPage.tsx — Los proyectos que le toca evaluar a esta persona.
 *
 * ── DE DÓNDE SALEN ──────────────────────────────────────────────────────────
 *
 *     Mis ternas  →  proyectos asociados
 *
 * y NO
 *
 *     todos los proyectos  →  filtrar en el navegador
 *
 * La diferencia no es de estilo. `GET /api/proyectos` devuelve el catálogo
 * completo —el contrato dice «Admin y evaluadores pueden ver el listado de
 * proyectos» y sus únicos parámetros son `fase`, `search`, `page` y `limit`—,
 * así que pedirlo aquí sería descargarse los proyectos de toda la facultad
 * para ocultar los ajenos con una condición en React. Los datos ya habrían
 * viajado. Ocultar no es acotar.
 *
 * La terna trae el título, la fase, el estudiante, el carné y la foto: con eso
 * se presenta el proyecto sin pedir nada nuevo y sin ver nada de nadie más.
 *
 * ── LO QUE FALTA (BLOQUEO DEL BACKEND) ──────────────────────────────────────
 *
 * Ni el resumen ni el detalle de terna declaran `proyecto_id`, así que desde
 * aquí no se puede abrir la ficha del proyecto: no hay id que poner en la URL.
 * Se enlaza a la terna, que además es el sitio donde se evalúa. Con un
 * `proyecto_id` en la terna —o un filtro por asignación en `/api/proyectos`—
 * esta pantalla podría enlazar a la ficha completa.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { PageHeader, Button, Badge, EmptyState, Skeleton } from '../../../components/ui';
import { useEvaluatorWorkspace } from '../hooks/useEvaluatorWorkspace';
import { useAuth } from '../../../context/AuthContext';
import { derivarProyectos } from '../domain/assignments';
import { routes } from '../../../config/routes';
import '../styles/evaluator.css';

const MisProyectosPage: React.FC = () => {
    const { usuarioId } = useAuth();
    const { state, reload } = useEvaluatorWorkspace(usuarioId);

    const cargando = state.status === 'loading' || state.status === 'idle';
    const proyectos = state.status === 'success' ? derivarProyectos(state.data.asignaciones) : null;

    return (
        <div className="ev-page">
            <PageHeader
                title="Mis proyectos"
                subtitle="Los trabajos de graduación de las ternas que evalúas"
            />

            {cargando && (
                <div className="ev-proyectos" aria-busy="true" aria-label="Cargando tus proyectos…">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="ev-proyecto">
                            <Skeleton height={18} width="70%" />
                            <Skeleton height={15} width="45%" />
                            <Skeleton height={20} width="30%" />
                        </div>
                    ))}
                </div>
            )}

            {!cargando && state.status === 'error' && (
                <div className="asig-error" role="alert">
                    <AlertCircle size={18} aria-hidden="true" />
                    <div>
                        <p className="asig-error__tit">No se pudieron cargar tus proyectos</p>
                        <p className="asig-error__msg">{state.message}</p>
                    </div>
                    <Button variant="secondary" onClick={reload}>
                        <RefreshCw size={15} aria-hidden="true" /> Reintentar
                    </Button>
                </div>
            )}

            {!cargando && proyectos?.length === 0 && (
                <EmptyState
                    icon={<FolderOpen size={26} />}
                    title="No tienes proyectos asignados"
                    description="Los proyectos aparecen aquí cuando te asignan a la terna que los evalúa."
                />
            )}

            {!cargando && proyectos && proyectos.length > 0 && (
                <div className="ev-proyectos">
                    {proyectos.map((p) => (
                        <article key={p.clave} className="ev-proyecto">
                            <h2 className="ev-proyecto__titulo">{p.titulo}</h2>

                            <p className="ev-proyecto__autor">
                                {p.estudianteNombre}
                                <span className="ev-proyecto__carnet">{p.carnet}</span>
                            </p>

                            <div className="ev-proyecto__meta">
                                {p.fase && <Badge tone="info">{p.fase}</Badge>}
                                {p.ternas.some((t) => t.miEstado === 'pendiente') && (
                                    <Badge tone="warning">Te toca evaluar</Badge>
                                )}
                            </div>

                            {/* Se enlaza a la TERNA porque es lo que el contrato
                                permite identificar, y porque es donde se evalúa. */}
                            <div className="ev-proyecto__acciones">
                                {p.ternas.map((t) => (
                                    <Link key={t.id} className="ev-proyecto__link" to={routes.ternaDetail(t.id)}>
                                        Abrir terna {t.numero}
                                        <ChevronRight size={15} aria-hidden="true" />
                                    </Link>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MisProyectosPage;
