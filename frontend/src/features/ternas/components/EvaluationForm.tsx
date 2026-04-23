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
 */

import React, { useEffect, useState } from 'react';
import { Save, Send, Lock, RotateCw } from 'lucide-react';
import { saveDraft, submitEvaluation, reopenEvaluation } from '../../../services/ternasService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import ConfirmModal from '../../../components/ConfirmModal';
import type { TernaDetalle, EvaluadorTerna } from '../../../types/api';

interface Props {
    terna: TernaDetalle;
    onChanged: () => void | Promise<void>;
}

type PendingAction =
    | { kind: 'submit'; score: number }
    | { kind: 'reopen'; evaluadorId: number; nombre: string }
    | null;

/** Encuentra la fila del evaluador autenticado dentro de la terna. */
function findMyEvaluation(terna: TernaDetalle, usuarioId: number | null, userName: string | undefined): EvaluadorTerna | null {
    if (!terna?.evaluadores?.length) return null;
    if (usuarioId != null) {
        const byId = terna.evaluadores.find((e) => (e.id ?? e.usuario_id) === usuarioId);
        if (byId) return byId;
    }
    if (userName) {
        const byName = terna.evaluadores.find((e) => e.nombre?.trim() === userName.trim());
        if (byName) return byName;
    }
    return null;
}

const EvaluationForm: React.FC<Props> = ({ terna, onChanged }) => {
    const { user, isAdmin, usuarioId } = useAuth();
    const { toast } = useToast();
    const mine = findMyEvaluation(terna, usuarioId, user?.nombre);
    const isLocked = mine?.eval_estado === 'enviada';
    const isParticipant = mine !== null;

    const [score, setScore] = useState<string>(mine?.calificacion?.toString() ?? '');
    const [comments, setComments] = useState<string>(mine?.comentarios ?? '');
    const [busy, setBusy] = useState<'draft' | 'submit' | 'reopen' | null>(null);
    const [pending, setPending] = useState<PendingAction>(null);
    const [scoreError, setScoreError] = useState<string | null>(null);

    useEffect(() => {
        setScore(mine?.calificacion?.toString() ?? '');
        setComments(mine?.comentarios ?? '');
        setScoreError(null);
    }, [mine?.calificacion, mine?.comentarios, mine?.eval_estado, terna.id]);

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
            await onChanged();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al guardar borrador.');
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
            setPending(null);
            await onChanged();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al enviar la evaluación.');
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
            toast.error(e instanceof Error ? e.message : 'Error al reabrir la evaluación.');
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
                <div className="eval-locked" role="status">
                    <Lock size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Tu evaluación ya fue enviada (calificación <strong>{mine?.calificacion}</strong>).
                    {' '}Solo el administrador puede reabrirla.
                </div>
            ) : isParticipant ? (
                <>
                    <div className="eval-form__row">
                        <label htmlFor="ev-score" className="eval-form__label">
                            Calificación <small style={{ color: '#94a3b8' }}>(0–100)</small>
                        </label>
                        <input
                            id="ev-score"
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            value={score}
                            onChange={(e) => { setScore(e.target.value); if (scoreError) setScoreError(null); }}
                            className="eval-form__input"
                            placeholder="Ej. 85"
                            disabled={busy !== null}
                            aria-invalid={scoreError != null}
                            aria-describedby={scoreError ? 'ev-score-error' : 'ev-score-hint'}
                        />
                        {scoreError ? (
                            <span id="ev-score-error" className="eval-form__hint" style={{ color: '#b91c1c' }}>
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
                            onChange={(e) => setComments(e.target.value)}
                            className="eval-form__textarea"
                            placeholder="Comentarios para el estudiante…"
                            disabled={busy !== null}
                        />
                    </div>

                    <div className="eval-form__actions">
                        <button
                            type="button"
                            className="eval-btn eval-btn--secondary"
                            onClick={handleDraft}
                            disabled={busy !== null}
                        >
                            <Save size={16} aria-hidden="true" />
                            {busy === 'draft' ? 'Guardando…' : 'Guardar borrador'}
                        </button>
                        <button
                            type="button"
                            className="eval-btn eval-btn--primary"
                            onClick={askSubmit}
                            disabled={busy !== null}
                        >
                            <Send size={16} aria-hidden="true" />
                            Enviar evaluación
                        </button>
                    </div>
                </>
            ) : null}

            {isAdmin && terna.evaluadores.some((e) => e.eval_estado === 'enviada') && (
                <details style={{ marginTop: 14 }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: '#475569' }}>
                        Acciones de administrador
                    </summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                        {terna.evaluadores
                            .filter((e) => e.eval_estado === 'enviada' && (e.id ?? e.usuario_id) != null)
                            .map((ev) => (
                                <button
                                    key={(ev.id ?? ev.usuario_id)!.toString()}
                                    type="button"
                                    className="eval-btn eval-btn--danger"
                                    onClick={() => askReopen(ev)}
                                    disabled={busy !== null}
                                >
                                    <RotateCw size={14} aria-hidden="true" />
                                    Reabrir evaluación de {ev.nombre}
                                </button>
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
                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
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
