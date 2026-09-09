/**
 * EvaluationForm.tsx
 *
 * Formulario de evaluación para una terna.
 *
 * Comportamiento:
 *   - Si la evaluación del usuario actual está 'enviada' → bloqueado (locked).
 *   - Si está 'borrador' o no existe → editable.
 *   - Acciones: Guardar borrador, Enviar definitiva (con ConfirmModal).
 *   - Admin puede reabrir la evaluación de un evaluador (con ConfirmModal).
 *   - Feedback vía ToastContext.
 *
 * ── DÓNDE VIVE LO QUE SE ESCRIBE ────────────────────────────────────────────
 *
 * Antes, en `useState` de este componente. Con eso, quien escribía media
 * página de observaciones, salía a comprobar un dato del proyecto y volvía, se
 * encontraba el formulario vacío: el componente se había desmontado y con él lo
 * tecleado. El borrador del SERVIDOR solo existe si se pulsa «Guardar
 * borrador» a propósito.
 *
 * Ahora vive en `evaluationStore` (Zustand), indexado por terna. Es estado de
 * un PROCESO —empieza en una pantalla, sigue en otra— y no pertenece a un
 * componente que se monta y se desmonta al navegar.
 *
 * Lo que NO se movió: `scoreError`, `busy` y `pending` siguen en `useState`.
 * Son estado efímero de esta pantalla, mueren con ella y nadie más los mira;
 * subirlos a un store global no arreglaría nada y añadiría ruido.
 *
 * Lo que se ve = lo tecleado, si hay algo tecleado; si no, lo que dice el
 * servidor. Al guardar o enviar se descarta lo local: a partir de ahí la
 * verdad la tiene el servidor y conservar una copia solo puede divergir.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Save, Send, Lock, RotateCw, PencilLine } from 'lucide-react';
import { saveDraft, submitEvaluation, reopenEvaluation } from '../../../services/ternasService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import ConfirmModal from '../../../components/ConfirmModal';
import { Button } from '../../../components/ui';
import { useEvaluationStore, hayCambiosSinGuardar } from '../../../stores/evaluationStore';
import type { TernaDetalle, EvaluadorTerna } from '../../../types/api';
import { userMessageFor } from '../../../services/errorMessages';

interface Props {
    terna: TernaDetalle;
    onChanged: () => void | Promise<void>;
}

type PendingAction =
    | { kind: 'submit'; score: number }
    | { kind: 'reopen'; evaluadorId: number; nombre: string }
    | null;

/**
 * Encuentra la fila del evaluador autenticado dentro de la terna.
 *
 * La identidad se resuelve ÚNICAMENTE por `usuarioId`. No hay respaldo por
 * nombre: dos evaluadores homónimos —nada improbable en una facultad— harían
 * que el formulario cargara la calificación y los comentarios de otra persona
 * como propios. Ante la duda, la respuesta correcta es "no eres participante"
 * (solo lectura), no una conjetura sobre quién eres.
 *
 * Si la API omitiera el id de forma sistemática, es un defecto del contrato:
 * se documenta, no se compensa con una heurística en el cliente.
 */
function findMyEvaluation(terna: TernaDetalle, usuarioId: number | null): EvaluadorTerna | null {
    if (usuarioId == null || !terna?.evaluadores?.length) return null;
    return terna.evaluadores.find((e) => (e.id ?? e.usuario_id) === usuarioId) ?? null;
}

const EvaluationForm: React.FC<Props> = ({ terna, onChanged }) => {
    const { isAdmin, usuarioId, capabilities } = useAuth();
    const { toast } = useToast();
    const mine = findMyEvaluation(terna, usuarioId);
    const isLocked = mine?.eval_estado === 'enviada';
    const isParticipant = mine !== null;

    // Lo tecleado y sin guardar, si existe. Sobrevive a la navegación.
    const local = useEvaluationStore((s) => s.borradores[terna.id]);
    const escribir = useEvaluationStore((s) => s.escribir);
    const descartar = useEvaluationStore((s) => s.descartar);

    // Lo que se ve: lo tecleado manda sobre lo del servidor.
    const score = local?.calificacion ?? (mine?.calificacion?.toString() ?? '');
    const comments = local?.comentarios ?? (mine?.comentarios ?? '');
    const sinGuardar = hayCambiosSinGuardar(local, {
        calificacion: mine?.calificacion ?? null,
        comentarios: mine?.comentarios ?? null,
    });

    /*
     * Se escriben SIEMPRE los dos campos, no solo el que cambió. Si se
     * guardara únicamente el modificado, el otro entraría en el store como
     * cadena vacía y borraría de la vista un valor del servidor que nadie tocó:
     * escribir una observación habría hecho desaparecer la calificación.
     */
    const cambiar = (patch: { calificacion?: string; comentarios?: string }) =>
        escribir(terna.id, { calificacion: score, comentarios: comments, ...patch });

    const [busy, setBusy] = useState<'draft' | 'submit' | 'reopen' | null>(null);
    const [pending, setPending] = useState<PendingAction>(null);
    const [scoreError, setScoreError] = useState<string | null>(null);

    /*
     * A DONDE VA EL FOCO CUANDO TERMINA UNA ACCION.
     *
     * Los dos botones se deshabilitan mientras dura la peticion
     * (`disabled={busy !== null}`), y deshabilitar el elemento enfocado tira el
     * foco al documento. MEDIDO con teclado, en las dos acciones del rol:
     *
     *     antes de pulsar «Guardar borrador»  foco = el propio boton
     *     despues                              foco = BODY
     *     tras «Enviar evaluacion» confirmada  foco = BODY
     *
     * En un dialogo esto ya se corrigio en su momento; aqui el formulario es el
     * trabajo entero del evaluador, y quien navega con teclado se queda fuera:
     * para seguir tiene que recorrer otra vez la barra lateral y la cabecera.
     *
     * Guardar borrador deja el formulario en pie, asi que el foco vuelve al
     * boton que se pulso. Enviar lo sustituye por el aviso de «ya enviada»
     * —que es lo que ahora explica el estado— y ahi aterriza.
     */
    const botonBorradorRef = useRef<HTMLButtonElement>(null);
    const enviadaRef = useRef<HTMLDivElement>(null);
    const [destinoFoco, setDestinoFoco] = useState<'borrador' | 'enviada' | null>(null);

    /*
     * El destino se PIDE al terminar la peticion y se atiende cuando de verdad
     * se puede, que no es el mismo momento:
     *
     *   · `busy` sigue puesto hasta el `finally`, y `.focus()` sobre un boton
     *     deshabilitado NO HACE NADA —falla en silencio y sin error—. MEDIDO:
     *     con el efecto limpiando la peticion en su primera pasada, el foco
     *     seguia en BODY.
     *   · al enviar, el aviso de «ya enviada» no existe hasta que `onChanged()`
     *     trae los datos nuevos.
     *
     * Por eso la peticion solo se borra cuando el foco ha aterrizado, y `busy`
     * e `isLocked` estan en las dependencias: son las dos transiciones que
     * hacen alcanzable cada destino.
     */
    useEffect(() => {
        if (!destinoFoco) return;

        /* Los dos destinos son elementos distintos —un boton y un aviso—, asi
           que el tipo comun es HTMLElement y `disabled` solo existe en uno. Se
           comprueba estrechando por instancia, no afirmando un tipo que el
           aviso no tiene. */
        const destino: HTMLElement | null =
            destinoFoco === 'borrador' ? botonBorradorRef.current : enviadaRef.current;
        if (!destino) return;
        if (destino instanceof HTMLButtonElement && destino.disabled) return;

        /* NO ROBAR EL FOCO.
           Deshabilitar el boton pulsado tira el foco al documento, y ese es el
           caso que hay que reparar. Pero si mientras se guardaba el usuario se
           fue a otro control —el area de comentarios, la barra lateral—, ese
           foco es suyo y moverlo seria peor que el defecto. Solo se recupera
           cuando el foco quedo suelto. */
        const activo = destino.ownerDocument.activeElement;
        const quedoSuelto = activo === null || activo === destino.ownerDocument.body;
        if (!quedoSuelto && activo !== destino) {
            setDestinoFoco(null);
            return;
        }

        destino.focus();
        setDestinoFoco(null);
    }, [destinoFoco, isLocked, busy]);

    const parseScore = (): number | null => {
        if (score.trim() === '') return null;
        const n = Number(score);
        if (!Number.isFinite(n) || n < 0 || n > 100) return null;
        return Math.round(n * 100) / 100;
    };

    const handleDraft = async () => {
        setBusy('draft');
        setScoreError(null);
        try {
            const n = parseScore();
            if (score.trim() !== '' && n == null) {
                setScoreError('La calificación debe estar entre 0 y 100.');
                setBusy(null);
                return;
            }
            await saveDraft(terna.id, {
                ...(n != null ? { calificacion: n } : {}),
                comentarios: comments.trim() || null,
            });
            toast.success('Borrador guardado.');
            setDestinoFoco('borrador');
            // Ya está en el servidor: la copia local sobra y solo podría divergir.
            descartar(terna.id);
            await onChanged();
        } catch (e) {
            toast.error(userMessageFor(e) || 'Error al guardar borrador.');
        } finally {
            setBusy(null);
        }
    };

    const askSubmit = () => {
        const n = parseScore();
        if (n == null) {
            setScoreError('Debes ingresar una calificación entre 0 y 100 para enviar.');
            toast.warning('Ingresa una calificación válida antes de enviar.');
            return;
        }
        setScoreError(null);
        setPending({ kind: 'submit', score: n });
    };

    const doSubmit = async () => {
        if (pending?.kind !== 'submit') return;
        const { score: n } = pending;
        setBusy('submit');
        try {
            await submitEvaluation(terna.id, { calificacion: n, comentarios: comments.trim() || null });
            toast.success('Evaluación enviada exitosamente.');
            setDestinoFoco('enviada');
            descartar(terna.id);
            setPending(null);
            await onChanged();
        } catch (e) {
            toast.error(userMessageFor(e) || 'Error al enviar la evaluación.');
        } finally {
            setBusy(null);
        }
    };

    const askReopen = (ev: EvaluadorTerna) => {
        const id = ev.id ?? ev.usuario_id;
        if (id == null) return;
        setPending({ kind: 'reopen', evaluadorId: id, nombre: ev.nombre });
    };

    const doReopen = async () => {
        if (pending?.kind !== 'reopen') return;
        setBusy('reopen');
        try {
            await reopenEvaluation(terna.id, pending.evaluadorId);
            toast.success(`Evaluación de ${pending.nombre} reabierta.`);
            setPending(null);
            await onChanged();
        } catch (e) {
            toast.error(userMessageFor(e) || 'Error al reabrir la evaluación.');
        } finally {
            setBusy(null);
        }
    };

    if (!isParticipant && !isAdmin) {
        return (
            <div className="eval-locked">
                No formas parte de esta terna, por lo que no puedes evaluar.
            </div>
        );
    }

    return (
        <div className="eval-form">
            {isLocked ? (
                <div className="eval-locked" role="status" tabIndex={-1} ref={enviadaRef}>
                    <Lock size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Tu evaluación ya fue enviada (calificación <strong>{mine?.calificacion}</strong>).
                    {' '}Solo el administrador puede reabrirla.
                </div>
            ) : isParticipant ? (
                <>
                    <div className="eval-form__row">
                        <label htmlFor="ev-score" className="eval-form__label">
                            Calificación <small style={{ color: 'var(--text-muted)' }}>(0–100)</small>
                        </label>
                        <input
                            id="ev-score"
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            value={score}
                            onChange={(e) => { cambiar({ calificacion: e.target.value }); if (scoreError) setScoreError(null); }}
                            className="ui-control eval-form__input"
                            placeholder="Ej. 85"
                            disabled={busy !== null}
                            aria-invalid={scoreError != null}
                            aria-describedby={scoreError ? 'ev-score-error' : 'ev-score-hint'}
                        />
                        {scoreError ? (
                            <span id="ev-score-error" className="eval-form__hint" style={{ color: 'var(--color-danger)' }}>
                                {scoreError}
                            </span>
                        ) : (
                            <span id="ev-score-hint" className="eval-form__hint">
                                Requerida para enviar; opcional para guardar borrador.
                            </span>
                        )}
                    </div>

                    <div className="eval-form__row">
                        <label htmlFor="ev-comments" className="eval-form__label">
                            Observaciones
                        </label>
                        <textarea
                            id="ev-comments"
                            value={comments}
                            onChange={(e) => cambiar({ comentarios: e.target.value })}
                            className="ui-control eval-form__textarea"
                            placeholder="Comentarios para el estudiante…"
                            disabled={busy !== null}
                        />
                    </div>

                    {/* Que haya cambios sin guardar tiene que VERSE. El
                        borrador del servidor no se guarda solo, y el aviso es
                        lo que separa «lo tengo escrito» de «lo tengo guardado». */}
                    {sinGuardar && (
                        <p className="eval-form__sin-guardar" role="status">
                            <PencilLine size={14} aria-hidden="true" />
                            Tienes cambios sin guardar.
                        </p>
                    )}

                    <div className="eval-form__actions">
                        <Button
                            ref={botonBorradorRef}
                            variant="secondary"
                            onClick={handleDraft}
                            loading={busy === 'draft'}
                            disabled={busy !== null}
                        >
                            {busy !== 'draft' && <Save size={16} aria-hidden="true" />}
                            {busy === 'draft' ? 'Guardando…' : 'Guardar borrador'}
                        </Button>
                        <Button onClick={askSubmit} disabled={busy !== null}>
                            <Send size={16} aria-hidden="true" />
                            Enviar evaluación
                        </Button>
                    </div>
                </>
            ) : null}

            {capabilities.canReopenEvaluations && terna.evaluadores.some((e) => e.eval_estado === 'enviada') && (
                <details style={{ marginTop: 14 }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Acciones de administrador
                    </summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                        {terna.evaluadores
                            .filter((e) => e.eval_estado === 'enviada' && (e.id ?? e.usuario_id) != null)
                            .map((ev) => (
                                <Button
                                    key={(ev.id ?? ev.usuario_id)!.toString()}
                                    variant="danger"
                                    size="sm"
                                    onClick={() => askReopen(ev)}
                                    disabled={busy !== null}
                                >
                                    <RotateCw size={14} aria-hidden="true" />
                                    Reabrir evaluación de {ev.nombre}
                                </Button>
                            ))}
                    </div>
                </details>
            )}

            {pending?.kind === 'submit' && (
                <ConfirmModal
                    title="Enviar evaluación definitiva"
                    message={
                        <>
                            Vas a enviar tu evaluación con calificación <strong>{pending.score}</strong>.
                            <br />
                            Una vez enviada no podrás modificarla (solo el administrador puede reabrirla).
                            <br />
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                ¿Deseas continuar?
                            </span>
                        </>
                    }
                    confirmText="Sí, enviar"
                    cancelText="Cancelar"
                    variant="primary"
                    loading={busy === 'submit'}
                    onConfirm={doSubmit}
                    onCancel={() => { if (busy !== 'submit') setPending(null); }}
                />
            )}

            {pending?.kind === 'reopen' && (
                <ConfirmModal
                    title="Reabrir evaluación"
                    message={
                        <>
                            Vas a reabrir la evaluación enviada por <strong>{pending.nombre}</strong>.
                            <br />
                            El evaluador podrá volver a editarla y enviarla nuevamente.
                        </>
                    }
                    confirmText="Sí, reabrir"
                    cancelText="Cancelar"
                    variant="warning"
                    loading={busy === 'reopen'}
                    onConfirm={doReopen}
                    onCancel={() => { if (busy !== 'reopen') setPending(null); }}
                />
            )}
        </div>
    );
};

export default EvaluationForm;
