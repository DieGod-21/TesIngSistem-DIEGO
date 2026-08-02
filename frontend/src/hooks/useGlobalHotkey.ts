/**
 * useGlobalHotkey.ts — Atajos de teclado a nivel de documento.
 *
 * El producto no tenía ninguno: cada búsqueda de un estudiante obligaba a
 * soltar el teclado, alcanzar el ratón y hacer clic en el campo. Es la
 * operación más repetida de la jornada de un coordinador.
 *
 * La parte delicada de un atajo global no es escucharlo, es saber CUÁNDO NO
 * dispararlo. Esa decisión (`shouldFireHotkey`) se exporta pura y se prueba
 * aparte: un atajo que se cuela mientras el usuario escribe es peor que no
 * tener atajo.
 */

import { useEffect, useRef } from 'react';

/**
 * ¿Hay un diálogo modal abierto? Todos los diálogos del producto declaran
 * `aria-modal="true"` (Quick View, importación, confirmación, edición de nota,
 * alta de usuario y de proyecto), así que basta una consulta genérica.
 *
 * Un atajo global que mueve el foco fuera de un modal rompe su trampa de foco
 * y deja al usuario navegando "detrás" del diálogo. Mientras haya uno abierto,
 * el atajo se calla: el diálogo es dueño del teclado.
 */
export function isModalOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.querySelector('[aria-modal="true"]') !== null;
}

/** Combinación soportada: una tecla, opcionalmente con Ctrl/Cmd. */
export interface Hotkey {
    /** Valor de `KeyboardEvent.key` (comparación sensible a mayúsculas). */
    key: string;
    /** Requiere Ctrl (Windows/Linux) o Cmd (macOS). Por defecto, no. */
    mod?: boolean;
}

/** Evento mínimo que necesita la decisión: permite probarla sin DOM real. */
export type HotkeyEventLike = {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    defaultPrevented: boolean;
    target?: EventTarget | null;
};

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * ¿El foco está en un contexto donde el usuario está escribiendo? Ahí los
 * atajos sin modificador deben callarse.
 */
export function isEditableTarget(target: EventTarget | null | undefined): boolean {
    if (!target || typeof target !== 'object') return false;
    const el = target as Partial<HTMLElement>;
    if (typeof el.tagName === 'string' && EDITABLE_TAGS.has(el.tagName)) return true;
    return el.isContentEditable === true;
}

/**
 * Decide si un evento debe activar el atajo. Puro: sin DOM propio, sin React.
 *
 * Reglas:
 *   - La tecla debe coincidir exactamente.
 *   - `mod` exige Ctrl o Meta; sin `mod`, ninguno puede estar pulsado (así "/"
 *     no roba a "Ctrl+/" ni a combinaciones del navegador).
 *   - Alt nunca participa: se reserva a los atajos del sistema operativo.
 *   - Un atajo SIN modificador no dispara con el foco en un campo editable.
 *     Uno CON modificador sí: es la convención de ⌘K (Linear, Notion, Vercel),
 *     que debe funcionar incluso mientras se escribe.
 *   - Nunca se secuestra un evento ya cancelado por otro manejador.
 */
export function shouldFireHotkey(e: HotkeyEventLike, hotkey: Hotkey): boolean {
    if (e.defaultPrevented) return false;
    if (e.altKey) return false;
    if (e.key !== hotkey.key) return false;

    const mod = e.ctrlKey || e.metaKey;
    if (hotkey.mod ? !mod : mod) return false;

    if (!hotkey.mod && isEditableTarget(e.target)) return false;

    return true;
}

/**
 * Registra uno o varios atajos globales. `handler` se invoca con el evento ya
 * neutralizado (`preventDefault`): todo atajo soportado sustituye a un
 * comportamiento por defecto del navegador (p. ej. "/" abre la búsqueda rápida
 * de Firefox, Ctrl+K enfoca la barra de direcciones).
 */
export function useGlobalHotkey(hotkeys: Hotkey[], handler: () => void, enabled = true): void {
    // El handler se lee por referencia: cambiar de callback en cada render no
    // vuelve a registrar el listener.
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    // Serializa las combinaciones para que el efecto no dependa de la identidad
    // del array que el consumidor construya en línea.
    const signature = hotkeys.map((h) => `${h.mod ? 'mod+' : ''}${h.key}`).join('|');

    useEffect(() => {
        if (!enabled) return;

        const combos: Hotkey[] = signature
            .split('|')
            .filter(Boolean)
            .map((s) => (s.startsWith('mod+') ? { key: s.slice(4), mod: true } : { key: s }));

        const onKeyDown = (e: KeyboardEvent) => {
            // El diálogo abierto manda sobre el teclado (ver isModalOpen).
            if (isModalOpen()) return;
            if (!combos.some((combo) => shouldFireHotkey(e, combo))) return;
            e.preventDefault();
            handlerRef.current();
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [signature, enabled]);
}
