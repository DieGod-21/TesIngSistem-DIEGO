/**
 * evaluationStore.ts — Estado del PROCESO de evaluar. Zustand.
 *
 * ═══ QUÉ PROBLEMA REAL RESUELVE ═════════════════════════════════════════════
 *
 * El formulario de evaluación guardaba la calificación y las observaciones en
 * `useState`, y un `useEffect` los reponía desde el servidor cada vez que
 * cambiaba la terna. Consecuencia medible: el evaluador escribía media página
 * de observaciones, abría el proyecto para comprobar un dato, volvía… y no
 * quedaba nada. El borrador del servidor solo existe si se pulsa «Guardar
 * borrador» a propósito; todo lo tecleado antes de eso vivía en un componente
 * que se desmonta al navegar.
 *
 * Eso no es estado de servidor ni estado de una pantalla: es estado de un
 * PROCESO que atraviesa varias vistas y sobrevive al desmontaje. Es justo el
 * caso para el que un store compartido está bien empleado.
 *
 * ═══ QUÉ NO GUARDA (Y POR QUÉ) ══════════════════════════════════════════════
 *
 * NO guarda ternas, ni proyectos, ni evaluadores, ni resultados. Nada que
 * venga del servidor entra aquí. Duplicar el estado de servidor en un store
 * global es exactamente cómo estas herramientas se convierten en una segunda
 * base de datos que se desincroniza en silencio: el servidor cambia, el store
 * no se entera, y el usuario acaba mirando datos viejos con aspecto de nuevos.
 *
 * El estado de servidor sigue donde estaba: en `services/` con su caché de TTL,
 * deduplicación e invalidación por prefijo.
 *
 * Aquí solo vive UNA cosa: lo que la persona ha escrito y todavía no ha
 * mandado. Es información que el servidor no tiene y que se perdería sin esto.
 *
 * ═══ POR QUÉ NO PERSISTE EN disco ═══════════════════════════════════════════
 *
 * Vive en memoria y muere con la pestaña. Persistirlo en `localStorage`
 * resucitaría un borrador escrito hace tres días sobre una terna que el
 * administrador pudo reabrir, reasignar o completar mientras tanto, y lo
 * pintaría encima de los datos frescos del servidor sin que nadie lo pidiera.
 * Recuperar lo tecleado dentro de la misma sesión es útil; resucitarlo entre
 * sesiones es una fuente de errores.
 */

import { create } from 'zustand';

/** Lo que el usuario ha escrito y aún no ha enviado. Ambos campos son texto: */
/** es lo que hay en los `input`, sin convertir todavía a número. */
export interface BorradorLocal {
    calificacion: string;
    comentarios: string;
}

interface EvaluationState {
    /** ternaId → lo tecleado sin guardar. Ausente = no se ha tocado nada. */
    borradores: Record<number, BorradorLocal>;

    /** Registra lo tecleado en una terna (parcial: solo el campo que cambió). */
    escribir: (ternaId: number, patch: Partial<BorradorLocal>) => void;

    /** Lee lo tecleado en una terna, o `undefined` si está intacta. */
    leer: (ternaId: number) => BorradorLocal | undefined;

    /**
     * Olvida lo tecleado en una terna. Se llama cuando el contenido ya está en
     * el servidor (borrador guardado o evaluación enviada): a partir de ahí la
     * verdad la tiene el servidor y mantener una copia local solo puede
     * desincronizarse.
     */
    descartar: (ternaId: number) => void;

    /** Vacía todo. Se llama al cerrar sesión: lo de un usuario no es del siguiente. */
    limpiar: () => void;
}

export const useEvaluationStore = create<EvaluationState>((set, get) => ({
    borradores: {},

    escribir: (ternaId, patch) => set((s) => {
        const previo = s.borradores[ternaId] ?? { calificacion: '', comentarios: '' };
        return { borradores: { ...s.borradores, [ternaId]: { ...previo, ...patch } } };
    }),

    leer: (ternaId) => get().borradores[ternaId],

    descartar: (ternaId) => set((s) => {
        if (!(ternaId in s.borradores)) return s;      // sin cambios → sin re-render
        const copia = { ...s.borradores };
        delete copia[ternaId];
        return { borradores: copia };
    }),

    limpiar: () => set((s) => (Object.keys(s.borradores).length === 0 ? s : { borradores: {} })),
}));

/**
 * ¿Lo tecleado difiere de lo que tiene el servidor?
 *
 * Función pura y fuera del store a propósito: el store guarda, no compara. Se
 * usa para avisar de cambios sin guardar sin tener que duplicar el valor del
 * servidor dentro del store.
 */
export function hayCambiosSinGuardar(
    local: BorradorLocal | undefined,
    servidor: { calificacion: number | null; comentarios: string | null },
): boolean {
    if (!local) return false;
    const califServidor = servidor.calificacion?.toString() ?? '';
    const comentServidor = servidor.comentarios ?? '';
    return local.calificacion.trim() !== califServidor.trim()
        || local.comentarios.trim() !== comentServidor.trim();
}
