/**
 * apiConfig.ts
 *
 * Contrato centralizado entre el frontend y el API externo.
 *
 * CUANDO LLEGUE EL NUEVO API: solo modifica este archivo.
 * Los servicios y componentes NO deben cambiar.
 *
 * Convención de nombres de secciones:
 *   AUTH   → campos del endpoint de login / claims del JWT
 *   PATHS  → rutas de endpoints (si cambian de /auth/login a /api/v2/login, etc.)
 */

// ─── Auth ─────────────────────────────────────────────────────────────────

/**
 * Campos que el API espera en el body de POST /auth/login.
 * Si el nuevo API usa "email" / "password", cambia aquí.
 */
export const AUTH_REQUEST_FIELDS = {
  email:    'correo_electronico',
  password: 'contrasena',
} as const;

/**
 * Claims del JWT que el frontend necesita leer.
 * Si el nuevo JWT usa "sub" en lugar de "user_id", cambia aquí.
 */
export const JWT_CLAIMS = {
  userId: 'user_id',
  name:   'nombre',
  roles:  'roles',
  exp:    'exp',
} as const;

/**
 * Campo de la respuesta de login que contiene el token.
 * Si el API devuelve { access_token: "..." } en lugar de { token: "..." }, cambia aquí.
 */
export const AUTH_TOKEN_RESPONSE_FIELD = 'token' as const;

// ─── Endpoints ────────────────────────────────────────────────────────────

/**
 * Rutas de la API. Cambiar aquí si el nuevo backend tiene versioning u otras rutas.
 */
export const API_PATHS = {
  auth: {
    login: '/auth/login',
  },
  students: {
    list:     '/students',
    bulk:     '/students/bulk',
    template: '/students/template',
    byId:     (id: string) => `/students/${id}`,
  },
  semesters:      '/semesters',
  academicPhases: {
    active: '/academic-phases',
    admin:  '/academic-phases/admin',
    byId:   (id: number) => `/academic-phases/${id}`,
    toggle: (id: number) => `/academic-phases/${id}/toggle`,
  },
  dashboard: {
    summary:        '/dashboard/summary',
    recentStudents: '/dashboard/recent-students',
  },
  events: {
    list:  '/events',
    byId:  (id: string) => `/events/${id}`,
  },
  deadlines: {
    list:  '/deadlines',
    byId:  (id: string) => `/deadlines/${id}`,
  },
  notifications: {
    list:       '/notifications',
    unreadCount:'/notifications/unread-count',
    markRead:   (id: string) => `/notifications/${id}/read`,
    markAllRead:'/notifications/read-all',
  },
  uploads: {
    list:  '/uploads',
    byId:  (id: string) => `/uploads/${id}`,
  },
  evaluations: {
    panels:            '/evaluation/panels',
    panelById:         (id: string) => `/evaluation/panels/${id}`,
    studentByPanel:    (panelId: string) => `/evaluation/panels/${panelId}/student`,
    criteria:          '/evaluation/criteria',
    evaluatorsByPanel: (panelId: string) => `/evaluation/panels/${panelId}/evaluators`,
    submit:            (panelId: string) => `/evaluation/panels/${panelId}/submit`,
    draft:             (panelId: string) => `/evaluation/panels/${panelId}/draft`,
  },
} as const;
