import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SinceLastVisit from './SinceLastVisit';
import type { SnapshotDiff } from '../domain/snapshot';

describe('SinceLastVisit — estados de render', () => {
    it('diff null: no renderiza nada (desaparece en silencio)', () => {
        const { container } = render(<SinceLastVisit diff={null} />);
        expect(container.firstChild).toBeNull();
    });

    it('diff no meaningful: no renderiza nada', () => {
        const diff: SnapshotDiff = { sincePreviousMs: 1000, stageDeltas: [], queueChanged: false, meaningful: false };
        const { container } = render(<SinceLastVisit diff={diff} />);
        expect(container.firstChild).toBeNull();
    });

    it('diff meaningful: muestra encabezado, deltas descritos y tiempo relativo', () => {
        const diff: SnapshotDiff = {
            sincePreviousMs: 2 * 24 * 3600 * 1000,
            stageDeltas: [
                { stage: 'elegible_sin_caso', delta: 3 },
                { stage: 'pg1_pendiente', delta: -2 },
            ],
            queueChanged: true,
            meaningful: true,
        };
        render(<SinceLastVisit diff={diff} />);
        expect(screen.getByText('Desde tu última visita')).toBeInTheDocument();
        expect(screen.getByText(/3 nuevo\(s\) elegible\(s\) a tesis/)).toBeInTheDocument();
        expect(screen.getByText(/2 nota\(s\) PG1 registrada\(s\)/)).toBeInTheDocument();
        expect(screen.getByText(/hace 2 días/)).toBeInTheDocument();
    });
});
