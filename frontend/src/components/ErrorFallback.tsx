/**
 * ErrorFallback.tsx
 *
 * Fallbacks de los boundaries, construidos con primitivas del sistema de diseño
 * (EmptyState + Button) para que se vean como parte de la aplicación. Se
 * tematizan por el atributo `data-theme` que ThemeProvider fija en <html>
 * (persiste aunque el árbol se desmonte), respetando modo claro/oscuro,
 * tipografía y espaciado vía variables de tema.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';
import { Button, EmptyState } from './ui';

/**
 * Nivel 1 — Aplicación. Pantalla completa de recuperación. Vive por encima del
 * Router, por lo que la única acción segura es recargar (no usa navegación).
 * La recarga NO limpia sessionStorage: la sesión se conserva.
 */
export const AppErrorFallback: React.FC = () => (
    <div
        style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'var(--surface-base)',
            fontFamily: 'var(--font-main)',
        }}
        role="alert"
    >
        <div style={{ maxWidth: 480, width: '100%' }}>
            <EmptyState
                tone="danger"
                icon={<AlertTriangle size={26} />}
                title="Ocurrió un error inesperado"
                description="La aplicación encontró un problema y no pudo continuar. Recarga para volver a intentarlo; tu sesión se mantiene."
                action={
                    <Button onClick={() => window.location.reload()}>
                        <RotateCw size={16} aria-hidden="true" />
                        Recargar aplicación
                    </Button>
                }
            />
        </div>
    </div>
);

/**
 * Nivel 2 — Contenido. Se muestra dentro del AppShell (sidebar y header siguen
 * usables). La recuperación es navegar: al cambiar de ruta, el boundary se
 * re-monta (key por pathname) y la app continúa.
 */
export const PageErrorFallback: React.FC = () => {
    const history = useHistory();
    return (
        <div className="reportes-page" role="alert">
            <EmptyState
                tone="danger"
                icon={<AlertTriangle size={26} />}
                title="No se pudo mostrar esta sección"
                description="Ocurrió un error inesperado en esta página. El resto de la aplicación sigue disponible: usa el menú o vuelve al inicio."
                action={
                    <Button onClick={() => history.push('/dashboard')}>
                        <Home size={16} aria-hidden="true" />
                        Ir al inicio
                    </Button>
                }
            />
        </div>
    );
};
