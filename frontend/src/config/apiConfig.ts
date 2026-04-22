/**
 * apiConfig.ts
 *
 * Contrato centralizado entre el frontend y el API Control de Notas (UMG).
 * Si el backend cambia rutas, este es el único archivo a modificar.
 *
 * Las secciones bajo `legacy:` apuntan a endpoints inexistentes en el API real
 * (eran del prototipo anterior). Se mantienen sólo para no romper la
 * compilación de servicios antiguos. NO las uses en código nuevo.
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
    health: '/health',

    // ─── Legacy (no existen en el API real, sólo evitan que rompa el build) ─
    auth: { login: '/auth/login' },
    students: {
        list:     '/api/estudiantes',
        bulk:     '/api/estudiantes/bulk',
        template: '/api/estudiantes/template',
        byId:     (id: string) => `/api/estudiantes/${id}`,
    },
    semesters: '/api/semesters',
    academicPhases: {
        active: '/api/academic-phases',
        admin:  '/api/academic-phases/admin',
        byId:   (id: number) => `/api/academic-phases/${id}`,
        toggle: (id: number) => `/api/academic-phases/${id}/toggle`,
    },
    dashboard: {
        summary:        '/api/dashboard/summary',
        recentStudents: '/api/dashboard/recent-students',
    },
    events: {
        list:  '/api/events',
        byId:  (id: string) => `/api/events/${id}`,
    },
    deadlines: {
        list:  '/api/deadlines',
        byId:  (id: string) => `/api/deadlines/${id}`,
    },
    notifications: {
        list:        '/api/notifications',
        unreadCount: '/api/notifications/unread-count',
        markRead:    (id: string) => `/api/notifications/${id}/read`,
        markAllRead: '/api/notifications/read-all',
    },
    uploads: {
        list:  '/api/uploads',
        byId:  (id: string) => `/api/uploads/${id}`,
    },
    evaluations: {
        panels:            '/api/evaluation/panels',
        panelById:         (id: string) => `/api/evaluation/panels/${id}`,
        studentByPanel:    (panelId: string) => `/api/evaluation/panels/${panelId}/student`,
        criteria:          '/api/evaluation/criteria',
        evaluatorsByPanel: (panelId: string) => `/api/evaluation/panels/${panelId}/evaluators`,
        submit:            (panelId: string) => `/api/evaluation/panels/${panelId}/submit`,
        draft:             (panelId: string) => `/api/evaluation/panels/${panelId}/draft`,
    },
} as const;

// ─── Auth (legacy compat — el API real no usa JWT) ────────────────────────

export const AUTH_REQUEST_FIELDS = {
    email:    'correo_electronico',
    password: 'contrasena',
} as const;

export const JWT_CLAIMS = {
    userId: 'user_id',
    name:   'nombre',
    roles:  'roles',
    exp:    'exp',
} as const;

export const AUTH_TOKEN_RESPONSE_FIELD = 'token' as const;

// ─── Constantes del dominio de tesis ──────────────────────────────────────

export const COURSE_CODES = {
    PG1: '043',
    PG2: '049',
} as const;

/** Nota mínima requerida en cada curso para aprobar la tesis. */
export const THESIS_MIN_GRADE = 70;
