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
 * que declara copiar la envoltura de /api-docs.json. La primera parte solo
 * comprueba COBERTURA, que es la que se pierde sola con el tiempo.
 *
 * La segunda sí mira los CUERPOS de las escrituras: un doble que acepta
 * cualquier cosa ocultó durante meses que notas, altas y ternas no enviaban
 * lo que el contrato pide. Aquí el cuerpo antiguo debe fallar y el del
 * contrato, pasar.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { API_PATHS } from '../config/apiConfig';
import { responder, installDemoApi } from './demoApi';
import { ESTUDIANTES, PROYECTOS, resolucionDe } from './demoDataset';

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
    'reportes.actaPdf':        [1],
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

describe('la demo valida los cuerpos de escritura como el contrato', () => {
    const url = (ruta: string) => new URL(ruta, 'http://localhost');
    const estado = async (verbo: string, ruta: string, cuerpo: unknown) =>
        (await responder(verbo, url(ruta), cuerpo))?.status;

    it('PUT /api/notas exige estudianteId, cursoCodigo y notaFinal', async () => {
        const id = ESTUDIANTES[0].id;
        expect(await estado('PUT', '/api/notas', { carnet: ESTUDIANTES[0].carnet, curso_codigo: '043', nota_final: 80 })).toBe(400);
        expect(await estado('PUT', '/api/notas', { estudianteId: id, cursoCodigo: '050', notaFinal: 80 })).toBe(400);
        expect(await estado('PUT', '/api/notas', { estudianteId: id, cursoCodigo: '043', notaFinal: 101 })).toBe(400);
        expect(await estado('PUT', '/api/notas', { estudianteId: 999_999, cursoCodigo: '043', notaFinal: 80 })).toBe(404);
        expect(await estado('PUT', '/api/notas', { estudianteId: id, cursoCodigo: '043', notaFinal: 80, observacion: null })).toBe(200);
    });

    it('POST /api/estudiantes exige carnet y nombre', async () => {
        expect(await estado('POST', '/api/estudiantes', null)).toBe(400);
        expect(await estado('POST', '/api/estudiantes', { carnet: '1890-99-00001' })).toBe(400);
        expect(await estado('POST', '/api/estudiantes', { carnet: '1890-99-00001', nombre: 'PRUEBA DE PARIDAD' })).toBe(201);
    });

    it('POST /api/ternas exige exactamente 3 evaluadores, uno por cargo', async () => {
        const base = { numero: 90, proyectoId: PROYECTOS[0].id };
        expect(await estado('POST', '/api/ternas', {
            ...base,
            evaluadores: [{ usuarioId: 2, rol: 'presidente' }, { usuarioId: 3, rol: 'secretario' }],
        })).toBe(422);
        expect(await estado('POST', '/api/ternas', {
            ...base,
            evaluadores: [
                { usuarioId: 2, rol: 'presidente' },
                { usuarioId: 3, rol: 'presidente' },
                { usuarioId: 4, rol: 'vocal' },
            ],
        })).toBe(422);
        expect(await estado('POST', '/api/ternas', {
            ...base,
            evaluadores: [
                { usuarioId: 2, rol: 'presidente' },
                { usuarioId: 2, rol: 'secretario' },
                { usuarioId: 4, rol: 'vocal' },
            ],
        })).toBe(422);
        expect(await estado('POST', '/api/ternas', {
            ...base,
            evaluadores: [
                { usuarioId: 2, rol: 'presidente' },
                { usuarioId: 3, rol: 'secretario' },
                { usuarioId: 4, rol: 'vocal' },
            ],
        })).toBe(201);
        // Legacy deprecado: el contrato lo mapea en orden presidente/secretario/vocal.
        expect(await estado('POST', '/api/ternas', { ...base, numero: 91, evaluadoresIds: [2, 3, 4] })).toBe(201);
        expect(await estado('POST', '/api/ternas', { ...base, numero: 92, evaluadoresIds: [2, 3] })).toBe(422);
    });

    it('un cuerpo string sin Content-Type JSON llega vacío, como en el servidor', async () => {
        installDemoApi();
        const alta = { carnet: '1890-99-00002', nombre: 'PRUEBA SIN CABECERA' };
        const sinCabecera = await fetch('/api/estudiantes', { method: 'POST', body: JSON.stringify(alta) });
        expect(sinCabecera.status).toBe(400);
        const conCabecera = await fetch('/api/estudiantes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alta),
        });
        expect(conCabecera.status).toBe(201);
    });
});

describe('la resolución de terna de la demo sigue la escala de la API', () => {
    it('≥70 tesis · 60–69 curso · <60 reprobado · sin enviar pendiente', () => {
        expect(resolucionDe(70, true)).toBe('aprueba_tesis');
        expect(resolucionDe(69.99, true)).toBe('aprueba_curso');
        expect(resolucionDe(60, true)).toBe('aprueba_curso');
        expect(resolucionDe(59.99, true)).toBe('reprobado');
        expect(resolucionDe(95, false)).toBe('pendiente');
        expect(resolucionDe(null, true)).toBe('pendiente');
    });
});
