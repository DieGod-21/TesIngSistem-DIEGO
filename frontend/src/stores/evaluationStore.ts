/**
 * evaluationStore.ts — Lo que el evaluador ha escrito y todavía no ha mandado.
 *
 * Es estado de un PROCESO: empieza en una pantalla, sigue en otra y sobrevive
 * al desmontaje. Antes vivía en `useState` del formulario y se perdía al salir
 * a comprobar un dato.
 *
 * NO guarda nada que venga del servidor —eso vive en `services/` con su caché—
 * ni persiste en disco: un borrador de hace tres días se pintaría encima de
 * datos frescos sobre una terna que pudieron reabrir o reasignar.
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
