/**
 * apiConfig.ts
 *
 * Contrato centralizado entre el frontend y el API Control de Notas (UMG).
 * Sólo contiene endpoints REALES expuestos por https://notas.digicom.com.gt
 * (verificados contra Swagger). Si el backend agrega rutas nuevas, este
 * es el único archivo a modificar.
 */

// ─── Endpoints reales (Control de Notas) ──────────────────────────────────

export const API_PATHS = {
    usuarios: {
        me:    '/api/usuarios/yo',
        list:  '/api/usuarios',
        byId:  (id: number) => `/api/usuarios/${id}`,
    },
    estudiantes: {
        list:       '/api/estudiantes',
        byId:       (id: number | string) => `/api/estudiantes/${id}`,
        byCarnet:   (carnet: string) => `/api/estudiantes/carnet/${encodeURIComponent(carnet)}`,
        search:     '/api/estudiantes/buscar',
    },
    cursos: {
        list:     '/api/cursos',
        byCodigo: (codigo: string) => `/api/cursos/${codigo}`,
    },
    notas: {
        upsert:        '/api/notas',
        byEstudiante:  (id: number | string) => `/api/notas/estudiante/${id}`,
        byCarnet:      (carnet: string) => `/api/notas/carnet/${encodeURIComponent(carnet)}`,
        byCurso:       (codigo: string) => `/api/notas/curso/${codigo}`,
    },
    tesis: {
        resumen:    '/api/tesis/resumen',
        aprobados:  '/api/tesis/aprobados',
        reprobados: '/api/tesis/reprobados',
        byCarnet:   (carnet: string) => `/api/tesis/estado/${encodeURIComponent(carnet)}`,
    },
    proyectos: {
        list:           '/api/proyectos',
        byId:           (id: number) => `/api/proyectos/${id}`,
        byEstudiante:   (estudianteId: number) => `/api/proyectos/estudiante/${estudianteId}`,
    },
    ternas: {
        list:               '/api/ternas',
        byId:               (id: number) => `/api/ternas/${id}`,
        addEvaluador:       (id: number) => `/api/ternas/${id}/evaluadores`,
        removeEvaluador:    (id: number, usuarioId: number) => `/api/ternas/${id}/evaluadores/${usuarioId}`,
        draft:              (id: number) => `/api/ternas/${id}/evaluacion/borrador`,
        submit:             (id: number) => `/api/ternas/${id}/evaluacion/enviar`,
        reopen:             (id: number) => `/api/ternas/${id}/evaluacion/reabrir`,
    },
    reportes: {
        ternas:      '/api/reportes/ternas',
        ternaById:   (id: number) => `/api/reportes/ternas/${id}`,
        estudiante:  (carnet: string) => `/api/reportes/estudiante/${encodeURIComponent(carnet)}`,
    },
    importar: {
        estudiantes:  '/api/importar/estudiantes',
        notas:        (cursoCodigo: string) => `/api/importar/notas/${cursoCodigo}`,
    },
    health: '/health',
} as const;

// ─── Constantes del dominio de tesis ──────────────────────────────────────

export const COURSE_CODES = {
    PG1: '043',
    PG2: '049',
} as const;

/** Nota mínima requerida en cada curso para aprobar la tesis. */
export const THESIS_MIN_GRADE = 70;
