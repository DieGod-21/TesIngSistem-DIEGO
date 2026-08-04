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
        expectNoRegression(actual, {
            'features/reportes/styles/reportes.css': 19,
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
            'features/ternas/styles/ternas.css': 24,
            'features/reportes/styles/reportes.css': 20,
            'styles/dashboard.css': 11,
            'styles/student-detail.css': 3,
            'styles/students-list.css': 2,
            'features/students-workspace/styles/since-last-visit.css': 1,
        }, 'Reapunta a tokens semánticos; el modo oscuro se hereda.');
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
