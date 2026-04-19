import { useCallback, useEffect, useState } from 'react';
import {
    getStudentByPanel,
    getCriteria,
    getEvaluators,
    submitEvaluation,
    saveDraftEvaluation,
} from '../services/evaluationService';
import type { EvaluationStudent, EvaluationCriteria, Evaluator, EvaluationFormState } from '../types/evaluation';
import { useToast } from '../../../context/ToastContext';

export function useEvaluationForm(panelId: string) {
    const [student,    setStudent   ] = useState<EvaluationStudent | null>(null);
    const [criteria,   setCriteria  ] = useState<EvaluationCriteria[]>([]);
    const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
    const [loading,    setLoading   ] = useState(true);
    const [error,      setError     ] = useState<string | null>(null);
    const [scores,     setScores    ] = useState<Record<string, number>>({});
    const [observations, setObsState] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [saving,     setSaving    ] = useState(false);
    const [submitted,  setSubmitted ] = useState(false);
    const [draftSaved, setDraftSaved] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        let canceled = false;
        setLoading(true);
        setError(null);

        Promise.all([
            getStudentByPanel(panelId),
            getCriteria(),
            getEvaluators(panelId),
        ])
            .then(([s, c, ev]) => {
                if (canceled) return;
                setStudent(s);
                setCriteria(c);
                setEvaluators(ev);
                const initial: Record<string, number> = {};
                c.forEach((cr) => { initial[cr.id] = 0; });
                setScores(initial);
            })
            .catch((err) => {
                if (!canceled)
                    setError(err instanceof Error ? err.message : 'Error al cargar la evaluación');
            })
            .finally(() => { if (!canceled) setLoading(false); });

        return () => { canceled = true; };
    }, [panelId]);

    const setScore = useCallback((criterionId: string, value: number) => {
        setScores((prev) => ({ ...prev, [criterionId]: value }));
    }, []);

    const setObservations = useCallback((value: string) => {
        setObsState(value);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!student) return;
        const form: EvaluationFormState = { panelId, studentId: student.id, scores, observations };
        setSubmitting(true);
        try {
            await submitEvaluation(form);
            toast.success('Terna enviada correctamente');
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 2500);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al enviar la evaluación');
        } finally {
            setSubmitting(false);
        }
    }, [student, panelId, scores, observations, toast]);

    const handleSaveDraft = useCallback(async () => {
        if (!student) return;
        const form: EvaluationFormState = { panelId, studentId: student.id, scores, observations };
        setSaving(true);
        try {
            await saveDraftEvaluation(form);
            toast.success('Borrador guardado');
            setDraftSaved(true);
            setTimeout(() => setDraftSaved(false), 2500);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al guardar el borrador');
        } finally {
            setSaving(false);
        }
    }, [student, panelId, scores, observations, toast]);

    return {
        student,
        criteria,
        evaluators,
        loading,
        error,
        scores,
        observations,
        submitting,
        saving,
        submitted,
        draftSaved,
        setScore,
        setObservations,
        handleSubmit,
        handleSaveDraft,
    } as const;
}
