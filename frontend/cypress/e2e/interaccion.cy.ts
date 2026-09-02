/**
 * interaccion.cy.ts — El lenguaje de interacción del producto.
 *
 * ── QUÉ PROTEGE ─────────────────────────────────────────────────────────
 *
 * Cosas que solo existen cuando hay un navegador de verdad aplicando la
 * cascada: qué icono se ve, qué gana una transición, si un control acusa el
 * foco. En jsdom no hay hojas de estilo, así que nada de esto se puede
 * comprobar con pruebas unitarias.
 */

/** Estilo calculado de un elemento, tal y como lo resuelve la cascada. */
function calculado(el: Element) {
    const win = el.ownerDocument.defaultView;
    if (!win) throw new Error('el elemento no está en una ventana');
    return win.getComputedStyle(el);
}

describe('lenguaje de interacción', () => {

    beforeEach(() => {
        cy.entrar();
    });

    describe('relevo de iconos del tema', () => {
        it('los dos iconos están siempre, y la cascada elige cuál se ve', () => {
            /*
             * Alternar el icono en React lo desmontaba y montaba: entre un
             * icono y otro no hay nada que animar. Con los dos presentes el
             * relevo es un cruce. Si alguien vuelve al ternario, aquí faltará
             * uno de los dos.
             */
            cy.get('.dash-header__theme-icon--luna').should('exist');
            cy.get('.dash-header__theme-icon--sol').should('exist');
        });

        it('se ve el icono de lo que va a pasar, y al cambiar se intercambian', () => {
            /*
             * El icono anuncia lo que ocurrirá al pulsar, no el estado actual:
             * en claro se ofrece la luna, en oscuro el sol.
             *
             * No se asume con qué tema arranca. Sin `theme` guardado, la
             * aplicación respeta `prefers-color-scheme`, y el navegador de
             * Cypress lo reporta OSCURO: dar por hecho «empieza en claro»
             * hacía fallar la prueba por el entorno y no por el producto.
             */
            cy.get('html').then(($html) => {
                const oscuroAlEmpezar = $html.attr('data-theme') === 'dark';
                const visible = oscuroAlEmpezar ? '--sol' : '--luna';
                const oculto = oscuroAlEmpezar ? '--luna' : '--sol';

                cy.get(`.dash-header__theme-icon${visible}`)
                    .should(($e) => expect(calculado($e[0]).opacity).to.eq('1'));
                cy.get(`.dash-header__theme-icon${oculto}`)
                    .should(($e) => expect(calculado($e[0]).opacity).to.eq('0'));

                cy.get('.dash-header__theme-toggle').click();
                cy.get('html').should('have.attr', 'data-theme', oscuroAlEmpezar ? 'light' : 'dark');

                // Se intercambian. El cruce dura, así que se espera al valor final.
                cy.get(`.dash-header__theme-icon${oculto}`)
                    .should(($e) => expect(calculado($e[0]).opacity).to.eq('1'));
                cy.get(`.dash-header__theme-icon${visible}`)
                    .should(($e) => expect(calculado($e[0]).opacity).to.eq('0'));
            });
        });

        it('el botón no cambia de tamaño al cruzar los iconos', () => {
            // Los dos ocupan la misma celda del grid. Si alguien los pone en
            // flujo, el botón crece al doble y la cabecera se recoloca.
            cy.get('.dash-header__theme-toggle').then(($b) => {
                const antes = $b[0].getBoundingClientRect().width;
                const temaAntes = Cypress.$('html').attr('data-theme');

                cy.get('.dash-header__theme-toggle').click();
                cy.get('html').should('not.have.attr', 'data-theme', temaAntes);
                cy.get('.dash-header__theme-toggle').then(($d) => {
                    expect($d[0].getBoundingClientRect().width, 'mismo ancho').to.be.closeTo(antes, 1);
                });
            });
        });
    });

    describe('fundido de color al cambiar de tema', () => {
        it('la transición existe SOLO durante el cambio', () => {
            /*
             * Antes era una lista permanente de 18 selectores: la mitad la
             * pisaba el CSS de su propio módulo y a la otra mitad le imponía
             * 220ms de transición de color en CADA hover.
             *
             * Ahora la enciende una clase transitoria. Los dos extremos
             * importan: que aparezca al cambiar y que NO se quede.
             */
            cy.get('html').should('not.have.class', 'tema-cambiando');

            cy.get('.dash-header__theme-toggle').click();
            cy.get('html').should('have.class', 'tema-cambiando');

            // Y se retira sola, sin que nadie la limpie.
            cy.get('html', { timeout: 4000 }).should('not.have.class', 'tema-cambiando');
        });

        it('mientras cambia, alcanza a lo que la lista vieja no alcanzaba', () => {
            // `.ui-card` nunca estuvo en la enumeración, y `.dash-header`
            // estaba pero declaraba su propia `transition` y la pisaba: los
            // dos casos que dejaban el cambio a dos velocidades.
            cy.get('.dash-header__theme-toggle').click();
            cy.get('html').should('have.class', 'tema-cambiando');
            cy.get('.dash-header').then(($h) => {
                expect(
                    calculado($h[0]).transitionProperty,
                    'la cabecera se funde durante el cambio',
                ).to.contain('background-color');
            });
        });
    });

    describe('la cascada es para llegar, no para cada cambio', () => {
        /**
         * ¿Cuántas de estas animaciones ACABAN de arrancar?
         *
         * Contar elementos con animación no basta: con `fill: both` o
         * `forwards` una animación TERMINADA sigue «en efecto» y
         * `getAnimations()` la devuelve igual. MEDIDO en Reportes: cinco filas
         * en reposo daban cinco «animándose», con el reloj en 220–340ms, muy
         * pasados los 200ms que dura. Lo que separa un reestreno de un resto
         * de la carga inicial es el reloj propio de la animación.
         */
        function recienArrancadas(win: Window, sel: string): number {
            return Array.from(win.document.querySelectorAll(sel))
                .flatMap((e) => (e as Element & { getAnimations?: () => Animation[] }).getAnimations?.() ?? [])
                .filter((a) => a.playState === 'running' && Number(a.currentTime ?? 0) < 120)
                .length;
        }

        const animando = (win: Window) => recienArrancadas(win, '.sl-table__tr');

        it('la primera llegada se escalona; paginar ya no', () => {
            /*
             * MEDIDO antes del arreglo: tras pulsar «página siguiente», las
             * siete filas volvían a animarse con la cascada entera. Las filas
             * se identifican por `id`, así que al paginar cambian todas las
             * claves, React las desmonta y las remonta, y la entrada se
             * reproduce completa: hasta 0,43s entre el clic y la última fila,
             * en la acción más repetida del padrón.
             *
             * Se comprueban las DOS mitades. Solo mirar que no anima al
             * paginar pasaría también si alguien borrase la cascada entera,
             * que no es lo que se quiere.
             */
            cy.visitaDemo('/students');
            cy.get('.sl-table__tr', { timeout: 20000 }).should('have.length.greaterThan', 3);

            cy.window().then((win) => {
                expect(animando(win), 'al llegar, las filas se escalonan').to.be.greaterThan(0);
            });

            cy.get('.sl-pager__btn').eq(2).click();          // página siguiente
            cy.get('.sl-table__tr', { timeout: 10000 }).should('have.length.greaterThan', 3);
            cy.window().then((win) => {
                expect(animando(win), 'paginar ya no reproduce la entrada').to.eq(0);
            });
        });

        it('proyectos: quitar un filtro no vuelve a estrenar la cuadricula', () => {
            /*
             * MEDIDO antes del arreglo: volver de «PG1» a «Todas» rearrancaba
             * las ocho tarjetas que el filtro habia desmontado, con el reloj
             * propio en 50ms. Las tarjetas se identifican por `id`; al filtrar,
             * las que dejan de encajar se desmontan, y al volver montan otra
             * vez con su entrada intacta.
             *
             * Se comprueban las DOS mitades: llegar SI escalona, filtrar NO.
             * Mirar solo la segunda pasaria tambien si alguien borrase la
             * cascada entera.
             */
            cy.visitaDemo('/proyectos');
            cy.get('.proy-card', { timeout: 20000 }).should('have.length.greaterThan', 1);
            cy.window().then((win) => {
                expect(recienArrancadas(win, '.proy-card'), 'al llegar si se escalona').to.be.greaterThan(0);
            });

            cy.wait(700); // que termine la cascada inicial
            cy.get('.ui-toolbar__group .ui-chip').eq(1).click({ scrollBehavior: 'center' });
            cy.get('.ui-toolbar__group .ui-chip').eq(0).click({ scrollBehavior: 'center' });
            cy.get('.proy-card').should('have.length.greaterThan', 1);
            cy.window().then((win) => {
                expect(recienArrancadas(win, '.proy-card'), 'quitar el filtro no reestrena').to.eq(0);
            });
        });

        it('reportes: cambiar de chip no escalona las filas otra vez', () => {
            /*
             * La tarjeta de la tabla lleva `key={filter}` y se remonta entera
             * al cambiar de chip: ese fundido es UNA transicion coordinada y
             * se queda. Lo que sobraba era la cascada por fila DENTRO de ella
             * —dos entradas superpuestas para la misma accion—, medida con el
             * reloj en 67ms tras el chip.
             */
            cy.visitaDemo('/reports');
            cy.get('.reportes-table tbody tr', { timeout: 20000 }).should('have.length.greaterThan', 0);
            cy.window().then((win) => {
                expect(recienArrancadas(win, '.reportes-table tbody tr'), 'al llegar si se escalona').to.be.greaterThan(0);
            });

            cy.wait(700);
            cy.get('.ui-chip').eq(1).click({ scrollBehavior: 'center' });
            cy.get('.reportes-table tbody tr').should('exist');
            cy.window().then((win) => {
                expect(recienArrancadas(win, '.reportes-table tbody tr'), 'filtrar no reestrena').to.eq(0);
            });
        });
    });

    describe('refrescar no es cargar', () => {
        /** Vigila si la zona llega a quedarse SIN contenido durante una accion. */
        function vigilar(win: Window, sel: string, esqueleto: string) {
            const reg = { vacio: 0, esqueleto: 0 };
            const mirar = () => {
                if (!win.document.querySelector(sel)) reg.vacio += 1;
                if (win.document.querySelector(esqueleto)) reg.esqueleto += 1;
            };
            mirar();
            // `win` llega tipado como `Window`, no como `Window & typeof globalThis`:
            // el observador se toma del propio documento.
            new (win as Window & typeof globalThis).MutationObserver(mirar).observe(win.document.body, {
                childList: true, subtree: true, attributes: true,
            });
            return reg;
        }

        it('crear un usuario no borra la lista ni reestrena las demas filas', () => {
            /*
             * MEDIDO antes del arreglo: al crear, la lista entera desaparecia
             * —el esqueleto ocupaba su sitio— y volvia con las NUEVE filas
             * reanimandose desde cero, justo en el instante en que habia que
             * mirar UNA. El anillo de la recien creada competia con ocho
             * entradas.
             *
             * Ahora se anima exactamente la fila nueva y nada mas.
             */
            cy.visitaDemo('/usuarios');
            cy.get('.usr-list-item', { timeout: 20000 }).should('have.length.greaterThan', 0);
            cy.wait(700);

            cy.contains('button', /Nuevo Usuario/i).click({ scrollBehavior: 'center' });
            cy.get('.ui-modal-overlay').should('be.visible');
            const sufijo = Date.now().toString().slice(-6);
            cy.get('#nu-nombre').type('Refresco ' + sufijo);
            cy.get('#nu-email').type('refresco.' + sufijo + '@miumg.edu.gt');
            cy.get('#nu-password').type('claveSegura1');

            const reg: { vacio: number; esqueleto: number }[] = [];
            cy.window().then((win) => { reg.push(vigilar(win, '.usr-list-item', '.usr-skeleton')); });
            cy.get('.ui-modal__footer button[type="submit"]').click();
            cy.get('.usr-list-item--nuevo', { timeout: 10000 }).should('have.length', 1);

            cy.window().then((win) => {
                expect(reg[0].vacio, 'la lista nunca se queda sin filas').to.eq(0);
                expect(reg[0].esqueleto, 'el esqueleto no sustituye a lo que ya estaba').to.eq(0);
                const animadas = Array.from(win.document.querySelectorAll('.usr-list-item'))
                    .filter((e) => (e as Element & { getAnimations?: () => Animation[] }).getAnimations?.().length);
                expect(animadas, 'solo se anima la fila nueva').to.have.length(1);
                expect(animadas[0].className).to.contain('usr-list-item--nuevo');
            });
        });

        it('«Refrescar» en Reportes conserva la tabla y el boton acusa el trabajo', () => {
            /*
             * MEDIDO antes del arreglo: el unico boton del producto que se
             * llama «Refrescar» era el sitio donde refrescar salia peor parado
             * —la tabla desaparecia entera y un esqueleto ocupaba su lugar— y
             * ademas no acusaba nada: `aria-busy` no llegaba a aparecer en
             * NINGUN elemento de la pagina. Se pedia una actualizacion, se
             * perdia lo que se estaba mirando y no habia senal de que algo
             * estuviera pasando.
             *
             * Las dos mitades importan. Conservar la tabla sin que el boton
             * diga nada deja la accion sin respuesta; que el boton se ocupe
             * mientras la tabla se borra no arregla la perdida de contexto.
             */
            cy.visitaDemo('/reports');
            cy.get('.reportes-table tbody tr', { timeout: 20000 }).should('have.length.greaterThan', 0);
            cy.wait(700);

            const reg: { vacio: number; esqueleto: number; ocupado: number }[] = [];
            cy.window().then((win) => {
                const r = { vacio: 0, esqueleto: 0, ocupado: 0 };
                const mirar = () => {
                    if (!win.document.querySelector('.reportes-table tbody tr')) r.vacio += 1;
                    if (win.document.querySelector('.ui-skeleton, .ui-skeleton-row')) r.esqueleto += 1;
                    if (win.document.querySelector('button[aria-busy="true"]')) r.ocupado += 1;
                };
                mirar();
                new (win as Window & typeof globalThis).MutationObserver(mirar)
                    .observe(win.document.body, { childList: true, subtree: true, attributes: true });
                reg.push(r);
            });

            cy.contains('button', /Refrescar/i).click({ scrollBehavior: 'center' });
            cy.get('.reportes-table tbody tr', { timeout: 10000 }).should('exist');
            cy.wait(300);
            cy.then(() => {
                expect(reg[0].vacio, 'la tabla nunca se queda sin filas').to.eq(0);
                expect(reg[0].esqueleto, 'el esqueleto no sustituye a lo que ya estaba').to.eq(0);
                expect(reg[0].ocupado, 'el boton acusa el trabajo que ha pedido').to.be.greaterThan(0);
            });
        });

        it('con movimiento reducido, refrescar no atenua nada', () => {
            /*
             * `.ui-refrescando` es el unico cambio VISUAL que este sprint
             * anade; todo lo demas quita movimiento. Con la preferencia activa
             * no se atenua, y no por purismo: sin la transicion el atenuado
             * seria instantaneo y cada recarga —incluidas las que vuelven en un
             * suspiro— daria un destello. Quien sigue contestando «esto se esta
             * poniendo al dia» es `aria-busy`, que ademas es lo que lee un
             * lector de pantalla.
             *
             * POR QUE SE LEE EL CSSOM Y NO EL ESTILO CALCULADO. Se intento
             * emular la preferencia de verdad, como hace salida-de-dialogo.cy.ts.
             * MEDIDO: bajo Electron 118 headless el comando del protocolo se
             * acepta sin error y no surte efecto —`matchMedia('(prefers-reduced-
             * motion: reduce)')` sigue devolviendo false y el estilo calculado no
             * cambia—, asi que una prueba escrita asi no comprueba nada aunque
             * se ponga verde.
             *
             * Lo que si se puede comprobar sin emular es lo unico que ha
             * fallado de verdad en este repositorio: el ORDEN. A igual
             * especificidad —y una consulta de medios no anade ninguna— manda
             * la ultima regla, y aqui ya hubo una salida de dialogo que quedaba
             * por debajo de su entrada y dejaba la preferencia sin efecto en
             * movil. Se lee la hoja publicada, no el archivo fuente.
             */
            cy.visitaDemo('/ternas');
            cy.get('.terna-card', { timeout: 20000 }).should('exist');

            cy.document().then((doc) => {
                // Posicion de aparicion de cada regla `.ui-refrescando`, en el
                // orden en que el navegador las aplicaria.
                let n = 0;
                let base = -1;
                let bajoPreferencia = -1;

                const recorrer = (reglas: CSSRuleList, enPreferencia: boolean) => {
                    for (const regla of Array.from(reglas)) {
                        if (regla instanceof doc.defaultView!.CSSMediaRule) {
                            recorrer(regla.cssRules, enPreferencia
                                || regla.conditionText.includes('prefers-reduced-motion'));
                            continue;
                        }
                        if (!(regla instanceof doc.defaultView!.CSSStyleRule)) continue;
                        n += 1;
                        if (regla.selectorText !== '.ui-refrescando') continue;
                        if (enPreferencia) bajoPreferencia = n;
                        else base = n;
                    }
                };

                for (const hoja of Array.from(doc.styleSheets)) {
                    let reglas: CSSRuleList;
                    try { reglas = hoja.cssRules; } catch { continue; } // hoja de otro origen
                    recorrer(reglas, false);
                }

                expect(base, 'la atenuacion existe').to.be.greaterThan(0);
                expect(bajoPreferencia, 'y hay un bloque que la apaga con la preferencia activa').to.be.greaterThan(0);
                expect(bajoPreferencia, 'que va DESPUES: a igual especificidad manda el orden').to.be.greaterThan(base);
            });
        });

        it('filtrar ternas no vacia la cuadricula', () => {
            /*
             * El filtro de ternas se resuelve en el SERVIDOR, asi que cada
             * chip volvia a poner la bandera de carga y el esqueleto borraba
             * lo que se estaba mirando (MEDIDO: `esqueleto=true`) para una
             * accion que ocurre dentro de la misma pantalla.
             *
             * Lo que se conserva es el contenido; lo que dice «esto se esta
             * poniendo al dia» es `aria-busy`, que ademas es lo que lee un
             * lector de pantalla. El atenuado va con retardo, de modo que una
             * respuesta rapida no da ni un parpadeo: por eso la prueba mira la
             * marca y no la opacidad.
             */
            cy.visitaDemo('/ternas');
            cy.get('.terna-card', { timeout: 20000 }).should('have.length.greaterThan', 0);
            cy.wait(700);

            const reg: { vacio: number; esqueleto: number }[] = [];
            cy.window().then((win) => {
                reg.push(vigilar(win, '.terna-card', '[aria-label="Cargando ternas…"]'));
            });
            cy.get('.ui-chip').eq(1).click({ scrollBehavior: 'center' });
            cy.get('.terna-card').should('exist');
            cy.then(() => {
                expect(reg[0].vacio, 'la cuadricula nunca se queda vacia').to.eq(0);
                expect(reg[0].esqueleto, 'no aparece el esqueleto sobre contenido ya cargado').to.eq(0);
            });
        });
    });

    describe('continuidad al guardar', () => {
        it('la nota guardada deja señalado SU curso', () => {
            /*
             * MEDIDO antes del arreglo: tras guardar, cero filas señaladas.
             * El aviso confirmaba que salió bien pero no decía dónde, y la
             * fila que acababa de cambiar quedaba igual que las demás.
             */
            cy.visitaDemo('/students/1');
            cy.get('.nota-add-btn, .nota-edit-btn', { timeout: 20000 }).first().click();
            cy.get('#en-nota').clear().type('91');
            cy.get('.ui-modal__footer button[type="submit"]').click();

            cy.contains(/nota guardada/i, { timeout: 10000 }).should('exist');
            cy.get('.sd-rec--guardado', { timeout: 10000 })
                .should('have.length', 1)
                .and('be.visible');
        });
    });

    describe('continuidad al crear', () => {
        it('el usuario recién creado queda señalado en el listado', () => {
            /*
             * Crear cerraba el diálogo, mostraba un aviso y recargaba la
             * lista: el usuario nuevo aparecía en algún sitio de ella sin
             * decir cuál, y en una lista larga había que buscarlo a mano.
             *
             * Proyectos y ternas ya señalaban el suyo desde hace tiempo. Este
             * era el único de los tres altas que no lo hacía: la
             * inconsistencia entre flujos equivalentes es peor que no señalar
             * en ninguno.
             */
            cy.visitaDemo('/usuarios');
            cy.contains('button', /Nuevo Usuario/i, { timeout: 20000 }).click({ scrollBehavior: 'center' });
            cy.get('.ui-modal-overlay').should('be.visible');

            const sufijo = Date.now().toString().slice(-6);
            cy.get('#nu-nombre').type(`Prueba ${sufijo}`);
            cy.get('#nu-email').type(`prueba.${sufijo}@miumg.edu.gt`);
            cy.get('#nu-password').type('claveSegura1');
            cy.get('.ui-modal__footer button[type="submit"]').click();

            // El diálogo se va y la fila nueva queda marcada — una sola.
            cy.get('.ui-modal-overlay', { timeout: 10000 }).should('not.exist');
            cy.get('.usr-list-item--nuevo', { timeout: 10000 })
                .should('have.length', 1)
                .and('contain.text', `Prueba ${sufijo}`);
        });
    });

    describe('foco de teclado en la navegación principal', () => {
        it('los ítems de la barra lateral acusan el foco', () => {
            /*
             * La barra lateral no tenía NINGÚN estilo de foco: quien navega
             * con teclado dependía del anillo por defecto del navegador, que
             * sobre este índigo oscuro casi no se ve.
             *
             * Se comprueba el `outline` calculado con el ítem enfocado. Si la
             * regla desaparece, el ancho vuelve a 0 (o al valor del navegador,
             * que no es 2px sólido blanco).
             */
            cy.get('.dash-sidebar__nav-item').first().focus();
            cy.focused().should(($el) => {
                const cs = calculado($el[0]);
                expect(cs.outlineStyle, 'hay anillo').to.eq('solid');
                expect(parseFloat(cs.outlineWidth), 'y se ve').to.be.greaterThan(1);
            });
        });
    });
});
