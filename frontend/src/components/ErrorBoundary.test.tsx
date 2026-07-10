import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import { setTelemetryProvider, type ErrorReport } from '../services/telemetry';

const Boom: React.FC = () => {
    throw new Error('render crash');
};

describe('ErrorBoundary', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // React registra el error atrapado en console.error; lo silenciamos.
        consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
        consoleSpy.mockRestore();
    });

    it('muestra el fallback y reporta a telemetría cuando un hijo falla al renderizar', () => {
        const reports: ErrorReport[] = [];
        setTelemetryProvider({ report: (r) => { reports.push(r); } });

        render(
            <ErrorBoundary level="content" fallback={<div>Fallback visible</div>}>
                <Boom />
            </ErrorBoundary>,
        );

        expect(screen.getByText('Fallback visible')).toBeInTheDocument();
        expect(reports).toHaveLength(1);
        expect(reports[0].boundary).toBe('content');
        expect(reports[0].message).toBe('render crash');
    });

    it('renderiza los hijos con normalidad cuando no hay error', () => {
        setTelemetryProvider({ report: () => {} });

        render(
            <ErrorBoundary level="app" fallback={<div>Fallback</div>}>
                <div>Contenido OK</div>
            </ErrorBoundary>,
        );

        expect(screen.getByText('Contenido OK')).toBeInTheDocument();
        expect(screen.queryByText('Fallback')).not.toBeInTheDocument();
    });
});
