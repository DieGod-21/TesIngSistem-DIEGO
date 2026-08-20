# Changelog

Todas las entradas notables de este proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y versionado según [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Fixed
- **Panel del coordinador en `loading` eterno (regresión de e5895e5):** el
  resumen de tesis pasaba la señal de aborto del consumidor al loader de la
  caché compartida, violando el contrato de `cache.ts`. Con StrictMode
  (montar→abortar→remontar) el segundo montaje se enganchaba a la promesa ya
  abortada, recibía la cancelación ajena y las tarjetas nunca salían del
  esqueleto. El loader compartido ya no recibe señales de consumidores; la
  regresión queda fijada con tests a nivel de servicio y de hook (StrictMode).
- **Cuentas de usuario que nacían inutilizables:** el alta de usuarios no
  enviaba contraseña (el contrato la acepta) y el API no expone ningún
  restablecimiento (`/api/usuarios/{id}` solo admite GET), de modo que un
  evaluador recién creado aparecía en el listado pero el login respondía 401.
  El formulario ahora exige una contraseña inicial (≥8 caracteres) y advierte
  que no puede recuperarse.
- **Renovación de sesión defensiva:** si el refresh no trae un `refreshToken`
  nuevo, se conserva el vigente en lugar de sobrescribirlo con `undefined`
  (que mataba la sesión en la renovación siguiente, no en la actual).
- **Doble demo fiel al contrato:** `/api/auth/refresh` del doble ahora rota
  también el `refreshToken`, como declara la especificación.

## [1.0.0-rc.1] - 2026-07-22

Primer Release Candidate. Consolida el endurecimiento de arquitectura,
fiabilidad, rendimiento y seguridad del frontend acumulado en los sprints
previos. Solo frontend; el backend se consume como caja negra.

### Added
- **Sistema de capacidades (RBAC):** `getCapabilities(role)` como fuente única
  de autorización, `RoleRoute` con estado "Acceso restringido" (sin redirect).
- **Error Boundaries de dos niveles:** app (recarga) y contenido (navegación),
  con `EmptyState` del sistema de diseño.
- **Telemetría abstracta y reemplazable:** proveedor por entorno; en producción,
  proveedor HTTP por lotes (opt-in vía `VITE_TELEMETRY_URL`) con reintentos,
  fallo graceful y garantía de no-lanzar. Reportes por lista blanca (sin
  JWT/PII/payloads). Captura global de errores no manejados.
- **Fiabilidad de red:** verificación de sesión de 3 estados, cancelación real
  de peticiones (AbortController), timeouts configurables por operación,
  clasificación de errores (`NetworkErrorKind`) y errores de validación.
- **Capa de datos:** caché compartida con TTL + deduplicación + invalidación,
  normalización centralizada de respuestas, detección de truncamiento
  (`isTruncated`) y registro compartido de estudiantes.
- **Matriz de mensajes HTTP:** `userMessageFor()` centraliza los mensajes al
  usuario; las páginas nunca muestran mensajes HTTP crudos.
- **Configuración fail-fast:** `VITE_API_URL` obligatoria en producción (el
  build aborta si falta); `.env.example` documentado.
- **Documentación de despliegue:** `HOSTING.md` (SPA rewrites y cabeceras de
  seguridad) y `RELEASE_NOTES.md`.

### Changed
- **Rendimiento:** lazy-loading de rutas secundarias/admin (bundle inicial y CSS
  reducidos) y memoización de los valores de contexto (Auth/Theme/Toast).
- **Build modernizado:** eliminado `@vitejs/plugin-legacy` (y `terser`); React 19
  e Ionic 8 no soportan navegadores legacy. Build más pequeño y rápido.
- **Timeout de autenticación:** 10s → **15s** (solo auth), por el riesgo de
  arranque en frío del backend en el primer request. `normal` (20s) sin cambio.
- **Metadata de versión:** el build inyecta `VITE_APP_VERSION` desde
  `package.json` para la telemetría.
- **Accesibilidad:** `<html lang="es">`.
- **Logout:** purga la caché compartida (sin afectar la lógica de expiración).

### Fixed
- **Race condition** en el listado de estudiantes por tesis: cambiar de filtro
  rápido ya no muestra datos obsoletos (cancelación + guardas).
- **Redirect de sesión expirada:** ya no redirige si el usuario está en `/login`.
- Cancelación completada en páginas de solo lectura (Ternas, Reportes,
  Dashboard, Usuarios, Proyectos, detalle de estudiante).

### Removed
- Dependencia **`xlsx`** (sin uso; el parseo es server-side). Reduce superficie
  de vulnerabilidades.
- Artefactos `package.json`/`package-lock.json` huérfanos en la raíz.
- Código muerto con cero referencias: `USER_ID_KEY`, `verifyToken`,
  `getRecentStudentsSummary` (y sus tipos privados).

### Security
- Claves de sesión centralizadas (`config/storageKeys.ts`), sin duplicación.
- `.env` retirado del control de versiones; nunca versionado.
- Revisiones de seguridad frontend: sin `eval`/`Function`, sin
  `dangerouslySetInnerHTML`/`innerHTML`, sin fugas de JWT/`Authorization`, sin
  logging de datos sensibles, sin contenido mixto ni secretos hardcodeados.

[1.0.0-rc.1]: https://github.com/-/releases/tag/v1.0.0-rc.1
