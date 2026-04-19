/**
 * evaluationService.ts
 *
 * Capa de datos para el módulo de Evaluaciones.
 * Usa mock data mientras el API no esté disponible.
 *
 * Cuando llegue el API:
 *   1. Importar apiFetch desde services/apiClient
 *   2. Importar API_PATHS.evaluations desde config/apiConfig
 *   3. Importar funciones adapt* desde adapters/evaluationAdapter
 *   4. Reemplazar cada función mock con su equivalente real
 */

import type { Panel, EvaluationStudent, EvaluationCriteria, Evaluator, EvaluationFormState } from '../types/evaluation';
import { MOCK_PANELS, MOCK_STUDENTS, MOCK_CRITERIA, MOCK_EVALUATORS } from '../mocks/evaluationMocks';

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

// TODO: apiFetch<PanelDTO[]>(API_PATHS.evaluations.panels) + MOCK_PANELS.map(adaptPanel)
export async function getPanels(): Promise<Panel[]> {
    await delay(500);
    return MOCK_PANELS;
}

// TODO: apiFetch<EvaluationStudentDTO>(API_PATHS.evaluations.studentByPanel(panelId)) + adaptEvaluationStudent(dto)
export async function getStudentByPanel(panelId: string): Promise<EvaluationStudent> {
    await delay(500);
    const student = MOCK_STUDENTS[panelId];
    if (!student) throw new Error(`No se encontró estudiante para el panel ${panelId}`);
    return student;
}

// TODO: apiFetch<CriteriaDTO[]>(API_PATHS.evaluations.criteria) + dtos.map(adaptCriteria)
export async function getCriteria(): Promise<EvaluationCriteria[]> {
    await delay(400);
    return MOCK_CRITERIA;
}

// TODO: apiFetch<EvaluatorDTO[]>(API_PATHS.evaluations.evaluatorsByPanel(panelId)) + dtos.map(adaptEvaluator)
export async function getEvaluators(_panelId: string): Promise<Evaluator[]> {
    await delay(400);
    return MOCK_EVALUATORS;
}

// TODO: apiFetch<void>(API_PATHS.evaluations.submit(form.panelId), { method: 'POST', body: JSON.stringify(form) })
export async function submitEvaluation(form: EvaluationFormState): Promise<void> {
    await delay(600);
    console.info('[evaluationService] Evaluación enviada:', form);
}

// TODO: apiFetch<void>(API_PATHS.evaluations.draft(form.panelId), { method: 'PUT', body: JSON.stringify(form) })
export async function saveDraftEvaluation(form: EvaluationFormState): Promise<void> {
    await delay(400);
    console.info('[evaluationService] Borrador guardado:', form);
}
