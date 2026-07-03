/**
 * useFocusTrap.ts
 *
 * Accesibilidad de diálogos: cuando `active` es true…
 *   - guarda el foco previo y enfoca el primer elemento del contenedor
 *     (o el que tenga [data-autofocus]),
 *   - atrapa el Tab / Shift+Tab dentro del contenedor,
 *   - cierra con Escape (onEscape),
 *   - restaura el foco al cerrar.
 *
 * Uso:
 *   const ref = useFocusTrap<HTMLDivElement>(open, onClose);
 *   return <div ref={ref} role="dialog" aria-modal>…</div>;
 */

import { useEffect, useRef } from 'react';

const FOCUSABLE =
    'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),' +
    'select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement = HTMLElement>(
    active: boolean,
    onEscape?: () => void,
) {
    const containerRef = useRef<T>(null);
    // Guardamos onEscape en ref para que el efecto solo dependa de `active`
    // (evita re-enfocar en cada render si el callback cambia de identidad).
    const escapeRef = useRef(onEscape);
    escapeRef.current = onEscape;

    useEffect(() => {
        if (!active) return;
        const container = containerRef.current;
        if (!container) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;

        const focusables = () =>
            Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
                .filter((el) => el.offsetParent !== null || el === document.activeElement);

        // Foco inicial: [data-autofocus] > primer focusable > contenedor.
        const preferred = container.querySelector<HTMLElement>('[data-autofocus]');
        (preferred ?? focusables()[0] ?? container).focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                escapeRef.current?.();
                return;
            }
            if (e.key !== 'Tab') return;
            const items = focusables();
            if (items.length === 0) { e.preventDefault(); return; }
            const first = items[0];
            const last = items[items.length - 1];
            const activeEl = document.activeElement as HTMLElement | null;
            if (e.shiftKey && (activeEl === first || activeEl === container)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && activeEl === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('keydown', onKey, true);
            previouslyFocused?.focus?.();
        };
    }, [active]);

    return containerRef;
}
