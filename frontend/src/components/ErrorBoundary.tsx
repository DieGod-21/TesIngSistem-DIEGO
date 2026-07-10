/**
 * ErrorBoundary.tsx
 *
 * Boundary de errores de RENDER genérico y reutilizable. Captura excepciones
 * inesperadas del árbol hijo, evita la pantalla en blanco y reporta a la capa
 * de telemetría (nunca datos sensibles).
 *
 * No maneja errores de API: esos siguen tratándose en cada página con sus
 * estados de error actuales (EmptyState). Este boundary solo atrapa fallos de
 * renderizado.
 *
 * Recuperación:
 *   - Nivel 'app'     → el fallback ofrece recargar la aplicación.
 *   - Nivel 'content' → el boundary se re-monta al navegar (key por pathname
 *     en AppShell), por lo que la navegación recupera sin lógica de reset.
 */

import React from 'react';
import { reportError, type BoundaryLevel } from '../services/telemetry';

interface ErrorBoundaryProps {
    /** Nivel del boundary; se adjunta a la telemetría. */
    level: BoundaryLevel;
    /** UI a mostrar cuando el árbol hijo falla al renderizar. */
    fallback: React.ReactNode;
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo): void {
        // Solo se reporta información diagnóstica; el componentStack no se envía
        // para evitar ruido y cualquier dato incidental.
        void info;
        reportError(error, {
            boundary: this.props.level,
            source: 'react.componentDidCatch',
        });
    }

    render(): React.ReactNode {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
