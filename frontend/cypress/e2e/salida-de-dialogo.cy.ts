/**
 * salida-de-dialogo.cy.ts — Los diálogos también se van.
 *
 * ── QUÉ DEFECTO PROTEGE ─────────────────────────────────────────────────
 *
 * Los diálogos entraban animados y desaparecían entre dos cuadros. La
 * asimetría se nota: al abrir, la capa se presenta y el ojo la sigue; al
 * cerrar, el contexto de debajo reaparece sin que nadie lo haya anunciado.
 *
 * Pero la parte que DE VERDAD hay que proteger no es el fundido —eso se mira—
 * sino lo que lo hace seguro. Retrasar el desmontaje significa que durante unos
 * 140ms hay un diálogo en el DOM que ya no es un diálogo: no debe atrapar el
 * foco, no debe aceptar clics y no puede quedarse ahí si algo sale mal. Una
 * capa atascada tapa la aplicación entera.
 *
 * Ninguna de esas cuatro cosas se puede comprobar en jsdom, donde no hay
 * animaciones ni geometría: por eso viven aquí.
 */

/** Abre el diálogo de nota desde el expediente del primer estudiante. */
function abrirDialogoDeNota() {
    cy.entrar();
    cy.visitaDemo('/students/1');
    // El botón es «Registrar» si al curso le falta la nota y «Editar» si ya la
    // tiene; el diálogo es el mismo y da igual por cuál se entre.
    cy.get('.nota-add-btn, .nota-edit-btn', { timeout: 20000 }).first().as('disparador');
    cy.get('@disparador').click();
    cy.get('.ui-modal-overlay', { timeout: 10000 }).should('be.visible');
}

describe('salida del diálogo', () => {
    it('al cerrar, la capa se marca como saliendo antes de irse', () => {
        abrirDialogoDeNota();
        cy.get('body').type('{esc}');
        // Existe una ventana real de salida: la capa sigue en el DOM, marcada.
        cy.get('.ui-modal-overlay').should('have.class', 'ui-modal-overlay--saliendo');
    });

    it('durante la salida no es un diálogo con el que se pueda hablar', () => {
        // Sigue pintada, pero ya no acepta el puntero ni debe anunciarse a un
        // lector de pantalla: sin esto, un clic rápido sobre un velo que se
        // desvanece alcanzaría lo que hay debajo.
        abrirDialogoDeNota();
        cy.get('body').type('{esc}');
        cy.get('.ui-modal-overlay--saliendo')
            .should('have.attr', 'aria-hidden', 'true')
            .and('have.css', 'pointer-events', 'none');
    });

    it('el foco vuelve al botón que abrió, sin esperar a la animación', () => {
        // La accesibilidad no paga el precio de la decoración: quien navega con
        // teclado recupera el control en cuanto pide cerrar.
        abrirDialogoDeNota();
        cy.get('body').type('{esc}');
        cy.focused().should('match', '.nota-add-btn, .nota-edit-btn');
    });

    it('termina de irse: no queda ninguna capa', () => {
        abrirDialogoDeNota();
        cy.get('body').type('{esc}');
        cy.get('.ui-modal-overlay', { timeout: 4000 }).should('not.exist');
        cy.get('.ui-modal').should('not.exist');
    });

    it('cerrar con el aspa también la retira del todo', () => {
        abrirDialogoDeNota();
        cy.get('.ui-modal__header .ui-icon-btn').click();
        cy.get('.ui-modal-overlay', { timeout: 4000 }).should('not.exist');
    });

    it('cerrar pulsando el velo también la retira del todo', () => {
        abrirDialogoDeNota();
        // Esquina superior izquierda: el velo, nunca el panel centrado.
        cy.get('.ui-modal-overlay').click(5, 5);
        cy.get('.ui-modal-overlay', { timeout: 4000 }).should('not.exist');
    });

    it('abrir y cerrar repetidamente no acumula capas', () => {
        // Un desmontaje que se pierde deja restos invisibles apilados sobre la
        // aplicación. Tres ciclos bastan para que se notara.
        abrirDialogoDeNota();
        for (let i = 0; i < 3; i += 1) {
            cy.get('body').type('{esc}');
            cy.get('.ui-modal-overlay', { timeout: 4000 }).should('not.exist');
            cy.get('@disparador').click();
            cy.get('.ui-modal-overlay').should('have.length', 1);
        }
        cy.get('body').type('{esc}');
        cy.get('.ui-modal-overlay', { timeout: 4000 }).should('not.exist');
    });

    it('reabrir a mitad de la salida deja el diálogo utilizable', () => {
        abrirDialogoDeNota();
        cy.get('body').type('{esc}');
        cy.get('.ui-modal-overlay--saliendo').should('exist');
        cy.get('@disparador').click({ force: true });
        cy.get('.ui-modal-overlay')
            .should('have.length', 1)
            .and('not.have.class', 'ui-modal-overlay--saliendo');
        cy.get('.ui-modal-overlay').should('not.have.attr', 'aria-hidden');
        cy.get('#en-nota').should('be.visible').type('88');
    });

    it('la salida no bloquea el guardado', () => {
        /*
         * Guardar dispara el cierre. La animación solo retrasa PÍXELES: la
         * petición sale, la respuesta se procesa y el aviso de éxito aparece
         * como siempre.
         *
         * No se comprueba que la nota nueva se pinte: el conjunto de
         * demostración confirma la escritura sin persistirla a propósito
         * («no persiste», ver demoApi), así que esperar un 91 en pantalla
         * mediría el doble, no el producto.
         */
        abrirDialogoDeNota();
        cy.get('#en-nota').clear().type('91');
        cy.get('.ui-modal__footer button[type="submit"]').click();
        cy.contains(/nota guardada/i, { timeout: 10000 }).should('exist');
        cy.get('.ui-modal-overlay', { timeout: 4000 }).should('not.exist');
        cy.get('.ui-alert--danger').should('not.exist');
    });

    it('con movimiento reducido no hay salida que esperar', () => {
        // El CSS deja la animación en `none` y el hook lo deduce del propio
        // elemento: se desmonta en el acto en vez de aguardar un evento que
        // nunca va a llegar. Es el camino por el que una capa se quedaría
        // colgada para siempre.
        cy.entrar();
        cy.visitaDemo('/students/1');
        cy.get('.nota-add-btn, .nota-edit-btn', { timeout: 20000 }).first().click();
        cy.get('.ui-modal-overlay').should('be.visible');

        // Cypress no expone la preferencia del sistema; se fuerza el mismo
        // resultado que produce la consulta de medios, que es lo que el hook
        // lee: una animación de salida inexistente.
        cy.document().then((doc) => {
            const estilo = doc.createElement('style');
            estilo.textContent =
                '.ui-modal-overlay--saliendo, .ui-modal--saliendo { animation: none !important; }';
            doc.head.appendChild(estilo);
        });

        cy.get('body').type('{esc}');
        cy.get('.ui-modal-overlay').should('not.exist');
    });

    /* ── La misma promesa en todos los diálogos ─────────────────────────
     *
     * Media docena de diálogos con la misma carcasa: si solo uno se despide y
     * los demás desaparecen de golpe, el producto se siente MENOS coherente
     * que antes de tocarlo, no más. Aquí se comprueba que la ventana de salida
     * y su desmontaje valen igual en los que se alcanzan desde la interfaz.
     *
     * `ImportModal` además lleva el modificador `--wide`: sirve para verificar
     * que la clase de salida se suma a los modificadores en vez de pisarlos.
     *
     * Los clics se CENTRAN al desplazar: la cabecera del producto es pegajosa
     * y Cypress, al alinear un elemento con el borde superior del área de
     * scroll, lo deja justo debajo de ella y se niega a pulsar «algo tapado».
     */
    const CENTRADO = { scrollBehavior: 'center' } as const;
    const OTROS = [
        { nombre: 'importar al padrón', ruta: '/students', abrir: () => cy.contains('button', /^Importar$/).click(CENTRADO) },
        { nombre: 'nueva terna',        ruta: '/ternas',   abrir: () => cy.contains('button', /Nueva terna/i).click(CENTRADO) },
    ];

    OTROS.forEach(({ nombre, ruta, abrir }) => {
        it(`«${nombre}» también se despide y se retira del todo`, () => {
            cy.entrar();
            cy.visitaDemo(ruta);
            abrir();
            cy.get('.ui-modal-overlay', { timeout: 20000 }).should('be.visible');
            // El panel conserva sus modificadores además de la clase de salida.
            cy.get('.ui-modal').invoke('attr', 'class').as('clasesPanel');

            cy.get('body').type('{esc}');
            cy.get('.ui-modal-overlay')
                .should('have.class', 'ui-modal-overlay--saliendo')
                .and('have.attr', 'aria-hidden', 'true');
            cy.get('@clasesPanel').then((clases) => {
                cy.get('.ui-modal').should('have.class', 'ui-modal--saliendo');
                String(clases).split(/\s+/).filter(Boolean).forEach((c) => {
                    cy.get('.ui-modal').should('have.class', c);
                });
            });

            cy.get('.ui-modal-overlay', { timeout: 4000 }).should('not.exist');
        });
    });

    it('en móvil la hoja inferior también se despide y se retira', () => {
        // A 640px o menos el diálogo deja de ser una tarjeta centrada y pasa a
        // ser una hoja anclada abajo. Es el mismo componente, pero la salida
        // ocurre sobre otra disposición: conviene verla ahí también.
        cy.viewport(390, 844);
        abrirDialogoDeNota();
        // El alto se lee de la ventana real: `Cypress.config('viewportHeight')`
        // devuelve el valor configurado, no el que acaba de fijar `cy.viewport`.
        cy.window().then((win) => {
            cy.get('.ui-modal').then(($m) => {
                expect($m[0].getBoundingClientRect().bottom, 'anclada al borde inferior')
                    .to.be.closeTo(win.innerHeight, 2);
            });
        });

        cy.get('body').type('{esc}');
        cy.get('.ui-modal-overlay').should('have.class', 'ui-modal-overlay--saliendo');
        cy.get('.ui-modal-overlay', { timeout: 4000 }).should('not.exist');
        cy.focused().should('match', '.nota-add-btn, .nota-edit-btn');
    });
});
