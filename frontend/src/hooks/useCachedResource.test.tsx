/**
 * useCachedResource.test.tsx
 *
 * El hook sustituye un bloque que Proyectos, Usuarios y Reportes copiaban a
 * mano. Aquí se fija lo que ese bloque ya hacía (caché síncrona al montar,
 * errores traducidos, StrictMode sin `loading` eterno) y lo que le faltaba
 * (volver a leer cuando una escritura invalida la clave, y que una respuesta
 * tardía no pise a la más reciente).
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCachedResource } from './useCachedResource';
import { cached, clear, invalidate, setCached } from '../services/cache';
import { ApiError } from '../services/apiClient';

const CLAVE = 'recurso:list';

/** Carga cuyas respuestas se liberan a mano; pasa por `cached()` como los servicios. */
function cargaManual() {
    const pendientes: Array<{ resolver: (v: string[]) => void; rechazar: (e: unknown) => void }> = [];
    let llamadas = 0;
    const origen = () => {
        llamadas++;
        return new Promise<string[]>((resolver, rechazar) => { pendientes.push({ resolver, rechazar }); });
    };
    const load = () => cached(CLAVE, origen);
    return { load, pendientes, llamadas: () => llamadas };
}

const Strict: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <React.StrictMode>{children}</React.StrictMode>
);

describe('useCachedResource', () => {
    beforeEach(() => { clear(); });
    afterEach(() => { clear(); });

    it('con caché vigente, el dato está en el primer render (sin hueco para esqueleto)', async () => {
        setCached(CLAVE, ['cacheado']);
        const { load, llamadas } = cargaManual();
        const { result } = renderHook(() => useCachedResource(CLAVE, load));
        expect(result.current.data).toEqual(['cacheado']);

        // La revalidación de fondo sale de la caché sin tocar el origen.
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.data).toEqual(['cacheado']);
        expect(llamadas()).toBe(0);
    });

    it('sin caché: carga, entrega el dato y termina el loading', async () => {
        const { load, pendientes } = cargaManual();
        const { result } = renderHook(() => useCachedResource(CLAVE, load));
        expect(result.current.loading).toBe(true);
        expect(result.current.data).toBeUndefined();

        await act(async () => { pendientes[0].resolver(['a', 'b']); });
        expect(result.current.data).toEqual(['a', 'b']);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('bajo StrictMode la carga termina (no queda en loading eterno)', async () => {
        const { load, pendientes, llamadas } = cargaManual();
        const { result } = renderHook(() => useCachedResource(CLAVE, load), { wrapper: Strict });
        // El remonte de StrictMode se engancha a la misma carga deduplicada.
        expect(llamadas()).toBe(1);
        await act(async () => { pendientes[0].resolver(['x']); });
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toEqual(['x']);
    });

    it('un fallo llega traducido por userMessageFor, nunca crudo', async () => {
        const { load, pendientes } = cargaManual();
        const { result } = renderHook(() => useCachedResource(CLAVE, load));
        await act(async () => {
            pendientes[0].rechazar(new ApiError(503, 'Error HTTP 503', undefined, 'unavailable'));
        });
        expect(result.current.error).toBe('El servicio no está disponible temporalmente. Intenta más tarde.');
        expect(result.current.loading).toBe(false);
    });

    it('si una escritura invalida la clave, la vista montada vuelve a leer sola', async () => {
        const { load, pendientes, llamadas } = cargaManual();
        const { result } = renderHook(() => useCachedResource(CLAVE, load));
        await act(async () => { pendientes[0].resolver(['antes']); });

        act(() => { invalidate('recurso'); });
        expect(llamadas()).toBe(2);
        // Mientras llega lo nuevo se conserva lo que había (refresco, no esqueleto).
        expect(result.current.data).toEqual(['antes']);
        expect(result.current.loading).toBe(true);

        await act(async () => { pendientes[1].resolver(['antes', 'nuevo']); });
        expect(result.current.data).toEqual(['antes', 'nuevo']);
        expect(result.current.loading).toBe(false);
    });

    it('desmontada, una invalidación ya no la hace leer', async () => {
        const { load, pendientes, llamadas } = cargaManual();
        const { unmount } = renderHook(() => useCachedResource(CLAVE, load));
        await act(async () => { pendientes[0].resolver(['a']); });
        unmount();
        invalidate('recurso');
        expect(llamadas()).toBe(1);
    });

    it('gana la última lectura: la respuesta vieja que llega tarde no pisa a la nueva', async () => {
        const { load, pendientes } = cargaManual();
        const { result } = renderHook(() => useCachedResource(CLAVE, load));

        // La carga inicial sigue en vuelo cuando una escritura invalida.
        act(() => { invalidate('recurso'); });
        await act(async () => { pendientes[1].resolver(['nuevo']); });
        await act(async () => { pendientes[0].resolver(['viejo']); });

        expect(result.current.data).toEqual(['nuevo']);
        expect(result.current.loading).toBe(false);
    });

    it('una carga escrita en línea no provoca un bucle de peticiones', async () => {
        let llamadas = 0;
        const origen = async () => { llamadas++; return ['x']; };
        const { result, rerender } = renderHook(
            // Flecha nueva en cada render: el uso natural en una pantalla con filtros.
            ({ filtro }) => useCachedResource(`recurso:${filtro}`, () => cached(`recurso:${filtro}`, origen)),
            { initialProps: { filtro: 'a' } },
        );
        await waitFor(() => expect(result.current.loading).toBe(false));
        rerender({ filtro: 'a' });
        rerender({ filtro: 'a' });
        await act(async () => { await new Promise((r) => setTimeout(r, 20)); });

        expect(llamadas).toBe(1);
        expect(result.current.data).toEqual(['x']);
    });

    it('cambiar la clave vuelve a leer con la carga nueva', async () => {
        const vistos: string[] = [];
        const { result, rerender } = renderHook(
            ({ filtro }) => useCachedResource(`recurso:${filtro}`, async () => { vistos.push(filtro); return [filtro]; }),
            { initialProps: { filtro: 'a' } },
        );
        await waitFor(() => expect(result.current.data).toEqual(['a']));
        rerender({ filtro: 'b' });
        await waitFor(() => expect(result.current.data).toEqual(['b']));
        expect(vistos).toEqual(['a', 'b']);
    });

    it('reload() vuelve a pedir cuando la caché ya no sirve', async () => {
        const { load, pendientes, llamadas } = cargaManual();
        const { result } = renderHook(() => useCachedResource(CLAVE, load));
        await act(async () => { pendientes[0].resolver(['a']); });

        clear();
        act(() => { void result.current.reload(); });
        await waitFor(() => expect(llamadas()).toBe(2));
        await act(async () => { pendientes[1].resolver(['b']); });
        expect(result.current.data).toEqual(['b']);
    });
});
