/**
 * iconRegistry.ts
 *
 * Registro explícito de iconos lucide-react usados dinámicamente.
 *
 * Problema que resuelve:
 *   `import * as Icons from 'lucide-react'` importa ~1400 iconos
 *   al bundle y anula el tree-shaking de Vite para accesos dinámicos.
 *
 * Solución:
 *   Importar solo los iconos que el proyecto referencia por nombre
 *   (desde dashboardService / KPIs) y exponerlos vía un mapa tipado.
 */

import {
    Users,
    GraduationCap,
    FileCheck,
    AlertTriangle,
    FileText,
    Download,
    Link,
    CheckCircle,
    Clock,
    BarChart3,
    BookOpen,
    ClipboardList,
    TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Mapa de iconos disponibles para resolución dinámica */
const ICON_MAP: Record<string, LucideIcon> = {
    Users,
    GraduationCap,
    FileCheck,
    AlertTriangle,
    FileText,
    Download,
    Link,
    CheckCircle,
    Clock,
    BarChart3,
    BookOpen,
    ClipboardList,
    TrendingUp,
};

/**
 * Resuelve un nombre de icono a su componente React.
 * Retorna undefined si el icono no está registrado.
 */
export function resolveIcon(name: string): LucideIcon | undefined {
    return ICON_MAP[name];
}
