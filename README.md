# TesIngSistem-DIEGO

Frontend del sistema de control y seguimiento de Proyectos de Graduación (PG1 y PG2) de la Facultad de Ingeniería de la Universidad Mariano Gálvez. Forma parte del trabajo de graduación de Ingeniería en Sistemas.

Versión actual: `1.0.0-rc.1`

## Alcance del repositorio

Este repositorio contiene **solo el frontend**: una aplicación web de una sola página (SPA) que consume una API REST externa. No incluye el backend, la base de datos ni lógica de servidor. La API se trata como una caja negra y su contrato es el que publica el propio servidor en `/api-docs.json`.

La aplicación tiene dos espacios de trabajo según el rol de la sesión (`src/config/permissions.ts`):

- **Coordinación (`admin`)**: padrón de estudiantes, altas individuales e importación desde Excel, notas, proyectos, ternas, reportes con descarga del acta en PDF y gestión de usuarios.
- **Evaluador (`evaluador`)**: consulta y evaluación de las ternas que tiene asignadas.

La autenticación usa los tokens que emite la API (JWT de acceso y token de renovación). Se guardan en `sessionStorage` y se descartan al cerrar la pestaña.

## Tecnologías

| Área | Herramienta |
|---|---|
| Interfaz | React 19, Ionic React 8, lucide-react |
| Lenguaje | TypeScript 5.9 (modo estricto) |
| Build y servidor de desarrollo | Vite 5 |
| Enrutado | react-router-dom 5 |
| Estado de cliente | Zustand (solo borradores de evaluación); Context para sesión, tema y avisos |
| Pruebas unitarias | Vitest, Testing Library, jsdom |
| Pruebas E2E | Cypress 13 |
| Calidad | ESLint 9, typescript-eslint |

Capacitor está instalado y configurado (`capacitor.config.ts`), pero el código de `src/` no lo usa.

## Estructura

```
.
├── frontend/               aplicación (todo el código vive aquí)
│   ├── src/
│   │   ├── components/     componentes reutilizables y sistema de UI
│   │   ├── features/       módulos por dominio: proyectos, ternas, reportes,
│   │   │                   usuarios, evaluator, students-workspace
│   │   ├── pages/          páginas de nivel superior (login, panel, estudiantes)
│   │   ├── layout/         armazón de la aplicación (barra lateral y cabecera)
│   │   ├── routes/         rutas y protección por rol
│   │   ├── services/       cliente HTTP, un servicio por recurso y caché
│   │   ├── hooks/          lógica reutilizable de carga y de interfaz
│   │   ├── context/        sesión, tema y avisos
│   │   ├── stores/         store de Zustand
│   │   ├── config/         rutas de la API, permisos y claves de almacenamiento
│   │   ├── dev/            conjunto de datos de demostración (solo desarrollo)
│   │   ├── types/          tipos de la API
│   │   └── utils/, theme/, styles/
│   ├── cypress/            pruebas E2E
│   ├── scripts/e2e.mjs     lanzador de las pruebas E2E
│   ├── HOSTING.md          guía de despliegue
│   ├── CHANGELOG.md
│   └── RELEASE_NOTES.md
├── docs/engineering-journal.md
└── .github/workflows/ci.yml
```

`src/architecture.test.ts` convierte varias convenciones del proyecto en pruebas: fronteras entre módulos, CSS válido, escalas del sistema de diseño y ausencia de código muerto.

## Requisitos

- Node.js y npm. No hay una versión fijada en el proyecto; la CI usa Node 20.
- Para las pruebas E2E, el binario de Cypress, que se descarga con `npm install`.

## Instalación

```bash
cd frontend
npm install
```

## Desarrollo

```bash
npm run dev        # contra la API real, a través del proxy de Vite
npm run dev:demo   # con el conjunto de datos de demostración
```

La aplicación queda en `http://localhost:5173`.

**`npm run dev`** reenvía `/api` a `https://notas.digicom.com.gt` (`vite.config.ts`). Es la API de producción: hacen falta credenciales reales y **cualquier escritura modifica datos reales**. Para probar altas, notas, ternas o importaciones, usa el modo demo.

## Modo demo

`npm run dev:demo` intercepta todas las peticiones a `/api` y responde desde `src/dev/` con un conjunto coherente: 27 expedientes, 11 proyectos, 5 ternas y 7 usuarios (una cuenta de coordinación y seis de evaluador). Los casos cubren nombres largos, notas en el límite, expedientes sin correo y ternas a medio evaluar.

Diferencias con producción:

- **Acceso**: el correo tiene que pertenecer al conjunto (por ejemplo `coordinacion@miumg.edu.gt` o `jbatres@miumg.edu.gt`); la contraseña no se comprueba. La banda inferior incluye un selector de cuentas.
- **Contrato**: el modo demo valida los cuerpos de las escrituras como la API real y responde 400 o 422 si no coinciden.
- **Aislamiento**: una ruta `/api` que el modo demo no conoce responde 501; nunca pasa al servidor real. En `--mode demo` tampoco se configura el proxy.
- **Persistencia**: los cambios viven en memoria y se pierden al recargar.
- Mientras está activo lo anuncia una banda que no se puede cerrar.

También se puede activar sobre un servidor ya arrancado con `?demo=1` en la URL (se recuerda durante la pestaña y se desactiva con `?demo=0`), o con `VITE_DEMO_DATA=1`.

El conjunto de demostración no viaja al build de producción: se carga con un `import()` dinámico dentro de `if (import.meta.env.DEV)`, y el empaquetador elimina esa rama al generar `dist/`.

## Configuración de la API y variables de entorno

Las variables se definen en `frontend/.env` (plantilla en `frontend/.env.example`). Todo lo que empieza por `VITE_` acaba en el bundle, así que no deben contener secretos.

| Variable | Uso |
|---|---|
| `VITE_API_URL` | Origen de la API. **Obligatoria en el build de producción**: si falta, el build falla. En desarrollo no se usa, porque Vite sirve `/api` por el proxy. |
| `VITE_APP_VERSION` | Versión para telemetría. Por defecto, la de `package.json`. |
| `VITE_APP_COMMIT` | Commit que se incorpora a la versión del build (ver más abajo). |
| `VITE_TELEMETRY_URL` | Endpoint de telemetría. Si no se define, la telemetría no envía nada. |
| `VITE_DEMO_DATA` | Con valor `1`, activa el modo demo en desarrollo. |

## Build de producción

```bash
VITE_API_URL=https://notas.digicom.com.gt npm run build
npm run preview    # sirve dist/ en local
```

`npm run build` ejecuta `tsc` y después `vite build`. El resultado es estático (`frontend/dist/`). React e Ionic van en paquetes propios, separados del código de la aplicación, para que un despliegue no invalide la caché de lo que no cambió.

### Identificación del build

El build añade el commit a la versión como metadato semver, por ejemplo `1.0.0-rc.1+24ef293`, con el sufijo `-dirty` si había cambios sin commitear en archivos rastreados. El commit se toma de `VITE_APP_COMMIT`, `SOURCE_COMMIT` o `GITHUB_SHA`, o de git si el build dispone de `.git`; si no hay ninguno, la versión queda sin commit.

La versión se publica en `index.html` como `<meta name="app-version">` y en la telemetría. En `npm run dev` no se añade commit.

## Pruebas y calidad

Todos los comandos se ejecutan desde `frontend/`:

| Comando | Qué hace |
|---|---|
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Comprobación de tipos del código |
| `npx tsc --noEmit -p cypress` | Comprobación de tipos de los specs E2E |
| `npm run test` | Pruebas unitarias con Vitest, una sola ejecución |
| `npm run test.unit` | Vitest en modo watch |
| `npm run test.e2e` | Pruebas E2E con Cypress |
| `npm run build` | Build de producción (requiere `VITE_API_URL`) |

### Pruebas E2E

`npm run test.e2e` levanta Vite en modo demo, espera a que responda, ejecuta los specs de `cypress/e2e/` y apaga el servidor. Nunca se ejecutan contra la API real.

```bash
npm run test.e2e                                  # todos los specs
npm run test.e2e -- --spec cypress/e2e/flujo.cy.ts
E2E_BASE_URL=http://localhost:5175 npm run test.e2e   # usa un servidor ya levantado
```

### Integración continua

`.github/workflows/ci.yml` se ejecuta en cada push a `main` y `diego` y en cada pull request. Ejecuta lint, `tsc` (código y specs de Cypress), Vitest y el build de producción, y publica el tamaño del bundle. Cada paso se ejecuta aunque falle el anterior, para ver todos los problemas en una sola ejecución. Las pruebas E2E no forman parte de la CI.

## Despliegue

El build es un conjunto de archivos estáticos. `frontend/HOSTING.md` recoge lo que necesita el servidor que los aloje:

- reescritura de rutas hacia `index.html` (la aplicación es una SPA);
- HTTPS;
- cabeceras de seguridad (CSP, HSTS y otras);
- política de caché;
- un ejemplo de configuración para Nginx;
- las variables de entorno del build;
- una lista de comprobación previa al despliegue.

## Notas y limitaciones

- `npm run dev` trabaja contra la API de producción. Úsalo solo para leer datos o con autorización expresa para escribir.
- La búsqueda y la paginación del padrón se resuelven en el cliente sobre el conjunto descargado; los listados completos se piden a la API por páginas de 100 como máximo.
- El modo demo no verifica contraseñas, así que no sirve para probar el caso de credenciales incorrectas.
- La caché de listados (`src/services/cache.ts`) dura 60 segundos y cada servicio la invalida tras sus propias escrituras.

## Documentación adicional

- `frontend/HOSTING.md`: despliegue y configuración del servidor.
- `frontend/CHANGELOG.md` y `frontend/RELEASE_NOTES.md`: historial de cambios y notas de la versión.
- `docs/engineering-journal.md`: diario técnico con causas raíz y decisiones. Cubre hasta la iteración 18.
- `GUIA_DEL_SISTEMA.md`: guía general del sistema. Describe una configuración anterior con backend y base de datos locales que no forman parte de este repositorio, así que sus pasos de arranque no se aplican aquí.
- Los comentarios del código documentan decisiones concretas junto a la línea que las implementa.

## Autor

Diego Vásquez
