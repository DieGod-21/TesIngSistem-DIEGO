import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCached, setCached, invalidate, clear, cached } from './cache';

describe('cache — TTL, hit/miss, invalidación', () => {
    beforeEach(() => { clear(); });
    afterEach(() => { clear(); vi.useRealTimers(); });

    it('miss → undefined; set/get → hit', () => {
        expect(getCached('k')).toBeUndefined();
        setCached('k', 42);
        expect(getCached<number>('k')).toBe(42);
    });

    it('expira tras el TTL', () => {
        vi.useFakeTimers();
        setCached('k', 'v', 1000);
        expect(getCached('k')).toBe('v');
        vi.advanceTimersByTime(1001);
        expect(getCached('k')).toBeUndefined();
    });

    it('invalidate por prefijo limpia el recurso pero respeta otros', () => {
        setCached('estudiantes:registry', [1]);
        setCached('estudiantes:otro', [2]);
        setCached('ternas:list', [3]);
        invalidate('estudiantes');
        expect(getCached('estudiantes:registry')).toBeUndefined();
        expect(getCached('estudiantes:otro')).toBeUndefined();
        expect(getCached('ternas:list')).toEqual([3]);
    });
});

describe('cache — deduplicación de peticiones en vuelo', () => {
    beforeEach(() => { clear(); });
    afterEach(() => { clear(); });

    it('dos cargas concurrentes con la misma clave → un solo loader', async () => {
        let calls = 0;
        let resolve!: (v: string) => void;
        const loader = () => { calls++; return new Promise<string>((r) => { resolve = r; }); };

        const p1 = cached('reg', loader);
        const p2 = cached('reg', loader);
        resolve('data');

        expect(await p1).toBe('data');
        expect(await p2).toBe('data');
        expect(calls).toBe(1); // deduplicado
    });

    it('cache hit evita reejecutar el loader', async () => {
        let calls = 0;
        const loader = async () => { calls++; return 'x'; };
        expect(await cached('k', loader)).toBe('x');
        expect(await cached('k', loader)).toBe('x');
        expect(calls).toBe(1);
    });

    it('tras invalidar, cached() vuelve al origen', async () => {
        let calls = 0;
        const loader = async () => { calls++; return calls; };
        expect(await cached('k', loader)).toBe(1);
        invalidate('k');
        expect(await cached('k', loader)).toBe(2);
        expect(calls).toBe(2);
    });
});
