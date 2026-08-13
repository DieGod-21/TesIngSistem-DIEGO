/**
 * demoDataset.ts — Datos de DESARROLLO. Nunca de producción.
 *
 * Por qué existe
 * ──────────────
 * Evaluar el producto contra un servidor vacío o con tres filas esconde
 * justo lo que hay que ver: qué pasa con un título de veinte palabras, con
 * un alumno sin correo, con una terna a medio evaluar o con alguien que se
 * queda a un punto del mínimo. Este conjunto existe para poder MIRAR el
 * sistema lleno, no para simular funcionalidad que el API no tenga.
 *
 * Cómo se garantiza que no se cuele en producción
 * ───────────────────────────────────────────────
 *   1. Vive bajo `src/dev/` y solo lo importa `installDemoApi`.
 *   2. `installDemoApi` no hace nada si `import.meta.env.DEV` es falso, así
 *      que el empaquetador lo elimina del bundle de producción.
 *   3. Hay que pedirlo explícitamente (`?demo=1` o `VITE_DEMO_DATA=1`).
 *   4. Mientras está activo, la interfaz lo anuncia con una banda visible.
 *
 * Regla de coherencia
 * ───────────────────
 * `PERFILES` es la ÚNICA fuente de verdad académica. Notas, listas oficiales
 * de aprobados y reprobados, resumen y estado por carné se DERIVAN de ella.
 * No hay una segunda tabla que pueda contradecirla, porque un conjunto de
 * pruebas incoherente hace perder más tiempo del que ahorra: la pantalla
 * acaba discrepando consigo misma y no se sabe si el fallo es del dato o del
 * producto.
 *
 * El formato de carné (`1890-17-15352`) y el código de carrera (`1890`) se
 * copian de lo que devuelve el API real, no se inventan.
 */

import type {
    Curso, Estudiante, Nota, Proyecto, TernaDetalle, TernaResumen, Usuario,
} from '../types/api';

export const NOTA_MINIMA = 70;
export const CARRERA = '1890';

// ─── Cursos (copiados del catálogo real) ────────────────────────────────────

export const CURSOS: Curso[] = [
    { id: 1, codigo: '043', nombre: 'PROYECTO DE GRADUACIÓN I',  ciclo: 'Ciclo 1-2025', seccion: 'A', anio: 2025 },
    { id: 2, codigo: '049', nombre: 'PROYECTO DE GRADUACIÓN II', ciclo: 'Ciclo 2-2025', seccion: 'A', anio: 2025 },
];

// ─── Personas ───────────────────────────────────────────────────────────────

interface Semilla {
    nombre: string;
    /** Nota de PG1. `null` = NO REGISTRADA, que no es lo mismo que cero. */
    pg1: number | null;
    pg2: number | null;
    /** Caso excepcional que este registro representa. Solo documentación. */
    caso: string;
    activo?: boolean;
    sinEmail?: boolean;
}

const PERFILES: Semilla[] = [
    { nombre: 'MARÍA JOSÉ RAMÍREZ COY',            pg1: 86,   pg2: 83,   caso: 'elegible' },
    { nombre: 'CARLOS EDUARDO XICARÁ LÓPEZ',       pg1: 91,   pg2: 88,   caso: 'elegible, terna completada' },
    { nombre: 'ANA LUCÍA MORALES PÉREZ',           pg1: 78,   pg2: 74,   caso: 'elegible, terna en progreso' },
    { nombre: 'JOSÉ ANTONIO CHÁVEZ RODAS',         pg1: 88,   pg2: null, caso: 'PG2 pendiente' },
    { nombre: 'DIANA SOFÍA TZOC BATZ',             pg1: null, pg2: 79,   caso: 'PG1 pendiente' },
    { nombre: 'LUIS FERNANDO AGUILAR SAY',         pg1: null, pg2: null, caso: 'sin ninguna nota' },
    { nombre: 'MARÍA DE LOS ÁNGELES XITUMUL CHOCOJAY DE RODRÍGUEZ GUZMÁN',
                                                   pg1: 84,   pg2: 90,   caso: 'nombre larguísimo' },
    { nombre: 'ANA COC',                           pg1: 77,   pg2: 81,   caso: 'nombre muy corto' },
    { nombre: 'KEVIN ESTUARDO MONZÓN ICAL',        pg1: 64,   pg2: 58,   caso: 'insuficiente en ambas' },
    { nombre: 'SILVIA MARISOL CABRERA TUY',        pg1: 70,   pg2: 70,   caso: 'BORDE: justo en el mínimo' },
    { nombre: 'BYRON ALEXANDER GIRÓN PUAC',        pg1: 69,   pg2: 92,   caso: 'BORDE: reprobado por un punto' },
    { nombre: 'JENNIFER PAOLA ESTRADA QUIEJ',      pg1: 100,  pg2: 0,    caso: 'BORDE: extremos de la escala' },
    { nombre: 'MARVIN JOSUÉ HERNÁNDEZ CHUC',       pg1: 82,   pg2: 81,   caso: 'sin correo registrado', sinEmail: true },
    { nombre: 'WENDY CAROLINA ALVARADO SIC',       pg1: 75,   pg2: 73,   caso: 'expediente inactivo', activo: false },
    { nombre: 'EDGAR LEONEL CASTAÑEDA YAX',        pg1: 93,   pg2: 87,   caso: 'elegible, terna pendiente' },
    { nombre: 'KARLA FERNANDA SOLÍS BAL',          pg1: 80,   pg2: 85,   caso: 'elegible con proyecto sin descripción' },
    { nombre: 'HÉCTOR MANUEL ORDÓÑEZ TUM',         pg1: 72,   pg2: null, caso: 'PG2 pendiente, con proyecto' },
    { nombre: 'ASTRID YOHANA REYES CANEL',         pg1: 89,   pg2: 94,   caso: 'elegible, título larguísimo' },
    { nombre: 'PABLO ANDRÉS VILLAGRÁN SET',        pg1: 68,   pg2: 71,   caso: 'PG1 insuficiente' },
    { nombre: 'LUCÍA ESMERALDA GÓMEZ TZUL',        pg1: 85,   pg2: 66,   caso: 'PG2 insuficiente' },
    { nombre: 'RODRIGO IGNACIO SALAZAR CHAN',      pg1: 90,   pg2: 79,   caso: 'elegible sin proyecto' },
    { nombre: 'MELISSA ROCÍO FUENTES POZ',         pg1: null, pg2: null, caso: 'recién inscrita' },
    { nombre: 'JORGE MARIO RECINOS AJANEL',        pg1: 76,   pg2: 88,   caso: 'elegible, terna con dos evaluadores' },
    { nombre: 'CLAUDIA BEATRIZ HERRERA MUX',       pg1: 83,   pg2: 92,   caso: 'elegible' },
    { nombre: 'FERNANDO JAVIER RUANO TOJ',         pg1: 61,   pg2: 55,   caso: 'insuficiente en ambas' },
    { nombre: 'NANCY ELIZABETH PACAY COC',         pg1: 87,   pg2: null, caso: 'PG2 pendiente' },
    { nombre: 'ÓSCAR RENÉ SUCHITE MEJÍA',          pg1: 74,   pg2: 77,   caso: 'elegible' },
];

const correo = (nombre: string, i: number): string => {
    const partes = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ');
    const inicial = partes[0]?.[0] ?? 'x';
    const apellido = partes[2] ?? partes[1] ?? 'umg';
    return `${inicial}${apellido}${i}@miumg.edu.gt`;
};

export const ESTUDIANTES: Estudiante[] = PERFILES.map((p, i) => ({
    id: i + 1,
    carnet: `${CARRERA}-${17 + (i % 6)}-${String(11000 + i * 431).padStart(5, '0')}`,
    nombre: p.nombre,
    email: p.sinEmail ? '' : correo(p.nombre, i + 1),
    carrera: CARRERA,
    activo: p.activo !== false,
    created_at: `2025-0${(i % 8) + 1}-1${i % 9}T09:00:00.000Z`,
}));

const perfilDe = (carnet: string): Semilla | undefined => {
    const idx = ESTUDIANTES.findIndex((e) => e.carnet === carnet);
    return idx >= 0 ? PERFILES[idx] : undefined;
};

// ─── Notas, derivadas de los perfiles ───────────────────────────────────────

const estadoDe = (n: number): Nota['estado'] => (n >= NOTA_MINIMA ? 'APROBADO' : 'REPROBADO');

export function notasDe(carnet: string): Nota[] {
    const p = perfilDe(carnet);
    if (!p) return [];
    const idx = ESTUDIANTES.findIndex((e) => e.carnet === carnet);
    const out: Nota[] = [];
    if (p.pg1 != null) {
        out.push({
            id: idx * 2 + 1,
            nota_final: p.pg1,
            estado: estadoDe(p.pg1),
            observacion: null,
            curso_codigo: '043',
            curso_nombre: CURSOS[0].nombre,
            ciclo: CURSOS[0].ciclo,
            seccion: 'A',
            anio: 2025,
            updated_at: `2025-06-${String(10 + (idx % 18)).padStart(2, '0')}T15:20:00.000Z`,
        });
    }
    if (p.pg2 != null) {
        out.push({
            id: idx * 2 + 2,
            nota_final: p.pg2,
            estado: estadoDe(p.pg2),
            observacion: p.pg2 === 0 ? 'No se presentó a la defensa.' : null,
            curso_codigo: '049',
            curso_nombre: CURSOS[1].nombre,
            ciclo: CURSOS[1].ciclo,
            seccion: 'A',
            anio: 2025,
            updated_at: `2025-11-${String(3 + (idx % 22)).padStart(2, '0')}T11:05:00.000Z`,
        });
    }
    return out;
}

/**
 * `true` solo si AMBAS notas existen y alcanzan el mínimo.
 *
 * Es la regla ESTRICTA, la que aplica el servidor real en
 * `GET /api/tesis/estado/{carnet}` y la que el producto muestra en el
 * expediente individual.
 */
export const apruebaTesis = (p: Semilla): boolean =>
    p.pg1 != null && p.pg2 != null && p.pg1 >= NOTA_MINIMA && p.pg2 >= NOTA_MINIMA;

/** Le faltan notas: ni aprueba ni reprueba todavía. */
export const faltanNotas = (p: Semilla): boolean => p.pg1 == null || p.pg2 == null;

/**
 * Pertenencia a la LISTA de aprobados, que en el servidor real NO coincide con
 * la regla estricta de arriba.
 *
 * Comprobado el 13/08/2026 contra https://notas.digicom.com.gt:
 *
 *   GET /api/tesis/aprobados        → 30 estudiantes, 5 de ellos con
 *                                     "nota_grad1": null y "aprueba_tesis": true
 *   GET /api/tesis/estado/1890-18-20913
 *                                   → "aprueba_tesis": false,
 *                                     "razon": "No tiene nota en Proyecto de
 *                                              Graduación I (043)"
 *
 * El mismo servidor da veredictos opuestos sobre la misma persona según a qué
 * endpoint se le pregunte. La lista, en la práctica, incluye a quien no tiene
 * NINGUNA nota por debajo del mínimo, aunque le falte alguna por registrar.
 *
 * Esto se REPRODUCE aquí a propósito, no se inventa: el conjunto de desarrollo
 * existe para mirar el producto en las condiciones reales, y una de esas
 * condiciones es que el backend se contradice. Sin esto, `auditarElegibilidad`
 * no tendría nada que detectar en demo y el aviso del panel sería imposible de
 * ver salvo contra el servidor de producción.
 *
 * Sigue habiendo UNA sola fuente de verdad: ambas reglas se derivan de
 * `PERFILES`. Lo que hay son dos lecturas distintas del mismo dato, que es
 * exactamente lo que ocurre en el servidor.
 */
export const enListaAprobados = (p: Semilla): boolean => {
    const notas = [p.pg1, p.pg2].filter((n): n is number => n != null);
    return notas.length > 0 && notas.every((n) => n >= NOTA_MINIMA);
};

/** Pertenencia a la LISTA de reprobados: alguna nota registrada no alcanza. */
export const enListaReprobados = (p: Semilla): boolean =>
    [p.pg1, p.pg2].some((n) => n != null && n < NOTA_MINIMA);

export function razonDe(p: Semilla): string {
    if (faltanNotas(p)) return 'Faltan notas de PG1 y/o PG2.';
    if (apruebaTesis(p)) return `Cumple con la nota mínima (${NOTA_MINIMA}) en PG1 y PG2.`;
    return `No alcanza la nota mínima (${NOTA_MINIMA}) en PG1 y/o PG2.`;
}

export function promedioDe(p: Semilla): number | null {
    if (p.pg1 == null || p.pg2 == null) return null;
    return Number(((p.pg1 + p.pg2) / 2).toFixed(2));
}

export const PERFIL_POR_CARNET = new Map<string, Semilla>(
    ESTUDIANTES.map((e, i) => [e.carnet, PERFILES[i]]),
);

// ─── Proyectos ──────────────────────────────────────────────────────────────
// No todos tienen: «sin proyecto» es un estado real del sistema y la interfaz
// tiene que saber dibujarlo. Los índices apuntan a ESTUDIANTES.

interface SemillaProyecto {
    idx: number;
    titulo: string;
    descripcion: string | null;
    fase: 'PG1' | 'PG2';
}

const PROYECTOS_SEMILLA: SemillaProyecto[] = [
    { idx: 0,  fase: 'PG2', titulo: 'Sistema web de control de inventarios para farmacias comunitarias',
      descripcion: 'Plataforma de registro de existencias y alertas de vencimiento dirigida a farmacias del área rural de Alta Verapaz.' },
    { idx: 1,  fase: 'PG2', titulo: 'Aplicación móvil de trazabilidad para cooperativas de café',
      descripcion: 'Registro del recorrido del grano desde la finca hasta el punto de exportación, con lectura de códigos QR en cada traslado.' },
    { idx: 2,  fase: 'PG2', titulo: 'Portal de citas médicas para clínicas municipales',
      descripcion: 'Agenda compartida entre clínicas de un mismo municipio, con recordatorios por mensajería.' },
    { idx: 6,  fase: 'PG2', titulo: 'Plataforma de gestión documental para juzgados de paz',
      descripcion: 'Digitalización y consulta de expedientes con control de versiones y bitácora de accesos.' },
    { idx: 7,  fase: 'PG1', titulo: 'Sistema de riego automatizado con sensores de humedad',
      descripcion: 'Prototipo de riego por goteo gobernado por lecturas de humedad del suelo.' },
    // Proyecto SIN descripción: la interfaz debe nombrar la ausencia, no dejar hueco.
    { idx: 15, fase: 'PG2', titulo: 'Herramienta de análisis de deserción escolar', descripcion: null },
    { idx: 16, fase: 'PG1', titulo: 'Aplicación de reservas para canchas deportivas municipales',
      descripcion: 'Reserva de horarios y cobro en línea para instalaciones deportivas de gestión municipal.' },
    // Título larguísimo: la tarjeta y el panel tienen que aguantarlo.
    { idx: 17, fase: 'PG2',
      titulo: 'Diseño e implementación de un sistema integral de gestión académica y administrativa para centros educativos del nivel medio con soporte para operación sin conexión permanente a internet',
      descripcion: 'Propuesta de sistema con sincronización diferida pensado para centros educativos con conectividad intermitente, incluyendo control de notas, asistencia y comunicación con padres de familia.' },
    { idx: 22, fase: 'PG2', titulo: 'Sistema de seguimiento de egresados de ingeniería',
      descripcion: 'Encuestas periódicas y tablero de indicadores de inserción laboral.' },
    { idx: 23, fase: 'PG2', titulo: 'Plataforma de préstamo de equipo de laboratorio',
      descripcion: 'Control de préstamos, devoluciones y mantenimiento de equipo de laboratorio universitario.' },
    { idx: 19, fase: 'PG1', titulo: 'Registro digital de visitas domiciliares de trabajo social',
      descripcion: 'Formularios en campo con captura de evidencia fotográfica y sincronización posterior.' },
];

export const PROYECTOS: Proyecto[] = PROYECTOS_SEMILLA.map((p, i) => ({
    id: i + 1,
    titulo: p.titulo,
    descripcion: p.descripcion,
    fase: p.fase,
    estudiante_id: ESTUDIANTES[p.idx].id,
    estudiante_nombre: ESTUDIANTES[p.idx].nombre,
    carnet: ESTUDIANTES[p.idx].carnet,
}));

// ─── Usuarios ───────────────────────────────────────────────────────────────

export const USUARIOS: Usuario[] = [
    { id: 1, nombre: 'Coordinación de Graduación', email: 'coordinacion@miumg.edu.gt', rol: 'admin' },
    { id: 2, nombre: 'Ing. Roberto Méndez Salguero', email: 'rmendez@miumg.edu.gt',    rol: 'evaluador' },
    { id: 3, nombre: 'Inga. Patricia Alvarado Ruiz', email: 'palvarado@miumg.edu.gt',  rol: 'evaluador' },
    { id: 4, nombre: 'Ing. Marco Tulio Guzmán',      email: 'mguzman@miumg.edu.gt',    rol: 'evaluador' },
    { id: 5, nombre: 'Inga. Sandra López Rivera',    email: 'slopez@miumg.edu.gt',    rol: 'evaluador' },
    { id: 6, nombre: 'Ing. Julio César Batres Paz',  email: 'jbatres@miumg.edu.gt',    rol: 'evaluador' },
];

// ─── Ternas ─────────────────────────────────────────────────────────────────
// Cubren los tres estados y los dos tamaños de panel que el contrato admite.

interface SemillaTerna {
    numero: number;
    proyectoIdx: number;               // índice en PROYECTOS
    evaluadores: Array<{ usuarioId: number; nota: number | null; enviada: boolean; comentario?: string }>;
    fecha?: string;
}

const TERNAS_SEMILLA: SemillaTerna[] = [
    {
        numero: 1, proyectoIdx: 1, fecha: '2025-11-14',
        evaluadores: [
            { usuarioId: 2, nota: 88, enviada: true, comentario: 'Trabajo sólido; la validación de campo está bien documentada.' },
            { usuarioId: 3, nota: 91, enviada: true, comentario: 'Excelente presentación de resultados.' },
            { usuarioId: 4, nota: 86, enviada: true },
        ],
    },
    {
        numero: 2, proyectoIdx: 2, fecha: '2025-11-21',
        evaluadores: [
            { usuarioId: 2, nota: 79, enviada: true },
            { usuarioId: 5, nota: null, enviada: false },
            { usuarioId: 6, nota: 74, enviada: true, comentario: 'Falta profundizar en el análisis de riesgos.' },
        ],
    },
    {
        numero: 3, proyectoIdx: 7, fecha: '2025-12-03',
        evaluadores: [
            { usuarioId: 3, nota: null, enviada: false },
            { usuarioId: 4, nota: null, enviada: false },
            { usuarioId: 6, nota: null, enviada: false },
        ],
    },
    {
        // Panel de DOS evaluadores: el contrato admite de 2 a 3.
        numero: 4, proyectoIdx: 8,
        evaluadores: [
            { usuarioId: 2, nota: 68, enviada: true, comentario: 'El alcance propuesto no se sostiene con la evidencia presentada.' },
            { usuarioId: 5, nota: 64, enviada: true },
        ],
    },
    {
        numero: 5, proyectoIdx: 0, fecha: '2025-11-28',
        evaluadores: [
            { usuarioId: 4, nota: 84, enviada: true },
            { usuarioId: 5, nota: 82, enviada: true },
            { usuarioId: 6, nota: null, enviada: false },
        ],
    },
];

const nombreUsuario = (id: number) => USUARIOS.find((u) => u.id === id)?.nombre ?? 'Evaluador';

function resolucionDe(promedio: number | null, todasEnviadas: boolean) {
    if (!todasEnviadas || promedio == null) return 'pendiente' as const;
    if (promedio >= 80) return 'aprueba_tesis' as const;
    if (promedio >= NOTA_MINIMA) return 'aprueba_curso' as const;
    return 'reprobado' as const;
}

export const TERNAS: TernaDetalle[] = TERNAS_SEMILLA.map((t, i) => {
    const proyecto = PROYECTOS[t.proyectoIdx];
    const enviadas = t.evaluadores.filter((e) => e.enviada);
    const todas = enviadas.length === t.evaluadores.length;
    const promedio = enviadas.length
        ? Number((enviadas.reduce((a, e) => a + (e.nota ?? 0), 0) / enviadas.length).toFixed(2))
        : null;
    const estado = enviadas.length === 0
        ? 'pendiente' as const
        : todas ? 'completada' as const : 'en_progreso' as const;

    return {
        id: i + 1,
        numero: t.numero,
        estado,
        titulo: proyecto.titulo,
        estudiante_nombre: proyecto.estudiante_nombre ?? '',
        carnet: proyecto.carnet ?? '',
        fase: proyecto.fase,
        fecha_evaluacion: t.fecha ?? null,
        total_evaluadores: t.evaluadores.length,
        evaluaciones_enviadas: enviadas.length,
        evaluadores: t.evaluadores.map((e) => ({
            usuario_id: e.usuarioId,
            nombre: nombreUsuario(e.usuarioId),
            calificacion: e.nota,
            comentarios: e.comentario ?? null,
            eval_estado: e.enviada ? 'enviada' : 'borrador',
        })),
        resultado: {
            promedio,
            resolucion: resolucionDe(promedio, todas),
            evaluaciones_enviadas: enviadas.length,
            total_evaluadores: t.evaluadores.length,
        },
    };
});

export const resumenTerna = (t: TernaDetalle): TernaResumen => ({
    id: t.id,
    numero: t.numero,
    estado: t.estado,
    titulo: t.titulo,
    estudiante_nombre: t.estudiante_nombre,
    carnet: t.carnet,
    fase: t.fase,
    fecha_evaluacion: t.fecha_evaluacion,
    total_evaluadores: t.total_evaluadores,
    evaluaciones_enviadas: t.evaluaciones_enviadas,
});
