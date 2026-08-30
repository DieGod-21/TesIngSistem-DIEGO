# Changelog

Todas las entradas notables de este proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y versionado según [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Changed
- **«Expedientes por revisar» deja de parecer una avería.** Probado contra el
  servidor real, el bloque se seguía leyendo como «algo se rompió»: la causa no
  era el tono ámbar sino la superficie entera teñida de él. Ahora la tarjeta es
  neutra —la misma que usa la cola de trabajo, que dice lo mismo y nadie
  confunde con un fallo— y el ámbar queda como ACENTO en el distintivo y la
  cifra. La semántica de aviso no cambia: sigue sin `role="alert"` y sigue
  ofreciendo «Revisar», nunca «Reintentar». Cada fila pasa a ser un destino
  pulsable con realce y anillo de foco, y la acción principal viaja junto a la
  cifra en vez de al pie, lo que además devuelve altura a la cola de trabajo.
- **Recorrido de la vista rápida como una sola pieza.** Anterior, posición y
  siguiente comparten marco: el contador separa la posición actual (destacada)
  del total (apagado) y se enuncia entero para lectores de pantalla
  («Expediente 19 de 20»), en lugar de un «19 de 20» en el tamaño más pequeño
  de la escala junto al aspa de cerrar. Los controles suben a 36px, con estado
  inerte legible en los extremos.
- **Cristal más presente sin cristal nuevo.** `--glass-surface` estaba al 88 %
  de opacidad: se pagaba la capa de composición del desenfoque sin obtener el
  efecto. Baja a 78 % (80 % en oscuro) y la saturación del material sube de
  1.06 a 1.25. No se añade cristal a ninguna superficie nueva.

### Fixed
- **Recorrer expedientes reconstruía el panel entero.** La vista rápida
  dependía de `loading` a secas, así que cada pulsación de flecha desmontaba
  identidad, cuerpo y pie, mostraba cuatro barras grises y lo volvía a montar:
  hojear veinte expedientes se sentía como abrir veinte paneles. Ahora el
  expediente anterior se conserva en pantalla hasta que llega el siguiente, y
  solo transiciona el contenido; el atenuado de la espera lleva 120 ms de
  retardo, de modo que una carga de caché no llega a parpadear.
- **Desplazamiento automático bajo la cabecera pegajosa.** El hueco que
  reservaba la fila del padrón existía solo ahí; la terna y el proyecto recién
  creados se llevaban a la vista y quedaban tapados. Se unifica en la utilidad
  `.ui-scroll-anchor`, aplicada en los tres sitios que desplazan por su cuenta.
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

### Added
- Pruebas de regresión del recorrido: `StudentQuickView.test.tsx` (el relevo no
  remonta el panel ni cae al esqueleto) y `EligibilityAudit.test.tsx` (informa
  de trabajo, no de avería; singular, plegado y enlace por identificador), más
  el recorrido en navegador `cypress/e2e/vista-rapida.cy.ts`.

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
