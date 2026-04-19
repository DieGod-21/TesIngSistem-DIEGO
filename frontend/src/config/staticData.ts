/**
 * staticData.ts
 *
 * Datos temporales mientras el nuevo API no expone estos endpoints.
 * TODO: reemplazar cada sección con una llamada real cuando el API lo soporte.
 *
 * Para eliminar un bloque estático:
 *   1. Verifica que el endpoint esté disponible
 *   2. Crea el método en el servicio correspondiente
 *   3. Elimina la constante de aquí
 *   4. Actualiza dashboardService.ts para usar el servicio
 */

import type { Deadline, FacultyResource } from '../services/dashboardService';

// TODO: reemplazar con GET /deadlines cuando el nuevo API lo exponga
export const FALLBACK_DEADLINES: Deadline[] = [
  {
    id:       'dl-1',
    month:    'Abr',
    day:      '15',
    title:    'Revisión de Anteproyectos',
    subtitle: 'Fase Anteproyecto — Primer Semestre 2026',
  },
  {
    id:       'dl-2',
    month:    'May',
    day:      '09',
    title:    'Entrega de Capítulos I-III',
    subtitle: 'Tesis — Estudiantes con Asesor Asignado',
  },
  {
    id:       'dl-3',
    month:    'Jun',
    day:      '20',
    title:    'Defensas Privadas',
    subtitle: 'Salón B-102 — Fase Final de Graduación',
  },
];

// TODO: reemplazar con GET /resources o configuración institucional
const currentYear = new Date().getFullYear();
export const FALLBACK_RESOURCES: FacultyResource[] = [
  { id: 'res-1', label: `Guía Normativa ${currentYear}`, iconName: 'Download', href: '#' },
  { id: 'res-2', label: 'Plantillas LaTeX / Word',       iconName: 'File',     href: '#' },
  { id: 'res-3', label: 'Repositorio Institucional',     iconName: 'Link',     href: '#' },
];
