/**
 * demoParity.test.ts — La demo no puede quedarse atrás del producto.
 *
 * ── QUÉ PROBLEMA RESUELVE ───────────────────────────────────────────────
 *
 * El conjunto de desarrollo es la única forma de mirar el producto lleno sin
 * credenciales del servidor real. Pero es un doble escrito a mano: cuando el
 * producto empieza a consumir un endpoint nuevo, la demo no se entera. Ese
 * hueco no da error al compilar ni rompe ninguna prueba; se descubre abriendo
 * la demo, navegando hasta la pantalla nueva y viendo un fallo que además
 * parece del producto, no del doble.
 *
 * Aquí se pregunta al doble, ruta por ruta, si sabe responder a lo que el
 * producto puede pedirle. Una ruta sin atender devuelve `null` —«sigue al
 * servidor real»—, que en desarrollo significa exactamente eso: un hueco.
 *
 * ── QUÉ NO COMPRUEBA ────────────────────────────────────────────────────
 *
 * No compara respuestas contra el contrato: eso lo garantiza el propio doble,
 * que declara copiar la envoltura de /api-docs.json. Aquí solo se comprueba
 * COBERTURA, que es la que se pierde sola con el tiempo.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { API_PATHS } from '../config/apiConfig';
import { responder } from './demoApi';

const SERVICIOS = join(__dirname, '..', 'services');

/** Argumentos de muestra para las rutas que se construyen con parámetros. */
const MUESTRA: Record<string, unknown[]> = {
    'estudiantes.byId':        [1],
    'estudiantes.byCarnet':    ['1890-17-11000'],
    'usuarios.byId':           [1],
    'cursos.byCodigo':         ['043'],
    'notas.byEstudiante':      [1],
    'notas.byCarnet':          ['1890-17-11000'],
    'notas.byCurso':           ['043'],
    'tesis.byCarnet':          ['1890-17-11000'],
    'proyectos.byId':          [1],
    'proyectos.byEstudiante':  [1],
    'ternas.byId':             [1],
    'ternas.addEvaluador':     [1],
    'ternas.removeEvaluador':  [1, 2],
    'ternas.draft':            [1],
    'ternas.submit':           [1],
    'ternas.reopen':           [1],
    'reportes.ternaById':      [1],
    'reportes.estudiante':     ['1890-17-11000'],
    'importar.notas':          ['043'],
};

/** Todas las rutas declaradas, como `grupo.hoja` → ruta concreta. */
function rutasDeclaradas(): Map<string, string> {
    const out = new Map<string, string>();
    for (const [grupo, valor] of Object.entries(API_PATHS)) {
        if (typeof valor === 'string') { out.set(grupo, valor); continue; }
        for (const [hoja, v] of Object.entries(valor as Record<string, unknown>)) {
            const clave = `${grupo}.${hoja}`;
            if (typeof v === 'string') out.set(clave, v);
            else if (typeof v === 'function') {
                const args = MUESTRA[clave];
                // Un constructor de ruta sin argumentos de muestra no se puede
                // comprobar: se declara aquí para que añadirlo sea obligatorio.
                if (!args) throw new Error(`Falta un argumento de muestra para API_PATHS.${clave}`);
                out.set(clave, (v as (...a: unknown[]) => string)(...args));
            }
        }
    }
    return out;
}

/** Claves `grupo.hoja` que alguna capa de servicios llega a usar. */
function rutasUsadasPorServicios(): Set<string> {
    const usadas = new Set<string>();
    for (const f of readdirSync(SERVICIOS)) {
        if (!f.endsWith('.ts') || f.endsWith('.test.ts')) continue;
        const src = readFileSync(join(SERVICIOS, f), 'utf-8');
        for (const m of src.matchAll(/API_PATHS\.([a-zA-Z]+)\.([a-zA-Z]+)/g)) {
            usadas.add(`${m[1]}.${m[2]}`);
        }
        if (/API_PATHS\.health/.test(src)) usadas.add('health');
    }
    return usadas;
}

const VERBOS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

async function loAtiendeLaDemo(ruta: string): Promise<boolean> {
    const url = new URL(ruta, 'http://localhost');
    for (const verbo of VERBOS) {
        // Cuerpo vacío: aquí se pregunta por la COBERTURA de la ruta, no por la
        // validación del cuerpo. Un 400 o un 422 también son «sé quién eres».
        const r = await responder(verbo, url, {});
        if (r !== null) return true;
    }
    return false;
}

describe('paridad demo ↔ producto', () => {
    it('el doble atiende toda ruta que la capa de servicios puede pedir', async () => {
        const declaradas = rutasDeclaradas();
        const usadas = rutasUsadasPorServicios();
        const huecos: string[] = [];

        for (const clave of usadas) {
            const ruta = declaradas.get(clave);
            if (!ruta) continue;   // no es una ruta de API_PATHS
            if (!(await loAtiendeLaDemo(ruta))) huecos.push(`${clave} → ${ruta}`);
        }

        expect(huecos, [
            'Estas rutas las usa el producto y la demo no las atiende:',
            ...huecos.map((h) => `  · ${h}`),
            'Añade su manejador en src/dev/demoApi.ts.',
        ].join('\n')).toEqual([]);
    });

    it('la capa de servicios se está leyendo de verdad', () => {
        // Sin esto, un cambio de ruta o de nombre de carpeta dejaría la prueba
        // anterior recorriendo un conjunto vacío y aprobando siempre.
        const usadas = rutasUsadasPorServicios();
        expect(usadas.size).toBeGreaterThan(15);
        expect(usadas.has('ternas.list')).toBe(true);
        expect(usadas.has('estudiantes.list')).toBe(true);
    });

    it('toda ruta con parámetros tiene argumento de muestra', () => {
        expect(() => rutasDeclaradas()).not.toThrow();
    });
});
