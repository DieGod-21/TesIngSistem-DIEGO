/**
 * navigation.ts — Mapeo ÍTEM DE TRABAJO → URL real ("enrutar, no fingir").
 *
 * Config de ruteo de presentación (como lens.ts): traduce el `target` que el
 * DOMINIO ya decidió a una URL existente de la app. No toma decisiones de
 * negocio (no deriva etapas, elegibilidad ni prioridad). Cada rama apunta a una
 * ruta REAL de AppRouter, de modo que ningún ítem produce un enlace muerto:
 *
 *   - notas_entry / student_detail → /students/:id  (registro de notas + estado)
 *   - terna_detail                 → /ternas/:id
 *   - create_proyecto              → /proyectos
 *
 * Fallbacks reales cuando falta un identificador (estudiante fuera del padrón /
 * terna sin id): el roster filtrado por carnet y el listado de ternas.
 */

import { routes } from '../../config/routes';
import { assertNever } from '../../utils/assertNever';
import type { WorkItem } from './domain/types';

export function resolveWorkItemHref(item: WorkItem): string {
    switch (item.target.kind) {
        case 'terna_detail':
            return item.target.ternaId != null ? routes.ternaDetail(item.target.ternaId) : routes.ternas();
        case 'create_proyecto':
            return routes.proyectos();
        case 'notas_entry':
        case 'student_detail':
            return item.studentId != null
                ? routes.studentDetail(item.studentId)
                : routes.studentsSearch(item.carnet);
    }
    return assertNever(item.target.kind);
}
