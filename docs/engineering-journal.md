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
| P9 | **Un token inexistente es un fallo silencioso.** Referenciar `var(--space-18)` cuando la escala salta de 16 a 20 hace que el navegador descarte la declaración entera. Hay regla de arquitectura que lo detecta. | it. 10 |
| P10 | **Para forzar un estado de la app en una auditoría, hay que usar el mecanismo de la app**, no manipular el DOM. Fijar `data-theme` a mano lo pisa React al montar; el tema se fija por `localStorage`, que es de donde lee el `ThemeProvider`. | it. 10 |
| P11 | **Un instrumento no se declara estable por el TEXTO.** Un fundido no cambia una sola letra: la página parece quieta con la animación viva. `settle()` espera además a `document.getAnimations()`, excluyendo las infinitas. | it. 11: la tarjeta de login fotografiada al 85 % de opacidad se leyó como «translúcida y lavanda» |
| P12 | **Un arreglo de instrumento que vive duplicado se pagará dos veces.** Cuando el mismo fallo aparece en dos scripts, la causa raíz no es el fallo: es la duplicación. El arranque de página (tema + sesión + doble de API) es UNO solo, en `harness.openPage`. | it. 8 y it. 11: el mismo bug del tema, en `dialogs.mjs` y en `capture.mjs`, arreglado por separado |
| P13 | **Antes de reportar que una superficie carece de una propiedad, verificar el disparador de la sonda.** Dos «defectos de accesibilidad» eran selectores muertos del arnés: el panel se gobierna por URL y el botón buscado no existía con ese nombre. | it. 11: `role=dialog` ausente y modal que «no abría» |
| P14 | **Contar elementos movidos no es medir desplazamiento.** Identificar nodos por «el n-esimo con etiqueta X» se rompe en cuanto el DOM INSERTA nodos: se comparan elementos distintos. Se miden hitos CON NOMBRE (selector estable) y se reporta la magnitud, no el recuento. | it. 12: la busqueda daba «234 elementos desplazados» y «780px» en una pagina quieta; el desplazamiento real era 0 |
| P15 | **Un dataset sin variacion audita una sola rama.** Si todos los fixtures son el camino feliz, las pantallas que el producto sabe pintar para los demas casos no se han visto NUNCA, y ninguna cantidad de capturas lo revela. El dataset debe cubrir explicitamente los estados que el codigo distingue. | it. 12: `NOTAS(i)` devolvia siempre las mismas dos notas aprobadas; PG1 pendiente, sin notas y nota insuficiente jamas se habian renderizado |
| P16 | **Todo campo del doble se DERIVA o se justifica.** Un valor fijo dentro de una respuesta por lo demas derivada acaba contradiciendo al resto y se audita como defecto del producto. | it. 12: `promedio: 84.33, resolucion: 'aprueba_tesis'` fijos hacian que un alumno con 0/3 evaluaciones mostrara «Aprueba tesis» |
| P17 | **La calibracion no es opcional aunque el probe sea de tres lineas.** Un medidor de contraste sin caso conocido devolvio 1.00:1 para SEIS candidatos distintos y parecia un resultado, no un fallo. La regla P1 existia y la salte por ser un script pequeño: el tamaño del instrumento no cambia la regla. | it. 13: `getComputedStyle().color` devuelve `oklch()` literal en Chromium; leer sus numeros como RGB da basura |
| P18 | **Un token con dos papeles opuestos no puede satisfacer a los dos.** Relleno de marca y texto de marca son contrastes contrarios. Cuando un token falla contraste «solo en algunos sitios», la respuesta no es retocarlo: es partirlo por rol y hacer ejecutable que cada uno se use donde toca. | it. 13: `--color-primary` daba 3.34:1 como texto en oscuro |
| P19 | **Medir antes de creerse el diagnostico propio.** Di por hecho que «los botones estan a 36px en movil» y lo arrastre en dos informes. La medicion con puntero grueso real: 214 controles ya en ≥44px y solo 3 por debajo de 32. Casi «arreglo» un problema inexistente y habria inflado las barras densas. | it. 13 |
| P20 | **Los digitos de una captura no son un dato.** Estuve a punto de reportar que el panel se contradecia —KPIs «26/14/11» frente a «27/15/12» en la columna de progreso— y de llamarlo defecto de credibilidad. El DOM decia 27/15/12 en los dos sitios: lei mal los numeros de la imagen. Las capturas sirven para juzgar composicion, jerarquia, ritmo y color; los VALORES se leen del DOM. | it. 14 |
| P21 | **Nunca canalizar un script de render por `head`/`tail`.** `node render.mjs \| head -5` manda SIGPIPE al proceso y mata el bucle: las capturas 6 a 12 nunca se regeneraron y estuve comparando una pantalla nueva contra una imagen vieja. La salida se redirige a fichero y se recorta DESPUES. | it. 14 |
| P22 | **Un medidor que solo imprime fallos es indistinguible de uno roto cuando calla.** Todo probe que reporte por excepcion debe imprimir tambien el recuento de lo que SI comprobo, y pasar por un par conocido-bueno y otro conocido-malo. | it. 14: `token-contrast.mjs` llevaba iteraciones diciendo «nada» sin demostrar que supiera decir «algo» |
| P23 | **Antes de dar espacio a un campo, comprobar que discrimina.** `carrera` parecia el relleno natural para el hueco de la vista rapida: es dato real y ya venia cargado. Son 26 de 27 alumnos con el MISMO valor. Habria repetido «Ingenieria en Sistemas» en cada ficha sin informar de nada. | it. 14 |
| P24 | **Deshabilitar un boton por formulario incompleto es esconder el motivo.** El CTA de acceso —la accion principal de la entrada al producto— salia gris y muerto, sin decir que faltaba. El guardia ya estaba en `handleSubmit`: habilitarlo convierte un control mudo en uno que explica. | it. 14 |
| P25 | **Una sonda que mide UN elemento no ve lo que vive en su padre.** Dos veces seguidas dio falso positivo: el nombre «cortado sin elipsis» estaba bien recortado, y el campo de busqueda «sin indicador de foco» tiene el anillo en el envoltorio por `:focus-within`, que es el patron correcto. Se mide la CADENA elemento-padre-abuelo, no el nodo suelto. | it. 15 |
| P26 | **Un bloque `prefers-reduced-motion` colocado antes de las animaciones que pretende apagar no apaga nada.** A igual especificidad manda el orden. El CSS se lee correcto, la preferencia se incumple y ninguna lectura lo revela: solo el render. El bloque va al FINAL del archivo, y hay regla de arquitectura que lo verifica. | it. 15: login.css apagaba 1 de 4; proyectos, usuarios y dashboard fallaban solo en movil |
| P27 | **Una sonda de tiempo de ejecucion solo ve donde mira.** Los tres fallos de movimiento reducido vivian en consultas de ancho movil y en dos rutas que la lista de la sonda no visitaba; la regla estatica los encontro sin abrir el navegador. Las dos clases de instrumento son complementarias: la estatica cubre TODO el codigo, la dinamica prueba el comportamiento real. Usar solo una deja un hueco. | it. 15 |
| P28 | **`scrollWidth - clientWidth` no detecta contenido RECORTADO.** Cuando un ancestro tiene `overflow:hidden`, el documento no desborda: el contenido simplemente desaparece por el borde, sin barra de scroll y sin senal. Mi sonda de desbordamiento daba 0 mientras a 768px el armazon entero estaba 136px fuera de pantalla. Se mide contra el borde del VIEWPORT, no contra el documento. | it. 16 |
| P29 | **`min-width: auto` es el valor por defecto de todo item flex, y significa «no encojo».** Basta una tabla ancha dentro para que el contenedor crezca y arrastre la cabecera fuera de la pantalla. Todo contenedor de layout que envuelva contenido de ancho intrinseco necesita `min-width: 0` explicito. | it. 16 |
| P30 | **Una rejilla se disena para un numero de elementos y ese numero cambia.** `repeat(4, 1fr)` con tres tarjetas dejaba una columna vacia permanente en escritorio y un huerfano 2+1 en tableta: mal a TODAS las anchuras, durante quien sabe cuanto, en la pantalla de inicio. Al cambiar cuantos elementos pinta una rejilla, hay que volver a mirarla renderizada. | it. 16 |

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

---

## Iteración 10 — Sprint WOW: percepción

### Observación
Primera vez que se renderiza `StudentQuickView`: no tenía disparador de botón,
se controla por URL (`?preview=<id>`). Llevaba dos iteraciones declarada como
hueco por buscarla mal.

### Evidencia y decisiones
| Defecto observado | Decisión |
|---|---|
| El acuse «copiado» **nunca se revertía** (solo al cambiar de estudiante) | `useCopyToClipboard` con ventana de 1,6 s y limpieza al desmontar |
| Carné copiable en un sitio, texto plano en otros dos | Primitiva `CopyField`; 3 superficies con el mismo lenguaje |
| Franja de color de 3px a la izquierda en las notas | Superficie tonal completa + cifra con color |
| Franja superior de 3px en Proyectos, codificando la fase que la píldora ya decía | Eliminada; pie anclado con `margin-top:auto` para alinear filas |
| CTA del panel en `secondary`, «demasiado fácil de perder» | `primary` + flecha que avanza al apuntar |
| Velo del panel transparente: la lista competía con el panel | `--glass-scrim` + `backdrop-filter`, con respaldo `@supports` |

### Alternativas rechazadas
- **Cristal en varias superficies** (tarjetas KPI, cabecera, barra lateral).
  Rechazada: la guía de diseño prohíbe el glassmorphism decorativo y el propio
  plan pide cristal «solo donde mejore de verdad». Se usa en **una** superficie,
  el velo de un panel modal, que es su caso canónico.
- **Rellenar el vacío del panel con más datos del API.** Rechazada: el panel es
  para decidir rápido; el expediente es para profundizar. Se resolvió con
  materia (veladura inferior), no con contenido.

### Errores cometidos
- `var(--space-18)` **no existe**: la escala salta de 16 a 20. La declaración se
  descartó en silencio y colapsó el ritmo vertical del panel. Detectado mirando
  una captura, no compilando → regla P9 + test de arquitectura.
- Arreglé el bug del tema en `dialogs.mjs` en la iteración 8 y **no lo porté a
  `capture.mjs`**: todo el barrido «dark» de esta sesión salió en claro. Mi
  propia regla P4 lo advertía. Y el arreglo portado tampoco bastaba: el
  `ThemeProvider` restaura su estado y pisa el atributo → regla P10.

### Riesgos futuros
- `--aurora-wash` se aplica ya en dos cabeceras. Si aparece en una tercera sin
  criterio, deja de significar «esta es la identidad» y pasa a ser decoración.
- `backdrop-filter` tiene coste de composición. Está en una sola superficie y
  solo mientras el panel está abierto; vigilar si se extiende.


---

## Iteración 11 — Pasada WOW / Perfección

### Observación
El plan denunciaba «rebotes» al apuntar tarjetas en el expediente. Leer el CSS
no bastaba para confirmarlo ni para descartarlo, así que se construyó un
instrumento (`probe-hover.mjs`) que mide sobre el render dos magnitudes
distintas: si apuntar mueve a OTROS elementos, y cuánto se mueve el elemento
a sí mismo.

El resultado corrigió mi hipótesis de partida: **desplazamiento ajeno = 0** en
las 10 rutas. La regla dura del plan ya se cumplía. Lo que sí existía eran
**106 elementos que se desplazan a sí mismos**, 80 de ellos en la barra
lateral, presente en todas las pantallas.

### Causa raíz
El sistema de diseño codificaba «interactivo» **moviendo el elemento**. El
desplazamiento es el único canal de hover capaz de invalidar su propio
disparador: si la tarjeta sube 2px queda una banda de 2px en su borde inferior
donde el cursor deja de estar encima; el navegador cancela el `:hover`, la
tarjeta baja, el cursor vuelve a entrar. A 1-2px el bucle se lee como parpadeo.
Además el desplazamiento DUPLICA lo que la sombra ya dice: la elevación es la
sombra.

Regla nueva, con test de arquitectura que la sostiene: *el estado al apuntar se
comunica con luz —sombra, borde, fondo, color—, nunca con posición.* Siguen
permitidos `:active` (el puntero está capturado) y transformar un descendiente
del apuntado (la flecha dentro del botón), porque el disparador no se mueve.

### Evidencia y decisiones
| Defecto medido | Decisión |
|---|---|
| 106 elementos con banda de rebote al apuntar | Se elimina el `transform` de los 9 `:hover` propios; la sombra sube un escalón para compensar |
| El copyright del login se renderizaba DOS veces en escritorio | El pie fijo del panel derecho solo existe en móvil, donde el panel de marca está oculto |
| Mitad derecha del login: formulario desnudo sobre una superficie plana | El panel pasa a `--surface-base` y el formulario se convierte en tarjeta: la mitad derecha gana el plano acotado que la izquierda ya tenía |
| «Gestión PG1-PG2» blanco sobre blanco en móvil | El bloque de marca vivía DENTRO de la hoja blanca; se mueve fuera, sobre la banda índigo |
| CTA deshabilitado como gradiente de marca al 50 % | Superficie neutra: «todavía no», no «roto» |
| `INGRESAR` en mayúsculas (Ionic) frente a todos los `.ui-btn` en caja normal | `text-transform: none` |
| Modo claro con la MITAD de profundidad que el oscuro (ΔL 0.027 vs 0.053) | `--surface-base` baja a 0.952 con un punto de croma de marca → ΔL 0.043 |
| «52 %» dos veces en cuerpo grande en la misma pantalla | El dato se queda en el anillo, que lo acompaña de su composición |

### Errores cometidos
- **Afirmé un defecto que no existía.** Al leer el CSS con `grep` interpreté un
  `\*` del render de la herramienta como un comentario mal abierto y concluí que
  una regla entera se descartaba. Los bytes decían `/*`. Comprobarlo costó una
  orden. Lección: una herramienta de búsqueda no es un lector de bytes.
- **Introduje una regresión de contraste** al bajar `--surface-base`: el modo
  claro pasó de 0 a 4 pares por debajo de AA. Lo detectó el propio instrumento
  en la fase de auto-ataque, antes de dar nada por bueno. Se corrigió bajando
  los cuatro tokens de primer plano afectados, no revirtiendo la profundidad.
- **Tercera animación a medio vuelo** leída como defecto visual (P11).
- **Mismo bug de instrumento, arreglado dos veces por duplicación** (P12).

### Alternativas rechazadas
- **Conservar el `translateY` y ampliar el área sensible** con un pseudo-elemento
  que cubriera la banda de rebote. Rechazada: añade una capa invisible por cada
  tarjeta para sostener un efecto que ya era redundante con la sombra.
- **Quitar el anillo de «Progreso académico»** en vez de la métrica de cabecera.
  Habría dejado el carril derecho vacío y obligado a rehacer la rejilla; el plan
  pide explícitamente no reescribir páginas sin necesidad.
- **Revertir la profundidad del modo claro** al aparecer los fallos de contraste.
  Rechazada: el problema no era la profundidad sino cuatro tokens calibrados
  contra el fondo anterior.

### Riesgos futuros
- `--surface-raised` (0.978) queda ENTRE base (0.952) y card (0.995) en claro,
  mientras que en oscuro está POR ENCIMA de card. El modelo de elevación no es
  simétrico entre temas. No molesta hoy porque se usa como relleno interior,
  pero si alguien lo usa para «flotar» algo, en claro se hundirá.
- El margen de contraste del modo claro es ahora estrecho (~4.5:1 justo). Bajar
  `--surface-base` otro punto vuelve a romperlo. Está medido, no supuesto.


---

## Iteracion 12 — Datos de demo y experiencia de estudiante

### Observacion
El plan pedia habilitar datos de demo porque varias rutas «no eran
inspeccionables». La verificacion mostro que **todas** las rutas ya se
renderizaban con el arnes de pruebas visuales (la propia opcion preferente #1
del plan). El hueco real era otro y mas grave: **el dataset no tenia
variacion**. `NOTAS(i)` devolvia siempre las mismas dos notas aprobadas, asi
que la vista rapida y el expediente solo se habian visto con un alumno
perfecto. Las ramas que el producto SI implementa —PG1 pendiente, sin ninguna
nota, nota insuficiente, justo en el umbral— no se habian renderizado nunca.

Decision de mecanismo: NO se añadio una capa de datos de demo dentro de la
aplicacion. El arnes ya existente cubre el objetivo del plan (§0) con la opcion
que el propio plan ordena primero, vive fuera del repositorio —por lo que no
puede afectar a produccion en ningun escenario— y añadir una segunda
implementacion habria violado §21 («do not create parallel implementations»).

### Evidencia y decisiones
| Defecto observado | Decision |
|---|---|
| El encabezado del panel decia «Nota insuficiente · Promedio 80.5» con el minimo 70 debajo | El complemento del veredicto pasa a ser el MOTIVO por curso; el promedio solo se muestra cuando concuerda |
| El panel no respondia «que sigue», su cuarta promesa | Linea de siguiente paso derivada del estado de tesis, con la MISMA funcion que ya usaba el expediente |
| «En progreso» sin decir cuanto falta | Avance de evaluaciones (2/3) en la fila de terna |
| Las sugerencias no marcaban la coincidencia | `highlightRanges` + `<mark>` tintado de marca, con mapa de indices que sobrevive a los diacriticos |
| `ternaHint` duplicado (expediente si, panel no) | Extraido a `utils/thesisStatus`, dos consumidores migrados |

### Errores cometidos
- **Introduje una contradiccion al arreglar otra.** La linea de «siguiente paso»
  se pinto tambien cuando SI habia terna, anunciando «se asigna al recuperar la
  elegibilidad» justo debajo de «Terna 7 · En progreso». Lo caze en la fase de
  auto-ataque, mirando el render del cambio que acababa de hacer.
- **Dos instrumentos de busqueda seguidos dieron falsos positivos** por
  identificar nodos por indice (P14). El tercero, sobre hitos con nombre, dio 0.
- **Deje un objeto sin derivar en el doble** y produjo «Aprueba tesis · 84.33»
  para un alumno con 0/3 evaluaciones (P16).

### Riesgos futuros
- Los perfiles academicos son ahora la unica fuente de verdad del arnes. Si
  alguien añade un endpoint que devuelva notas sin pasar por `perfil(i)`,
  reaparece la clase de incoherencia. El selftest cubre los que existen hoy.
- `verdictReason` y `ternaHint` producen copia en castellano dentro de
  `utils/`. Es el sitio correcto mientras la copia derive del dominio; si crece,
  merece su propio modulo de vocabulario.


---

## Iteracion 13 — Cierre de huecos de auditoria

### Observacion
Los cuatro huecos que el informe anterior dejo abiertos por escrito. Tres se
cerraron con medicion; uno resulto no existir tal y como yo lo habia descrito.

### Evidencia y decisiones
| Hueco | Resultado |
|---|---|
| Contraste del primario como texto en oscuro | Rol partido: `--color-primary` (relleno) vs `--color-primary-text`. Oscuro 3.34:1 → **5.20:1** en el peor caso. 25 usos migrados. Regla de arquitectura que prohibe `color: var(--color-primary)` |
| Notas por estados | 5 estados abiertos. Defecto: registrar una nota que no existe titulaba el dialogo **«Editar Nota»** |
| Usuarios por estados | 5 estados abiertos (listado, alta, validacion, vacio, error 500). Sin defectos. El color del avatar por rol se verifico INTENCIONAL (`tone` explicito, documentado en el propio componente), no duplicacion accidental |
| Objetivos tactiles | Mi diagnostico previo era falso. Reales: 214 controles ≥44px, 3 por debajo de 32. `.qv-icon-btn` era un DUPLICADO de `.ui-icon-btn` a 30px → migrado y eliminado. Iconos a 44px solo bajo `(pointer: coarse)` |

### Errores cometidos
- **Salte mi propia regla P1** por escribir un probe «pequeño»: sin caso
  conocido, seis candidatos dieron 1.00:1 y el resultado parecia valido. Solo
  al añadir «negro sobre blanco = 21:1» quedo claro que el color nunca se
  aplicaba. Tras arreglarlo, los numeros coincidieron EXACTAMENTE con los del
  medidor independiente que ya existia — esa coincidencia es la prueba.
- **Arrastre un diagnostico no medido** («botones a 36px en movil») durante dos
  informes. La medicion lo desmintio.

### Riesgos futuros
- `--color-primary-text` solo esta garantizado en `color:`. Si alguien lo usa
  como relleno, el contraste al reves no esta vigilado.
- El objetivo tactil crece solo para botones de icono. Si aparece un control
  interactivo nuevo con caja propia, no lo cubre nadie.

---

## Iteracion 14 — Pasada de refinamiento visual

Fase de PRODUCTO, no de auditoria: el objetivo era lo que un revisor humano nota
en los primeros treinta segundos.

### El hueco de la vista rapida no era falta de contenido, era orden

El panel insignia tenia **entre el 34 % y el 40 % de su alto vacio en los diez
arquetipos**, medido con `probe-qv-space.mjs`. La tentacion era rellenarlo. Lo
que sobraba no era espacio: era jerarquia invertida.

El carne y el correo ocupaban el primer lugar del cuerpo —justo bajo el nombre—
siendo el dato MENOS decisivo del panel: no ayudan a decidir nada, se copian
para pegarlos en otro sistema. Bajarlos al pie con `margin-top:auto` hizo tres
cosas de una vez: el orden de lectura paso a ser *quien → que estado → por que →
que sigue → como lo contacto*, el hueco se convirtio en la frontera declarada
entre la zona de decision y la de utilidad, y el fondo del panel dejo de estar
vacio. Hueco residual: **24 px** (el propio relleno del cuerpo).

Se verifico que el `margin-top:auto` COLAPSA cuando el contenido desborda: a 560
px de alto los ocho casos vuelven a desplazarse con normalidad.

### El mismo alumno tenia dos nombres para el mismo veredicto

La vista rapida decia «Elegible a tesis» y el expediente, a un clic, «Aprobado».
`VOCAB.verdict*` existia precisamente para eso y el expediente no lo usaba.
Ademas la tarjeta de elegibilidad decia la misma cosa tres veces: titular
(«Cumple requisito de tesis»), etiqueta («APROBADO») y motivo al pie («Cumple con
la nota minima (70) en PG1 y PG2»). Se unificaron las etiquetas y se retiro el
titular, que era el eco mas debil; el veredicto hereda su peso tipografico.

El promedio se imprimia `84.5` en el panel y `84.50` en el expediente. `toFixed(2)`
es el formato de las otras siete llamadas del producto: el panel era el unico
outlier.

### Dos formateadores de tiempo relativo

«hace 2 dias» en la tira de cambios y «hace 314 d» en la cola de trabajo. La
segunda ni se lee: hay que dividir mentalmente. `formatAgo` vive ahora en
`utils/dates.ts` —el modulo que ya existia contra esta misma deriva— con escala
hasta meses y años, y una regla de arquitectura impide volver a componer
«hace …» a mano.

### Lo que NO se cambio

El hueco central de la vista rapida sigue siendo grande. No hay mas informacion
real que mostrar y no se inventa contenido academico para llenarlo. La carrera
se descarto por medicion, no por criterio (P23).

---

## Iteracion 15 — Superficies secundarias y accesibilidad no verificada

### El fallo mas caro fue silencioso

`prefers-reduced-motion` estaba escrito en cinco archivos y **no funcionaba en
cuatro**. La causa no era una media query mal escrita: era su POSICION. El
bloque se colocaba junto a la primera animacion del archivo, y todo lo declarado
mas abajo —a igual especificidad— ganaba.

En login apagaba 1 de 4 animaciones: quien pedia movimiento reducido recibia la
primera pantalla del producto deslizandose en tres piezas. Leyendo el CSS
parecia correcto. Lo delato medir la opacidad real de los elementos con la
preferencia activa: `0.83`, `0.47`, transform aplicado.

En proyectos, usuarios y dashboard el fallo solo existia en movil, dentro de
consultas de ancho declaradas despues del bloque. La sonda de navegador no lo
vio nunca porque medía a 1280 px y no visitaba esas dos rutas. **Lo encontro la
regla estatica**, que no abre el navegador pero lee todo el codigo.

### Tres copias de la misma resolucion

`ternaStatus.ts` nacio porque la etiqueta de ESTADO de terna vivia en tres
archivos. La de RESOLUCION repitio la historia exacta: tres copias literales, y
la de reportes en caja de titulo —«Aprueba Tesis» frente a «Aprueba tesis»—, de
modo que la misma resolucion del mismo alumno se escribia distinto segun la
pantalla. Cuatro textos mas dentro del propio archivo de reportes para la
leyenda de la barra. Ahora hay un mapa y una regla que impide el cuarto.

### Mi dataset ocultaba una rama del producto

Los nueve proyectos compartian descripcion, asi que la rejilla se auditaba con
una sola forma de tarjeta. Al variar longitudes e incluir descripcion nula y
vacia aparecio lo que nunca se habia renderizado: las tarjetas comparten alto
por fila, y una sin descripcion dejaba un vacio entre el titulo y el divisor que
se lee como «esto no cargo». La ausencia ahora se nombra.

### Dos falsos positivos propios

El nombre «cortado sin elipsis» y el buscador «sin indicador de foco» eran
defectos de mis sondas, no del producto (P25). En ambos casos el instrumento
media el elemento y la propiedad vivia en el padre. Corregidos los dos
instrumentos, el producto sale limpio: 0 cortes sin elipsis, 0 textos que
rebasan a su padre, 243 controles enfocables con indicador visible.

### Tono semantico usado como etiqueta de formato

En el dialogo de importacion los formatos de archivo se marcaban con
`<Badge tone="success">Excel</Badge>` y `<Badge tone="danger">PDF</Badge>`. En
todo el producto `success` significa «salio bien» y `danger` «salio mal», y en
ESE MISMO dialogo, unos centimetros mas abajo, el rojo marca las filas
rechazadas de la importacion. Dos significados para el mismo color a treinta
lineas de distancia. El formato de archivo es metadato, no estado: pasa a tono
neutro.

Del mismo tipo: el formulario de alta llamaba «Carnet ID» a lo que el resto del
producto llama «carne» en nueve sitios.

### Estado final de las puertas

```
tsc limpio · eslint 0 errores (5 avisos previos) · build ✓
tests             222 / 222  (28 ficheros)
arquitectura       25 reglas
contraste          48/48 pares AA, ambos temas (medidor calibrado)
foco              243/243 controles con indicador visible
zoom 200 %          0 rutas con perdida de contenido
movimiento reducido 0 animaciones vivas a 1280 y 375 px, 7 rutas
apuntado            0 desplazamientos ajenos · 0 fugas de puntero
desbordamiento      0 · 320→1920
dialogos           20/20 con rol, aria-modal, foco atrapado y tema verificado
consola             0 errores · 0 avisos en 10 rutas
recorrido           9/9 pasos (buscar → sugerencia → teclado → detalle → atras)
recorte             0 textos cortados sin elipsis · 0 que rebasan a su padre
```

---

## Iteracion 16 — Transformacion visual: el armazon se rompia y nadie lo veia

Fase de PRODUCTO. El criterio no era «pasa las puertas» sino «se nota al usarlo».

### El defecto mas grave del programa estaba a 768px

La linea base a cinco anchuras lo enseño de inmediato: en `/students` a 768px el
perfil del usuario, el conmutador de tema, el boton «Importar» y la columna
entera de acciones quedaban FUERA de la pantalla. Y no habia barra de scroll
horizontal para recuperarlos, porque nada desbordaba: algo los recortaba.

Por eso `probe-overflow.mjs` llevaba iteraciones diciendo «0 desbordamientos»
(P28). La causa raiz era `min-width: auto` en dos contenedores de layout (P29):
la tabla de estudiantes tiene un ancho minimo intrinseco de ~856px y el `main`
se negaba a encoger por debajo de el. Con `min-width: 0`, el `overflow-x:auto`
que la tarjeta de la tabla YA tenia por fin funciona: se desplaza la tabla, no
la aplicacion.

### La rejilla de indicadores estaba mal a todas las anchuras

`repeat(4, 1fr)` para tres tarjetas: cuarta columna vacia en escritorio,
huerfano 2+1 de 1280 para abajo. En la pantalla de inicio (P30).

### El listado no mostraba aquello por lo que filtra

La lente dice «Elegibles a tesis 15 / Pendientes 6» y la tabla tenia columnas
Estudiante · Email · Carrera · Estado(activo). Para saber si un alumno cumple
habia que filtrar o abrir su ficha, uno a uno, en el producto cuyo objeto ES la
elegibilidad. Los dos conjuntos oficiales ya venian en el mismo lote que
alimenta la cola de trabajo: solo habia que indexarlos.

«Carrera» cedio el sitio (es identidad, vive en el expediente) y «Activo» dejo
de ser pildora verde: dos verdes contiguos con significados distintos anulaban
el escaneo de la columna que importa. El color queda para el veredicto; el
estado administrativo solo destaca su excepcion.

Comprobado contra las listas oficiales: 15 elegibles, 6 insuficientes, 6 sin
notas, 27 filas, 0 sin clasificar.

### Escape no cerraba la navegacion movil

El cajon tiene velo y tapa el contenido, pero Escape no hacia nada y el foco se
quedaba fuera, en el boton de menu. Los otros cuatro dialogos del producto
cierran con Escape y atrapan el foco: el usuario aprende la regla en todo el
sistema y aqui dejaba de valer. `useFocusTrap` ya existia y es inerte cuando el
cajon esta cerrado, asi que la barra fija de escritorio no se entera
(verificado: el foco sale de la barra al tabular a 1440px).

### El panel se repetia a si mismo tres veces

Medido en el DOM: la tira de indicadores decia 27 / 15 / 12 y la tarjeta de
progreso, a 300px de distancia, volvia a decir 15 / 12 / 27 en cuerpo menor,
mas un pie que escribia el 12 por cuarta vez («12 estudiantes requieren
atencion»). Lo unico que esa columna aporta y las tarjetas no es la PROPORCION,
que es el anillo. Se quedan el anillo y las etiquetas de color; se van las
cifras.

Al quitarlas quedo al descubierto un defecto que las cifras tapaban: la leyenda
mostraba un punto verde y otro ambar mientras el anillo era un degradado aurora
indigo-cian. Dos puntos de color que no correspondian a nada en pantalla, en un
elemento cuyo unico trabajo es representar una composicion. El anillo era
decorativo y decia ser una leyenda. Ahora el arco lleva el verde de «cumple» y
la pista el ambar de «no cumple», que es exactamente lo que la leyenda nombra.

Primer intento de la pista: `color-mix(in oklch, var(--color-warning) 30%,
var(--surface-raised))`. Sale MALVA: mezclar un ambar con un gris frio en OKLCH
interpola el matiz por el camino corto. Se ve en la captura y no en el codigo.
Los tokens `--color-warning-light` ya existian en los dos temas.

---

## Iteracion 17 — Evolucion funcional: lo que el API permitia y el producto no hacia

### P31 — Un mapa de endpoints envejece, y su comentario mas rapido que el codigo

`apiConfig.ts` llevaba un bloque de veinte lineas explicando que crear ternas
NO estaba soportado por el backend, con la firma sugerida del endpoint que
faltaba. La especificacion publicada en `/api-docs.json` declara
`POST /api/ternas` — «Crear terna y asignar evaluadores (solo admin)» — con su
cuerpo completo. El comentario describia el contrato del dia en que se escribio
y despues nadie volvio a preguntarle al servidor.

El coste no fue el comentario: fue que el producto entero se organizo alrededor
de esa creencia. La pantalla de ternas era de solo lectura y su estado vacio le
decia al usuario que las ternas «se generan en el sistema de Control de Notas»,
enviandolo fuera del producto a hacer algo que el producto podia hacer.

Regla: antes de dar por imposible una capacidad, descargar la especificacion.
No leer el comentario que dice que no se puede.

### P32 — Un formulario que no puede funcionar no falla: nadie lo usa

`POST /api/proyectos` exige `estudianteId`. El dialogo «Nuevo Proyecto» enviaba
`{titulo, descripcion, fase}`. Ese formulario no podia crear un proyecto en
ninguna circunstancia, y llevaba asi el tiempo suficiente como para haber
pasado por varias auditorias de accesibilidad, de responsive y de contraste. Un
formulario roto supera todas esas pruebas sin despeinarse: tiene sus etiquetas,
su foco visible, su contraste AA y su comportamiento en movil.

Lo que ninguna de esas pruebas hace es PULSAR EL BOTON. Verificar un flujo de
escritura es ejecutarlo contra el contrato y comprobar que la entidad aparece.

### P33 — Un conjunto de datos de prueba se cuela en produccion por un import estatico

El conjunto de demostracion vive bajo `src/dev/`, `demoDataActivo()` devuelve
`false` fuera de desarrollo y todo colgaba de `if (import.meta.env.DEV)`. Aun
asi, `grep` sobre `dist/` encontraba los nombres de los estudiantes ficticios en
el bundle de produccion: `App.tsx` importaba `<DemoBanner>` de forma ESTATICA, y
un import estatico ata el modulo al grafo aunque la bandera sea falsa en tiempo
de ejecucion.

La bandera de entorno solo elimina codigo si TODO el camino hasta el modulo es
dinamico. La banda de aviso pasa a pintarse con DOM plano desde el propio modulo
de desarrollo, alcanzado unicamente por `await import()` dentro del `if`.

Regla: una garantia de «esto no viaja a produccion» se comprueba con `grep`
sobre el artefacto construido, no leyendo el codigo fuente.

### P34 — Colocacion correcta, cobertura incompleta

La iteracion 16 dejo una regla que exige que el bloque `prefers-reduced-motion`
vaya despues de la ultima animacion de su archivo. `students-list.css` la
cumplia y, con la preferencia activa, sus veintisiete filas seguian entrando
deslizandose: el bloque escribia `transition: none` y jamas mencionaba
`animation`.

Una regla sobre DONDE esta el bloque no dice nada sobre QUE apaga. La nueva
regla exige que un archivo que enciende animaciones las neutralice, y esta
calibrada contra el fallo concreto (se reintroduce, la regla falla; se corrige,
pasa).

### P35 — Un numero que se corrige solo es peor que un numero ausente

El alta de terna proponia el siguiente numero libre. Mientras cargaba la lista
de ternas mostraba «#1» y un instante despues lo cambiaba a «#6». Quien ya lo
habia leido se quedaba con el numero equivocado, y el fallo es invisible salvo
que se mire exactamente en el primer medio segundo. Ahora muestra «…» hasta
saberlo y el envio queda bloqueado mientras tanto.

### Lo que solo se ve con el producto lleno

Con veintisiete expedientes, once proyectos y cinco ternas coherentes entre si
aparecieron cuatro defectos que ninguna sonda habia encontrado en pantallas
vacias:

- El indicador «Estudiantes» del panel mostraba `total_estudiantes` de
  `/api/tesis/resumen`, que es aprobados + reprobados: anunciaba 21 y al pulsarlo
  abria una lista de 27 (contra el servidor real, 31 frente a 32).
- El tercer indicador sumaba un `pending` que por definicion del endpoint vale
  siempre cero, y su descripcion prometia incluir «con nota pendiente», gente que
  la tarjeta nunca conto ni su destino muestra.
- El expediente imprimia «Ciclo Ciclo 1-2025»: el catalogo ya devuelve el valor
  con su prefijo y la plantilla lo anteponia otra vez.
- `carrera` es un CODIGO (`"1890"` en los 32 expedientes del servidor real) y se
  pintaba desnudo bajo el nombre del estudiante, donde un numero suelto se lee
  como un dato roto.
- El nombre del estudiante en la ficha de proyecto se cortaba sin puntos
  suspensivos: `text-overflow` no actua sobre un nodo de texto suelto dentro de un
  contenedor flexible, hace falta un bloque propio.
- Un titulo de anteproyecto de treinta palabras estiraba TODA su fila de la
  cuadrilla de ternas y dejaba a las vecinas con un tercio de tarjeta vacio.

### Cinco armazones de dialogo para un solo dialogo

`np-`, `nu-`, `im-`, `en-` y `.ui-modal` resolvian lo mismo discrepando justo en
lo que se nota al abrir dos seguidos: relleno de cabecera 20/24 frente a 16/20,
cuerpo 24 frente a 20, radio `xl` frente a `lg` y titulo `lg` frente a `md`.
Ninguna diferencia respondia a una razon. Medido tras unificar: los cinco
dialogos del producto dan radio 16px, cabecera 20/24/16 y titulo 18px.
