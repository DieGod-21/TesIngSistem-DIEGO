# Students Workspace — Baseline de arquitectura

> **Estado: EPIC CERRADO (Waves 0–6).** Esta arquitectura es la **línea base**.
> Todo trabajo nuevo debe ir como **feature/epic separado**, sin modificar esta
> arquitectura salvo que sea estrictamente necesario. Antes de tocar algo aquí,
> lee "Invariantes" y confirma que el cambio no los rompe.

El módulo convierte el listado de estudiantes en un **espacio de trabajo del
coordinador**: sugiere el siguiente trabajo (Work Queue), muestra el pulso del
pipeline (Progress band + lente compartida) y resume los cambios desde la última
visita — todo derivado de un único motor de dominio.

## Capas (dependencia de arriba hacia abajo)

```
DOMINIO (puro, única fuente de verdad, determinista dado el input)
  domain/types.ts · domain/pipelineMeta.ts (STAGE_ORDER)
  domain/stage.ts (deriveGradStatus, deriveStage)
  domain/workQueue.ts (deriveWorkQueue, deriveWorkItem)
  domain/snapshot.ts (buildSnapshot, diffSnapshots, queueSignatureOf)
        │ produce WorkQueueResult / SnapshotDiff
        ▼
DATOS (compone cachés de servicios DUEÑOS; sin caché propia)
  data/workspaceData.ts → estudiantes | tesis | ternas | reportes
        ▼
POLÍTICA / CONFIG (feature, pura, exhaustiva)
  queuePolicy.ts (visibilidad · capacidad · selección)
  lens/lens.ts (lente compartida) · navigation.ts (→ config/routes.ts)
  dismissals.ts · snapshotStore.ts (persistencia localStorage)
        ▼
PRESENTACIÓN (React delgado, sin reglas de negocio)
  hooks/useStudentsPipeline · hooks/useDismissals · hooks/useSinceLastVisit
  components/WorkQueue · components/ProgressBand · components/SinceLastVisit
  (orquestado por pages/StudentsListPage.tsx, gated por canViewReports)
        ▼
PERSISTENCIA: localStorage versionado (wq_dismissed_v1, wq_snapshot_v1), per-dispositivo
```

Utilería compartida: `utils/assertNever.ts` (exhaustividad en compilación).

## Invariantes (contrato de la línea base — no romper)

1. **El dominio es la única fuente de verdad.** Etapas, ítems, prioridad, aging,
   snapshot/diff se derivan en `domain/`. La UI no recalcula.
2. **Componentes delgados.** WorkQueue/ProgressBand/SinceLastVisit solo mapean
   copy y disparan callbacks; ninguna decisión de negocio vive en React.
3. **El backend es la autoridad de elegibilidad** siempre que esté disponible; el
   dominio interpreta la pertenencia a `/tesis/aprobados|reprobados`, no la
   recalcula. (Ver deuda: `utils/thesisStatus.ts` en el detalle.)
4. **Nunca datos rancios tras una mutación.** Cada servicio posee su caché y toda
   escritura la invalida (ver "Contrato de datos").
5. **Construcción de rutas centralizada** en `config/routes.ts`; ningún literal
   de ruta fuera de ahí.
6. **`PipelineStage` / `WorkItemKind` / `WorkItemTargetKind` exhaustivos en
   compilación** (Records + `assertNever`); un caso nuevo rompe el build, no el
   runtime.
7. **Gating de capacidad de fuente única** (`queuePolicy.KIND_REQUIRED_CAPABILITY`).
8. **Visibilidad de cola ≠ `selfClearing`** (conceptos independientes en
   `queuePolicy`).
9. **Determinismo:** mismos datasets (+ mismo `now`) ⇒ misma salida. La impureza
   (hora, storage) vive solo en los hooks del borde.
10. **Sin estado global nuevo:** solo estado local + localStorage.

## Contrato de datos y caché

- Cachés con **dueño** (patrón `recurso:sub`, TTL por defecto de `services/cache.ts`):
  `estudiantes:registry`, `tesis:*`, `ternas:list`, `reportes:ternas-global`.
- Invalidación por mutación:
  - `upsertNota` / `importarNotas` → `invalidateEstudiantes` + `invalidateTesis`.
  - `importarEstudiantes` / `createStudent` → `invalidateEstudiantes`.
  - `submitEvaluation` / `reopenEvaluation` → `invalidateTernas` + `invalidateReportes`.
  - `saveDraft` → ninguna (un borrador no cambia campos en lote).
- **Resiliencia por-fuente** (`workspaceData.getWorkspaceDatasets`): el **padrón es
  requerido** (su fallo propaga error); tesis/ternas/reporte **degradan a vacío**
  de forma independiente y reportan a telemetría. El dominio tolera esos vacíos.

## Limitaciones conocidas / deuda (heredada, aceptada)

- **Doble cálculo de elegibilidad:** el detalle usa `utils/thesisStatus.ts`; el
  workspace confía en las listas del backend. Ante divergencia, **manda el backend**.
- **Escalabilidad:** el padrón se descarga completo (`FETCH_ALL_LIMIT`, con guarda
  de truncamiento). Migrar a paginación server-side es trabajo futuro.
- **Persistencia per-dispositivo** (descarte + snapshot): no colaborativa; subir
  `WORKSPACE_STORAGE_VERSION` deja el dato viejo huérfano sin GC.
- **Freshness:** el roster (`TesisFilteredView`) lee tesis sin caché; el pulso, con
  caché (≤60s) → pueden divergir brevemente.
- **Edge "falso inbox-zero":** si el padrón carga pero **todas** las fuentes de
  enriquecimiento fallan, la cola muestra "Todo al día". Mitigado por telemetría.

## Desarrollo

- Build: `npm run build` (`tsc && vite build`).
- Tests: `npx vitest run src/features/students-workspace`.
- El dominio y la política son puros → testeables sin React; los componentes
  tienen tests de render (`components/*.test.tsx`).
