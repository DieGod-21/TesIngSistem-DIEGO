/**
 * EvaluationForm.tsx
 *
 * Formulario de evaluación para una terna.
 *
 * Comportamiento:
 *   - Si la evaluación del usuario actual está 'enviada' → bloqueado (locked).
 *   - Si está 'borrador' o no existe → editable.
 *   - Acciones: Guardar borrador, Enviar definitiva.
 *   - Admin puede reabrir la evaluación de un evaluador.
 */

import React, { useEffect, useState } from 'react';
import { Save, Send, Lock, RotateCw } from 'lucide-react';
import { saveDraft, submitEvaluation, reopenEvaluation } from '../../../services/ternasService';
import { useAuth } from '../../../context/AuthContext';
import type { TernaDetalle, EvaluadorTerna } from '../../../types/api';

interface Props {
    terna: TernaDetalle;
    onChanged: () => void | Promise<void>;
}

/** Encuentra la fila del evaluador autenticado dentro de la terna. */
function findMyEvaluation(terna: TernaDetalle, usuarioId: number | null, userName: string | undefined): EvaluadorTerna | null {
    if (!terna?.evaluadores?.length) return null;
    // Preferimos match por id si el backend lo expone
    if (usuarioId != null) {
        const byId = terna.evaluadores.find((e) => (e.id ?? e.usuario_id) === usuarioId);
        if (byId) return byId;
    }
    // Fallback: nombre exacto
    if (userName) {
        const byName = terna.evaluadores.find((e) => e.nombre?.trim() === userName.trim());
        if (byName) return byName;
    }
    return null;
}

const EvaluationForm: React.FC<Props> = ({ terna, onChanged }) => {
    const { user, isAdmin, usuarioId } = useAuth();
    const mine = findMyEvaluation(terna, usuarioId, user?.nombre);
    const isLocked = mine?.eval_estado === 'enviada';
    const isParticipant = mine !== null;

    const [score, setScore] = useState<string>(mine?.calificacion?.toString() ?? '');
    const [comments, setComments] = useState<string>(mine?.comentarios ?? '');
    const [busy, setBusy] = useState<'draft' | 'submit' | null>(null);
    const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

    useEffect(() => {
        setScore(mine?.calificacion?.toString() ?? '');
        setComments(mine?.comentarios ?? '');
        setFeedback(null);
    }, [mine?.calificacion, mine?.comentarios, mine?.eval_estado, terna.id]);

    const parseScore = (): number | null => {
        if (score.trim() === '') return null;
        const n = Number(score);
        if (!Number.isFinite(n) || n < 0 || n > 100) return null;
        return Math.round(n * 100) / 100;
    };

    const handleDraft = async () => {
        setBusy('draft');
        setFeedback(null);
        try {
            const n = parseScore();
            await saveDraft(terna.id, {
                ...(n != null ? { calificacion: n } : {}),
                comentarios: comments.trim() || null,
            });
            setFeedback({ kind: 'ok', msg: 'Borrador guardado.' });
            await onChanged();
        } catch (e) {
            setFeedback({ kind: 'err', msg: e instanceof Error ? e.message : 'Error al guardar borrador.' });
        } finally {
            setBusy(null);
        }
    };

    const handleSubmit = async () => {
        const n = parseScore();
        if (n == null) {
            setFeedback({ kind: 'err', msg: 'Debes ingresar una calificación entre 0 y 100 para enviar.' });
            return;
        }
        const ok = window.confirm(
            `¿Enviar evaluación definitiva con calificación ${n}? Una vez enviada no podrás modificarla.`,
        );
        if (!ok) return;
        setBusy('submit');
        setFeedback(null);
        try {
            await submitEvaluation(terna.id, { calificacion: n, comentarios: comments.trim() || null });
            setFeedback({ kind: 'ok', msg: 'Evaluación enviada exitosamente.' });
            await onChanged();
        } catch (e) {
            setFeedback({ kind: 'err', msg: e instanceof Error ? e.message : 'Error al enviar.' });
        } finally {
            setBusy(null);
        }
    };

    const handleReopen = async (evaluadorId: number) => {
        const ok = window.confirm('¿Reabrir esta evaluación? El evaluador podrá volver a editarla.');
        if (!ok) return;
        try {
            await reopenEvaluation(terna.id, evaluadorId);
            setFeedback({ kind: 'ok', msg: 'Evaluación reabierta.' });
            await onChanged();
        } catch (e) {
            setFeedback({ kind: 'err', msg: e instanceof Error ? e.message : 'Error al reabrir.' });
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
            {feedback && (
                <div className={`tdetail-banner tdetail-banner--${feedback.kind === 'ok' ? 'ok' : 'err'}`}>
                    {feedback.msg}
                </div>
            )}

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
                            onChange={(e) => setScore(e.target.value)}
                            className="eval-form__input"
                            placeholder="Ej. 85"
                            disabled={busy !== null}
                        />
                        <span className="eval-form__hint">Requerida para enviar; opcional para guardar borrador.</span>
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
                            onClick={handleSubmit}
                            disabled={busy !== null}
                        >
                            <Send size={16} aria-hidden="true" />
                            {busy === 'submit' ? 'Enviando…' : 'Enviar evaluación'}
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
                            .map((e) => {
                                const id = (e.id ?? e.usuario_id)!;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        className="eval-btn eval-btn--danger"
                                        onClick={() => handleReopen(id)}
                                    >
                                        <RotateCw size={14} aria-hidden="true" />
                                        Reabrir evaluación de {e.nombre}
                                    </button>
                                );
                            })}
                    </div>
                </details>
            )}
        </div>
    );
};

export default EvaluationForm;
