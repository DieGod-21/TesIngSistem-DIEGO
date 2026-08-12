/**
 * ProyectoDetailPage.tsx
 *
 * Detalle de un trabajo de graduación.
 *
 * `GET /api/proyectos/{id}` existía en el contrato desde el principio y no lo
 * consumía nadie: el listado era una pared de tarjetas que no llevaban a
 * ninguna parte. La pantalla responde las cinco preguntas de una vista de
 * detalle —qué es, de quién, en qué estado, qué hay relacionado y qué puedo
 * hacer— y no es una tabla ampliada: la mitad de su valor son los dos saltos
 * al expediente y a la terna.
 *
 * LIMITACIÓN DEL CONTRATO: no existe `PUT /api/proyectos/{id}` ni un `DELETE`.
 * Un proyecto no se puede editar ni borrar desde el producto, así que esta
 * pantalla no ofrece esas acciones. Inventar un botón que no puede funcionar
 * sería peor que no tenerlo.
 */

import React from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import {
    ChevronLeft, FolderOpen, GraduationCap, Users, AlertTriangle, RefreshCw,
    FileQuestion, CalendarDays,
} from 'lucide-react';
import { useProyectoDetalle } from '../hooks/useProyectoDetalle';
import { useEntityLinks } from '../../../hooks/useEntityLinks';
import ThesisStatusBadge from '../../../components/thesis/ThesisStatusBadge';
import { Badge, Button, EmptyState, RelationCard, Skeleton } from '../../../components/ui';
import { VOCAB } from '../../../config/vocabulary';
import '../styles/proyectos.css';

const ProyectoDetailSkeleton: React.FC = () => (
    <div className="pd-layout" aria-busy="true" aria-label="Cargando proyecto…">
        <div className="pd-main">
            <div className="pd-hero">
                <Skeleton height={11} width="18%" />
                <Skeleton height={26} width="72%" />
                <Skeleton height={26} width="46%" />
            </div>
            <div className="ui-card pd-block">
                <Skeleton size="short" />
                <Skeleton size="large" />
                <Skeleton size="medium" />
            </div>
        </div>
        <aside className="pd-rail">
            {[0, 1].map((i) => <Skeleton key={i} height={68} />)}
        </aside>
    </div>
);

const ProyectoDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const location = useLocation<{ desde?: string } | undefined>();

    const { proyecto, tesis, loading, error, reload } = useProyectoDetalle(id);

    // El expediente y la terna se resuelven cruzando por carné sobre colecciones
    // ya cacheadas. Si el usuario llegó navegando, no cuesta una petición.
    const enlaces = useEntityLinks(proyecto?.carnet, ['estudiante', 'terna']);

    /*
     * Volver DONDE ESTABA, con sus filtros. El listado guarda su estado en la
     * URL, así que basta con conservarla al navegar hacia aquí; sin eso, volver
     * significaba perder la búsqueda y la fase que se habían elegido.
     */
    const origen = location.state?.desde ?? '/proyectos';

    return (
        <div className="proy-page">
            <Button variant="secondary" onClick={() => history.push(origen)} style={{ alignSelf: 'flex-start' }}>
                <ChevronLeft size={16} aria-hidden="true" />
                Volver a Proyectos
            </Button>

            {loading && <ProyectoDetailSkeleton />}

            {!loading && error && (
                <EmptyState
                    tone="danger"
                    icon={<AlertTriangle size={26} />}
                    title="No se pudo cargar el proyecto"
                    description={error}
                    action={
                        <Button variant="secondary" onClick={reload}>
                            <RefreshCw size={16} aria-hidden="true" /> Reintentar
                        </Button>
                    }
                />
            )}

            {!loading && !error && !proyecto && (
                <EmptyState
                    icon={<FileQuestion size={26} />}
                    title="Proyecto no encontrado"
                    description="El proyecto solicitado no existe o fue dado de baja."
                />
            )}

            {!loading && !error && proyecto && (
                <div className="view-transition pd-layout" key={proyecto.id}>
                    <div className="pd-main">
                        <header className="pd-hero">
                            <p className="pd-hero__kicker">
                                <FolderOpen size={13} aria-hidden="true" />
                                Trabajo de graduación
                            </p>
                            <h1 className="pd-hero__title">{proyecto.titulo}</h1>
                            <div className="pd-hero__tags">
                                {proyecto.fase && (
                                    <Badge tone={proyecto.fase === 'PG1' ? 'primary' : 'info'}>
                                        {proyecto.fase}
                                    </Badge>
                                )}
                                {proyecto.estudiante_nombre && (
                                    <span className="pd-hero__owner">
                                        de {proyecto.estudiante_nombre}
                                    </span>
                                )}
                            </div>
                        </header>

                        <section className="ui-card pd-block" aria-labelledby="pd-desc-title">
                            <h2 id="pd-desc-title" className="pd-block__title">Descripción</h2>
                            {proyecto.descripcion?.trim()
                                ? <p className="pd-desc">{proyecto.descripcion}</p>
                                : (
                                    /* La ausencia se NOMBRA. Un bloque vacío bajo un
                                       título se lee como «esto no cargó». */
                                    <p className="pd-desc pd-desc--empty">
                                        Este proyecto no tiene descripción registrada.
                                    </p>
                                )}
                        </section>

                        {/* Las dos notas que deciden si esto se puede defender.
                            Vienen en la MISMA respuesta que el estado de tesis, así
                            que no cuestan una petición, y responden la pregunta que
                            la píldora del carril deja abierta: por qué. */}
                        {tesis && (
                            <section className="ui-card pd-block" aria-labelledby="pd-notas-title">
                                <div className="pd-block__head">
                                    <h2 id="pd-notas-title" className="pd-block__title">Requisito de tesis</h2>
                                    <span className="pd-block__note">Mínimo {tesis.nota_minima}</span>
                                </div>
                                <ul className="pd-notas">
                                    {([
                                        ['PG1', tesis.graduacion_1],
                                        ['PG2', tesis.graduacion_2],
                                    ] as const).map(([etiqueta, curso]) => {
                                        const nota = curso?.nota_final ?? null;
                                        const cumple = nota != null && nota >= tesis.nota_minima;
                                        return (
                                            <li
                                                key={etiqueta}
                                                className={`pd-nota${nota == null ? ' pd-nota--empty' : cumple ? ' pd-nota--pass' : ' pd-nota--fail'}`}
                                            >
                                                <span className="pd-nota__curso">{etiqueta}</span>
                                                <span className="pd-nota__valor ui-tnum">{nota ?? '—'}</span>
                                                <span className="pd-nota__estado">
                                                    {nota == null ? 'Sin registrar' : cumple ? 'Cumple' : 'No cumple'}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        )}
                    </div>

                    <aside className="pd-rail" aria-label="Información relacionada">
                        {/* Estado de tesis del autor: contexto, no adorno. Un
                            proyecto impecable de alguien que no cumple el
                            requisito no se puede defender, y eso es lo primero
                            que hay que saber al abrirlo. */}
                        {tesis && (
                            <div className="ui-card pd-tesis">
                                <span className="pd-tesis__label">Estado de tesis del autor</span>
                                <ThesisStatusBadge estado={tesis} variant="badge" />
                                {tesis.razon && <p className="pd-tesis__why">{tesis.razon}</p>}
                            </div>
                        )}

                        <RelationCard
                            kicker="Estudiante"
                            icon={<GraduationCap size={17} />}
                            title={enlaces.estudianteNombre ?? proyecto.estudiante_nombre ?? null}
                            meta={proyecto.carnet}
                            loading={enlaces.loading && !enlaces.estudianteHref}
                            onOpen={enlaces.estudianteHref
                                ? () => history.push(enlaces.estudianteHref as string)
                                : undefined}
                            emptyText="Sin estudiante asociado"
                        />

                        <RelationCard
                            kicker={VOCAB.committee}
                            icon={<Users size={17} />}
                            title={enlaces.ternaNumero != null
                                ? `${VOCAB.committee} ${enlaces.ternaNumero}`
                                : null}
                            meta={enlaces.ternaNumero != null ? 'Ver evaluadores y resolución' : undefined}
                            loading={enlaces.loading && !enlaces.ternaHref}
                            onOpen={enlaces.ternaHref
                                ? () => history.push(enlaces.ternaHref as string)
                                : undefined}
                            emptyText={`Sin ${VOCAB.committee.toLowerCase()} asignada`}
                        />

                        {proyecto.fase && (
                            <div className="ui-card pd-fase">
                                <CalendarDays size={15} aria-hidden="true" />
                                <span>
                                    Registrado en <strong>{proyecto.fase}</strong>
                                    {proyecto.fase === 'PG1'
                                        ? ' · Proyecto de Graduación I'
                                        : ' · Proyecto de Graduación II'}
                                </span>
                            </div>
                        )}
                    </aside>
                </div>
            )}
        </div>
    );
};

export default ProyectoDetailPage;
