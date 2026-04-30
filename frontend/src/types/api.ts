/**
 * Tipos del dominio Control de Notas (UMG).
 * Reflejan los schemas reales del API en https://notas.digicom.com.gt/api-docs.
 */

export interface Estudiante {
    id: number;
    carnet: string;
    nombre: string;
    email: string;
    carrera: string;
    activo: boolean;
    created_at?: string;
}

export type EstadoNota = 'APROBADO' | 'REPROBADO' | 'NSP';

export interface Nota {
    id: number;
    /** El backend a veces devuelve string ("100.00"); usar `Number(n.nota_final)` o `toNumber`. */
    nota_final: number | string;
    estado: EstadoNota;
    observacion: string | null;
    curso_codigo: string;     // '043' | '049'
    curso_nombre: string;
    ciclo: string;
    seccion?: string;
    anio?: number;
    updated_at?: string;
}

export interface NotasEstudianteResponse {
    estudiante: Estudiante;
    notas: Nota[];
    total?: number;
}

export interface CursoNotaResumen {
    nota_final: number;
    estado: EstadoNota;
    curso: string;
    ciclo: string;
}

export interface EstadoTesis {
    carnet: string;
    nombre: string;
    email?: string;
    aprueba_tesis: boolean;
    razon: string;
    nota_minima: number;
    promedio: number | null;
    graduacion_1?: CursoNotaResumen | null;
    graduacion_2?: CursoNotaResumen | null;
}

export interface ReporteEstudianteTerna {
    id: number;
    numero: number;
    estado: EstadoTerna;
    promedio: number | null;
    resolucion: ResolucionTerna;
    evaluaciones_enviadas: number;
    total_evaluadores: number;
}

export interface ReporteEstudiante extends EstadoTesis {
    terna?: ReporteEstudianteTerna | null;
}

export type RolUsuario = 'admin' | 'evaluador';

export interface Usuario {
    id: number;
    nombre: string;
    email: string;
    rol: RolUsuario;
    foto_url?: string | null;
}

export type FaseProyecto = 'PG1' | 'PG2';

export interface Proyecto {
    id: number;
    titulo: string;
    descripcion?: string | null;
    foto_url?: string | null;
    fase: FaseProyecto;
    estudiante_id?: number;
    estudiante_nombre?: string;
    carnet?: string;
}

export type EstadoTerna = 'pendiente' | 'en_progreso' | 'completada';

export type EstadoEvaluacion = 'borrador' | 'enviada';

export interface EvaluadorTerna {
    id?: number;
    usuario_id?: number;
    nombre: string;
    calificacion: number | null;
    comentarios: string | null;
    eval_estado: EstadoEvaluacion | null;
}

export type ResolucionTerna = 'aprueba_tesis' | 'aprueba_curso' | 'reprobado' | 'pendiente';

export interface ResultadoTerna {
    promedio: number | null;
    resolucion: ResolucionTerna;
    evaluaciones_enviadas: number;
    total_evaluadores: number;
}

export interface TernaResumen {
    id: number;
    numero: number;
    estado: EstadoTerna;
    titulo: string;
    foto_url?: string | null;
    estudiante_nombre: string;
    carnet: string;
    fase?: FaseProyecto;
    fecha_evaluacion?: string | null;
    total_evaluadores?: number;
    evaluaciones_enviadas?: number;
}

export interface TernaDetalle extends TernaResumen {
    evaluadores: EvaluadorTerna[];
    resultado: ResultadoTerna;
}

export interface ReporteTernaItem {
    terna_id: number;
    numero: number;
    carnet: string;
    estudiante: string;
    titulo: string;
    promedio: number | null;
    resolucion: ResolucionTerna;
}

export interface ReporteTernasGlobal {
    resumen: {
        total: number;
        aprueba_tesis: number;
        aprueba_curso: number;
        reprobados: number;
        pendientes: number;
        escala?: Record<string, unknown>;
    };
    ternas: ReporteTernaItem[];
}

export interface PaginatedResponse<T> {
    data?: T[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}
