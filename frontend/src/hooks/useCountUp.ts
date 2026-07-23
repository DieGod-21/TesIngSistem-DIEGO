/**
 * useCountUp.ts
 *
 * Anima un valor numérico desde 0 hasta `target` en `duration` ms.
 * Retorna el valor actual animado (entero).
 * Soporta actualización dinámica: si `target` cambia, reinicia la animación.
 */

import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number, duration = 900): number {
    const [current, setCurrent] = useState(0);
    const rafRef = useRef<number>(0);
    const startTimeRef = useRef<number | null>(null);
    const startValueRef = useRef(0);

    useEffect(() => {
        // Respeta la preferencia de movimiento reducido: sin tween, valor final directo.
        const prefersReduced =
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            setCurrent(target);
            return;
        }

        startValueRef.current = current;
        startTimeRef.current = null;

        const step = (timestamp: number) => {
            if (startTimeRef.current === null) startTimeRef.current = timestamp;
            const elapsed = timestamp - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = Math.round(startValueRef.current + (target - startValueRef.current) * eased);
            setCurrent(value);
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(step);
            }
        };

        rafRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target, duration]);

    return current;
}
