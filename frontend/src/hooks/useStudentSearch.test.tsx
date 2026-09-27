/**
 * useStudentSearch.test.tsx
 *
 * El buscador del TopHeader está montado toda la sesión y se queda con su
 * copia del padrón. Dos cosas que debe cumplir:
 *   - una escritura que invalida el padrón (alta, edición, importación) llega
 *     al buscador: sin esto, el estudiante recién dado de alta no aparecía
 *     hasta recargar la página;
 *   - abandonar el buscador antes de que llegue el padrón no lo deja inútil
 *     para el resto de la sesión.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { clear, invalidate } from '../services/cache';
import type { Estudiante } from '../types/api';

vi.mock('../services/estudiantesService', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../services/estudiantesService')>();
    return { ...actual, getEstudiantesRegistry: vi.fn() };
});

import { getEstudiantesRegistry } from '../services/estudiantesService';
import { useStudentSearch } from './useStudentSearch';

const registro = vi.mocked(getEstudiantesRegistry);

const est = (id: number, nombre: string): Estudiante =>
    ({ id, nombre, carnet: `0900-20-${String(id).padStart(5, '0')}`, email: null } as unknown as Estudiante);

/** Respuestas del padrón liberadas a mano. */
function padronManual() {
    type Registro = Awaited<ReturnType<typeof getEstudiantesRegistry>>;
    const pendientes: Array<(e: Estudiante[]) => void> = [];
    registro.mockImplementation(() => new Promise<Registro>((r) => {
        pendientes.push((estudiantes) => r({ estudiantes } as unknown as Registro));
    }));
    return pendientes;
}

const nombres = (s: Estudiante[]) => s.map((e) => e.nombre);

describe('useStudentSearch — sincronía con las escrituras', () => {
    beforeEach(() => { clear(); registro.mockReset(); });
    afterEach(() => { clear(); });

    it('al invalidarse el padrón con el buscador abierto, vuelve a leerlo', async () => {
        const pendientes = padronManual();
        const { result } = renderHook(({ q, on }) => useStudentSearch(q, on), {
            initialProps: { q: 'ana', on: true },
        });
        await act(async () => { pendientes[0]([est(1, 'Ana López')]); });
        expect(nombres(result.current.suggestions)).toEqual(['Ana López']);

        act(() => { invalidate('estudiantes'); });
        expect(registro).toHaveBeenCalledTimes(2);
        await act(async () => { pendientes[1]([est(1, 'Ana López'), est(2, 'Ana Recién Creada')]); });
        expect(nombres(result.current.suggestions)).toEqual(['Ana López', 'Ana Recién Creada']);
    });

    it('con el buscador cerrado no pide nada; el próximo foco trae el padrón nuevo', async () => {
        const pendientes = padronManual();
        const { result, rerender } = renderHook(({ q, on }) => useStudentSearch(q, on), {
            initialProps: { q: 'ana', on: true },
        });
        await act(async () => { pendientes[0]([est(1, 'Ana López')]); });
        rerender({ q: 'ana', on: false });

        act(() => { invalidate('estudiantes'); });
        expect(registro).toHaveBeenCalledTimes(1);

        rerender({ q: 'ana', on: true });
        expect(registro).toHaveBeenCalledTimes(2);
        await act(async () => { pendientes[1]([est(1, 'Ana Renombrada')]); });
        expect(nombres(result.current.suggestions)).toEqual(['Ana Renombrada']);
    });

    it('abandonar el buscador antes de que llegue el padrón no lo deja inservible', async () => {
        const pendientes = padronManual();
        const { result, rerender } = renderHook(({ q, on }) => useStudentSearch(q, on), {
            initialProps: { q: 'ana', on: true },
        });
        rerender({ q: 'ana', on: false });          // se va antes de la respuesta
        await act(async () => { pendientes[0]([est(1, 'Ana López')]); });

        rerender({ q: 'ana', on: true });           // vuelve
        expect(registro).toHaveBeenCalledTimes(2);
        await act(async () => { pendientes[1]([est(1, 'Ana López')]); });
        expect(nombres(result.current.suggestions)).toEqual(['Ana López']);
    });

    it('sin escrituras, volver a enfocar no repite la descarga', async () => {
        const pendientes = padronManual();
        const { rerender } = renderHook(({ q, on }) => useStudentSearch(q, on), {
            initialProps: { q: 'ana', on: true },
        });
        await act(async () => { pendientes[0]([est(1, 'Ana López')]); });
        rerender({ q: 'ana', on: false });
        rerender({ q: 'ana', on: true });
        expect(registro).toHaveBeenCalledTimes(1);
    });
});
