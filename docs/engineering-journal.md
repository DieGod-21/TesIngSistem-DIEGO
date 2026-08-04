# Diario de ingeniería

Registro continuo del programa de refinamiento del producto. **No se sobrescribe:
cada iteración añade una entrada.** Antes de empezar una nueva iteración hay que
leer las anteriores — sobre todo los errores — y no repetir un fallo de método
sin explicar por qué se repitió.

> **Nota de origen.** El diario se crea en la iteración 8. Las entradas 6 y 7 se
> reconstruyen a partir de los informes de esas iteraciones; las iteraciones 1–5
> son anteriores y solo se conservan sus lecciones agregadas, no su detalle. Esto
> se declara para que nadie lea el diario como si fuera un registro contemporáneo
> de todo el programa.

---

## Lecciones heredadas (iteraciones 1–5)

- El patrón dominante del código no era la ausencia de abstracciones, sino
  **abstracciones correctas que nadie adopta**: `Field` con 1 de 6 consumidores,
  `AsyncState` con 1 de 13, el token `--ring` con 0 de 10. La causa habitual es
  un escape (una prop opcional, un alias permisivo) que permite no adoptarla.
- **Medir antes de diseñar la escala.** Dos escalas (tipográfica y de espaciado)
  se diseñaron primero y la medición posterior demostró que habrían encogido el
  KPI un 17 % y movido ~170 declaraciones. Se rehicieron a partir de los datos.
- Una migración generó 10 declaraciones `-var(--space-N)` —CSS inválido, que el
  navegador descarta en silencio— y pasó `tsc`, el build y 170 tests sin una sola
  señal. De ahí nacieron `architecture.test.ts` y el CI.

---

## Iteración 6 — Contraste medido sobre render real

### Qué se descubrió
Primera medición de contraste con render real (Chromium + canvas) en lugar de a
ojo. 12 pares token-texto/superficie incumplían WCAG AA. `--text-muted` —el token
de TODOS los metadatos del producto— estaba a **2.29:1**, menos de la mitad del
mínimo y por debajo incluso del umbral 3:1 de texto grande.

### Causa raíz
`--text-secondary` y `--text-muted` eran alias de la rampa de grises. Una rampa
es una paleta; el contraste es un contrato. Mezclarlos hacía que ajustar la
paleta rompiera la accesibilidad sin que nada avisara.

### Solución
Ambos tokens dejan de ser alias y se fijan explícitamente, con el valor hallado
por bisección de 40 pasos contra el render sobre la superficie más exigente.

### Verificación
Tema claro: 12 → **0** fallos. Tema oscuro: 3 residuales, todos `--color-primary`
usado como texto (3.34–4.37:1), documentados y no corregidos a medias.

### Errores cometidos
- **El medidor de contraste fabricó 23 fallos inexistentes.** Chromium serializa
  los colores computados como `oklch(...)` y el parser los leía como RGB,
  devolviendo 1.00:1 en textos legibles. Se detectó por desconfiar de un
  resultado imposible, no por una comprobación.
- El comentario del propio código decía `/* ~4.2:1 */` —un número por debajo de
  AA— y se había enviado igualmente. Estaba a la vista y no se leyó como fallo.

### Lecciones
1. **No se construye un instrumento y se usa en la misma pasada sin calibrarlo**
   contra un caso de valor conocido.
2. Un número escrito en un comentario es una medición: hay que leerlo como tal.

---

## Iteración 7 — Un solo idioma para el estado

### Qué se descubrió
Primera vez que se renderizan las 10 rutas autenticadas (arnés con doble de
prueba del API + sesión sembrada). Medidas **9 firmas visuales distintas** para
codificar estado; 3 describían el mismo `EstadoTerna`, entre 16 px y 33 px de
alto. La palabra «Completada» se veía de dos formas en pantallas contiguas.
Además, `TernaDetailPage` imprimía el ISO crudo del API (`2025-10-01T15:30:00Z`).

### Causa raíz
Una iteración anterior alineó los **colores** de esos chips con los del sistema y
lo declaró «consistencia total» en un comentario. Alinear tokens no es unificar
componentes: seguían divergiendo en tamaño, caja, tracking, padding y borde. La
declaración prematura impidió que nadie volviera a mirar.

### Solución
`utils/ternaStatus.ts` y `utils/dates.ts`; 6 sitios migrados a `<Badge>`, 3 al
formateador compartido; 3 bloques CSS y 5 overrides oscuros eliminados; 2 reglas
de arquitectura nuevas.

### Verificación
9 → **6** firmas. Primitiva presente en 5 → **8** rutas. `ternas.css`: 24 → 19
overrides oscuros. CSS neto −50 líneas. 182 → 194 tests.

### Errores cometidos
- `fullPage: true` devolvía **frames en blanco** (el contenido vive en un
  contenedor con scroll propio). Casi se reporta «el dashboard no renderiza».
- Los KPI animan un contador; dos lecturas lo pillaron en vuelo y casi se reporta
  «las cifras se contradicen entre componentes». No se contradecían.
- Un campo omitido en el fixture pintó `≥ undefined` en pantalla y se estuvo a
  punto de atribuir al producto.

### Lecciones
3. **Nunca declarar un problema resuelto sin medir el resultado.** Un comentario
   que afirma consistencia sin número al lado es una hipótesis, no un hecho.
4. Antes de atribuir un defecto al producto, comprobar que no lo produce el
   propio arnés.

---

## Iteración 8 — La altura de los controles

### Qué se descubrió
Se cerraron las dos incógnitas que la iteración 7 dejó abiertas: **las dos eran
falsas alarmas propias** (ver «Errores»). Luego se renderizó por primera vez la
superficie de diálogos —5 modales que nunca se habían abierto— y se midió la
altura de todo control interactivo a 375 px:

- `.ui-btn`, **la primitiva del sistema**, renderizaba a 30, 34.8 y **36 px**.
- Cinco botones de cerrar a medida: 32, 32, 26 y ~18 px, y **solo uno definía
  `:focus-visible`** — el afordance de teclado dependía del modal.
- `.nota-edit-btn` a **22 px**: incumplimiento real de WCAG 2.5.8 (AA, 24 px).
- Ocho clases de input con seis alturas; la primitiva `Field` (41 px) es
  justamente la que los modales no usan.

### Causa raíz
`.ui-btn` **no declaraba altura**. Era el residuo de
`padding + font-size × line-height + borde`, así que el tamaño del icono que
pasara cada sitio de llamada movía la caja: `<Plus size={18}>` daba 36 px y
`size={16}` daba 34.8 px. Circulan **seis tamaños de icono** (12…18) por los
botones del producto. La altura de un control es un contrato del sistema de
diseño, no una consecuencia del contenido.

### Solución
Escala `--control-h-sm|md|lg` (32/36/44 px, valores tomados de lo que el producto
ya hacía bien: la navegación lateral y `.ui-chip` ya median 44). `.ui-btn` declara
`min-height` por tamaño. Nueva primitiva `.ui-icon-btn` que absorbe los cinco
botones de cerrar y `.nota-edit-btn`. Tres reglas de arquitectura nuevas.

### Verificación (sobre render)
| | Antes | Después |
|---|---|---|
| `.ui-btn` md, 5 variantes | 34.8 y 36 px, fraccionaria | **36 px exacto** |
| `.ui-btn--sm` | 29.59 px | **32 px** |
| Botón de cerrar | 32/32/26/~18 px | **32 px, uno solo** |
| `.nota-edit-btn` | 22 px (incumple AA) | **32 px** ✓ |
| Tests | 194 | **197** |

Diálogos verificados en claro y oscuro: `aria-modal`, etiquetados, foco atrapado
dentro, y el modo oscuro resuelto **por herencia de tokens**, sin overrides.

### Errores cometidos
- **Las capturas «dark» de diálogos no eran oscuras.** El `addInitScript`
  llamaba a `setAttribute` sobre `document.documentElement`, que aún no existe al
  inicio del documento; la excepción abortaba el listener y el tema nunca se
  aplicaba. Se detectó al ver un modal blanco en una captura etiquetada `dark`.
  **Había afirmado verificación en oscuro sin tenerla.**
- Se leyó como «la hoja móvil se corta» algo que la medición desmintió
  (`cutOff: 0`, scrollable, los tres botones visibles).
- La contradicción de `/ternas/1` de la iteración 7 era del fixture: puso el
  **nombre** del curso donde el contrato espera el **código** (`'043'`/`'049'`),
  y `buildCursosResumen` descarta en silencio lo que no case.

### Lecciones
5. **Una captura de pantalla no prueba lo que su nombre de archivo afirma.** Hay
   que verificar que la condición bajo prueba se aplicó de verdad.
6. Sexto artefacto del instrumental en tres iteraciones. El patrón no cambia:
   se construye la herramienta y se usa sin calibrarla. La regla 1 existe desde
   la iteración 6 y se ha incumplido en la 7 y en la 8. **Consecuencia: cualquier
   arnés nuevo debe validarse contra un caso de resultado conocido antes de
   emitir un solo hallazgo.**

### Oportunidades restantes
1. **11 alturas literales** en el rango táctil, congeladas como línea base. Cada
   una exige verse antes de tocarla; algunas serán geometría legítima.
2. **Ocho clases de input, seis alturas.** Los modales no usan `Field`.
3. `.tsb-pill` (33 px) vs `.ui-badge` (25 px): último duplicado de significado.
   No se migró porque puede ser jerarquía deliberada; hay que decidirlo mirándolo.
4. `StudentQuickView` sigue **sin renderizarse nunca** (no se halló su disparador).
5. Estados de error y vacío: no renderizados aún.
6. Botones a 36 px en móvil, por debajo de los 44 px de Apple HIG/Material.
   Evaluar `@media (pointer: coarse)`.
7. Cuatro layouts distintos para «filtrar una colección»; dos idiomas de gráfico
   para el mismo porcentaje de aprobación.

---

## Reglas permanentes del proceso

Cada regla nace de un fallo real. **No son recordatorios: son precondiciones.**

| # | Regla | Origen |
|---|---|---|
| P1 | **Ningún instrumento emite una medición sin haber pasado antes por un caso de resultado conocido.** Implementado en `selftest.mjs`, que es precondición ejecutable de toda auditoría. | 6 artefactos en 3 iteraciones |
| P2 | **Todo fixture se valida contra el contrato del código**, no contra lo que yo crea que devuelve el API. Los campos requeridos se extraen del propio TypeScript. | `nota_minima_requerida` ausente (it. 7 y 8) |
| P3 | **La identidad sembrada en la sesión debe coincidir con la que devuelve el endpoint de identidad.** Si no, se audita en silencio un rol distinto del que se cree. | it. 9: `/api/usuarios/yo` devolvía siempre admin |
| P4 | **Una captura no prueba lo que afirma su nombre de archivo.** Hay que verificar que la condición bajo prueba se aplicó de verdad. | it. 8: capturas «dark» que eran claras |
| P5 | **Ningún cambio de UI se acepta sin verlo en claro Y en oscuro.** | it. 8 |
| P6 | **Ninguna medición se limita a lo que la sonda alcanza.** Las superficies tras `<details>`, modales o rutas por rol quedan fuera y deben abrirse explícitamente. | it. 9: el formulario de evaluación y el login quedaron fuera de dos barridos |
| P7 | **No declarar un problema resuelto sin medir el resultado.** Un comentario que afirma consistencia sin número al lado es una hipótesis. | it. 7: «consistencia total» falsa |
| P8 | **Antes de implementar, ordenar por impacto × frecuencia × riesgo ÷ coste.** Resolver primero la mayor fuente de inconsistencia. | it. 9 |

---

## Iteración 9 — El proceso primero, luego los campos

### Observación
El encargo obliga a detener la implementación si el mismo fallo de método se
repite. Se repetía: seis artefactos de instrumental en tres iteraciones, misma
causa. **La iteración empezó por el proceso.**

### Evidencia
`selftest.mjs` (calibración obligatoria: contraste contra referencias conocidas,
resolución oklch→sRGB, aplicación real del tema, detección de lienzo en blanco,
fixtures contra contratos) **detectó en su primera ejecución** el mismo campo
ausente que me engañó en la iteración 7 y que nunca llegué a corregir.

Con el instrumental calibrado, la observación de estados nunca renderizados dio:
- **Error y vacío: correctos en las 6 rutas** — mensaje, `role="status"`, reintento.
- **Permisos: correctos** — la barra oculta las secciones y el acceso directo por
  URL muestra «Acceso restringido». Un supuesto fallo de permisos resultó ser,
  otra vez, artefacto del arnés (regla P3).
- **Campos: 10 clases, 6 alturas** (33/35/36/37/41px). `.ui-field__input`, el
  campo del sistema, se usaba en UNA pantalla. Dentro del mismo formulario el
  input medía 35px y el select 37px.

### Causa raíz
Idéntica a la de los botones en la iteración 8, un nivel más abajo: la altura
del campo emergía de `padding + font-size` y cada modal eligió su padding. El
borde era de 1.5px frente al 1px del sistema.

### Alternativas rechazadas
- **A. Dar el token de altura a cada clase a medida.** Rechazada: deja 10 clases;
  la divergencia vuelve con el próximo modal. Cura el síntoma.
- **B. Migrar los modales al componente `Field`.** Rechazada *por ahora*: obliga
  a reescribir el marcado de etiquetas y validación de tres formularios que solo
  he renderizado una vez. Riesgo desproporcionado para una iteración.
- **C. `.ui-control`: una clase que posee la CAJA y que las clases de pantalla
  componen.** Elegida. Solo CSS y una clase añadida por campo; cero reescritura
  de marcado; mismo patrón que `.ui-icon-btn` y `.toast__close` en la it. 8.

### Verificación
| | Antes | Después |
|---|---|---|
| Clases de campo | 10 | **4** |
| Alturas distintas | 6 | **3** |
| Altura de todo control real | 33–41 px | **44 px** |
| Tests | 197 | **198** |

`tsc` 0 · `eslint` 0 errores · 198/198 · build ✓ · diálogos y login revisados en
claro y oscuro, sin regresión.

### Intento de rotura (fase obligatoria)
No logré romperlo visualmente: la flecha nativa del `<select>` sobrevive, el
modo oscuro se resuelve por herencia, el anillo de foco permanece y los dos
diálogos de creación siguen siendo gemelos. **Lo que sí encontró la regla nueva
fueron tres cajas más** que ninguna sonda había alcanzado: el formulario de
evaluación (tras un `<details>` colapsado), el login y el selector de página.

### Impacto en arquitectura
El sistema de diseño pasa a poseer las tres cajas fundamentales: botón
(`--control-h-*` + `.ui-btn`), botón de icono (`.ui-icon-btn`) y campo
(`.ui-control`). Las hojas de feature conservan ancho y posición; nunca la caja.

### Riesgos futuros
- `.ui-control` es una clase, no un componente: nada obliga a añadirla en un
  campo nuevo. La regla de arquitectura detecta la *reimplementación* de la caja,
  pero no un campo desnudo. Es el siguiente eslabón a cerrar.
- 44 px es cómodo en escritorio y correcto al tacto, pero engorda los
  formularios densos. Si aparece un formulario de más de 6 campos, revisar.
