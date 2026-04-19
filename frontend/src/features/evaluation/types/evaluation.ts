export type PanelStatus = 'available' | 'in_progress' | 'completed';

export interface Panel {
    id: string;
    name: string;
    description: string;
    status: PanelStatus;
    evaluatorsConnected: number;
    evaluatorsTotal: number;
}

export interface EvaluationStudent {
    id: string;
    panelId: string;
    nombreCompleto: string;
    carnetId: string;
    carrera: string;
    projectTitle: string;
    phase: 'PG1' | 'PG2';
    photoUrl: string | null;
}

export interface EvaluationCriteria {
    id: string;
    name: string;
    description: string;
}

export interface Evaluator {
    id: string;
    name: string;
    isCurrentUser: boolean;
    hasSubmitted: boolean;
}

export interface EvaluationFormState {
    panelId: string;
    studentId: string;
    scores: Record<string, number>;
    observations: string;
}
