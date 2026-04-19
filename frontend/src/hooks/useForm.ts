/**
 * useForm.ts
 *
 * Hook genérico para manejo de formularios con:
 *   - Validación onBlur + onSubmit (no onChange continuo)
 *   - Estado touched por campo
 *   - Reserva de espacio fija para errores (sin layout shift)
 *   - Reset al estado inicial
 *
 * Patrón inspirado en Formik / React Hook Form, simplificado
 * para las necesidades del proyecto.
 */

import { useState, useCallback } from 'react';

// ─── Tipos ───────────────────────────────────────────────────────────

type FormErrors<T> = Partial<Record<keyof T, string>>;
type FormTouched<T> = Partial<Record<keyof T, boolean>>;

export interface UseFormConfig<T extends Record<string, string>> {
    /** Valores iniciales del formulario */
    initialValues: T;
    /** Función de validación — recibe todos los valores, retorna mapa de errores */
    validate: (values: T) => FormErrors<T>;
    /** Callback al enviar el formulario (solo si no hay errores) */
    onSubmit: (values: T) => Promise<void>;
}

export interface UseFormReturn<T extends Record<string, string>> {
    values: T;
    errors: FormErrors<T>;
    touched: FormTouched<T>;
    submitting: boolean;
    /** Cambia el valor de un campo; si ya fue tocado, revalida ese campo */
    handleChange: (field: keyof T, value: string) => void;
    /** Marca un campo como tocado y valida ese campo */
    handleBlur: (field: keyof T) => void;
    /** Toca todos los campos, valida, y si no hay errores llama onSubmit */
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    /** Resetea el formulario al estado inicial */
    reset: () => void;
    /** Retorna el error visible de un campo (solo si fue tocado) */
    showError: (field: keyof T) => string | undefined;
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useForm<T extends Record<string, string>>(
    config: UseFormConfig<T>,
): UseFormReturn<T> {
    const { initialValues, validate, onSubmit } = config;

    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<FormErrors<T>>({});
    const [touched, setTouched] = useState<FormTouched<T>>({});
    const [submitting, setSubmitting] = useState(false);

    const handleChange = useCallback(
        (field: keyof T, value: string) => {
            setValues((prev) => ({ ...prev, [field]: value }));
            // Revalidar solo si el campo ya fue tocado
            setTouched((prev) => {
                if (!prev[field]) return prev;
                const updated = { ...values, [field]: value } as T;
                const partial = validate(updated);
                setErrors((e) => ({ ...e, [field]: partial[field] }));
                return prev;
            });
        },
        [values, validate],
    );

    const handleBlur = useCallback(
        (field: keyof T) => {
            setTouched((prev) => ({ ...prev, [field]: true }));
            const partial = validate(values);
            setErrors((prev) => ({ ...prev, [field]: partial[field] }));
        },
        [values, validate],
    );

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            // Tocar todos los campos
            const allTouched = (Object.keys(initialValues) as (keyof T)[]).reduce(
                (acc, k) => ({ ...acc, [k]: true }),
                {} as FormTouched<T>,
            );
            setTouched(allTouched);
            const newErrors = validate(values);
            setErrors(newErrors);
            if (Object.keys(newErrors).length > 0) return;

            setSubmitting(true);
            try {
                await onSubmit(values);
                // Reset después de submit exitoso
                setValues(initialValues);
                setTouched({});
                setErrors({});
            } finally {
                setSubmitting(false);
            }
        },
        [values, initialValues, validate, onSubmit],
    );

    const reset = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
    }, [initialValues]);

    const showError = useCallback(
        (field: keyof T): string | undefined =>
            touched[field] && errors[field] ? errors[field] : undefined,
        [touched, errors],
    );

    return {
        values,
        errors,
        touched,
        submitting,
        handleChange,
        handleBlur,
        handleSubmit,
        reset,
        showError,
    };
}
