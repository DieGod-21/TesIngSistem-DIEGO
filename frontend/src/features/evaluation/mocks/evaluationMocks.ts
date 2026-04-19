import type { Panel, EvaluationStudent, EvaluationCriteria, Evaluator } from '../types/evaluation';

export const MOCK_PANELS: Panel[] = [
    {
        id: 'panel-01',
        name: 'Panel 01',
        description: 'Defensa de Anteproyecto — Ingeniería en Sistemas de Información',
        status: 'available',
        evaluatorsConnected: 2,
        evaluatorsTotal: 3,
    },
    {
        id: 'panel-02',
        name: 'Panel 02',
        description: 'Evaluación de Avance de Proyecto de Graduación PG1',
        status: 'in_progress',
        evaluatorsConnected: 3,
        evaluatorsTotal: 3,
    },
    {
        id: 'panel-03',
        name: 'Panel 03',
        description: 'Defensa Final de Proyecto de Graduación PG2 — 2024',
        status: 'completed',
        evaluatorsConnected: 3,
        evaluatorsTotal: 3,
    },
];

export const MOCK_STUDENTS: Record<string, EvaluationStudent> = {
    'panel-01': {
        id: 'student-001',
        panelId: 'panel-01',
        nombreCompleto: 'María José López García',
        carnetId: '202001234',
        carrera: 'Ingeniería en Sistemas de Información',
        projectTitle: 'Sistema de Gestión de Inventarios con Inteligencia Artificial',
        phase: 'PG2',
        photoUrl: null,
    },
    'panel-02': {
        id: 'student-002',
        panelId: 'panel-02',
        nombreCompleto: 'Carlos Eduardo Méndez Ramos',
        carnetId: '201901567',
        carrera: 'Ingeniería en Sistemas de Información',
        projectTitle: 'Aplicación Móvil para Control de Asistencia Universitaria',
        phase: 'PG1',
        photoUrl: null,
    },
    'panel-03': {
        id: 'student-003',
        panelId: 'panel-03',
        nombreCompleto: 'Andrea Sofía Castillo Morales',
        carnetId: '201800923',
        carrera: 'Ingeniería en Sistemas de Información',
        projectTitle: 'Plataforma Web de Seguimiento Académico para Proyectos de Graduación',
        phase: 'PG2',
        photoUrl: null,
    },
};

export const MOCK_CRITERIA: EvaluationCriteria[] = [
    {
        id: 'criteria-01',
        name: 'Calidad de la Presentación',
        description: 'Claridad, organización y dominio del tema expuesto ante el panel',
    },
    {
        id: 'criteria-02',
        name: 'Documentación',
        description: 'Completitud, coherencia y calidad técnica del informe escrito entregado',
    },
    {
        id: 'criteria-03',
        name: 'Defensa del Proyecto',
        description: 'Respuesta a preguntas, justificación de decisiones y solidez técnica',
    },
];

export const MOCK_EVALUATORS: Evaluator[] = [
    { id: 'eval-01', name: 'Dr. Roberto Méndez Torres',    isCurrentUser: true,  hasSubmitted: false },
    { id: 'eval-02', name: 'Lic. Ana María Pérez Castro',  isCurrentUser: false, hasSubmitted: false },
    { id: 'eval-03', name: 'Ing. Juan Carlos Flores López', isCurrentUser: false, hasSubmitted: false },
];
