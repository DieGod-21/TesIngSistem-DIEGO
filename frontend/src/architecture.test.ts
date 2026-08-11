import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * architecture.test.ts — Puertas de calidad que NINGUNA otra herramienta cubre.
 *
 * Motivo concreto de existir: durante la migración de espaciado se generaron 10
 * declaraciones `-var(--space-N)`, que no es CSS válido —el navegador las
 * descarta en silencio— y que atravesaron `tsc`, el build de producción y los
 * 170 tests sin una sola señal. El CSS de este producto no lo valida nadie.
 *
 * Estas reglas se aplican sobre el CÓDIGO FUENTE, no sobre el render. No
 * sustituyen a una revisión visual: impiden que vuelva la deriva ya corregida.
 *
 * ── Sobre la LÍNEA BASE ──────────────────────────────────────────────────
 * Tres reglas tienen deuda preexistente y documentada. En vez de desactivarlas
 * (que las volvería decorativas) o de bloquear el repositorio, se congela el
 * recuento actual por archivo: la regla falla si un archivo empeora o si
 * aparece uno nuevo. La deuda solo puede encogerse.
 *
 * Al corregir un archivo, BAJA su número aquí. Si llega a 0, quítalo.
 * Subir un número requiere justificarlo en la revisión.
 */

const SRC = join(__dirname);

function walk(dir: string, ext: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, ext, out);
        else if (entry.endsWith(ext)) out.push(full);
    }
    return out;
}

const rel = (f: string) => relative(SRC, f).split(sep).join('/');
const read = (f: string) => readFileSync(f, 'utf8');

const cssFiles = walk(SRC, '.css');
const codeFiles = [...walk(SRC, '.tsx'), ...walk(SRC, '.ts')].filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'));
const themeFile = (f: string) => rel(f).endsWith('theme/variables.css');

/** Cuenta coincidencias por archivo, omitiendo los que no tienen ninguna. */
function countBy(files: string[], re: RegExp, skip: (f: string) => boolean = () => false) {
    const out: Record<string, number> = {};
    for (const f of files) {
        if (skip(f)) continue;
        const n = (read(f).match(re) ?? []).length;
        if (n > 0) out[rel(f)] = n;
    }
    return out;
}

/**
 * Cuenta valores de una propiedad CSS que NO satisfacen `ok`.
 *
 * Se extrae el valor y se decide en JS en lugar de negarlo con un lookahead:
 * `prop:\s*(?!var\()` es un falso negativo silencioso, porque `\s*` retrocede a
 * cero caracteres y el lookahead se evalúa sobre el espacio, no sobre `var(`.
 * Ese error hizo pasar por limpias 40 declaraciones ya tokenizadas.
 */
function countBadValues(files: string[], prop: string, ok: (value: string) => boolean, skip: (f: string) => boolean = () => false) {
    const re = new RegExp(`(?<![-\\w])${prop}\\s*:\\s*([^;{}]+);`, 'g');
    const out: Record<string, number> = {};
    for (const f of files) {
        if (skip(f)) continue;
        const bad = [...read(f).matchAll(re)].map((m) => m[1].trim()).filter((v) => !ok(v));
        if (bad.length > 0) out[rel(f)] = bad.length;
    }
    return out;
}

const isToken = (prefix: string) => (v: string) => v.startsWith(`var(--${prefix}`) || v === 'inherit';

/** Compara contra la línea base: nada puede crecer y nada nuevo puede aparecer. */
function expectNoRegression(actual: Record<string, number>, baseline: Record<string, number>, hint: string) {
    const problems: string[] = [];
    for (const [file, n] of Object.entries(actual)) {
        const allowed = baseline[file] ?? 0;
        if (n > allowed) {
            problems.push(
                allowed === 0
                    ? `${file}: ${n} nueva(s) violación(es). ${hint}`
                    : `${file}: ${n} violaciones, la línea base permite ${allowed}. ${hint}`,
            );
        }
    }
    expect(problems).toEqual([]);
}

// ─────────────────────────────────────────────────────────────────────────
describe('CSS válido', () => {
    /**
     * `-var(--x)` NO es CSS válido: no se puede anteponer un signo a una
     * función. Lo correcto es `calc(-1 * var(--x))`. El navegador descarta la
     * declaración entera y el fallo es invisible en build y tests.
     */
    it('no antepone un signo negativo a var() — usa calc(-1 * var(--x))', () => {
        const bad = countBy(cssFiles, /(?<![\w)])-var\(/g);
        expect(bad).toEqual({});
    });

    it('no deja declaraciones con var() sin cerrar', () => {
        const bad = countBy(cssFiles, /var\(--[a-z0-9-]*(?:;|\s*\})/gi);
        expect(bad).toEqual({});
    });

    /**
     * Referenciar un token que NO existe es el mismo fallo silencioso que
     * `-var(--x)`: el navegador descarta la declaración entera y la regla
     * desaparece sin una sola señal en build ni en tests.
     *
     * Ocurrió de nuevo en la iteración 10 con `var(--space-18)` —la escala salta
     * de 16 a 20— y colapsó el ritmo vertical de un panel completo. Se detectó
     * mirando una captura, no compilando. Esta regla lo convierte en un fallo.
     *
     * Solo se vigilan los tokens de ESCALA (los que forman un sistema cerrado).
     * Los tokens con fallback `var(--x, y)` son deliberados y se permiten.
     */
    it('no referencia tokens de escala inexistentes', () => {
        const declared = new Set(
            [...read(cssFiles.find(themeFile)!).matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((m) => m[1]),
        );
        const SCALES = /^--(space|text|weight|leading|radius|control-h|shadow|transition|color|surface|border|text-|ring|glass|aurora|gray|indigo)/;
        const missing = new Set<string>();
        for (const f of cssFiles) {
            for (const m of read(f).matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/gi)) {
                const name = m[1];
                if (!SCALES.test(name) || declared.has(name)) continue;
                missing.add(`${rel(f)} → ${name}`);
            }
        }
        expect([...missing]).toEqual([]);
    });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Fronteras de módulo', () => {
    /**
     * Una feature no importa la hoja de estilo de otra. Es un fallo real y
     * reincidente: si el dueño legítimo borra una clase, el consumidor ajeno se
     * rompe SIN error de compilación. Ya ocurrió tres veces (migas, chips de
     * filtro, fila de esqueleto).
     */
    it('ningún módulo importa el CSS de otra feature', () => {
        const violations: string[] = [];
        for (const f of codeFiles) {
            const from = rel(f);
            const owner = /features\/([^/]+)\//.exec(from)?.[1] ?? null;
            for (const m of read(f).matchAll(/import\s+'([^']+\.css)'/g)) {
                const spec = m[1];
                // `src/styles/` es el directorio GLOBAL compartido (reset, layout,
                // transiciones): cualquiera puede importarlo. Solo se vigila el
                // CSS que pertenece a una feature concreta.
                const target = /(?:features\/|(?:\.\.\/)*)([^/.]+)\/styles\//.exec(spec)?.[1];
                if (target && target !== owner) violations.push(`${from} -> ${spec}`);
            }
        }
        // Deuda conocida: ambas páginas reutilizan `.tdetail-card` y `.ternas-page`,
        // que son compartidos de facto y deben promoverse al sistema de diseño.
        expect(violations.sort()).toEqual([
            'features/reportes/pages/ReportDetailPage.tsx -> ../../ternas/styles/ternas.css',
            'pages/StudentDetailPage.tsx -> ../features/ternas/styles/ternas.css',
        ]);
    });

    it('una hoja de estilo solo puede @import el archivo de tokens', () => {
        const violations: string[] = [];
        for (const f of cssFiles) {
            for (const m of read(f).matchAll(/@import\s+url\(['"]?([^'")]+)/g)) {
                if (!m[1].endsWith('theme/variables.css')) violations.push(`${rel(f)} -> ${m[1]}`);
            }
        }
        expect(violations).toEqual([]);
    });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Escalas del sistema de diseño', () => {
    it('ningún componente escribe un font-size literal', () => {
        // Se permiten clamp() (fluido deliberado) y unidades relativas (em).
        const ok = (v: string) => isToken('text')(v) || v.startsWith('clamp(') || /^\d*\.?\d+em$/.test(v);
        expect(countBadValues(cssFiles, 'font-size', ok, themeFile)).toEqual({});
    });

    it('ningún componente escribe un font-weight literal', () => {
        expect(countBadValues(cssFiles, 'font-weight', isToken('weight'), themeFile)).toEqual({});
    });

    it('ningún componente escribe un line-height literal', () => {
        // `0` es legítimo en envoltorios de SVG (elimina el hueco de línea base).
        const ok = (v: string) => isToken('leading')(v) || v === '0';
        expect(countBadValues(cssFiles, 'line-height', ok, themeFile)).toEqual({});
    });

    it('ningún componente escribe un border-radius literal fuera de los casos geométricos', () => {
        // `50%` (círculo), esquinas compuestas (hojas inferiores) y `0` son
        // geometría, no escala: no tienen token porque no deben tenerlo.
        const ok = (v: string) =>
            isToken('radius')(v) || v === '50%' || v === '0' || v.split(/\s+/).length > 1;
        expect(countBadValues(cssFiles, 'border-radius', ok, themeFile)).toEqual({});
    });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Deuda visual congelada (solo puede encoger)', () => {
    /**
     * Colores fijos fuera del archivo de tokens. `#fff`/`#000` se permiten:
     * son necesarios en máscaras (`mask-image`) y sobre rellenos sólidos de
     * marca, donde un token de superficie sería incorrecto.
     */
    it('no crecen los colores hexadecimales fuera de variables.css', () => {
        const actual = countBy(cssFiles, /#(?!fff\b|000\b|ffffff\b|000000\b)[0-9a-f]{3,8}\b/gi, themeFile);
        // reportes.css: 19 -> 0. Se elimina la entrada: ya no puede reaparecer.
        expectNoRegression(actual, {
            'styles/dashboard.css': 8,
            'styles/student-detail.css': 5,
        }, 'Usa un token semántico de theme/variables.css.');
    });

    /**
     * El modo oscuro debe resolverse por HERENCIA de tokens. Un override por
     * clase significa que cambiar un token arregla unos módulos y deja otros
     * rotos, en silencio y sin error de compilación.
     */
    it('no crecen los overrides [data-theme="dark"] por clase', () => {
        const actual = countBy(cssFiles, /\[data-theme="dark"\]\s*\./g, themeFile);
        expectNoRegression(actual, {
            'features/ternas/styles/ternas.css': 19,       // 24 -> 19: los 5 de
            // los chips de estado desaparecieron al migrarlos a <Badge>, que
            // resuelve el modo oscuro por herencia y no por override.
            'features/reportes/styles/reportes.css': 7,   // 20 -> 7
            'styles/dashboard.css': 11,
            'styles/student-detail.css': 3,
            'styles/students-list.css': 2,
            'features/students-workspace/styles/since-last-visit.css': 1,
        }, 'Reapunta a tokens semánticos; el modo oscuro se hereda.');
    });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Una sola forma de codificar estado', () => {
    /**
     * Auditoría sobre el render (iteración 7): se midieron CINCO lenguajes
     * visuales distintos para "el estado de una cosa", tres de ellos para el
     * mismo `EstadoTerna`, entre 16 px y 33 px de alto. La misma palabra,
     * "Completada", se veía de dos formas en dos pantallas contiguas.
     *
     * La causa no fue el color —una iteración previa ya había alineado los
     * tonos y lo declaró resuelto— sino que cada pantalla reimplementaba la
     * CAJA: tamaño, mayúsculas, tracking, padding y borde.
     *
     * Un chip de estado se reconoce por su forma: fondo propio + píldora +
     * negrita. Si una hoja de feature define uno, es un <Badge> a mano.
     */
    it('ninguna hoja de feature define su propio chip de estado', () => {
        const violations: string[] = [];
        for (const f of cssFiles) {
            if (themeFile(f) || rel(f).endsWith('components/ui/ui.css')) continue;
            // Los comentarios se eliminan ANTES de partir en bloques: si no, el
            // comentario que precede a una regla se captura como parte del
            // selector y la regla acusa a un texto en prosa.
            const css = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
            // Bloques `selector { … }` que combinan píldora + negrita: la firma
            // de un badge. `--radius-pill` es el token; 999px su valor crudo.
            for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
                const [, selector, body] = m;
                const pill = /border-radius:\s*(var\(--radius-pill\)|999px|9999px)/.test(body);
                const bold = /font-weight:\s*var\(--weight-bold\)/.test(body);
                const bg = /background(-color)?:/.test(body);
                if (pill && bold && bg) violations.push(`${rel(f)} → ${selector.trim().slice(0, 60)}`);
            }
        }
        /*
         * EXCEPCIÓN, no deuda. `.pb__chip-count` comparte la FORMA de un badge
         * pero no su SIGNIFICADO: es el contador que va DENTRO de un chip de
         * filtro ("Pendientes · 27") y hereda el color del chip cuando está
         * activo. Fundirlo en <Badge> sería unificar por código y no por
         * significado, que es justo el error contrario al que corrige esta regla.
         * Cualquier OTRA aparición sí es un <Badge> hecho a mano.
         */
        expect(violations).toEqual([
            'features/students-workspace/styles/progress-band.css → .pb__chip-count',
        ]);
    });

    /**
     * El mapa `estado → etiqueta` estaba declarado en TRES archivos con
     * contenido idéntico. Vive en utils/ternaStatus.ts y solo allí.
     */
    it('el mapa de etiquetas de EstadoTerna existe una sola vez', () => {
        const owners = codeFiles
            .filter((f) => /pendiente:\s*'Pendiente'[\s\S]{0,80}completada:\s*'Completada'/.test(read(f)))
            .map(rel);
        expect(owners).toEqual(['utils/ternaStatus.ts']);
    });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Escala de altura de controles', () => {
    /**
     * Medición a 375px (iteración 8): `.ui-btn` —LA primitiva— renderizaba a
     * 30, 34.8 y 36px. No porque tuviera tres tamaños, sino porque NO declaraba
     * altura: emergía de `padding + font-size × line-height`, y el icono que
     * pasara quien llamaba movía la caja. Circulan seis tamaños de icono
     * distintos (12…18) por los botones del producto.
     *
     * La altura de un control es un contrato del sistema de diseño, no un
     * residuo del contenido.
     */
    it('cada tamaño de botón declara su altura', () => {
        const ui = read(cssFiles.find((f) => rel(f).endsWith('components/ui/ui.css'))!);
        for (const sel of ['.ui-btn', '.ui-btn--sm', '.ui-btn--lg']) {
            const block = new RegExp(`\\${sel}\\s*\\{([^}]*)\\}`).exec(ui)?.[1] ?? '';
            expect(block, `${sel} debe fijar min-height con un token de control`).toMatch(/min-height:\s*var\(--control-h-/);
        }
    });

    /**
     * Cerrar un diálogo es la misma acción en los cuatro modales. Estaba
     * implementada cuatro veces, con tres tamaños y solo UNA con `:focus-visible`
     * propio: el afordance de teclado dependía del modal en el que estuvieras.
     */
    it('ningún modal define la GEOMETRÍA de su botón de cerrar', () => {
        // Redefinir el COLOR es composición legítima: `.toast__close` se pinta
        // sobre una superficie tonal y hereda su tinta. Redefinir el TAMAÑO es
        // reimplementar el control y desanclarlo de la escala.
        const GEOMETRY = /(?<![-\w])(width|height|padding)\s*:/;
        const offenders: string[] = [];
        for (const f of cssFiles) {
            const css = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
            for (const m of css.matchAll(/([^{}]*__close)\s*\{([^}]*)\}/g)) {
                if (GEOMETRY.test(m[2])) offenders.push(`${rel(f)} → ${m[1].trim()}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    /**
     * Iteración 9: 10 clases de campo con 6 alturas (33/35/36/37/41px). El
     * campo del sistema se usaba en UNA pantalla; los cinco modales fabricaban
     * el suyo, con borde de 1.5px frente al 1px del sistema. Dentro del mismo
     * formulario el input medía 35px y el select 37px.
     *
     * La CAJA de un campo (padding, borde, radio, foco) la posee `.ui-control`.
     * Una hoja de feature que la redefina está reimplementando la primitiva.
     */
    it('ninguna hoja de feature redefine la caja de un campo', () => {
        const offenders: string[] = [];
        for (const f of cssFiles) {
            if (themeFile(f) || rel(f).endsWith('components/ui/ui.css')) continue;
            const css = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
            for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
                const [, sel, body] = m;
                // Solo selectores de campo: input / select / textarea.
                if (!/(input|select|textarea)/i.test(sel)) continue;
                if (/--error|:disabled|::placeholder|:focus/.test(sel)) continue;
                // Patrón de ENVOLTORIO (`.ui-search`, `.auth-input-wrapper`):
                // el contenedor ES el control y el campo va desnudo dentro. Es
                // composición válida, no una caja duplicada.
                if (/wrapper|__wrap\b/.test(sel)) continue;
                const box = /(?<![-\w])(padding|border)\s*:/.test(body);
                if (box) offenders.push(`${rel(f)} → ${sel.trim().slice(0, 46)}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    /**
     * Una altura fijada a mano en el rango táctil vuelve a desanclar la escala.
     *
     * LÍNEA BASE: la regla destapó 11 alturas literales más en archivos que esta
     * iteración no midió sobre el render. No se corrigen a ciegas —cambiar el
     * tamaño de algo que no se ha observado es exactamente el error que este
     * programa persigue— ni se silencia la regla. Se congela el recuento: la
     * deuda solo puede encoger. Cada una debe verificarse VIÉNDOLA antes de
     * tocarla; algunas serán geometría legítima (avatares, barras) y no
     * controles, y entonces la entrada se retira con su justificación.
     */
    it('no crecen las alturas literales en el rango táctil', () => {
        const actual: Record<string, number> = {};
        for (const f of cssFiles) {
            if (themeFile(f)) continue;
            const n = [...read(f).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?<![-\w])height:\s*(\d+)px/g)]
                .filter((m) => Number(m[1]) >= 24 && Number(m[1]) <= 48).length;
            if (n > 0) actual[rel(f)] = n;
        }
        expectNoRegression(actual, {
            'components/thesis/thesis-status.css': 1,
            'components/ui/ui.css': 2,
            'features/students-workspace/styles/quick-view.css': 1,
            'features/students-workspace/styles/work-queue.css': 1,
            'styles/dashboard.css': 2,
            'styles/student-detail.css': 1,
            'styles/student-new.css': 1,
            'styles/students-list.css': 2,
        }, 'Usa la escala --control-h-* de theme/variables.css.');
    });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Ninguna fecha cruda en pantalla', () => {
    /**
     * La ficha de terna renderizaba `{terna.fecha_evaluacion}` — el ISO 8601
     * crudo del API — en una pantalla donde todo lo demás iba formateado.
     * Cualquier campo de fecha debe pasar por utils/dates.ts.
     */
    it('ningún componente interpola un campo de fecha sin formatear', () => {
        const raw = /\{\s*[\w.?]*\.?(fecha\w*|created_at|updated_at|createdAt|updatedAt)\s*\}/g;
        const violations: string[] = [];
        for (const f of codeFiles.filter((f) => f.endsWith('.tsx'))) {
            for (const m of read(f).matchAll(raw)) violations.push(`${rel(f)} → ${m[0]}`);
        }
        expect(violations).toEqual([]);
    });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Sin código muerto', () => {
    it('no quedan componentes sin ningún importador', () => {
        // Se contempla tanto `from '.../X'` como el import dinámico de las
        // rutas diferidas: `lazy(() => import('.../X'))`.
        const all = codeFiles.map(read).join('\n');
        const orphans = codeFiles
            .filter((f) => f.endsWith('.tsx'))
            .map(rel)
            .filter((f) => !['App.tsx', 'main.tsx'].includes(f))
            .filter((f) => {
                const name = f.split('/').pop()!.replace(/\.tsx$/, '');
                return !new RegExp(`(?:from|import\\()\\s*'[^']*/${name}'`).test(all);
            });
        expect(orphans).toEqual([]);
    });

    it('no quedan hojas de estilo que nadie importe', () => {
        const all = codeFiles.map(read).join('\n');
        const orphans = cssFiles
            .map(rel)
            .filter((f) => !f.endsWith('theme/variables.css'))
            .filter((f) => {
                const name = f.split('/').pop()!;
                return !all.includes(`/${name}'`) && !all.includes(`'./${name}'`);
            });
        expect(orphans).toEqual([]);
    });
});
