import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkQueue from './WorkQueue';
import type { WorkItem } from '../domain/types';
import type { Capabilities } from '../../../config/permissions';

const ADMIN: Capabilities = {
    canManageUsers: true, canViewReports: true, canImportStudents: true,
    canEditGrades: true, canReopenEvaluations: true,
};

function wi(over: Partial<WorkItem> = {}): WorkItem {
    return {
        id: 'registrar_nota_pg1:A1', kind: 'registrar_nota_pg1', carnet: 'A1', nombre: 'Ana López',
        studentId: 1, stage: 'pg1_pendiente', priority: 4, reason: 'Falta la nota de PG1 (curso 043).',
        target: { kind: 'notas_entry', carnet: 'A1' }, selfClearing: true, timestamp: null, ageDays: null, ...over,
    };
}

describe('WorkQueue — estados de render', () => {
    beforeEach(() => localStorage.clear());

    it('loading: muestra el título, sin recompensa ni filas', () => {
        render(<WorkQueue items={null} capabilities={ADMIN} loading error={null} onOpen={() => {}} />);
        expect(screen.getByText('Tu trabajo')).toBeInTheDocument();
        expect(screen.queryByText('Sin trabajo pendiente')).toBeNull();
    });

    it('error: muestra el aviso de error', () => {
        render(<WorkQueue items={null} capabilities={ADMIN} loading={false} error="boom" onOpen={() => {}} />);
        expect(screen.getByText('No se pudo cargar la cola de trabajo.')).toBeInTheDocument();
    });

    it('empty (cargado, sin ítems): muestra la recompensa', () => {
        render(<WorkQueue items={[]} capabilities={ADMIN} loading={false} error={null} onOpen={() => {}} />);
        expect(screen.getByText('Sin trabajo pendiente')).toBeInTheDocument();
    });

    it('normal: renderiza la fila y navega al hacer click', () => {
        const onOpen = vi.fn();
        render(<WorkQueue items={[wi()]} capabilities={ADMIN} loading={false} error={null} onOpen={onOpen} />);
        expect(screen.getByText('Ana López')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Registrar nota — Ana López' }));
        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('descarte: un ítem no self-clearing se oculta al marcar "Hecho"', () => {
        const item = wi({
            id: 'terna_estancada:B2', kind: 'terna_estancada', carnet: 'B2', nombre: 'Beto Mux',
            selfClearing: false, stage: 'terna_estancada', priority: 0,
            target: { kind: 'terna_detail', carnet: 'B2', ternaId: 9 },
        });
        render(<WorkQueue items={[item]} capabilities={ADMIN} loading={false} error={null} onOpen={() => {}} />);
        expect(screen.getByText('Beto Mux')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Marcar como atendido: Beto Mux' }));
        expect(screen.queryByText('Beto Mux')).toBeNull();
        expect(screen.getByText('Sin trabajo pendiente')).toBeInTheDocument();
    });

    it('gating por capacidad: oculta ítems cuya acción el usuario no puede ejecutar', () => {
        const noGrades: Capabilities = { ...ADMIN, canEditGrades: false };
        render(<WorkQueue items={[wi()]} capabilities={noGrades} loading={false} error={null} onOpen={() => {}} />);
        expect(screen.queryByText('Ana López')).toBeNull();
        expect(screen.getByText('Sin trabajo pendiente')).toBeInTheDocument();
    });
});
