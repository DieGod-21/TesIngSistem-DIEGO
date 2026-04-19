# Guía del Sistema — Proyectos de Graduación UMG
**Facultad de Ingeniería en Sistemas de Información**
Universidad Mariano Gálvez de Guatemala

---

## Contenido
1. [Requisitos previos](#1-requisitos-previos)
2. [Arrancar el backend](#2-arrancar-el-backend)
3. [Arrancar el frontend](#3-arrancar-el-frontend)
4. [Probar el login](#4-probar-el-login)
5. [Usar Swagger](#5-usar-swagger)
6. [Carga masiva de estudiantes (Excel)](#6-carga-masiva-de-estudiantes-excel)
7. [Ejecutar los tests automatizados](#7-ejecutar-los-tests-automatizados)
8. [Estructura del proyecto](#8-estructura-del-proyecto)

---

## 1. Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 14+ |

La base de datos debe estar corriendo y configurada en `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tesis_db
DB_USER=postgres
DB_PASSWORD=postgres123
PORT=3000
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=<tu_secreto_jwt>
JWT_EXPIRES_IN=1h
NODE_ENV=development
```

Variables opcionales para los tests:
```env
TEST_ADMIN_EMAIL=admin@demo.com
TEST_ADMIN_PASSWORD=admin123
```

---

## 2. Arrancar el backend

```bash
cd backend
npm install
npm run dev
```

El servidor queda disponible en `http://localhost:3000`.

Verificación rápida:
```bash
curl http://localhost:3000
# Respuesta: {"message":"Backend tesis_db funcionando correctamente","version":"1.0.0"}
```

---

## 3. Arrancar el frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

---

## 4. Probar el login

### Desde el frontend
1. Abre `http://localhost:5173`
2. Ingresa correo y contraseña del usuario admin
3. El sistema redirige al dashboard automáticamente

### Desde Swagger o curl
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo_electronico":"admin@demo.com","contrasena":"admin123"}'
```

Respuesta exitosa:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 5. Usar Swagger

1. Con el backend corriendo, abre: `http://localhost:3000/api-docs`
2. Ejecuta `POST /auth/login` con tus credenciales
3. Copia el valor del campo `token` (solo el token, sin comillas)
4. Haz clic en el botón **Authorize** (candado arriba a la derecha)
5. Pega el token en el campo **Value** → clic en **Authorize** → **Close**
6. El candado cerrado indica que el token está activo
7. Expande cualquier endpoint → **Try it out** → **Execute**

El spec completo en JSON está disponible en: `http://localhost:3000/api-docs.json`

### Endpoints documentados

| Tag | Endpoints |
|---|---|
| Autenticación | `POST /auth/login` |
| Estudiantes | `GET/POST /students`, `POST /students/bulk`, `GET/PUT/DELETE /students/:id` |
| Semestres | `GET/POST /semesters`, `GET/PUT /semesters/:id` |
| Proyectos | `GET/POST /projects`, `GET/PUT /projects/:id`, `GET /projects/by-student/:id` |
| Usuarios | `GET/POST /users`, `GET/PUT/DELETE /users/:id` |
| Entregables | Plantillas + entregables por proyecto |
| Evaluaciones | `GET/POST/PUT /evaluations`, por proyecto |
| Eventos | CRUD `/events` |
| Fechas Límite | CRUD `/deadlines` |
| Entregas | `POST /submissions`, observaciones |

---

## 6. Carga masiva de estudiantes (Excel)

### Descargar la plantilla
El archivo `template_estudiantes.xlsx` está en la raíz del proyecto. También puedes regenerarlo:

```bash
cd backend
npm run generar:template
```

### Estructura del Excel

| Columna | Nombre | Obligatorio | Descripción |
|---|---|---|---|
| A | `nombreCompleto` | Sí | Nombre completo del estudiante |
| B | `carnetId` | Sí | Carnet UMG único |
| C | `correoInstitucional` | Sí | Email válido |
| D | `faseAcademica` | Sí | `anteproyecto`, `tesis` o `eps` |
| E | `semestreLectivo` | No | Nombre del semestre |
| F | `aprobado` | No | `true` o `false` (default: `false`) |

> La columna D tiene un **menú desplegable** con los valores válidos. La hoja "Instrucciones" explica cada campo en detalle.

### Proceso de carga desde el frontend
1. Ve a **Registrar Estudiante → Carga Masiva**
2. Arrastra el `.xlsx` o usa "Seleccionar Archivo"
3. Revisa la vista previa (filas con ícono rojo tienen errores)
4. Haz clic en **Importar X Registros**
5. El sistema muestra: cuántos se importaron, cuántos se rechazaron y el motivo

### Endpoint directo (API)
```bash
POST /api/students/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "filas": [
    {
      "nombre_completo": "María López",
      "carnet_id": "2021-00123",
      "correo_institucional": "mlopez@miumg.edu.gt",
      "fase_academica": "tesis",
      "semester_id": "<uuid-semestre>",
      "approved": false
    }
  ]
}
```

Respuesta:
```json
{
  "importados": 1,
  "rechazados": 0,
  "total": 1,
  "errores": []
}
```

---

## 7. Ejecutar los tests automatizados

Los tests usan **Jest + Supertest** y se conectan a la base de datos real.

> **Importante:** La base de datos debe estar corriendo y el usuario de prueba debe existir.
> Configura `TEST_ADMIN_EMAIL` y `TEST_ADMIN_PASSWORD` en `backend/.env`.

```bash
cd backend

# Ejecutar todos los tests
npm test

# Ejecutar con reporte de cobertura
npm run test:coverage

# Modo watch (re-ejecuta al guardar cambios)
npm run test:watch
```

### Tests incluidos

**Archivo:** `backend/tests/students.test.js`

| Grupo | Tests |
|---|---|
| `GET /students` | Lista con token, sin token (401), filtro `approved=false/true`, filtro `fase_academica`, fase inválida (400) |
| `POST /students` | Registro exitoso, campos faltantes (400), correo inválido (400), fase inválida (400), carnet duplicado |
| `PUT /students/:id` | Toggle approved true/false, actualizar fase, fase inválida, UUID inválido (400), UUID inexistente (404) |
| `POST /students/bulk` | 2 filas válidas, filas mixtas, datos incompletos, duplicados internos, body vacío (400), sin array (400), sin token (401) |

### Limpieza automática
Los tests crean registros de prueba y los eliminan en `afterAll`. No dejan datos residuales en la BD.

---

## 8. Estructura del proyecto

```
Tesis_IngSistems_DiegoAVS/
│
├── template_estudiantes.xlsx          ← Plantilla Excel para carga masiva
├── GUIA_DEL_SISTEMA.md               ← Este archivo
│
├── backend/
│   ├── src/
│   │   ├── app.js                    ← Express sin listen (usado por tests)
│   │   ├── index.js                  ← Punto de entrada del servidor
│   │   ├── config/
│   │   │   ├── env.js                ← Validación de variables de entorno
│   │   │   └── swagger.js            ← Especificación OpenAPI 3.0 completa
│   │   ├── controllers/
│   │   │   └── students.controller.js ← Incluye bulkCreate
│   │   ├── routes/
│   │   │   └── students.routes.js    ← Incluye POST /bulk
│   │   ├── middleware/
│   │   │   ├── authenticate.js       ← Verificación JWT
│   │   │   ├── authorize.js          ← RBAC por roles
│   │   │   └── errorHandler.js
│   │   └── db/pool.js
│   ├── tests/
│   │   ├── helpers.js                ← obtenerToken, semesterIdValido, limpiarEstudiante
│   │   └── students.test.js          ← 20+ casos de prueba
│   ├── scripts/
│   │   └── generar_template_excel.js ← npm run generar:template
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── services/
    │   │   ├── apiClient.ts           ← Cliente HTTP centralizado con JWT
    │   │   ├── authService.ts         ← Login, logout, persistencia
    │   │   ├── studentsService.ts     ← Usa POST /students/bulk
    │   │   ├── studentStore.ts        ← GET/PUT estudiantes
    │   │   └── dashboardService.ts    ← KPIs desde API real
    │   ├── context/AuthContext.tsx    ← Estado global de autenticación
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   ├── StudentsListPage.tsx
    │   │   └── StudentNewPage.tsx
    │   ├── theme/variables.css        ← Paleta rojo/blanco/gris UMG
    │   └── styles/                   ← CSS modular por módulo
    └── package.json
```

---

## Scripts de referencia rápida

```bash
# Backend
npm run dev              # Servidor en modo desarrollo (nodemon)
npm run start            # Servidor en producción
npm test                 # Tests Jest + Supertest
npm run test:coverage    # Tests con cobertura
npm run generar:template # Genera template_estudiantes.xlsx

# Frontend
npm run dev              # Dev server Vite
npm run build            # Build de producción
```

---

*Sistema desarrollado como proyecto de tesis — Ingeniería en Sistemas de Información, UMG.*
