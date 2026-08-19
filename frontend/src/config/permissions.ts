/**
 * permissions.ts
 *
 * FUENTE ÚNICA DE VERDAD de la autorización del frontend.
 *
 * Toda decisión de acceso (rutas, acciones de UI, navegación) se deriva de las
 * capacidades que expone este módulo. Ningún otro archivo debe comparar el rol
 * directamente: los consumidores usan `capabilities` (vía AuthContext) o los
 * helpers de aquí. Esto centraliza la lógica, la hace mantenible y aporta
 * defensa en profundidad.
 *
 * Regla de seguridad: un rol desconocido o ausente obtiene el mínimo de
 * permisos posible (todo en `false`). Nunca se asume acceso de administrador.
 *
 * Este módulo NO cambia el contrato del backend: solo modela, en el cliente,
 * las mismas reglas que la API ya aplica como caja negra.
 */

import type { RolUsuario } from '../types/api';

/** Rol de autorización. Reutiliza el tipo de dominio para no duplicar la unión. */
export type Role = RolUsuario;

/**
 * Conjunto inmutable de capacidades derivadas de un rol.
 * Añadir una capacidad aquí la habilita para todos los consumidores.
 */
export interface Capabilities {
    /** Administrar usuarios (crear/listar evaluadores y administradores). */
    readonly canManageUsers: boolean;
    /** Ver los reportes globales de ternas y su detalle. */
    readonly canViewReports: boolean;
    /** Importar estudiantes de forma masiva. */
    readonly canImportStudents: boolean;
    /** Editar o registrar notas de PG1/PG2 de un estudiante. */
    readonly canEditGrades: boolean;
    /** Reabrir evaluaciones ya enviadas por un evaluador. */
    readonly canReopenEvaluations: boolean;
    /**
     * Corregir los datos de identidad de un expediente (nombre, correo,
     * carrera). El carné NO se toca: es la clave con la que notas, tesis y
     * reportes referencian a la persona.
     */
    readonly canEditStudents: boolean;
    /**
     * Coordinar la cohorte: padrón de estudiantes, alta de expedientes,
     * catálogo global de proyectos y creación de ternas.
     *
     * Es la capacidad que separa los dos workspaces. Un evaluador no coordina
     * a nadie: entra a evaluar lo que le asignaron. Sin esto, la navegación
     * tenía que enumerar rutas administrativas una por una y el evaluador
     * llegaba igualmente al padrón escribiendo la URL.
     */
    readonly canCoordinate: boolean;
}

/** Capacidades mínimas: todo denegado. Base segura para roles desconocidos. */
const NO_CAPABILITIES: Capabilities = Object.freeze({
    canManageUsers: false,
    canViewReports: false,
    canImportStudents: false,
    canEditGrades: false,
    canReopenEvaluations: false,
    canEditStudents: false,
    canCoordinate: false,
});

/** Administrador: acceso completo a la coordinación. */
const ADMIN_CAPABILITIES: Capabilities = Object.freeze({
    canManageUsers: true,
    canViewReports: true,
    canImportStudents: true,
    canEditGrades: true,
    canReopenEvaluations: true,
    canEditStudents: true,
    canCoordinate: true,
});

/** Evaluador: solo evalúa las ternas asignadas; sin capacidades administrativas. */
const EVALUADOR_CAPABILITIES: Capabilities = NO_CAPABILITIES;

const CAPABILITIES_BY_ROLE: Record<Role, Capabilities> = {
    admin: ADMIN_CAPABILITIES,
    evaluador: EVALUADOR_CAPABILITIES,
};

/**
 * Devuelve el conjunto inmutable de capacidades de un rol.
 *
 * Rol desconocido, ausente o inesperado → capacidades mínimas (nunca admin).
 * La comprobación `role in CAPABILITIES_BY_ROLE` protege incluso si en tiempo
 * de ejecución llegara un valor fuera de la unión declarada.
 */
export function getCapabilities(role: Role | null | undefined): Capabilities {
    if (role != null && role in CAPABILITIES_BY_ROLE) {
        return CAPABILITIES_BY_ROLE[role];
    }
    return NO_CAPABILITIES;
}

/**
 * ─── WORKSPACE ──────────────────────────────────────────────────────────────
 *
 * El producto no es una sola aplicación con botones ocultos: son DOS espacios
 * de trabajo con propósitos distintos.
 *
 *   admin      → coordina la cohorte completa (padrón, proyectos, ternas,
 *                notas, importaciones, usuarios y reportes).
 *   evaluator  → evalúa lo que le asignaron, y nada más.
 *
 * Se deriva del rol en un solo sitio para que ninguna pantalla tenga que
 * preguntar «¿es admin?» por su cuenta. Un rol desconocido cae en el workspace
 * RESTRINGIDO: el que menos enseña.
 */
export type Workspace = 'admin' | 'evaluator';

export function getWorkspace(role: Role | null | undefined): Workspace {
    return role === 'admin' ? 'admin' : 'evaluator';
}

/**
 * Compatibilidad hacia atrás: único punto del sistema donde se compara el rol
 * administrador. `isAdmin` de AuthContext se deriva de aquí, de modo que no
 * quedan comparaciones de rol dispersas por la aplicación.
 */
export function isAdminRole(role: Role | null | undefined): boolean {
    return role === 'admin';
}

/** Etiquetas legibles del rol (evita mapear nombres de rol en la UI). */
const ROLE_LABELS: Record<Role, string> = {
    admin: 'Administrador',
    evaluador: 'Evaluador',
};

/** Etiqueta legible del rol; valor neutral y seguro si el rol es desconocido. */
export function getRoleLabel(role: Role | null | undefined): string {
    return role != null && role in ROLE_LABELS ? ROLE_LABELS[role] : 'Usuario';
}
