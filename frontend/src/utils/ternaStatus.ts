/**
 * ternaStatus.ts — El estado de una terna, con UNA sola representación.
 *
 * MOTIVO CONCRETO: una auditoría sobre el render midió cinco lenguajes visuales
 * distintos para "el estado de una cosa", y tres de ellos describían el mismo
 * `EstadoTerna`:
 *
 *   .terna-card__estado        12px  700  MAYÚSCULAS  sin borde   16px de alto
 *   .tdetail-evaluator__estado 11px  700  MAYÚSCULAS  sin borde   19px de alto
 *   .sd-terna-state            11px  700  MAYÚSCULAS  sin borde   23px de alto
 *
 * Los tres mapeaban exactamente los mismos tres tonos (`--color-warning`,
 * `--color-info`, `--color-success`) que la primitiva `Badge` ya expone, y cada
 * uno necesitaba sus propios overrides de modo oscuro que la primitiva obtiene
 * por herencia. Además la etiqueta ('Pendiente' / 'En progreso' / 'Completada')
 * estaba declarada en tres archivos.
 *
 * La misma palabra, "Completada", se veía de dos formas distintas en dos
 * pantallas entre las que el coordinador navega constantemente.
 */

import type { EstadoTerna, EstadoEvaluacion } from '../types/api';
import type { BadgeTone } from '../components/ui';

/** Etiqueta visible del estado de una terna. */
export const TERNA_ESTADO_LABEL: Record<EstadoTerna, string> = {
    pendiente:   'Pendiente',
    en_progreso: 'En progreso',
    completada:  'Completada',
};

/** Tono semántico del estado de una terna. */
export const TERNA_ESTADO_TONE: Record<EstadoTerna, BadgeTone> = {
    pendiente:   'warning',
    en_progreso: 'info',
    completada:  'success',
};

/** Etiqueta visible del estado de la evaluación de UN evaluador. */
export const EVALUACION_ESTADO_LABEL: Record<EstadoEvaluacion, string> = {
    borrador: 'Borrador',
    enviada:  'Enviada',
};

/** Tono semántico del estado de la evaluación de UN evaluador. */
export const EVALUACION_ESTADO_TONE: Record<EstadoEvaluacion, BadgeTone> = {
    borrador: 'warning',
    enviada:  'success',
};

/**
 * Estado de evaluación cuando el backend aún no lo ha fijado (`null`): el
 * evaluador no ha empezado. Se resuelve aquí y no en cada pantalla.
 *
 * La etiqueta es 'Pendiente' —la que ya mostraba la ficha— y NO se cambia:
 * esta unificación es visual, no de terminología.
 */
export const EVALUACION_SIN_ESTADO = { label: 'Pendiente', tone: 'neutral' as BadgeTone };

export function evaluacionEstado(estado: EstadoEvaluacion | null | undefined): { label: string; tone: BadgeTone } {
    if (!estado) return EVALUACION_SIN_ESTADO;
    return { label: EVALUACION_ESTADO_LABEL[estado], tone: EVALUACION_ESTADO_TONE[estado] };
}
