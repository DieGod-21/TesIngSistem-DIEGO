/**
 * MisTernasPage.tsx — «Mis ternas» del evaluador.
 *
 * El listado ya viene acotado por el servidor: `GET /api/ternas` documenta
 * «Evaluador: solo ve las ternas en que está asignado». Aquí NO se pide la
 * lista completa para filtrarla en el cliente; lo que llega es ya lo propio.
 *
 * El filtro de esta pantalla es otra cosa y por eso existe: no separa por
 * estado del PANEL (pendiente / en progreso / completada, que es lo que le
 * importa a quien coordina) sino por estado de MI evaluación —lo que me toca
 * frente a lo que ya envié—, que es la única división que le sirve a quien
 * evalúa. Un panel «en progreso» puede estar esperándome a mí o no tener nada
 * que ver conmigo.
 *
 * El filtro vive en la URL (`?mias=pendiente`) para que sea enlazable y
 * sobreviva a una recarga, igual que en el resto del producto.
 */

import React, { useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { PageHeader } from '../../../components/ui';
import AssignmentQueue from '../components/AssignmentQueue';
import { useEvaluatorWorkspace } from '../hooks/useEvaluatorWorkspace';
import { useAuth } from '../../../context/AuthContext';
import { routes } from '../../../config/routes';
import type { MiEstado } from '../domain/assignments';
import '../styles/evaluator.css';

type Filtro = 'todas' | 'pendiente' | 'enviada';

const FILTROS: Array<{ valor: Filtro; etiqueta: string }> = [
    { valor: 'todas',     etiqueta: 'Todas' },
    { valor: 'pendiente', etiqueta: 'Te tocan' },
    { valor: 'enviada',   etiqueta: 'Enviadas' },
];

function leerFiltro(search: string): Filtro {
    const v = new URLSearchParams(search).get('mias');
    return v === 'pendiente' || v === 'enviada' ? v : 'todas';
}

const MisTernasPage: React.FC = () => {
    const history = useHistory();
    const location = useLocation();
    const { usuarioId } = useAuth();
    const { state, reload } = useEvaluatorWorkspace(usuarioId);

    const filtro = leerFiltro(location.search);
    const trabajo = state.status === 'success' ? state.data : null;

    const visibles = useMemo(() => {
        if (!trabajo) return null;
        if (filtro === 'todas') return trabajo.asignaciones;
        return trabajo.asignaciones.filter((a) => a.miEstado === (filtro as MiEstado));
    }, [trabajo, filtro]);

    const cambiarFiltro = (v: Filtro) => {
        history.replace(v === 'todas' ? routes.ternas() : `${routes.ternas()}?mias=${v}`);
    };

    const cuenta = (v: Filtro) => {
        if (!trabajo) return null;
        if (v === 'todas') return trabajo.asignaciones.length;
        return trabajo.asignaciones.filter((a) => a.miEstado === v).length;
    };

    /* El vacío no significa lo mismo según el filtro: sin asignaciones es «no
       participas en ningún panel», y con el filtro puesto es «aquí no queda
       nada», que es una buena noticia y no un error. */
    const vacio = filtro === 'pendiente'
        ? { titulo: 'No te toca ninguna evaluación', texto: 'Has enviado todas las evaluaciones que tenías asignadas.' }
        : filtro === 'enviada'
            ? { titulo: 'Todavía no has enviado ninguna', texto: 'Las evaluaciones que envíes aparecerán aquí.' }
            : { titulo: 'No tienes ternas asignadas', texto: 'Cuando la coordinación te asigne a un panel de evaluación, aparecerá aquí.' };

    return (
        <div className="ev-page">
            <PageHeader
                title="Mis ternas"
                subtitle="Los paneles de evaluación en los que participas"
            />

            {/* `ui-chip` es el chip de filtro DEL SISTEMA, el mismo que usa el
                listado de ternas del coordinador. Esta pantalla llegó a tener
                uno propio: mismo aspecto, otra implementación y otra
                calibración de contraste. Un filtro se ve igual en todo el
                producto o no es el mismo producto. */}
            <div className="ev-filtros" role="group" aria-label="Filtrar mis ternas">
                {FILTROS.map((f) => {
                    const activo = filtro === f.valor;
                    const n = cuenta(f.valor);
                    return (
                        <button
                            key={f.valor}
                            type="button"
                            className="ui-chip"
                            onClick={() => cambiarFiltro(f.valor)}
                            aria-pressed={activo}
                        >
                            {f.etiqueta}
                            {n !== null && <span className="ev-filtro__n">{n}</span>}
                        </button>
                    );
                })}
            </div>

            <AssignmentQueue
                titulo={filtro === 'pendiente' ? 'Te toca evaluar' : filtro === 'enviada' ? 'Ya enviadas' : 'Todas tus ternas'}
                asignaciones={visibles}
                cargando={state.status === 'loading' || state.status === 'idle'}
                error={state.status === 'error' ? state.message : null}
                onReintentar={reload}
                vacioTitulo={vacio.titulo}
                vacioTexto={vacio.texto}
            />
        </div>
    );
};

export default MisTernasPage;
