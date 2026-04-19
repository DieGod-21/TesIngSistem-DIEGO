/**
 * evaluationAdapter.ts
 *
 * Stubs para adaptar DTOs del API externo al modelo interno.
 * No se usan todavía — se activan cuando llegue el API.
 *
 * Cuando llegue el API:
 *   1. Definir PanelDTO, EvaluationStudentDTO, etc. en src/types/dto.ts
 *   2. Implementar cada función adapt* mapeando snake_case → camelCase
 *   3. Llamarlas desde evaluationService.ts
 */

import type { Panel, EvaluationStudent, EvaluationCriteria, Evaluator } from '../types/evaluation';

// Tipos provisionales — reemplazar con los reales de src/types/dto.ts
type PanelDTO             = Record<string, unknown>;
type EvaluationStudentDTO = Record<string, unknown>;
type CriteriaDTO          = Record<string, unknown>;
type EvaluatorDTO         = Record<string, unknown>;

export function adaptPanel(dto: PanelDTO): Panel {
    // Ejemplo esperado del API:
    // { id, nombre, descripcion, estado, evaluadores_conectados, evaluadores_total }
    return {
        id:                  String(dto['id']                  ?? ''),
        name:                String(dto['nombre']              ?? ''),
        description:         String(dto['descripcion']         ?? ''),
        status:              (dto['estado'] as Panel['status']) ?? 'available',
        evaluatorsConnected: Number(dto['evaluadores_conectados'] ?? 0),
        evaluatorsTotal:     Number(dto['evaluadores_total']      ?? 0),
    };
}

export function adaptEvaluationStudent(dto: EvaluationStudentDTO): EvaluationStudent {
    // Ejemplo esperado del API:
    // { id, panel_id, nombre_completo, carnet_id, carrera, titulo_proyecto, fase, foto_url }
    return {
        id:             String(dto['id']              ?? ''),
        panelId:        String(dto['panel_id']        ?? ''),
        nombreCompleto: String(dto['nombre_completo'] ?? ''),
        carnetId:       String(dto['carnet_id']       ?? ''),
        carrera:        String(dto['carrera']         ?? ''),
        projectTitle:   String(dto['titulo_proyecto'] ?? ''),
        phase:          (dto['fase'] as 'PG1' | 'PG2') ?? 'PG1',
        photoUrl:       typeof dto['foto_url'] === 'string' ? dto['foto_url'] : null,
    };
}

export function adaptCriteria(dto: CriteriaDTO): EvaluationCriteria {
    // Ejemplo esperado del API:
    // { id, nombre, descripcion }
    return {
        id:          String(dto['id']          ?? ''),
        name:        String(dto['nombre']      ?? ''),
        description: String(dto['descripcion'] ?? ''),
    };
}

export function adaptEvaluator(dto: EvaluatorDTO): Evaluator {
    // Ejemplo esperado del API:
    // { id, nombre, es_usuario_actual, ha_enviado }
    return {
        id:            String(dto['id']               ?? ''),
        name:          String(dto['nombre']           ?? ''),
        isCurrentUser: Boolean(dto['es_usuario_actual']),
        hasSubmitted:  Boolean(dto['ha_enviado']),
    };
}
