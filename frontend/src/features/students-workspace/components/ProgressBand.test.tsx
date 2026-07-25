import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProgressBand from './ProgressBand';
import type { PipelineStage, WorkQueueResult } from '../domain/types';

function stageCounts(over: Partial<Record<PipelineStage, number>>): Record<PipelineStage, number> {
    return {
        sin_datos: 0, pg1_pendiente: 0, pg2_pendiente: 0, no_elegible: 0,
        elegible_sin_caso: 0, en_terna: 0, terna_estancada: 0, resuelto: 0, ...over,
    };
}

function result(): WorkQueueResult {
    return {
        items: [],
        coverage: { totalStudents: 10, withStatus: 8, withoutStatus: 2 },
        stageCounts: stageCounts({ elegible_sin_caso: 3, resuelto: 5 }),
    };
}

const NO_COUNTS = null;

describe('ProgressBand — estados de render', () => {
    it('siempre renderiza los chips de lente (aunque result sea null)', () => {
        render(<ProgressBand activeLens="all" onSelectLens={() => {}} result={null} lensCounts={NO_COUNTS} loading={false} error={null} />);
        expect(screen.getByText('Todos')).toBeInTheDocument();
        expect(screen.getByText('Elegibles a tesis')).toBeInTheDocument();
        expect(screen.getByText('Pendientes de tesis')).toBeInTheDocument();
    });

    it('error: muestra el aviso y conserva los chips (filtrado sigue vivo)', () => {
        render(<ProgressBand activeLens="all" onSelectLens={() => {}} result={null} lensCounts={NO_COUNTS} loading={false} error="boom" />);
        expect(screen.getByText('No se pudo cargar el panorama del pipeline.')).toBeInTheDocument();
        expect(screen.getByText('Todos')).toBeInTheDocument();
    });

    it('normal: muestra el pulso (barra + etiquetas de etapa)', () => {
        render(<ProgressBand activeLens="all" onSelectLens={() => {}} result={result()} lensCounts={{ all: 10, approved: 3, failed: 5 }} loading={false} error={null} />);
        expect(screen.getByRole('img', { name: /Distribución del pipeline/ })).toBeInTheDocument();
        expect(screen.getByText('Elegible sin caso')).toBeInTheDocument();
        expect(screen.getByText('Resuelto')).toBeInTheDocument();
    });

    it('onSelectLens: click en un chip dispara el callback con la lente', () => {
        const onSelect = vi.fn();
        render(<ProgressBand activeLens="all" onSelectLens={onSelect} result={null} lensCounts={NO_COUNTS} loading={false} error={null} />);
        fireEvent.click(screen.getByRole('button', { name: /Elegibles a tesis/ }));
        expect(onSelect).toHaveBeenCalledWith('approved');
    });
});
