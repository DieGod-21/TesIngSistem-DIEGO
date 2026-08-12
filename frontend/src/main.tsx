import React from 'react';
import { createRoot } from 'react-dom/client';

/* Inter (self-hosted, variable) — la marca tipográfica del producto.
   Se importa aquí para garantizar que cargue antes de pintar la app. */
import '@fontsource-variable/inter';

import App from './App';
import { registerGlobalErrorHandlers } from './services/telemetry';

// Captura global de errores no manejados (window.onerror / unhandledrejection).
// Se registra antes del render para no perder fallos tempranos.
registerGlobalErrorHandlers();

/*
 * Conjunto de datos de DESARROLLO (opcional, ver src/dev/demoApi.ts).
 *
 * El `import.meta.env.DEV` no es defensa en profundidad decorativa: es lo que
 * permite al empaquetador eliminar la rama entera —y con ella el conjunto de
 * datos— del bundle de producción. Se instala antes de renderizar para que la
 * primera petición ya pase por el doble.
 */
if (import.meta.env.DEV) {
    const { demoDataActivo, installDemoApi } = await import('./dev/demoApi');
    if (demoDataActivo()) installDemoApi();
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);