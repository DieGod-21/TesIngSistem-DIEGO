/**
 * NuevaTernaModal.tsx
 *
 * Alta de una terna de evaluación.
 *
 * Es la operación que pone en marcha todo lo demás del sistema: sin terna no
 * hay evaluaciones que enviar, ni promedio, ni resolución que reportar. Durante
 * mucho tiempo el producto dijo que esto se hacía «en el sistema de Control de
 * Notas» porque el mapa de endpoints daba la creación por no soportada; la
 * especificación publicada dice lo contrario desde hace tiempo.
 *
 * Una terna se crea SOBRE UN PROYECTO, no sobre un estudiante: el proyecto ya
 * lleva a su autor. Por eso el primer campo es el proyecto y el estudiante
 * aparece como consecuencia, no como otra cosa que elegir.
 *
 * El alta es irreversible desde el frontend (el contrato no publica un
 * DELETE /api/ternas/:id), así que el resumen previo al envío no es cortesía:
 * es la última oportunidad de revisar.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ClipboardList, Info } from 'lucide-react';
import {
    createTerna,
    listTernasCached,
    ROLES_TERNA,
    type RolTerna,
} from '../../../services/ternasService';
import { listProyectosCached } from '../../../services/proyectosService';
import { listUsuarios } from '../../../services/usuariosService';
import { isCancel } from '../../../services/apiClient';
import { userMessageFor } from '../../../services/errorMessages';
import { matchesText } from '../../../utils/text';
import { Button, Picker, Alert } from '../../../components/ui';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useOverlayTransition } from '../../../hooks/useOverlayTransition';
import type { Proyecto, TernaResumen, Usuario } from '../../../types/api';

const ROL_LABEL: Record<RolTerna, string> = {
    presidente: 'Presidente',
    secretario: 'Secretario',
    vocal:      'Vocal',
};

type Asignados = Record<RolTerna, number | null>;

const SIN_ASIGNAR: Asignados = { presidente: null, secretario: null, vocal: null };

interface Props {
    open: boolean;
    onClose: () => void;
    onCreated: (numero: number) => void;
}

const NuevaTernaModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
    const [proyectos, setProyectos]   = useState<Proyecto[]>([]);
    const [cargandoProy, setCargandoProy] = useState(false);
    const [falloProy, setFalloProy]   = useState<string | null>(null);

    /**
     * Ternas EXISTENTES, sin filtrar.
     *
     * No se heredan de la página a propósito: allí la lista está filtrada por
     * estado, y con «Pendientes» activo el siguiente número libre y el conjunto
     * de proyectos ya ocupados saldrían mal. El listado completo está cacheado,
     * así que preguntarlo aquí no cuesta una petición extra en la práctica.
     */
    const [ternasExistentes, setTernasExistentes] = useState<TernaResumen[] | null>(null);

    const [evaluadores, setEvaluadores] = useState<Usuario[]>([]);
    const [cargandoEval, setCargandoEval] = useState(true);
    const [falloEval, setFalloEval]   = useState<string | null>(null);

    const [proyecto, setProyecto] = useState<Proyecto | null>(null);
    const [asignados, setAsignados] = useState<Asignados>(SIN_ASIGNAR);
    const [fecha, setFecha]       = useState('');
    const [errores, setErrores]   = useState<{ proyecto?: string; roles?: Partial<Record<RolTerna, string>> }>({});
    const [enviando, setEnviando] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    /**
     * El siguiente número libre, calculado sobre TODAS las ternas.
     *
     * `null` mientras no se sabe. Es importante que no arranque en 1: el
     * diálogo mostraba «#1» durante la carga y lo cambiaba a «#6» un instante
     * después, de modo que quien ya lo había leído se quedaba con el número
     * equivocado. Un valor que se corrige solo es peor que un valor ausente.
     */
    const numero = useMemo(() => {
        if (ternasExistentes == null) return null;
        const nums = ternasExistentes.map((t) => t.numero).filter(Number.isFinite);
        return (nums.length ? Math.max(...nums) : 0) + 1;
    }, [ternasExistentes]);

    const reset = useCallback(() => {
        setProyecto(null);
        setAsignados(SIN_ASIGNAR);
        setFecha('');
        setErrores({});
        setApiError(null);
    }, []);

    /*
     * El formulario se vacía al ABRIR, no al cerrar.
     *
     * Cerrar ya no desmonta en el acto: la capa sobrevive lo que dura su
     * salida. Vaciar aquí el estado dejaba el formulario en blanco A LA VISTA
     * durante el fundido —proyecto elegido, evaluadores marcados y fecha
     * desaparecían antes que el diálogo—, que se lee como pérdida de datos.
     *
     * Al abrir, el resultado es el mismo (el diálogo siempre nace limpio) y
     * nadie llega a ver el paso intermedio.
     */
    useEffect(() => {
        if (open) reset();
    }, [open, reset]);

    const cerrar = useCallback(() => {
        if (enviando) return;
        onClose();
    }, [enviando, onClose]);

    /* Misma ventana de salida que el resto de diálogos del producto: la capa
       sobrevive a `open === false` lo que dure su animación. El atrapador de
       foco NO espera —recibe `open`— así que el foco vuelve a quien abrió en
       cuanto se pide cerrar. Ver useOverlayTransition. */
    const { montado, saliendo, overlayRef } = useOverlayTransition(open);
    const modalRef = useFocusTrap<HTMLDivElement>(open, cerrar);

    // Los evaluadores se cargan al abrir: son la lista corta y hay que enseñarla
    // entera, no buscarla. Los proyectos se cargan al desplegar su selector.
    useEffect(() => {
        if (!open) return;
        let vivo = true;
        setCargandoEval(true);
        setFalloEval(null);
        listUsuarios('evaluador')
            .then((us) => { if (vivo) setEvaluadores(us); })
            .catch((e) => {
                if (!vivo || isCancel(e)) return;
                setFalloEval(userMessageFor(e));
            })
            .finally(() => { if (vivo) setCargandoEval(false); });

        // Si esta lectura falla no se bloquea el alta: se propone el número 1 y
        // no se oculta ningún proyecto. Peor propuesta, nunca una puerta cerrada.
        listTernasCached()
            .then((ts) => { if (vivo) setTernasExistentes(ts); })
            .catch(() => { if (vivo) setTernasExistentes([]); });

        return () => { vivo = false; };
    }, [open]);

    const cargarProyectos = useCallback(() => {
        setCargandoProy(true);
        setFalloProy(null);
        listProyectosCached()
            .then(setProyectos)
            .catch((e) => {
                if (isCancel(e)) return;
                setFalloProy('No se pudieron cargar los proyectos.');
            })
            .finally(() => setCargandoProy(false));
    }, []);

    /**
     * Proyectos que aún pueden evaluarse.
     *
     * El resumen de terna no publica el `proyecto_id`, pero sí el carné de quien
     * la tiene; y un proyecto lleva el carné de su autor. Cruzar por carné
     * responde la pregunta real —«¿a esta persona ya se le formó terna?»— sin
     * inventar un campo que el contrato no da.
     */
    const proyectosDisponibles = useMemo(() => {
        const ocupados = new Set(
            (ternasExistentes ?? []).map((t) => t.carnet).filter(Boolean),
        );
        if (ocupados.size === 0) return proyectos;
        return proyectos.filter((p) => !p.carnet || !ocupados.has(p.carnet));
    }, [proyectos, ternasExistentes]);

    if (!montado) return null;

    const asignar = (rol: RolTerna, valor: string) => {
        setErrores((p) => ({ ...p, roles: { ...p.roles, [rol]: undefined } }));
        setAsignados((prev) => ({ ...prev, [rol]: valor ? Number(valor) : null }));
    };

    /** Un evaluador ocupa un solo cargo: en los otros dos aparece deshabilitado. */
    const ocupadoEnOtroCargo = (usuarioId: number, rol: RolTerna) =>
        ROLES_TERNA.some((r) => r !== rol && asignados[r] === usuarioId);

    const enviar = async (ev: React.FormEvent) => {
        ev.preventDefault();
        const errs: typeof errores = {};
        if (!proyecto) errs.proyecto = 'Elige el proyecto que se va a evaluar.';
        const faltan = ROLES_TERNA.filter((r) => asignados[r] == null);
        if (faltan.length > 0) {
            errs.roles = Object.fromEntries(
                faltan.map((r) => [r, `Elige quién ocupa el cargo de ${ROL_LABEL[r].toLowerCase()}.`]),
            );
        }
        setErrores(errs);
        if (Object.keys(errs).length > 0 || !proyecto || numero == null) return;

        setEnviando(true);
        setApiError(null);
        try {
            await createTerna({
                numero,
                proyectoId: proyecto.id,
                evaluadores: ROLES_TERNA.map((rol) => ({ usuarioId: asignados[rol] as number, rol })),
                ...(fecha ? { fechaEvaluacion: fecha } : {}),
            });
            // No se vacía aquí: `onCreated` cierra el diálogo y el formulario
            // se quedaría en blanco durante la salida. Lo limpia el efecto de
            // apertura.
            onCreated(numero);
        } catch (e) {
            setApiError(userMessageFor(e));
        } finally {
            setEnviando(false);
        }
    };

    // Sin número todavía no hay nada que enviar: el contrato lo exige y
    // adivinarlo produciría un choque con una terna existente.
    const listo = numero != null && Boolean(proyecto) && ROLES_TERNA.every((r) => asignados[r] != null);
    const faltanEvaluadores = !cargandoEval && !falloEval && evaluadores.length < ROLES_TERNA.length;

    return createPortal(
        <div
            ref={overlayRef}
            className={`ui-modal-overlay${saliendo ? ' ui-modal-overlay--saliendo' : ''}`}
            aria-hidden={saliendo || undefined}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nt-title"
            onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}
        >
            <div className={`ui-modal ui-modal--form ui-modal--wide${saliendo ? ' ui-modal--saliendo' : ''}`} ref={modalRef}>
                <header className="ui-modal__header">
                    <h2 id="nt-title" className="ui-modal__title">
                        <ClipboardList size={18} aria-hidden="true" />
                        Nueva terna
                    </h2>
                    <button
                        type="button"
                        className="ui-icon-btn"
                        onClick={cerrar}
                        aria-label="Cerrar"
                        disabled={enviando}
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>

                <form className="ui-modal__body" onSubmit={enviar} noValidate>
                    <div className="ui-modal__field">
                        <label htmlFor="nt-proyecto" className="ui-modal__label">
                            Proyecto a evaluar <span aria-hidden="true">*</span>
                        </label>
                        <Picker<Proyecto>
                            id="nt-proyecto"
                            items={proyectosDisponibles}
                            value={proyecto}
                            onChange={(p) => {
                                setProyecto(p);
                                setErrores((e) => ({ ...e, proyecto: undefined }));
                            }}
                            getKey={(p) => p.id}
                            getLabel={(p) => p.titulo}
                            getMeta={(p) => [p.estudiante_nombre, p.carnet].filter(Boolean).join(' · ') || undefined}
                            getSearchText={(p) => `${p.titulo} ${p.estudiante_nombre ?? ''} ${p.carnet ?? ''}`}
                            match={matchesText}
                            loading={cargandoProy}
                            loadingText="Cargando proyectos…"
                            failureText={falloProy}
                            emptyText="No hay proyectos sin terna asignada."
                            disabled={enviando}
                            error={errores.proyecto}
                            hint="La terna se crea sobre el proyecto; el estudiante viene con él."
                            placeholder="Busca por título, estudiante o carné…"
                            listLabel="Proyectos"
                            onFirstOpen={cargarProyectos}
                        />
                    </div>

                    <div className="nt-row">
                        <div className="ui-modal__field nt-row__num">
                            <span className="ui-modal__label" id="nt-numero-label">Número de terna</span>
                            {/* No es editable: el número lo determina el sistema como
                                el siguiente libre. Presentarlo como campo invitaría a
                                cambiarlo sin saber cuáles ya están ocupados. */}
                            <output className="nt-numero" aria-labelledby="nt-numero-label" aria-live="polite">
                                {numero == null ? '…' : `#${numero}`}
                            </output>
                        </div>

                        <div className="ui-modal__field nt-row__fecha">
                            <label htmlFor="nt-fecha" className="ui-modal__label">
                                Fecha de evaluación <span className="ui-modal__opt">(opcional)</span>
                            </label>
                            <input
                                id="nt-fecha"
                                type="date"
                                className="ui-control"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                                disabled={enviando}
                            />
                        </div>
                    </div>

                    <fieldset className="nt-fieldset">
                        <legend className="ui-modal__label">
                            Evaluadores <span aria-hidden="true">*</span>
                        </legend>

                        <p className="nt-hint" id="nt-eval-hint">
                            Exactamente tres evaluadores, uno por cargo.
                        </p>

                        {cargandoEval && <p className="nt-hint">Cargando evaluadores…</p>}

                        {!cargandoEval && falloEval && (
                            <Alert tone="danger">{falloEval}</Alert>
                        )}

                        {faltanEvaluadores && (
                            <Alert tone="warning">
                                Una terna necesita {ROLES_TERNA.length} evaluadores y hay {evaluadores.length} registrados.
                                Créalos en la sección de Usuarios antes de formar una terna.
                            </Alert>
                        )}

                        {!cargandoEval && !falloEval && !faltanEvaluadores && (
                            <div className="nt-roles">
                                {ROLES_TERNA.map((rol) => {
                                    const error = errores.roles?.[rol];
                                    return (
                                        <div className="nt-rol" key={rol}>
                                            <label htmlFor={`nt-rol-${rol}`} className="nt-rol__label">
                                                {ROL_LABEL[rol]}
                                            </label>
                                            <select
                                                id={`nt-rol-${rol}`}
                                                className="ui-control"
                                                value={asignados[rol] ?? ''}
                                                onChange={(e) => asignar(rol, e.target.value)}
                                                disabled={enviando}
                                                required
                                                aria-invalid={error ? true : undefined}
                                                aria-describedby={`nt-rol-${rol}-msg`}
                                            >
                                                <option value="">Sin asignar</option>
                                                {evaluadores.map((u) => (
                                                    <option key={u.id} value={u.id} disabled={ocupadoEnOtroCargo(u.id, rol)}>
                                                        {u.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                            <p
                                                id={`nt-rol-${rol}-msg`}
                                                className="ui-picker__msg ui-picker__msg--error"
                                                aria-live="polite"
                                            >
                                                {error ?? ''}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </fieldset>

                    {/* Una terna creada no se puede borrar desde aquí: el contrato
                        no publica DELETE. Decirlo antes vale más que un mensaje de
                        error después. */}
                    <p className="nt-aviso">
                        <Info size={14} aria-hidden="true" />
                        Una vez creada, la terna no puede eliminarse desde el sistema.
                    </p>

                    {apiError && <Alert tone="danger" role="alert" autoFocus>{apiError}</Alert>}

                    <footer className="ui-modal__footer">
                        <Button variant="secondary" onClick={cerrar} disabled={enviando}>
                            Cancelar
                        </Button>
                        <Button type="submit" loading={enviando} disabled={enviando || !listo}>
                            {enviando ? 'Creando…' : 'Crear terna'}
                        </Button>
                    </footer>
                </form>
            </div>
        </div>,
        document.body,
    );
};

export default NuevaTernaModal;
