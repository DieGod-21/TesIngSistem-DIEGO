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

  // Metadata de versión: se prioriza la variable explícita; si no, la versión
  // de package.json que npm expone como npm_package_version al correr scripts.
  // Queda disponible en telemetría vía import.meta.env.VITE_APP_VERSION.
  const appVersion = env.VITE_APP_VERSION ?? process.env.npm_package_version ?? ''

  return {
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    },
    // Sin @vitejs/plugin-legacy: React 19 + Ionic 8 no soportan navegadores
    // legacy, por lo que el bundle nomodule/SystemJS + polyfills nunca podría
    // ejecutar la app. Se elimina para reducir tamaño y tiempo de build.
    plugins: [
      react(),
    ],
    build: {
      /*
       * EL ARMAZÓN VIAJA APARTE DEL PRODUCTO.
       *
       * Todo salía en un solo fichero de 619 kB, y el aviso de Rollup sobre
       * pasar de 500 kB llevaba tiempo dándose por inevitable. Se midió de qué
       * está hecho, atribuyendo cada byte a su módulo con el sourcemap:
       *
       *     react-dom                506 KB   27 %
       *     @ionic/core              471 KB   25 %
       *     @ionic/react + stencil   333 KB   18 %
       *     codigo de la aplicacion  348 KB   18 %
       *
       * Cuatro quintas partes son el armazón. No hay nada que recortar ahí sin
       * cambiar de tecnología, así que el tamaño total NO baja: lo que cambia
       * es cada cuánto hay que volver a bajarlo. React e Ionic solo se mueven
       * al actualizar dependencias; el código del producto, en cada despliegue.
       * Juntos, cualquier corrección de una línea invalidaba los 619 kB enteros.
       *
       *     antes    un chunk de 619 kB            (178 kB comprimido)
       *     despues  vendor-ionic  341 kB (93 kB)  ─┐ solo cambian al
       *              vendor-react  180 kB (58 kB)  ─┘ actualizar dependencias
       *              index         106 kB (20 kB)    el producto
       *
       * Quien vuelve tras un despliegue baja 20 kB en vez de 178. Los tres se
       * piden en paralelo (`modulepreload`), así que la primera visita no paga
       * ninguna cascada nueva: se comprobó arrancando el build de producción,
       * con los custom elements de Ionic definidos y cero errores de consola.
       *
       * Se dejó FUERA de este reparto trocear los paneles por rol, que era el
       * otro candidato: ahorraba unos 5 kB comprimidos y metía 442 ms de cuerpo
       * vacío justo después de entrar. Ver el informe del sprint.
       */
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            // Barras hacia delante y nada mas: Vite normaliza los
            // identificadores de modulo, tambien en Windows.
            if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
            if (/\/node_modules\/(@ionic|@stencil|ionicons)\//.test(id)) return 'vendor-ionic';
            return undefined;
          },
        },
      },
    },
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
