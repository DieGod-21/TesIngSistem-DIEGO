import React from 'react';
import { createRoot } from 'react-dom/client';

/* Inter (self-hosted, variable) — la marca tipográfica del producto.
   Se importa aquí para garantizar que cargue antes de pintar la app. */
import '@fontsource-variable/inter';

import App from './App';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);