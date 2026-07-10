import React from 'react';
import { IonApp, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import AppRouter from './routes/AppRouter';
import ErrorBoundary from './components/ErrorBoundary';
import { AppErrorFallback } from './components/ErrorFallback';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/*
 * Ionic Dark Mode – desactivado por defecto para el diseño de login.
 * Descomentar si se requiere soporte de modo oscuro automático.
 */
/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
/* import '@ionic/react/css/palettes/dark.system.css'; */

/* Theme variables */
import './theme/variables.css';

/* Layout reset: corrige scroll en Ionic + 100dvh móvil + overflow */
import './styles/layout-reset.css';

/*
 * animated: false → desactiva las transiciones de página nativas de Ionic.
 * Motivo: Ionic aplica un `transform` al `.ion-page` durante la transición de
 * ruta; como el sidebar es `position: fixed`, queda contenido por ese ancestro
 * transformado y "se desliza" para luego reajustarse al terminar (el rebote
 * horizontal del sidebar). Sin la transformación de página, el sidebar queda
 * estable desde el primer frame y el contenido entra con un fade CSS propio
 * (.page-enter-animate), sin movimientos horizontales del layout.
 */
setupIonicReact({ animated: false });

/**
 * App.tsx
 *
 * Punto de entrada de la aplicación.
 * DECISIÓN: App.tsx solo configura los proveedores globales y el router.
 * NO contiene ninguna ruta ni lógica de negocio.
 *
 * Orden de los providers:
 *  1. IonApp       → requisito de Ionic Framework
 *  2. AuthProvider → estado de autenticación global
 *  3. IonReactRouter → router (debe estar dentro de IonApp)
 *  4. AppRouter    → rutas protegidas y públicas
 */
const App: React.FC = () => (
  <IonApp>
    {/* Nivel 1 — Boundary de aplicación: cualquier fallo de render en el árbol
        muestra una pantalla completa de recuperación en lugar de una pantalla
        en blanco. Envuelve toda la pila de providers y el router. */}
    <ErrorBoundary level="app" fallback={<AppErrorFallback />}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <IonReactRouter>
              <AppRouter />
            </IonReactRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </IonApp>
);

export default App;
