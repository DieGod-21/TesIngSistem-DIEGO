/**
 * demoApi.ts — Doble del API para DESARROLLO. Nunca de producción.
 *
 * Intercepta `window.fetch` para las rutas `/api/*` y responde desde
 * `demoDataset`. Sirve para mirar el producto lleno de información coherente
 * sin depender de que el servidor tenga datos ni de tener sesión abierta.
 *
 * Lo que NO hace
 * ──────────────
 * No inventa endpoints. Cada ruta que atiende existe en la especificación
 * publicada en /api-docs.json, con el mismo verbo, el mismo cuerpo de petición
 * y la misma envoltura de respuesta (`{ success, data }`). Si el frontend
 * llamara a algo que el API real no ofrece, aquí devuelve 404 igual que allí:
 * el doble no debe hacer pasar por posible lo que no lo es.
 *
 * Las escrituras se aplican sobre copias en memoria y se pierden al recargar.
 * Eso es deliberado: el conjunto de partida siempre es el mismo y las pruebas
 * no arrastran estado de la sesión anterior.
 *
 * Activación (las dos primeras cosas tienen que darse):
 *   1. compilación de desarrollo (`import.meta.env.DEV`);
 *   2. petición explícita, por cualquiera de estas vías:
 *        · `npm run dev:demo`  → arranca Vite en modo `demo`;
 *        · `?demo=1` en la URL → se recuerda durante la pestaña;
 *        · `VITE_DEMO_DATA=1`  → variable de entorno;
 *   3. una vez activo, la interfaz lo anuncia con una banda permanente.
 *
 * Es VOLUNTARIO a propósito. Si el conjunto cargara por defecto, antes o
 * después alguien capturaría veintisiete estudiantes inventados creyendo que
 * son la cohorte. Sin activarlo, el servidor de desarrollo reenvía `/api` al
 * servidor real (ver el proxy de vite.config.ts) y hacen falta credenciales
 * reales: las de este conjunto solo existen aquí.
 */

import {
    CURSOS, ESTUDIANTES, PROYECTOS, TERNAS, USUARIOS, NOTA_MINIMA,
    PERFIL_POR_CARNET, apruebaTesis, faltanNotas, notasDe, promedioDe, razonDe,
    resumenTerna,
} from './demoDataset';
import type { Estudiante, Proyecto, TernaDetalle } from '../types/api';
import './demo.css';

const CLAVE_SESION = 'umg:demo-data';

/** ¿Se pidió el conjunto de demostración? Solo tiene sentido en desarrollo. */
export function demoDataActivo(): boolean {
    if (!import.meta.env.DEV) return false;

    /*
     * `npm run dev:demo` arranca Vite con `--mode demo`. Se comprueba el modo y
     * no un fichero `.env.demo` porque `.gitignore` excluye `.env.*`: ese
     * fichero no viajaría en el repositorio y el script fallaría para cualquiera
     * que clonase el proyecto.
     */
    if (import.meta.env.MODE === 'demo') return true;
    if (import.meta.env.VITE_DEMO_DATA === '1') return true;

    try {
        const url = new URL(window.location.href);
        const enUrl = url.searchParams.get('demo');
        if (enUrl === '1')  sessionStorage.setItem(CLAVE_SESION, '1');
        if (enUrl === '0')  sessionStorage.removeItem(CLAVE_SESION);
        return sessionStorage.getItem(CLAVE_SESION) === '1';
    } catch {
        return false;
    }
}

// ─── Estado mutable de la sesión ────────────────────────────────────────────

const estudiantes: Estudiante[] = ESTUDIANTES.map((e) => ({ ...e }));
const proyectos:   Proyecto[]   = PROYECTOS.map((p) => ({ ...p }));
const ternas:      TernaDetalle[] = TERNAS.map((t) => ({ ...t, evaluadores: t.evaluadores.map((x) => ({ ...x })) }));

// ─── Utilidades de respuesta ────────────────────────────────────────────────

const ok = (data: unknown, status = 200) =>
    new Response(JSON.stringify({ success: true, data }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

const fail = (status: number, message: string) =>
    new Response(JSON.stringify({ success: false, message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

const num = (v: string | null, alt: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : alt;
};

// ─── Derivados académicos (siempre desde los perfiles) ──────────────────────

function listaTesis(quiere: 'aprobados' | 'reprobados') {
    const filas = estudiantes
        .map((e) => ({ e, p: PERFIL_POR_CARNET.get(e.carnet) }))
        .filter((x) => x.p && !faltanNotas(x.p))
        .filter((x) => (quiere === 'aprobados' ? apruebaTesis(x.p!) : !apruebaTesis(x.p!)))
        .map(({ e, p }) => ({
            carnet: e.carnet,
            nombre: e.nombre,
            email: e.email,
            nota_grad1: p!.pg1,
            nota_grad2: p!.pg2,
            estado_grad1: p!.pg1 == null ? null : p!.pg1 >= NOTA_MINIMA ? 'APROBADO' : 'REPROBADO',
            estado_grad2: p!.pg2 == null ? null : p!.pg2 >= NOTA_MINIMA ? 'APROBADO' : 'REPROBADO',
        }));
    return { total: filas.length, nota_minima: NOTA_MINIMA, estudiantes: filas };
}

function estadoTesisDe(carnet: string) {
    const e = estudiantes.find((x) => x.carnet === carnet);
    const p = PERFIL_POR_CARNET.get(carnet);
    if (!e || !p) return null;
    const notas = notasDe(carnet);
    const resumenCurso = (codigo: string) => {
        const n = notas.find((x) => x.curso_codigo === codigo);
        return n ? { nota_final: Number(n.nota_final), estado: n.estado, curso: codigo, ciclo: n.ciclo } : null;
    };
    return {
        carnet,
        nombre: e.nombre,
        email: e.email,
        aprueba_tesis: apruebaTesis(p),
        razon: razonDe(p),
        nota_minima: NOTA_MINIMA,
        promedio: promedioDe(p),
        graduacion_1: resumenCurso('043'),
        graduacion_2: resumenCurso('049'),
    };
}

const ternaDeCarnet = (carnet: string) => ternas.find((t) => t.carnet === carnet);

function reporteGlobal() {
    const filas = ternas.map((t) => ({
        terna_id: t.id,
        numero: t.numero,
        carnet: t.carnet,
        estudiante: t.estudiante_nombre,
        titulo: t.titulo,
        promedio: t.resultado.promedio,
        resolucion: t.resultado.resolucion,
    }));
    const cuenta = (r: string) => filas.filter((f) => f.resolucion === r).length;
    return {
        resumen: {
            total: filas.length,
            aprueba_tesis: cuenta('aprueba_tesis'),
            aprueba_curso: cuenta('aprueba_curso'),
            reprobados:    cuenta('reprobado'),
            pendientes:    cuenta('pendiente'),
        },
        ternas: filas,
    };
}

// ─── Enrutado ───────────────────────────────────────────────────────────────

async function responder(metodo: string, url: URL, cuerpo: unknown): Promise<Response | null> {
    const ruta = url.pathname;
    const q = url.searchParams;
    const M = (patron: RegExp) => patron.exec(ruta);

    // ── Sesión ──
    if (ruta === '/api/auth/login' && metodo === 'POST') {
        return ok({
            accessToken: 'demo.access.token',
            refreshToken: 'demo.refresh.token',
            expiresIn: 3600,
            usuario: USUARIOS[0],
        });
    }
    if (ruta === '/api/auth/refresh' && metodo === 'POST') {
        return ok({ accessToken: 'demo.access.token', expiresIn: 3600 });
    }
    if (ruta === '/api/auth/logout') return ok({ mensaje: 'Sesión cerrada.' });
    if (ruta === '/api/usuarios/yo') return ok({ usuario: USUARIOS[0] });

    // ── Usuarios ──
    if (ruta === '/api/usuarios' && metodo === 'GET') {
        const rol = q.get('rol');
        return ok({ usuarios: rol ? USUARIOS.filter((u) => u.rol === rol) : USUARIOS });
    }
    if (ruta === '/api/usuarios' && metodo === 'POST') {
        const dto = cuerpo as { nombre: string; email: string; rol?: 'admin' | 'evaluador' };
        if (USUARIOS.some((u) => u.email === dto.email)) return fail(409, 'Ese correo ya está registrado.');
        const nuevo = { id: USUARIOS.length + 1, nombre: dto.nombre, email: dto.email, rol: dto.rol ?? 'evaluador' };
        USUARIOS.push(nuevo);
        return ok({ usuario: nuevo }, 201);
    }
    {
        const m = M(/^\/api\/usuarios\/(\d+)$/);
        if (m) {
            const u = USUARIOS.find((x) => x.id === Number(m[1]));
            return u ? ok({ usuario: u }) : fail(404, 'Usuario no encontrado.');
        }
    }

    // ── Cursos ──
    if (ruta === '/api/cursos') return ok({ cursos: CURSOS });
    {
        const m = M(/^\/api\/cursos\/(.+)$/);
        if (m) {
            const c = CURSOS.find((x) => x.codigo === decodeURIComponent(m[1]));
            return c ? ok({ curso: c }) : fail(404, 'Curso no encontrado.');
        }
    }

    // ── Estudiantes ──
    if (ruta === '/api/estudiantes' && metodo === 'GET') {
        const buscar = (q.get('search') ?? '').trim().toLowerCase();
        const filtrados = buscar
            ? estudiantes.filter((e) =>
                `${e.nombre} ${e.carnet} ${e.email}`.toLowerCase().includes(buscar))
            : estudiantes;
        const limit = num(q.get('limit'), 50);
        const page  = num(q.get('page'), 1);
        const desde = (page - 1) * limit;
        return ok({
            estudiantes: filtrados.slice(desde, desde + limit),
            pagination: {
                total: filtrados.length,
                page,
                limit,
                pages: Math.max(1, Math.ceil(filtrados.length / limit)),
            },
        });
    }
    if (ruta === '/api/estudiantes' && metodo === 'POST') {
        const dto = cuerpo as { carnet: string; nombre: string; email?: string; carrera?: string };
        if (estudiantes.some((e) => e.carnet === dto.carnet)) return fail(409, 'Ese carné ya está registrado.');
        const nuevo: Estudiante = {
            id: Math.max(...estudiantes.map((e) => e.id)) + 1,
            carnet: dto.carnet,
            nombre: dto.nombre,
            email: dto.email ?? '',
            carrera: dto.carrera ?? '1890',
            activo: true,
            created_at: new Date().toISOString(),
        };
        estudiantes.push(nuevo);
        return ok({ estudiante: nuevo }, 201);
    }
    {
        const m = M(/^\/api\/estudiantes\/carnet\/(.+)$/);
        if (m) {
            const e = estudiantes.find((x) => x.carnet === decodeURIComponent(m[1]));
            return e ? ok({ estudiante: e }) : fail(404, 'Estudiante no encontrado.');
        }
    }
    {
        const m = M(/^\/api\/estudiantes\/(\d+)$/);
        if (m) {
            const i = estudiantes.findIndex((x) => x.id === Number(m[1]));
            if (i < 0) return fail(404, 'Estudiante no encontrado.');
            if (metodo === 'GET') return ok({ estudiante: estudiantes[i] });
            if (metodo === 'PUT') {
                const dto = cuerpo as { nombre?: string; email?: string; carrera?: string };
                estudiantes[i] = { ...estudiantes[i], ...dto };
                return ok({ estudiante: estudiantes[i] });
            }
            if (metodo === 'DELETE') {
                estudiantes[i] = { ...estudiantes[i], activo: false };
                return ok({ estudiante: estudiantes[i] });
            }
        }
    }

    // ── Notas ──
    if (ruta === '/api/notas' && metodo === 'PUT') {
        // El doble NO altera los perfiles: son la fuente de verdad del conjunto
        // y reescribirlos rompería la coherencia entre pantallas. Se confirma la
        // escritura sin fingir que el estado académico cambió.
        return ok({ mensaje: 'Nota registrada (conjunto de demostración: no persiste).' });
    }
    {
        const m = M(/^\/api\/notas\/carnet\/(.+)$/);
        if (m) {
            const carnet = decodeURIComponent(m[1]);
            const e = estudiantes.find((x) => x.carnet === carnet);
            if (!e) return fail(404, 'Estudiante no encontrado.');
            const notas = notasDe(carnet);
            return ok({ estudiante: e, notas, total: notas.length });
        }
    }
    {
        const m = M(/^\/api\/notas\/estudiante\/(\d+)$/);
        if (m) {
            const e = estudiantes.find((x) => x.id === Number(m[1]));
            if (!e) return fail(404, 'Estudiante no encontrado.');
            const notas = notasDe(e.carnet);
            return ok({ estudiante: e, notas, total: notas.length });
        }
    }

    // ── Tesis ──
    if (ruta === '/api/tesis/aprobados')  return ok(listaTesis('aprobados'));
    if (ruta === '/api/tesis/reprobados') return ok(listaTesis('reprobados'));
    if (ruta === '/api/tesis/resumen') {
        const ap = listaTesis('aprobados').total;
        const re = listaTesis('reprobados').total;
        return ok({
            resumen: {
                total_estudiantes: ap + re,
                aprobados: ap,
                reprobados: re,
                porcentaje_aprobacion: ap + re ? Number(((ap / (ap + re)) * 100).toFixed(2)) : 0,
                nota_minima_requerida: NOTA_MINIMA,
            },
        });
    }
    {
        const m = M(/^\/api\/tesis\/estado\/(.+)$/);
        if (m) {
            const est = estadoTesisDe(decodeURIComponent(m[1]));
            return est ? ok(est) : fail(404, 'Estudiante no encontrado.');
        }
    }

    // ── Proyectos ──
    if (ruta === '/api/proyectos' && metodo === 'GET') {
        const fase = q.get('fase');
        const buscar = (q.get('search') ?? '').trim().toLowerCase();
        let filas = proyectos;
        if (fase)   filas = filas.filter((p) => p.fase === fase);
        if (buscar) filas = filas.filter((p) => `${p.titulo} ${p.estudiante_nombre}`.toLowerCase().includes(buscar));
        return ok({ proyectos: filas });
    }
    if (ruta === '/api/proyectos' && metodo === 'POST') {
        const dto = cuerpo as { estudianteId?: number; titulo?: string; descripcion?: string | null; fase?: 'PG1' | 'PG2' };
        const e = estudiantes.find((x) => x.id === Number(dto.estudianteId));
        if (!e) return fail(404, 'El estudiante indicado no existe.');
        if (proyectos.some((p) => p.estudiante_id === e.id)) {
            return fail(409, 'Ese estudiante ya tiene un proyecto registrado.');
        }
        const nuevo: Proyecto = {
            id: Math.max(0, ...proyectos.map((p) => p.id)) + 1,
            titulo: dto.titulo ?? '',
            descripcion: dto.descripcion ?? null,
            fase: dto.fase ?? 'PG1',
            estudiante_id: e.id,
            estudiante_nombre: e.nombre,
            carnet: e.carnet,
        };
        proyectos.push(nuevo);
        return ok({ proyecto: nuevo }, 201);
    }
    {
        const m = M(/^\/api\/proyectos\/estudiante\/(\d+)$/);
        if (m) return ok({ proyectos: proyectos.filter((p) => p.estudiante_id === Number(m[1])) });
    }
    {
        const m = M(/^\/api\/proyectos\/(\d+)$/);
        if (m) {
            const p = proyectos.find((x) => x.id === Number(m[1]));
            return p ? ok({ proyecto: p }) : fail(404, 'Proyecto no encontrado.');
        }
    }

    // ── Ternas ──
    if (ruta === '/api/ternas' && metodo === 'GET') {
        const estado = q.get('estado');
        const filas = ternas.map(resumenTerna);
        return ok({ ternas: estado ? filas.filter((t) => t.estado === estado) : filas });
    }
    if (ruta === '/api/ternas' && metodo === 'POST') {
        const dto = cuerpo as { numero?: number; proyectoId?: number; evaluadoresIds?: number[]; fechaEvaluacion?: string };
        const proyecto = proyectos.find((p) => p.id === Number(dto.proyectoId));
        if (!proyecto) return fail(404, 'El proyecto indicado no existe.');
        const ids = dto.evaluadoresIds ?? [];
        if (ids.length < 2 || ids.length > 3) return fail(422, 'Una terna requiere entre 2 y 3 evaluadores.');
        const nueva: TernaDetalle = {
            id: Math.max(0, ...ternas.map((t) => t.id)) + 1,
            numero: Number(dto.numero) || ternas.length + 1,
            estado: 'pendiente',
            titulo: proyecto.titulo,
            estudiante_nombre: proyecto.estudiante_nombre ?? '',
            carnet: proyecto.carnet ?? '',
            fase: proyecto.fase,
            fecha_evaluacion: dto.fechaEvaluacion ?? null,
            total_evaluadores: ids.length,
            evaluaciones_enviadas: 0,
            evaluadores: ids.map((id) => ({
                usuario_id: id,
                nombre: USUARIOS.find((u) => u.id === id)?.nombre ?? 'Evaluador',
                calificacion: null,
                comentarios: null,
                eval_estado: 'borrador' as const,
            })),
            resultado: { promedio: null, resolucion: 'pendiente', evaluaciones_enviadas: 0, total_evaluadores: ids.length },
        };
        ternas.push(nueva);
        return ok({ terna: nueva }, 201);
    }
    {
        const m = M(/^\/api\/ternas\/(\d+)$/);
        if (m) {
            const t = ternas.find((x) => x.id === Number(m[1]));
            return t ? ok({ terna: t }) : fail(404, 'Terna no encontrada.');
        }
    }
    {
        const m = M(/^\/api\/ternas\/(\d+)\/evaluacion\/(borrador|enviar|reabrir)$/);
        if (m) {
            const t = ternas.find((x) => x.id === Number(m[1]));
            if (!t) return fail(404, 'Terna no encontrada.');
            return ok({ mensaje: 'Evaluación registrada (conjunto de demostración: no persiste).' });
        }
    }

    // ── Reportes ──
    if (ruta === '/api/reportes/ternas') return ok({ reporte: reporteGlobal() });
    {
        const m = M(/^\/api\/reportes\/ternas\/(\d+)$/);
        if (m) {
            const t = ternas.find((x) => x.id === Number(m[1]));
            if (!t) return fail(404, 'Terna no encontrada.');
            return ok({
                reporte: {
                    terna_id: t.id,
                    numero: t.numero,
                    estado: t.estado,
                    proyecto: { titulo: t.titulo, fase: t.fase },
                    estudiante: { carnet: t.carnet, nombre: t.estudiante_nombre },
                    evaluadores: t.evaluadores.map((e) => ({
                        nombre: e.nombre,
                        calificacion: e.calificacion,
                        comentarios: e.comentarios,
                        estado: e.eval_estado ?? 'borrador',
                    })),
                    resultado: t.resultado,
                },
            });
        }
    }
    {
        const m = M(/^\/api\/reportes\/estudiante\/(.+)$/);
        if (m) {
            const carnet = decodeURIComponent(m[1]);
            const base = estadoTesisDe(carnet);
            if (!base) return fail(404, 'Estudiante no encontrado.');
            const t = ternaDeCarnet(carnet);
            return ok({
                ...base,
                terna: t
                    ? {
                        id: t.id,
                        numero: t.numero,
                        estado: t.estado,
                        promedio: t.resultado.promedio,
                        resolucion: t.resultado.resolucion,
                        evaluaciones_enviadas: t.resultado.evaluaciones_enviadas,
                        total_evaluadores: t.resultado.total_evaluadores,
                    }
                    : null,
            });
        }
    }

    // ── Importación ──
    if (ruta.startsWith('/api/importar/')) {
        return ok({ mensaje: 'Importación simulada (conjunto de demostración: no persiste).', total: 0, creados: 0, duplicados: 0 });
    }

    if (ruta === '/health') return ok({ status: 'ok', database: 'demo' });

    return null;   // ruta desconocida: se deja pasar al servidor real
}

// ─── Instalación ────────────────────────────────────────────────────────────

let instalado = false;

export function installDemoApi(): void {
    if (!import.meta.env.DEV || instalado) return;
    instalado = true;

    const original = window.fetch.bind(window);

    window.fetch = async (entrada: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const href = typeof entrada === 'string'
            ? entrada
            : entrada instanceof URL ? entrada.href : entrada.url;
        const url = new URL(href, window.location.origin);

        if (!url.pathname.startsWith('/api/') && url.pathname !== '/health') {
            return original(entrada as RequestInfo, init);
        }

        const metodo = (init?.method ?? (entrada instanceof Request ? entrada.method : 'GET')).toUpperCase();

        let cuerpo: unknown = null;
        const raw = init?.body;
        if (typeof raw === 'string') {
            try { cuerpo = JSON.parse(raw); } catch { cuerpo = null; }
        }

        // Latencia simbólica: sin ella los esqueletos de carga nunca se ven y no
        // hay forma de comprobar que existen y encajan.
        await new Promise((r) => setTimeout(r, 120));

        const respuesta = await responder(metodo, url, cuerpo);
        if (respuesta) return respuesta;

        return original(entrada as RequestInfo, init);
    };

    montarBanda();
}

/**
 * Señal permanente de que lo que se ve NO son datos reales.
 *
 * Se pinta con DOM plano desde este mismo módulo, y no como componente React
 * montado en `App`, por una razón concreta: un `import` estático desde `App`
 * arrastraba `demoDataset` al bundle de producción aunque la bandera fuese
 * falsa en tiempo de ejecución. Comprobado sobre `dist/`. Aquí toda la rama
 * cuelga de un `import()` dinámico dentro de `if (import.meta.env.DEV)`, así
 * que el empaquetador la elimina de verdad.
 *
 * No se puede cerrar: un aviso descartable deja de avisar exactamente cuando
 * más falta hace, una hora después, cuando ya se olvidó por qué se activó.
 */
function montarBanda(): void {
    /*
     * Cómo se sale, según cómo se entró. Con `--mode demo` la bandera está
     * cocida en el arranque del servidor y `?demo=0` no puede apagarla: decirlo
     * habría mandado al usuario a probar algo que no funciona. Tampoco interesa
     * que un parámetro de URL devuelva la sesión al servidor real a mitad de
     * camino, porque dejaría un token inventado hablando con producción.
     */
    const porModo = import.meta.env.MODE === 'demo' || import.meta.env.VITE_DEMO_DATA === '1';
    const salida = porModo
        ? 'Para volver al servidor real, arranca con «npm run dev».'
        : 'Añade ?demo=0 a la URL para desactivarlo.';

    const banda = document.createElement('div');
    banda.className = 'demo-banner';
    banda.setAttribute('role', 'status');

    const titulo = document.createElement('strong');
    titulo.textContent = 'Datos de demostración';
    const texto = document.createElement('span');
    texto.textContent = `Las respuestas del API vienen de src/dev/. ${salida}`;

    banda.append(titulo, texto);
    document.body.appendChild(banda);
}
