import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as telemetry from './telemetry';
import { getCached, setCached, invalidate, clear, cached, subscribe } from './cache';

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

/**
 * Una carga que empezó ANTES de una escritura trae datos de antes de la
 * escritura. `invalidate()` la retira del registro, pero la promesa sigue viva
 * y termina después: no puede volver a sembrar la caché ni pisar a la carga
 * nueva que se lanzó tras invalidar.
 */
describe('cache — invalidación con una carga en vuelo', () => {
    beforeEach(() => { clear(); });
    afterEach(() => { clear(); });

    /** Loader cuyas respuestas se liberan a mano, en el orden que decida el test. */
    function loaderManual() {
        const pendientes: Array<(v: string) => void> = [];
        let llamadas = 0;
        const loader = () => {
            llamadas++;
            return new Promise<string>((r) => { pendientes.push(r); });
        };
        return { loader, pendientes, llamadas: () => llamadas };
    }

    it('la carga vieja que termina tras invalidate() no reescribe la caché', async () => {
        const { loader, pendientes } = loaderManual();
        const vieja = cached('k', loader);
        invalidate('k');
        pendientes[0]('antes-de-la-escritura');

        // Quien la pidió recibe su respuesta: la pidió antes de la escritura.
        expect(await vieja).toBe('antes-de-la-escritura');
        expect(getCached('k')).toBeUndefined();
    });

    it('tras invalidar, la siguiente lectura lanza una carga nueva', () => {
        const { loader, llamadas } = loaderManual();
        void cached('k', loader);
        invalidate('k');
        void cached('k', loader);
        expect(llamadas()).toBe(2);
    });

    it('la carga vieja no pisa el dato de la nueva aunque termine después', async () => {
        const { loader, pendientes } = loaderManual();
        const vieja = cached('k', loader);
        invalidate('k');
        const nueva = cached('k', loader);

        pendientes[1]('despues');
        expect(await nueva).toBe('despues');
        pendientes[0]('antes');
        await vieja;

        expect(getCached('k')).toBe('despues');
    });

    it('la limpieza de la carga vieja no borra el registro de la nueva', async () => {
        const { loader, pendientes, llamadas } = loaderManual();
        const vieja = cached('k', loader);
        invalidate('k');
        const nueva = cached('k', loader);

        pendientes[0]('antes');
        await vieja;

        // La nueva sigue en vuelo: un tercer lector debe engancharse a ella.
        const tercero = cached('k', loader);
        expect(llamadas()).toBe(2);
        pendientes[1]('despues');
        expect(await tercero).toBe('despues');
        expect(await nueva).toBe('despues');
    });

    it('clear() (logout) tampoco deja que una carga en vuelo siembre la caché', async () => {
        const { loader, pendientes } = loaderManual();
        const vieja = cached('k', loader);
        clear();
        pendientes[0]('de-la-sesion-anterior');
        await vieja;
        expect(getCached('k')).toBeUndefined();
    });

    it('un fallo de la carga vieja no borra el registro de la nueva', async () => {
        let rechazar!: (e: Error) => void;
        let resolver!: (v: string) => void;
        const vieja = cached('k', () => new Promise<string>((_, r) => { rechazar = r; }));
        invalidate('k');
        const nueva = cached('k', () => new Promise<string>((r) => { resolver = r; }));

        rechazar(new Error('red'));
        await expect(vieja).rejects.toThrow('red');

        let terceras = 0;
        const tercero = cached('k', async () => { terceras++; return 'otra'; });
        resolver('despues');
        expect(await tercero).toBe('despues');
        expect(await nueva).toBe('despues');
        expect(terceras).toBe(0);
    });
});

describe('cache — aviso de invalidación a las vistas montadas', () => {
    beforeEach(() => { clear(); });
    afterEach(() => { clear(); });

    it('avisa cuando se invalida la clave o su recurso', () => {
        const avisos: string[] = [];
        const baja = subscribe('estudiantes:registry', () => avisos.push('registro'));
        invalidate('estudiantes:registry');
        invalidate('estudiantes');
        baja();
        expect(avisos).toEqual(['registro', 'registro']);
    });

    it('no avisa por otros recursos ni por prefijos que solo se parecen', () => {
        let avisos = 0;
        const baja = subscribe('ternas:list', () => { avisos++; });
        invalidate('estudiantes');
        invalidate('tern');
        baja();
        expect(avisos).toBe(0);
    });

    it('tras darse de baja ya no recibe avisos', () => {
        let avisos = 0;
        const baja = subscribe('k', () => { avisos++; });
        baja();
        invalidate('k');
        expect(avisos).toBe(0);
    });

    it('clear() (logout) no avisa: las vistas se desmontan, no deben volver a pedir', () => {
        let avisos = 0;
        const baja = subscribe('k', () => { avisos++; });
        clear();
        baja();
        expect(avisos).toBe(0);
    });

    it('darse de baja durante el aviso no salta a los demás suscriptores', () => {
        const avisos: string[] = [];
        const bajaA = subscribe('k', () => { avisos.push('a'); bajaA(); });
        const bajaB = subscribe('k', () => avisos.push('b'));
        invalidate('k');
        bajaB();
        expect(avisos).toEqual(['a', 'b']);
    });

    it('un suscriptor que falla no corta a los demás ni hace fallar la escritura', () => {
        const reporte = vi.spyOn(telemetry, 'reportError').mockImplementation(() => undefined);
        const avisos: string[] = [];
        const bajaA = subscribe('k', () => { throw new Error('fallo del suscriptor'); });
        const bajaB = subscribe('k', () => avisos.push('b'));

        // `invalidate` corre justo después de una escritura ya aceptada por el servidor.
        expect(() => invalidate('k')).not.toThrow();
        expect(avisos).toEqual(['b']);
        expect(reporte).toHaveBeenCalledTimes(1);
        const [error, contexto] = reporte.mock.calls[0];
        expect((error as Error).message).toBe('fallo del suscriptor');
        expect(contexto).toEqual({ source: 'cache:suscriptor' });

        bajaA();
        bajaB();
        reporte.mockRestore();
    });

    it('al avisar, la caché ya está vacía: releer va al origen', async () => {
        setCached('k', 'viejo');
        let visto: unknown = 'sin-aviso';
        const baja = subscribe('k', () => { visto = getCached('k'); });
        invalidate('k');
        baja();
        expect(visto).toBeUndefined();
    });
});
