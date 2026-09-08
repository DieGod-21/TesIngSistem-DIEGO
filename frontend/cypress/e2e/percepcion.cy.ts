/**
 * percepcion.cy.ts — Lo que el producto APARENTA: rapidez, sitio y color.
 *
 * ── QUÉ PROTEGE ─────────────────────────────────────────────────────────
 *
 * Tres defectos que no rompen nada y se notan todos: volver a un módulo y ver
 * cómo se borra lo que ya estaba, crear algo y que el aviso lo tape, y que el
 * tema claro pinte con un color que no es del sistema. Ninguno lo ve una
 * prueba unitaria, y los tres se midieron sobre la aplicación en marcha.
 */

describe('percepcion', () => {
    /* Los specs de esta carpeta comparten ámbito de tipos: los ayudantes viven
       DENTRO del bloque. */

    type Espia = Window & { __api?: string[]; __of?: typeof fetch };

    /** Anota cada llamada a /api/*. El modo demo intercepta `fetch`, así que no
        queda rastro en `performance.getEntriesByType('resource')`. */
    function espiarApi(win: Espia): void {
        if (win.__of) return;
        win.__of = win.fetch;
        win.__api = [];
        win.fetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url ?? String(args[0]);
            if (/\/api\//.test(url)) win.__api!.push(url);
            return win.__of!.apply(this, args);
        } as typeof fetch;
    }

    function llamadas(win: Espia, re: RegExp): number {
        return (win.__api ?? []).filter((u) => re.test(u)).length;
    }

    /** El scroller REAL: el `ion-content` de Ionic, dentro de su shadow root. */
    function scroller(win: Window): HTMLElement {
        const inner = win.document.querySelector('ion-content')?.shadowRoot?.querySelector('.inner-scroll');
        return inner as HTMLElement;
    }

    function seSolapan(a: DOMRect, b: DOMRect): boolean {
        return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    }

    beforeEach(() => {
        cy.viewport(1280, 800);
    });

    describe('volver a un modulo no es abrirlo por primera vez', () => {
        it('la revisita no borra la lista ni vuelve a pedirla', () => {
            /*
             * MEDIDO saliendo a Inicio y regresando, fotograma a fotograma:
             *
             *   antes   contenido@48 -> ESQUELETO@94 -> contenido@228
             *   despues vacio@36 -> contenido(revalidando)@79 -> contenido@85
             *
             * El módulo tiraba lo ya pintado, ponía 134ms de esqueleto y volvía
             * a dibujar la MISMA lista. La caché del servicio ya existía y ya
             * se invalidaba en cada escritura; solo faltaba leerla al montar.
             *
             * Se comprueban las dos mitades, porque una sola se podría cumplir
             * por accidente: que no aparezca el esqueleto Y que no haya una
             * segunda petición. Sin la segunda, bastaría con esconder el
             * esqueleto para «pasar» mientras se recarga todo igualmente.
             */
            cy.entrar();
            cy.get('.dash-header', { timeout: 20000 }).should('exist');
            cy.window().then((win: Espia) => espiarApi(win));

            cy.contains('.dash-sidebar__nav-item', 'Usuarios').click({ scrollBehavior: 'center' });
            cy.get('.usr-list-item', { timeout: 20000 }).should('exist');
            cy.wait(600);

            cy.window().then((win: Espia) => {
                expect(llamadas(win, /\/api\/usuarios/), 'la primera visita sí pide').to.be.greaterThan(0);
                cy.wrap(llamadas(win, /\/api\/usuarios/)).as('pedidasTrasLaPrimera');
            });

            cy.contains('.dash-sidebar__nav-item', 'Inicio').click({ scrollBehavior: 'center' });
            cy.get('.dash-hero__title', { timeout: 20000 }).should('exist');
            cy.wait(300);

            // Vigila el hueco entre pulsar y ver: si en algún fotograma no hay
            // ni una fila y sí un esqueleto, la lista se borró.
            cy.window().then((win) => {
                const d = win.document;
                const w = win as Window & { __huboEsqueleto?: boolean };
                w.__huboEsqueleto = false;
                let n = 0;
                const tick = () => {
                    const hayFilas = !!d.querySelector('.usr-list-item');
                    const hayBusy = !!d.querySelector('[aria-busy="true"]');
                    if (!hayFilas && hayBusy) w.__huboEsqueleto = true;
                    if (n++ < 180) win.requestAnimationFrame(tick);
                };
                win.requestAnimationFrame(tick);
            });

            cy.contains('.dash-sidebar__nav-item', 'Usuarios').click({ scrollBehavior: 'center' });
            cy.get('.usr-list-item', { timeout: 20000 }).should('exist');
            cy.wait(900);

            cy.get('@pedidasTrasLaPrimera').then((antes) => {
                cy.window().then((win: Espia) => {
                    const w = win as Window & { __huboEsqueleto?: boolean };
                    expect(w.__huboEsqueleto, 'al volver NO se ve el esqueleto').to.eq(false);
                    expect(llamadas(win, /\/api\/usuarios/), 'al volver no se vuelve a pedir')
                        .to.eq(Number(antes));
                });
            });
        });

        it('«Refrescar» sigue yendo al servidor pese a la cache', () => {
            /*
             * El reverso de la prueba anterior. Servir lo cacheado al entrar es
             * justo lo que evita el esqueleto, pero «Refrescar» es una petición
             * EXPLÍCITA de datos nuevos: devolverle lo mismo que ya tenía, sin
             * tocar la red, convertiría el botón en un adorno.
             */
            cy.entrar();
            cy.window().then((win: Espia) => espiarApi(win));
            cy.contains('.dash-sidebar__nav-item', 'Reportes').click({ scrollBehavior: 'center' });
            cy.get('.rep-proyecto', { timeout: 20000 }).should('exist');
            cy.wait(600);

            cy.window().then((win: Espia) => {
                cy.wrap(llamadas(win, /\/api\//)).as('antesDeRefrescar');
            });

            cy.contains('button', /Refrescar/i).click({ scrollBehavior: 'center' });
            cy.wait(900);

            cy.get('@antesDeRefrescar').then((antes) => {
                cy.window().then((win: Espia) => {
                    expect(llamadas(win, /\/api\//), 'refrescar vuelve al origen')
                        .to.be.greaterThan(Number(antes));
                });
            });
        });
    });

    describe('el aviso no puede tapar lo que anuncia', () => {
        it('la fila recien creada queda a la vista y fuera del aviso', () => {
            /*
             * MEDIDO tras crear un usuario, en las dos anchuras:
             *
             *   escritorio  fila 705..800 · aviso 712..776  → la tapaba
             *   movil       fila 749..844 · aviso 756..820  → la tapaba
             *
             * `scrollIntoView({block:'nearest'})` desplaza lo mínimo, y lo
             * mínimo era dejar la fila tocando el borde inferior, justo donde
             * se dibuja el aviso. El arreglo aparente —`scroll-margin-bottom`
             * en la fila— está PROBADO que no hace nada: el motor lo ignora en
             * este scroller incluso forzado a 300px.
             *
             * Se comprueba el RESULTADO —que no se solapen— y no la técnica:
             * cualquier solución que deje la fila visible y despejada vale.
             */
            cy.entrar();
            cy.visitaDemo('/usuarios');
            cy.get('.usr-list-item', { timeout: 20000 }).should('exist');

            cy.contains('button', /Nuevo Usuario/i).click({ scrollBehavior: 'center' });
            cy.get('.ui-modal-overlay').should('be.visible');
            cy.get('#nu-nombre').type('Zoraida Prueba');
            cy.get('#nu-email').type('zprueba@miumg.edu.gt');
            cy.get('#nu-password').type('claveSegura1');
            cy.get('.ui-modal__footer button[type="submit"]').click();

            cy.get('.usr-list-item--nuevo', { timeout: 15000 }).should('exist');
            cy.get('.toast').should('be.visible');
            cy.wait(600);

            cy.window().then((win) => {
                const fila = win.document.querySelector('.usr-list-item--nuevo') as HTMLElement;
                const aviso = win.document.querySelector('.toast') as HTMLElement;
                const f = fila.getBoundingClientRect();

                expect(f.bottom, 'la fila entra entera en la ventana').to.be.at.most(win.innerHeight);
                expect(f.top, 'y no se sale por arriba').to.be.at.least(0);
                expect(seSolapan(f, aviso.getBoundingClientRect()), 'el aviso NO tapa la fila').to.eq(false);
            });
        });

        it('una pantalla sin lista no gana desplazamiento', () => {
            /*
             * El hueco que se reserva bajo las listas tiene un coste si se pone
             * en el sitio equivocado. MEDIDO al ponerlo en el envoltorio de
             * página: «ningún usuario coincide» —que no tiene nada que
             * desplazar— pasaba a desplazar 115px. Una barra de scroll para
             * enseñar un hueco vacío. Vive en las listas justamente por esto.
             */
            cy.entrar();
            cy.visitaDemo('/usuarios');
            cy.get('.usr-list-item', { timeout: 20000 }).should('exist');
            cy.get('.ui-search__input').first()
                .type('zzzzzzzz', { scrollBehavior: 'center', force: true });
            cy.get('.ui-empty').should('be.visible');
            cy.wait(400);

            cy.window().then((win) => {
                const s = scroller(win);
                const recorrido = s.scrollHeight - s.clientHeight;
                expect(recorrido, 'sin lista, no hay recorrido que reservar').to.be.lessThan(40);
            });
        });
    });

    describe('el tema claro pinta con la paleta, no con el negro de fabrica', () => {
        it('ningun texto de Reportes cae en negro puro', () => {
            /*
             * MEDIDO recorriendo el texto visible y comparando el color
             * calculado con la paleta:
             *
             *   /reports  claro   10 elementos en rgb(0,0,0)
             *   /reports  oscuro   0
             *
             * Los nombres y los títulos de la tabla —la pantalla más densa del
             * producto— se pintaban con el negro de fábrica del navegador en
             * lugar de `--text-primary`. Salían bien en oscuro y solo porque
             * las variables puente de Ionic estaban declaradas ÚNICAMENTE en
             * el bloque oscuro; el claro, que es el tema de partida, se quedaba
             * sin puente.
             *
             * Se afirma sobre los DOS temas: el oscuro ya estaba bien y esta
             * prueba también protege que siga estándolo.
             */
            cy.entrar();
            cy.visitaDemo('/reports');
            cy.get('.rep-proyecto', { timeout: 20000 }).should('exist');

            (['light', 'dark'] as const).forEach((tema) => {
                cy.window().then((win) => {
                    win.document.documentElement.setAttribute('data-theme', tema);
                });
                cy.wait(300);
                cy.window().then((win) => {
                    const crudos: string[] = [];
                    win.document.querySelectorAll('*').forEach((el) => {
                        const tieneTexto = Array.from(el.childNodes)
                            .some((n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 1);
                        if (!tieneTexto) return;
                        const r = (el as HTMLElement).getBoundingClientRect();
                        if (r.width === 0 || r.height === 0) return;
                        if (win.getComputedStyle(el).color === 'rgb(0, 0, 0)') {
                            crudos.push((el.textContent ?? '').trim().slice(0, 30));
                        }
                    });
                    expect(crudos, `texto en negro de fabrica (${tema}): ${crudos.join(' | ')}`)
                        .to.have.length(0);
                });
            });
        });
    });
});
