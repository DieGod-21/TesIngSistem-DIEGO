/**
 * e2e.mjs — Lanzador de las pruebas de navegador.
 *
 * ── POR QUÉ EXISTE ──────────────────────────────────────────────────────
 *
 * `npm run test.e2e` era `cypress run` a secas y no funcionaba. Dos motivos,
 * y ninguno era el que parecía.
 *
 * 1. ELECTRON_RUN_AS_NODE.
 *
 *    El diagnóstico de partida decía «binario de Cypress corrupto». No lo
 *    estaba: reinstalarlo entero no cambió nada. Cypress es una aplicación
 *    Electron, y cuando esa variable vale 1 —VS Code la pone en sus terminales
 *    integradas— Electron arranca como si fuera Node y rechaza las banderas de
 *    la propia aplicación:
 *
 *        Cypress.exe: bad option: --smoke-test
 *
 *    El síntoma es idéntico al de una instalación rota, de ahí la confusión.
 *    Se borra aquí para el proceso hijo, sin tocar el entorno de nadie.
 *
 * 2. NO HABÍA A QUÉ CONECTARSE.
 *
 *    Los specs necesitan la aplicación servida CON el conjunto de
 *    demostración: contra el servidor real harían falta credenciales que no
 *    existen en el repositorio. Un comando de pruebas que exige levantar otra
 *    cosa a mano en otra terminal se queda sin usar. Aquí se arranca Vite en
 *    modo demo, se espera a que responda, se pasan las pruebas y se apaga.
 *
 * Uso:
 *     npm run test.e2e                    todos los specs
 *     npm run test.e2e -- --spec ...      lo que se le pase, va a Cypress
 *     E2E_BASE_URL=http://localhost:5175  usa un servidor ya levantado
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ESPERA_SERVIDOR_MS = 60_000;
// `fileURLToPath` y no `.pathname`: la ruta del proyecto lleva tilde
// («Código») y en una URL viaja percent-encoded, así que el crudo no existe
// como directorio y `spawn` fallaba con ENOENT.
const raiz = fileURLToPath(new URL('..', import.meta.url));

/** Entorno para los hijos, sin la variable que rompe Electron. */
function entornoLimpio() {
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    return env;
}

function ejecutar(cmd, args, opciones = {}) {
    return spawn(cmd, args, {
        cwd: raiz,
        env: entornoLimpio(),
        shell: process.platform === 'win32',
        ...opciones,
    });
}

/** Arranca Vite en modo demo y resuelve con la URL que haya elegido. */
function arrancarServidor() {
    return new Promise((resolver, rechazar) => {
        const vite = ejecutar('npx', ['vite', '--mode', 'demo'], { stdio: ['ignore', 'pipe', 'pipe'] });
        let salida = '';

        const limite = setTimeout(() => {
            rechazar(new Error(`El servidor no respondió en ${ESPERA_SERVIDOR_MS / 1000}s.\n${salida}`));
        }, ESPERA_SERVIDOR_MS);

        // Vite elige otro puerto si el 5173 está ocupado, así que la URL se
        // lee de su propia salida en vez de darla por supuesta.
        //
        // Y se lee SIN colores: Vite resalta el número de puerto, de modo que
        // en crudo la línea es «http://localhost:[1m5174[22m/» y
        // cualquier expresión que espere dígitos tras los dos puntos falla.
        const sinColor = (t) => t.replace(/\[[0-9;]*m/g, '');
        const mirar = (trozo) => {
            salida += sinColor(trozo.toString());
            const m = /(http:\/\/localhost:\d+)\//.exec(salida);
            if (m) {
                clearTimeout(limite);
                resolver({ proceso: vite, url: m[1] });
            }
        };

        vite.stdout.on('data', mirar);
        vite.stderr.on('data', mirar);
        vite.on('error', (e) => { clearTimeout(limite); rechazar(e); });
        vite.on('exit', (code) => {
            clearTimeout(limite);
            rechazar(new Error(`El servidor terminó antes de estar listo (código ${code}).\n${salida}`));
        });
    });
}

function correrCypress(baseUrl, extra) {
    return new Promise((resolver) => {
        const cy = ejecutar(
            'npx',
            ['cypress', 'run', '--config', `baseUrl=${baseUrl}`, ...extra],
            { stdio: 'inherit' },
        );
        cy.on('exit', (code) => resolver(code ?? 1));
        cy.on('error', () => resolver(1));
    });
}

const extra = process.argv.slice(2);
let servidor = null;

try {
    let baseUrl = process.env.E2E_BASE_URL;
    if (baseUrl) {
        console.log(`▸ Usando el servidor ya levantado en ${baseUrl}`);
    } else {
        console.log('▸ Levantando Vite en modo demo…');
        const arrancado = await arrancarServidor();
        servidor = arrancado.proceso;
        baseUrl = arrancado.url;
        console.log(`▸ Servidor listo en ${baseUrl}`);
    }

    const codigo = await correrCypress(baseUrl, extra);
    process.exitCode = codigo;
} catch (e) {
    console.error(`✗ ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
} finally {
    if (servidor && servidor.pid && servidor.exitCode == null) {
        console.log('▸ Apagando el servidor…');
        // En Windows matar el proceso de npx no alcanza al árbol de hijos, y
        // un Vite huérfano deja el puerto ocupado para la próxima ejecución.
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', String(servidor.pid), '/T', '/F'], { stdio: 'ignore' });
        } else {
            servidor.kill('SIGTERM');
        }
    }
}
