/**
 * Las escrituras envían EXACTAMENTE lo que declara /api-docs.json.
 *
 * Durante meses el registro de notas, el alta de estudiantes y el alta de
 * terna enviaron cuerpos que el contrato no reconoce, y nada lo detectó: la
 * demo aceptaba cualquier cosa y ningún test miraba el cuerpo. Aquí se mira.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStudent } from './studentsService';
import { upsertNota } from './notasService';
import { createTerna } from './ternasService';
import { importarEstudiantes, importarNotas } from './importarService';

interface Llamada { url: string; init: RequestInit }

function jsonResponse(status: number, body: unknown): Response {
    return {
        status,
        ok: status >= 200 && status < 300,
        text: async () => (body == null ? '' : JSON.stringify(body)),
    } as unknown as Response;
}

let llamadas: Llamada[] = [];

function responderCon(status: number, body: unknown) {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
        llamadas.push({ url, init });
        return jsonResponse(status, body);
    }));
}

const cabecera = (l: Llamada, nombre: string) =>
    (l.init.headers as Record<string, string> | undefined)?.[nombre];

const cuerpoJson = (l: Llamada) => JSON.parse(String(l.init.body));

describe('escrituras según el contrato', () => {
    beforeEach(() => {
        llamadas = [];
        sessionStorage.clear();
    });
    afterEach(() => { vi.unstubAllGlobals(); });

    it('POST /api/estudiantes: JSON declarado y respuesta desenvuelta', async () => {
        const estudiante = { id: 40, carnet: '1890-24-1', nombre: 'ANA PÉREZ', email: 'ap@miumg.edu.gt', carrera: '1890', activo: true };
        responderCon(201, { success: true, data: { estudiante } });

        const creado = await createStudent({
            nombreCompleto: '  ANA PÉREZ ',
            carnetId: ' 1890-24-1 ',
            correoInstitucional: 'ap@miumg.edu.gt',
        });

        const [l] = llamadas;
        expect(l.url).toBe('/api/estudiantes');
        expect(l.init.method).toBe('POST');
        expect(cabecera(l, 'Content-Type')).toBe('application/json');
        expect(cuerpoJson(l)).toEqual({ nombre: 'ANA PÉREZ', carnet: '1890-24-1', email: 'ap@miumg.edu.gt' });
        expect(creado).toEqual(estudiante);
    });

    it('PUT /api/notas: estudianteId, cursoCodigo, notaFinal y observacion', async () => {
        responderCon(200, { success: true, data: { nota: {} } });

        await upsertNota({ estudianteId: 15, cursoCodigo: '049', notaFinal: 88, observacion: null });

        const [l] = llamadas;
        expect(l.url).toBe('/api/notas');
        expect(l.init.method).toBe('PUT');
        expect(cabecera(l, 'Content-Type')).toBe('application/json');
        expect(cuerpoJson(l)).toEqual({ estudianteId: 15, cursoCodigo: '049', notaFinal: 88, observacion: null });
    });

    it('POST /api/ternas: tres evaluadores con cargo y sin evaluadoresIds', async () => {
        responderCon(201, { success: true, data: { terna: { id: 9 } } });

        await createTerna({
            numero: 6,
            proyectoId: 3,
            evaluadores: [
                { usuarioId: 2, rol: 'presidente' },
                { usuarioId: 3, rol: 'secretario' },
                { usuarioId: 4, rol: 'vocal' },
            ],
        });

        const [l] = llamadas;
        expect(l.url).toBe('/api/ternas');
        expect(l.init.method).toBe('POST');
        const cuerpo = cuerpoJson(l);
        expect(cuerpo).toEqual({
            numero: 6,
            proyectoId: 3,
            evaluadores: [
                { usuarioId: 2, rol: 'presidente' },
                { usuarioId: 3, rol: 'secretario' },
                { usuarioId: 4, rol: 'vocal' },
            ],
        });
        expect(cuerpo).not.toHaveProperty('evaluadoresIds');
    });

    it('importaciones: el archivo viaja solo en el campo `archivo`', async () => {
        responderCon(200, { success: true, data: {} });
        const excel = new File(['x'], 'listado.xlsx');
        const pdf = new File(['y'], 'acta.pdf');

        await importarEstudiantes(excel);
        await importarNotas('043', pdf);

        expect(llamadas.map((l) => l.url)).toEqual(['/api/importar/estudiantes', '/api/importar/notas/043']);
        for (const l of llamadas) {
            const form = l.init.body as FormData;
            expect(form).toBeInstanceOf(FormData);
            expect([...form.keys()]).toEqual(['archivo']);
            // FormData lleva su propio boundary: no se fuerza Content-Type.
            expect(cabecera(l, 'Content-Type')).toBeUndefined();
        }
    });
});
