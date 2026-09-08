/**
 * flujo.cy.ts — Lo que pasa ANTES, DURANTE y JUSTO DESPUÉS de una acción.
 *
 * ── QUÉ PROTEGE ─────────────────────────────────────────────────────────
 *
 * No la apariencia de una pantalla quieta, sino el trecho entre que el usuario
 * pide algo y lo obtiene: si el trabajo se adelanta, dónde queda el foco
 * cuando algo falla, y si el resumen de un módulo deja sitio al módulo.
 * Nada de esto se ve en una captura ni en una prueba unitaria.
 */

describe('flujo', () => {
    /* Los specs de esta carpeta comparten ámbito de tipos, así que los
       ayudantes viven DENTRO del bloque. */

    /** Cuántas veces se ha pedido un módulo al servidor de desarrollo. */
    function pedidas(win: Window, modulo: RegExp): number {
        return win.performance.getEntriesByType('resource').filter((r) => modulo.test(r.name)).length;
    }

    beforeEach(() => {
        cy.viewport(1280, 800);
        cy.entrar();
    });

    describe('el trabajo se adelanta al clic', () => {
        it('posar el puntero en un módulo ya lo trae', () => {
            /*
             * MEDIDO grabando fotograma a fotograma qué ocupa el área de
             * contenido al pulsar un módulo por primera vez:
             *
             *     CHUNK@136 → esqueleto@441 → contenido@595
             *
             * Dos esqueletos distintos encadenados para un solo clic: el
             * genérico que cubre la descarga del módulo y después el propio del
             * módulo mientras pide sus datos. El segundo es inevitable —los
             * datos aún no están—; el primero no, porque entre que el puntero
             * se posa y llega el clic hay cientos de milisegundos muertos.
             *
             * Se comprueban las DOS mitades: que ANTES de posar el puntero no
             * se haya pedido nada (si no, la prueba pasaría sola con cualquier
             * precarga indiscriminada) y que DESPUÉS sí, sin haber pulsado.
             */
            cy.contains('.dash-sidebar__nav-item', 'Inicio').click({ scrollBehavior: 'center' });
            cy.get('.dash-header', { timeout: 20000 }).should('exist');
            cy.wait(400);

            cy.window().then((win) => {
                expect(pedidas(win, /UsuariosPage/i), 'no se trae lo que nadie ha mirado').to.eq(0);
            });

            // React deriva `onMouseEnter` de `mouseover`: es el evento que hay
            // que disparar para que el manejador se ejecute de verdad.
            cy.contains('.dash-sidebar__nav-item', 'Usuarios').trigger('mouseover');
            cy.wait(800);

            cy.window().then((win) => {
                expect(pedidas(win, /UsuariosPage/i), 'al posar el puntero ya se trae, sin pulsar').to.be.greaterThan(0);
                expect(win.location.pathname, 'y sin haber navegado a ninguna parte').to.not.eq('/usuarios');
            });
        });

        it('el teclado también lo adelanta', () => {
            // Quien navega con el teclado nunca posa un puntero: sin `onFocus`
            // la mejora sería solo para quien usa ratón.
            cy.contains('.dash-sidebar__nav-item', 'Inicio').click({ scrollBehavior: 'center' });
            cy.get('.dash-header', { timeout: 20000 }).should('exist');
            cy.wait(400);
            cy.window().then((win) => {
                expect(pedidas(win, /ReportesPage/i), 'nada pedido todavía').to.eq(0);
            });

            cy.contains('.dash-sidebar__nav-item', 'Reportes').focus();
            cy.wait(800);
            cy.window().then((win) => {
                expect(pedidas(win, /ReportesPage/i), 'al recibir el foco ya se trae').to.be.greaterThan(0);
            });
        });
    });

    describe('cuando algo falla, el foco no se pierde', () => {
        it('un alta rechazada deja el foco EN el error', () => {
            /*
             * MEDIDO: al fallar el alta de un usuario el foco acababa en
             * `<body>`. El botón enviado se deshabilita mientras dura la
             * petición, y deshabilitar el elemento enfocado tira el foco al
             * documento. En el camino feliz no se nota —el diálogo se cierra y
             * el foco vuelve solo al botón que lo abrió—, pero cuando falla el
             * diálogo SIGUE abierto: quien navega con teclado se queda fuera de
             * la trampa de foco y el siguiente tabulador empieza arriba del
             * todo.
             *
             * Se comprueban las dos cosas que importan: que el foco esté en el
             * mensaje —aterrizar EN el problema es lo que recomienda WCAG para
             * un error de envío— y que siga DENTRO del diálogo.
             */
            cy.visitaDemo('/usuarios');
            cy.get('.usr-list-item', { timeout: 20000 }).should('exist');
            cy.contains('button', /Nuevo Usuario/i).click({ scrollBehavior: 'center' });
            cy.get('.ui-modal-overlay').should('be.visible');

            cy.get('#nu-nombre').type('Duplicado');
            cy.get('#nu-email').type('coordinacion@miumg.edu.gt');   // ya registrado
            cy.get('#nu-password').type('claveSegura1');
            cy.get('.ui-modal__footer button[type="submit"]').click();

            cy.get('.ui-alert--danger', { timeout: 10000 }).should('be.visible');
            cy.focused().should('have.class', 'ui-alert--danger');

            cy.window().then((win) => {
                const dialogo = win.document.querySelector('.ui-modal');
                expect(dialogo?.contains(win.document.activeElement), 'el foco sigue dentro del diálogo').to.eq(true);
                // Alcanzable por programa, nunca una parada más del tabulador.
                expect((win.document.activeElement as HTMLElement).tabIndex, 'no entra en el recorrido').to.eq(-1);
            });

            // Y el diálogo sigue en pie con lo escrito: nada que reescribir.
            cy.get('#nu-nombre').should('have.value', 'Duplicado');
        });
    });

    describe('en móvil, el resumen no puede costar la pantalla', () => {
        it('el listado de Usuarios empieza por encima del pliegue', () => {
            /*
             * MEDIDO a 390×844 antes del arreglo: la primera fila empezaba en
             * y=808 —el borde inferior de la ventana— porque las tres tarjetas
             * de resumen se apilaban en columna y ocupaban 232px. Proyectos y
             * Ternas ponen su primer elemento en y≈478. El resumen es
             * orientación; el listado es el trabajo, y quedaba fuera.
             *
             * Se comprueba el resultado —dónde empieza el trabajo— y no el
             * número de columnas: cualquier solución que deje el listado a la
             * vista vale.
             */
            cy.viewport(390, 844);
            cy.visitaDemo('/usuarios');
            cy.get('.usr-list-item', { timeout: 20000 }).should('exist');
            cy.wait(500);

            cy.window().then((win) => {
                const fila = win.document.querySelector('.usr-list-item') as HTMLElement;
                const y = fila.getBoundingClientRect().top + win.scrollY;
                expect(y, 'la primera fila entra en la primera pantalla').to.be.lessThan(win.innerHeight);

                const rejilla = win.document.querySelector('.ui-stat-grid') as HTMLElement;
                expect(rejilla.getBoundingClientRect().height, 'el resumen cabe en una franja')
                    .to.be.lessThan(160);

                // Sin desbordes laterales por comprimir las tarjetas.
                expect(win.document.documentElement.scrollWidth, 'no aparece scroll horizontal')
                    .to.eq(win.innerWidth);
            });

            // Y el texto de las tarjetas sigue completo: no se esconde nada.
            cy.get('.ui-stat__sub').should('have.length', 2).and('be.visible');
        });
    });
});
