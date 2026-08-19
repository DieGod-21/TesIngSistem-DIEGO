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
    PERFIL_POR_CARNET, apruebaTesis, enListaAprobados, enListaReprobados, notasDe, promedioDe, razonDe,
    resolucionDe, resumenTerna,
} from './demoDataset';
import type { Estudiante, Proyecto, TernaDetalle, Usuario } from '../types/api';
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

/*
 * ─── SESIÓN DEL DOBLE ───────────────────────────────────────────────────────
 *
 * El doble tenía una sola sesión fija —siempre `USUARIOS[0]`, que es admin— y
 * `/api/ternas` devolvía TODAS las ternas a cualquiera. Con eso, la mitad del
 * producto que depende del rol era imposible de ver: no había forma de entrar
 * como evaluador ni de comprobar que un evaluador solo ve lo suyo.
 *
 * Ahora el doble replica el acotamiento que /api-docs.json DECLARA para el
 * servidor real:
 *
 *   GET  /api/ternas            → «Admin: todas · Evaluador: solo las asignadas»
 *   GET  /api/ternas/{id}       → 403 «Evaluador no pertenece a esta terna»
 *   GET  /api/reportes/ternas   → solo admin
 *   GET  /api/usuarios          → solo admin
 *
 * No se inventa nada: cada regla de aquí está escrita en la especificación. El
 * doble EMULA al servidor, no lo sustituye —la autoridad sigue siendo el
 * backend—, pero permite verificar en el navegador que el producto se comporta
 * correctamente cuando el servidor acota.
 */
const CLAVE_SESION_ROL = 'umg:demo-sesion';

/*
 * La sesión SOBREVIVE a la recarga.
 *
 * Al principio era una variable suelta en memoria, y eso rompía justo la
 * comprobación más importante: al escribir una URL directa el navegador
 * recarga, el módulo se reinicia, la sesión volvía a ser la del admin y
 * `/api/usuarios/yo` devolvía admin. Resultado: un evaluador que escribía
 * `/students` acababa entrando de verdad, no por un fallo del producto sino
 * porque el doble le había cambiado el rol por debajo.
 *
 * Se guarda solo el id en `sessionStorage` (por pestaña, se va al cerrarla),
 * que es lo que hace un servidor con una sesión de verdad.
 */
function leerSesion(): Usuario {
    try {
        const id = Number(sessionStorage.getItem(CLAVE_SESION_ROL));
        return USUARIOS.find((u) => u.id === id) ?? USUARIOS[0];
    } catch {
        return USUARIOS[0];
    }
}

function guardarSesion(u: Usuario): void {
    try {
        sessionStorage.setItem(CLAVE_SESION_ROL, String(u.id));
    } catch { /* almacenamiento no disponible: la sesión durará lo que la página */ }
}

let sesion: Usuario = leerSesion();

const esAdmin = () => sesion.rol === 'admin';

/** ¿La terna tiene asignado a este usuario? Identidad por id, nunca por nombre. */
const asignadoA = (t: TernaDetalle, uid: number) =>
    t.evaluadores.some((e) => (e.usuario_id ?? e.id) === uid);

/** Ternas que la sesión actual tiene derecho a ver. */
const ternasVisibles = () => (esAdmin() ? ternas : ternas.filter((t) => asignadoA(t, sesion.id)));

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

const soloAdmin = () => fail(403, 'Esta operación requiere privilegios de administrador.');
const noPerteneces = () => fail(403, 'No formas parte de esta terna.');

/**
 * Recalcula los campos DERIVADOS de una terna tras una escritura de evaluación.
 * Usa la misma función de resolución con la que se construyó el conjunto, para
 * que una terna evaluada en vivo y una del conjunto inicial sean indistinguibles.
 */
function recalcularTerna(t: TernaDetalle): void {
    const enviadas = t.evaluadores.filter((e) => e.eval_estado === 'enviada');
    const todas = enviadas.length === t.evaluadores.length;
    const promedio = enviadas.length
        ? Number((enviadas.reduce((a, e) => a + (e.calificacion ?? 0), 0) / enviadas.length).toFixed(2))
        : null;
    t.estado = enviadas.length === 0 ? 'pendiente' : todas ? 'completada' : 'en_progreso';
    t.evaluaciones_enviadas = enviadas.length;
    t.resultado = {
        promedio,
        resolucion: resolucionDe(promedio, todas),
        evaluaciones_enviadas: enviadas.length,
        total_evaluadores: t.evaluadores.length,
    };
}

const num = (v: string | null, alt: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : alt;
};

// ─── Derivados académicos (siempre desde los perfiles) ──────────────────────

/*
 * Las listas oficiales replican la pertenencia REAL del servidor, que no es la
 * regla estricta: incluye a quien no tiene ninguna nota reprobada aunque le
 * falte alguna por registrar. Ver `enListaAprobados` en demoDataset.ts para la
 * comprobación contra el servidor de producción. Quien no tiene ninguna nota
 * no aparece en ninguna de las dos listas, igual que en el servidor real.
 */
function listaTesis(quiere: 'aprobados' | 'reprobados') {
    const filas = estudiantes
        .map((e) => ({ e, p: PERFIL_POR_CARNET.get(e.carnet) }))
        .filter((x) => Boolean(x.p))
        .filter((x) => (quiere === 'aprobados' ? enListaAprobados(x.p!) : enListaReprobados(x.p!)))
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
        /*
         * El correo decide QUIÉN entra. Antes se ignoraba y siempre entraba el
         * admin, así que el workspace de evaluador no se podía ni abrir.
         *
         * La contraseña no se comprueba, y es deliberado: esto es un doble de
         * desarrollo, no un mecanismo de seguridad. Fingir una verificación
         * aquí daría la impresión de que hay autenticación real donde no la hay.
         */
        const dto = cuerpo as { email?: string };
        const correo = (dto?.email ?? '').trim().toLowerCase();
        const encontrado = USUARIOS.find((u) => u.email.toLowerCase() === correo);
        if (!encontrado) {
            return fail(401, 'Ese correo no pertenece al conjunto de demostración.');
        }
        sesion = encontrado;
        guardarSesion(sesion);
        return ok({
            accessToken: 'demo.access.token',
            refreshToken: 'demo.refresh.token',
            expiresIn: 3600,
            usuario: sesion,
        });
    }
    if (ruta === '/api/auth/refresh' && metodo === 'POST') {
        return ok({ accessToken: 'demo.access.token', expiresIn: 3600 });
    }
    if (ruta === '/api/auth/logout') {
        // Cerrar sesión en el doble también olvida quién era, como haría el servidor.
        try { sessionStorage.removeItem(CLAVE_SESION_ROL); } catch { /* nada que limpiar */ }
        sesion = USUARIOS[0];
        return ok({ mensaje: 'Sesión cerrada.' });
    }
    if (ruta === '/api/usuarios/yo') return ok({ usuario: sesion });

    // ── Usuarios ──
    if (ruta === '/api/usuarios' && metodo === 'GET') {
        if (!esAdmin()) return soloAdmin();   // el contrato lo marca «solo admin»
        const rol = q.get('rol');
        return ok({ usuarios: rol ? USUARIOS.filter((u) => u.rol === rol) : USUARIOS });
    }
    if (ruta === '/api/usuarios' && metodo === 'POST') {
        if (!esAdmin()) return soloAdmin();
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
        // Acotado por rol EN EL SERVIDOR (aquí, el doble), no filtrando en React.
        const filas = ternasVisibles().map(resumenTerna);
        return ok({ ternas: estado ? filas.filter((t) => t.estado === estado) : filas });
    }
    if (ruta === '/api/ternas' && metodo === 'POST') {
        if (!esAdmin()) return soloAdmin();
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
            if (!t) return fail(404, 'Terna no encontrada.');
            // 403 declarado por el contrato: «Evaluador no pertenece a esta terna».
            if (!esAdmin() && !asignadoA(t, sesion.id)) return noPerteneces();
            return ok({ terna: t });
        }
    }
    {
        const m = M(/^\/api\/ternas\/(\d+)\/evaluacion\/(borrador|enviar|reabrir)$/);
        if (m) {
            const t = ternas.find((x) => x.id === Number(m[1]));
            if (!t) return fail(404, 'Terna no encontrada.');
            const accion = m[2];

            /*
             * Antes esto respondía «ok» sin tocar nada: se podía enviar una
             * evaluación y la terna seguía exactamente igual, así que el flujo
             * completo —evaluar y ver el resultado— no se podía comprobar.
             *
             * Ahora la escritura se APLICA sobre la copia en memoria, como el
             * resto de escrituras del doble, y los campos derivados se
             * recalculan con la misma función que construyó el conjunto.
             */
            if (accion === 'reabrir') {
                if (!esAdmin()) return soloAdmin();
                const dto = cuerpo as { evaluadorId?: number };
                const fila = t.evaluadores.find((e) => (e.usuario_id ?? e.id) === Number(dto?.evaluadorId));
                if (!fila) return fail(404, 'Esa evaluación no existe en la terna.');
                fila.eval_estado = 'borrador';
            } else {
                if (!esAdmin() && !asignadoA(t, sesion.id)) return noPerteneces();
                const dto = cuerpo as { calificacion?: number; comentarios?: string | null };
                const fila = t.evaluadores.find((e) => (e.usuario_id ?? e.id) === sesion.id);
                if (!fila) return noPerteneces();
                if (dto?.calificacion != null) fila.calificacion = Number(dto.calificacion);
                if (dto?.comentarios !== undefined) fila.comentarios = dto.comentarios ?? null;
                if (accion === 'enviar') {
                    if (fila.calificacion == null) return fail(422, 'La calificación es obligatoria para enviar.');
                    fila.eval_estado = 'enviada';
                } else {
                    fila.eval_estado = 'borrador';
                }
            }

            recalcularTerna(t);
            return ok({ terna: t, mensaje: 'Evaluación registrada (conjunto de demostración: se pierde al recargar).' });
        }
    }

    // ── Reportes ──
    // «Reporte global de todas las ternas (solo admin)», según el contrato.
    if (ruta === '/api/reportes/ternas') {
        if (!esAdmin()) return soloAdmin();
        return ok({ reporte: reporteGlobal() });
    }
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
    // Se devuelve la forma EXACTA que declara /api-docs.json, con detalle por
    // estudiante, porque es la única manera de comprobar que la pantalla de
    // resultado dibuja lo que el servidor manda de verdad. Nada se persiste.
    {
        const m = M(/^\/api\/importar\/notas\/(.+)$/);
        if (m) {
            const codigo = decodeURIComponent(m[1]);
            const curso = CURSOS.find((c) => c.codigo === codigo);
            // Una muestra del padrón, más DOS carnés que no existen: el caso que
            // de verdad importa comprobar es el del acta con gente sin registrar.
            const muestra = estudiantes.slice(0, 9);
            const detalle = muestra.map((e, i) => {
                const p = PERFIL_POR_CARNET.get(e.carnet);
                const nota = (codigo === '049' ? p?.pg2 : p?.pg1) ?? 78;
                return {
                    carnet: e.carnet,
                    nombre: e.nombre,
                    nota_final: nota,
                    estado: nota >= NOTA_MINIMA ? 'APROBADO' : nota === 0 ? 'NSP' : 'REPROBADO',
                    resultado: i % 3 === 0 ? 'INSERTADO' : 'ACTUALIZADO',
                };
            });
            const fantasmas = [
                { carnet: '1890-19-40771', nombre: 'MARIO ALBERTO CUC POP',      nota_final: 81, estado: 'APROBADO',  resultado: 'NO_ENCONTRADO' },
                { carnet: '1890-20-40993', nombre: 'GLORIA ESPERANZA IXCOT BOJ', nota_final: 66, estado: 'REPROBADO', resultado: 'NO_ENCONTRADO' },
            ];
            const filas = [...detalle, ...fantasmas];
            return ok({
                curso: codigo,
                ciclo: curso?.ciclo ?? 'Ciclo 1-2025',
                fecha_acta: '07/06/2025',
                totales: {
                    en_pdf: filas.length,
                    procesados: detalle.length,
                    no_encontrados: fantasmas.length,
                },
                // El reparto por estado cuenta lo REGISTRADO, no lo leído: si
                // sumara también los carnés que no existen en el padrón, el
                // desglose daría once y las registradas nueve, y la pantalla se
                // contradiría a sí misma.
                estados: {
                    aprobados:  detalle.filter((f) => f.estado === 'APROBADO').length,
                    reprobados: detalle.filter((f) => f.estado === 'REPROBADO').length,
                    nsp:        detalle.filter((f) => f.estado === 'NSP').length,
                },
                operaciones: {
                    insertados:   detalle.filter((f) => f.resultado === 'INSERTADO').length,
                    actualizados: detalle.filter((f) => f.resultado === 'ACTUALIZADO').length,
                },
                detalle: filas,
            });
        }
    }
    if (ruta === '/api/importar/estudiantes') {
        return ok({
            curso: '043',
            total_en_archivo: 12,
            estudiantes: { insertados: 9, actualizados: 2, total_procesados: 11 },
            inscripciones_nuevas: 9,
            filas_invalidas: 1,
            detalle_invalidos: [{ fila: 7, carnet: '', error: 'Carné vacío' }],
        });
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

    banda.append(titulo, texto, cuentasDemo());
    document.body.appendChild(banda);
}

/**
 * Selector de cuentas del conjunto.
 *
 * Ahora que el correo decide el rol de la sesión, hace falta saber qué correos
 * existen: sin esto habría que abrir `demoDataset.ts` para poder entrar como
 * evaluador, y comprobar «evaluador A ≠ evaluador B» sería incomodísimo.
 *
 * Al pulsar una cuenta rellena el formulario de acceso. Los campos son inputs
 * controlados por React, así que no basta con asignar `.value`: hay que usar el
 * setter nativo del prototipo y despachar un evento `input` para que React se
 * entere del cambio. Es la técnica estándar para gobernar un input controlado
 * desde fuera de React, y aquí es aceptable porque esto es una herramienta de
 * desarrollo que nunca viaja a producción.
 */
function cuentasDemo(): HTMLElement {
    const caja = document.createElement('details');
    caja.className = 'demo-cuentas';

    const resumen = document.createElement('summary');
    resumen.textContent = 'Cuentas';
    caja.appendChild(resumen);

    const lista = document.createElement('div');
    lista.className = 'demo-cuentas__lista';

    for (const u of USUARIOS) {
        const fila = document.createElement('button');
        fila.type = 'button';
        fila.className = 'demo-cuentas__item';
        fila.innerHTML = '';

        const nombre = document.createElement('span');
        nombre.className = 'demo-cuentas__nombre';
        nombre.textContent = u.nombre;

        const meta = document.createElement('span');
        meta.className = 'demo-cuentas__meta';
        meta.textContent = `${u.rol} · ${u.email}`;

        fila.append(nombre, meta);
        fila.addEventListener('click', () => rellenarAcceso(u.email));
        lista.appendChild(fila);
    }

    caja.appendChild(lista);
    return caja;
}

/** Escribe el correo en el formulario de acceso respetando el estado de React. */
function rellenarAcceso(email: string): void {
    const asignar = (sel: string, valor: string) => {
        /*
         * El campo es un `<ion-input>`: el id vive en el componente y el
         * `<input>` de verdad está dentro (en el DOM claro, sin shadow root).
         * Asignar sobre el componente no habría hecho nada.
         */
        const host = document.querySelector(sel);
        const el = host instanceof HTMLInputElement ? host : host?.querySelector('input');
        if (!el) return;
        const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value',
        )?.set;
        setter?.call(el, valor);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    asignar('#email', email);
    // La contraseña no se comprueba en el doble; se rellena para poder enviar.
    asignar('#password', 'demo');
}
