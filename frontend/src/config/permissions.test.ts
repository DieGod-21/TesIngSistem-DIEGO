import { describe, it, expect } from 'vitest';
import {
    getCapabilities,
    isAdminRole,
    getRoleLabel,
    type Capabilities,
    type Role,
} from './permissions';

const ALL_CAPS: (keyof Capabilities)[] = [
    'canManageUsers',
    'canViewReports',
    'canImportStudents',
    'canEditGrades',
    'canReopenEvaluations',
];

describe('getCapabilities — administrador', () => {
    const caps = getCapabilities('admin');

    it('concede todas las capacidades', () => {
        for (const cap of ALL_CAPS) {
            expect(caps[cap]).toBe(true);
        }
    });

    it('permite gestionar usuarios, ver reportes, importar, editar notas y reabrir', () => {
        expect(caps.canManageUsers).toBe(true);
        expect(caps.canViewReports).toBe(true);
        expect(caps.canImportStudents).toBe(true);
        expect(caps.canEditGrades).toBe(true);
        expect(caps.canReopenEvaluations).toBe(true);
    });
});

describe('getCapabilities — evaluador', () => {
    const caps = getCapabilities('evaluador');

    it('niega todas las capacidades administrativas', () => {
        for (const cap of ALL_CAPS) {
            expect(caps[cap]).toBe(false);
        }
    });

    it('no puede abrir Usuarios, Reportes ni Detalle de Reporte', () => {
        expect(caps.canManageUsers).toBe(false);
        expect(caps.canViewReports).toBe(false);
    });

    it('no puede importar, editar notas ni reabrir evaluaciones', () => {
        expect(caps.canImportStudents).toBe(false);
        expect(caps.canEditGrades).toBe(false);
        expect(caps.canReopenEvaluations).toBe(false);
    });
});

describe('getCapabilities — rol desconocido o ausente', () => {
    it('devuelve el mínimo de permisos para null/undefined', () => {
        for (const role of [null, undefined] as const) {
            const caps = getCapabilities(role);
            for (const cap of ALL_CAPS) {
                expect(caps[cap]).toBe(false);
            }
        }
    });

    it('nunca asume admin ante un rol inesperado en runtime', () => {
        const caps = getCapabilities('superusuario' as Role);
        for (const cap of ALL_CAPS) {
            expect(caps[cap]).toBe(false);
        }
    });
});

describe('inmutabilidad de las capacidades', () => {
    it('el objeto devuelto es inmutable (defensa en profundidad)', () => {
        const caps = getCapabilities('admin');
        expect(Object.isFrozen(caps)).toBe(true);
    });
});

describe('isAdminRole', () => {
    it('solo es verdadero para admin', () => {
        expect(isAdminRole('admin')).toBe(true);
        expect(isAdminRole('evaluador')).toBe(false);
        expect(isAdminRole(null)).toBe(false);
        expect(isAdminRole(undefined)).toBe(false);
        expect(isAdminRole('otro' as Role)).toBe(false);
    });
});

describe('getRoleLabel', () => {
    it('mapea roles conocidos y usa un valor neutral seguro para desconocidos', () => {
        expect(getRoleLabel('admin')).toBe('Administrador');
        expect(getRoleLabel('evaluador')).toBe('Evaluador');
        expect(getRoleLabel(null)).toBe('Usuario');
        expect(getRoleLabel(undefined)).toBe('Usuario');
        expect(getRoleLabel('desconocido' as Role)).toBe('Usuario');
    });
});
