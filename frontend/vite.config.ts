/// <reference types="vitest" />

import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Fail-fast: el build de producción NO puede generarse sin VITE_API_URL.
  // Evita publicar un bundle que apunte a una API no intencionada por defecto.
  if (command === 'build' && mode === 'production' && !env.VITE_API_URL) {
    throw new Error(
      '[config] VITE_API_URL es obligatoria para el build de producción. ' +
      'Defínela en .env (ver .env.example) o en el entorno de CI/CD.',
    )
  }

  return {
    // Sin @vitejs/plugin-legacy: React 19 + Ionic 8 no soportan navegadores
    // legacy, por lo que el bundle nomodule/SystemJS + polyfills nunca podría
    // ejecutar la app. Se elimina para reducir tamaño y tiempo de build.
    plugins: [
      react(),
    ],
    server: {
      proxy: {
        // Evita CORS en desarrollo: el navegador llama a /api/... (mismo origen)
        // y Vite reenvía a https://notas.digicom.com.gt manteniendo HTTPS.
        '/api': {
          target: 'https://notas.digicom.com.gt',
          changeOrigin: true,
          secure: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    }
  }
})
