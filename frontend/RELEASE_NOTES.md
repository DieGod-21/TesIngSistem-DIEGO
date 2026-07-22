# Release Notes — v1.0.0-rc.1

**Control de Notas · Coordinación de Proyectos de Graduación (PG1–PG2)**
Universidad Mariano Gálvez — Facultad de Ingeniería
Frontend: React 19 + Ionic 8 + TypeScript + Vite

Fecha: 2026-07-22 · Estado: **Release Candidate**

---

## Resumen

Primer candidato a release. El frontend alcanza estado listo para producción:
arquitectura estable, capa de datos y de red endurecidas, rendimiento
optimizado y revisión de seguridad completa. No hay cambios de backend; la API
se consume como caja negra.

## Aspectos destacados

- **Seguridad y sesión:** autenticación JWT con verificación de sesión de tres
  estados (un fallo de red no cierra la sesión), claves de almacenamiento
  centralizadas y `.env` fuera del control de versiones.
- **Fiabilidad de red:** cancelación real de peticiones, timeouts por operación
  (auth 15s / normal 20s / carga 120s), clasificación de errores y mensajes de
  usuario centralizados (nunca se muestran errores HTTP crudos).
- **Datos escalables:** caché compartida con TTL/deduplicación/invalidación,
  normalización única de respuestas y detección de truncamiento.
- **Rendimiento:** code-splitting por ruta y memoización de contextos; build sin
  bundle legacy (más pequeño y rápido).
- **Observabilidad:** telemetría reemplazable con proveedor HTTP de producción
  opt-in (batching + reintentos + fallo graceful), sin datos sensibles.
- **Robustez:** Error Boundaries de dos niveles y captura global de errores.

## Configuración requerida

- `VITE_API_URL` (obligatoria en producción; el build falla si falta).
- `VITE_TELEMETRY_URL` (opcional; activa el envío de telemetría).
- `VITE_APP_VERSION` (opcional; por defecto se toma de `package.json`).

Copiar `.env.example` a `.env` y ajustar. Ver **HOSTING.md** para el despliegue
(SPA rewrites + cabeceras de seguridad).

## Calidad

- Build de producción reproducible (`npm run build`).
- TypeScript estricto (sin `any`, sin `@ts-ignore`).
- Suite de pruebas automatizadas verde.

## Problemas conocidos / pendientes

- Búsqueda/paginación de estudiantes aún en cliente (con salvaguarda de
  truncamiento); migración a server-side pendiente para volúmenes grandes.
- Cabeceras de seguridad (CSP/HSTS/etc.) se aplican en la capa de hosting, no en
  el bundle (ver HOSTING.md).

## Próximos pasos hacia 1.0.0 (final)

- Validación de aceptación en entorno de staging con `VITE_API_URL` real.
- Definir las cabeceras de seguridad del host según HOSTING.md.
- Conectar `VITE_TELEMETRY_URL` a un backend de observabilidad si se requiere.
