import { describe, it, expect } from 'vitest';
import { userMessageFor } from './errorMessages';
import { ApiError, CanceledError } from './apiClient';

describe('userMessageFor — mapeo a mensajes de usuario', () => {
    it('nunca muestra el mensaje HTTP crudo "Error HTTP <n>"', () => {
        const err = new ApiError(429, 'Error HTTP 429', undefined, 'rateLimited');
        const msg = userMessageFor(err);
        expect(msg).not.toMatch(/Error HTTP/i);
        expect(msg.toLowerCase()).toContain('solicitudes');
    });

    it('valida: muestra los mensajes explícitos del backend (errors[])', () => {
        const err = new ApiError(422, 'x', undefined, 'validation', ['Correo inválido', 'Contraseña corta']);
        expect(userMessageFor(err)).toBe('Correo inválido Contraseña corta');
    });

    it('respeta un mensaje explícito del backend (no sintético)', () => {
        const err = new ApiError(404, 'Estudiante no encontrado', undefined, 'notFound');
        expect(userMessageFor(err)).toBe('Estudiante no encontrado');
    });

    it('mapea por kind cuando el mensaje es sintético', () => {
        const cases: Array<[ApiError['kind'], RegExp]> = [
            ['timeout',      /tard/i],
            ['offline',      /conect/i],
            ['forbidden',    /permiso/i],
            ['conflict',     /conflicto/i],
            ['server',       /servidor/i],
            ['unavailable',  /disponible/i],
            ['unknown',      /inesperado/i],
        ];
        for (const [kind, re] of cases) {
            const err = new ApiError(500, 'Error HTTP 500', undefined, kind);
            const msg = userMessageFor(err);
            expect(msg).not.toMatch(/Error HTTP/i);
            expect(msg).toMatch(re);
        }
    });

    it('cancelación → cadena vacía (no es un error visible)', () => {
        expect(userMessageFor(new CanceledError())).toBe('');
    });

    it('Error genérico → su propio mensaje; valor no-Error → mensaje por defecto', () => {
        expect(userMessageFor(new Error('Falla de la app'))).toBe('Falla de la app');
        expect(userMessageFor('boom')).toMatch(/inesperado/i);
        expect(userMessageFor(null)).toMatch(/inesperado/i);
    });
});
