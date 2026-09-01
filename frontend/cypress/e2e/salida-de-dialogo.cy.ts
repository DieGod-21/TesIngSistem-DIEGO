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

/*
 * Los clics se CENTRAN al desplazar: la cabecera del producto es pegajosa y
 * Cypress, al alinear un elemento con el borde superior del área de scroll, lo
 * deja justo debajo de ella y se niega a pulsar «algo tapado».
 */
const CENTRADO = { scrollBehavior: 'center' } as const;

/** Nombre de la animación que la CASCADA le da de verdad a este elemento. */
function nombreDeAnimacion(el: Element): string {
    const win = el.ownerDocument.defaultView;
    if (!win) throw new Error('el elemento no está en una ventana');
    return win.getComputedStyle(el).animationName;
}

/**
 * Alarga la salida SOLO para poder observarla.
 *
 * 140ms es más corto que el ciclo de comandos de Cypress en una máquina
 * cargada, y estas pruebas miden QUÉ animación gana la cascada y QUÉ hay en
 * pantalla mientras dura, no cuánto dura. Alargarla no puede enmascarar
 * ningún defecto: si ganara la regla equivocada, el nombre de la animación
 * seguiría delatándola.
 *
 * La duración se alarga también en el VELO porque es de ahí de donde
 * `useOverlayTransition` deduce cuánto mantener la capa montada.
 */
function alargarLaSalida(ms = 600) {
    cy.document().then((doc) => {
        const estilo = doc.createElement('style');
        estilo.textContent =
            `.ui-modal-overlay--saliendo, .ui-modal--saliendo { animation-duration: ${ms}ms !important; }`;
        doc.head.appendChild(estilo);
    });
}

/** Emula `prefers-reduced-motion` en el navegador real (protocolo de Chrome). */
function emularMovimientoReducido(valor: 'reduce' | 'no-preference') {
    cy.wrap(
        Cypress.automation('remote:debugger:protocol', {
            command: 'Emulation.setEmulatedMedia',
            params: { features: [{ name: 'prefers-reduced-motion', value: valor }] },
        }),
        { log: false },
    );
}

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
    afterEach(() => {
        // La emulación de medios sobrevive a la prueba y contaminaría la
        // siguiente; se devuelve el navegador a su estado normal siempre.
        emularMovimientoReducido('no-preference');
    });

    it('el contenido no se borra mientras el diálogo se va', () => {
        /*
         * ── EL DEFECTO QUE PROTEGE ──────────────────────────────────────
         *
         * Cuatro diálogos vaciaban su formulario DENTRO del manejador de
         * cierre, antes de avisar al padre. Con el desmontaje ya diferido,
         * el vaciado y el inicio de la salida caían en el mismo lote de
         * React y el usuario veía su propio texto desaparecer ANTES que el
         * diálogo. La curva de salida acelera: a mitad de camino la capa
         * sigue al ~68 % de opacidad, así que el formulario en blanco se lee
         * perfectamente. Se percibe como pérdida de datos.
         *
         * Se comprueba en el navegador y no solo en jsdom porque el defecto
         * solo existe DURANTE la animación, que jsdom no tiene.
         */
        cy.entrar();
        cy.visitaDemo('/usuarios');
        cy.contains('button', /Nuevo Usuario/i, { timeout: 20000 }).click(CENTRADO);
        cy.get('.ui-modal-overlay').should('be.visible');

        cy.get('#nu-nombre').type('Ana Pérez');
        cy.get('#nu-email').type('ana.perez@miumg.edu.gt');

        alargarLaSalida();
        // Se cierra por donde cierra el usuario: el defecto vive en el
        // manejador de cierre, así que forzar `open=false` no lo reproduce.
        cy.get('.ui-modal__header .ui-icon-btn').click();

        cy.get('.ui-modal').should('have.class', 'ui-modal--saliendo');
        cy.get('#nu-nombre').should('have.value', 'Ana Pérez');
        cy.get('#nu-email').should('have.value', 'ana.perez@miumg.edu.gt');

        // Y termina de irse del todo.
        cy.get('.ui-modal-overlay', { timeout: 4000 }).should('not.exist');

        // Al volver a abrir nace limpio: el vaciado se movió, no se perdió.
        cy.contains('button', /Nuevo Usuario/i).click(CENTRADO);
        cy.get('#nu-nombre').should('have.value', '');
    });

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

        // La entrada del móvil es la hoja que sube, no la tarjeta que escala.
        cy.get('.ui-modal').then(($m) => {
            expect(nombreDeAnimacion($m[0]), 'en móvil entra deslizándose').to.eq('sheet-up');
        });

        alargarLaSalida();
        cy.get('body').type('{esc}');

        /*
         * LA ASERCIÓN QUE FALTABA.
         *
         * Antes esta prueba solo miraba que la clase `--saliendo` estuviera
         * puesta, y la clase SIEMPRE está puesta: la pone React, no la
         * cascada. Con ella pasaba en verde mientras el panel no se movía.
         *
         * `.ui-modal--saliendo` y el `.ui-modal` de la consulta de 640px pesan
         * lo mismo, así que gana el que va DESPUÉS en el archivo. Estando la
         * salida antes, en móvil ganaba `sheet-up` y la hoja no se despedía:
         * se desvanecía el velo y ella desaparecía de golpe. Solo el nombre de
         * la animación calculada distingue un caso del otro.
         */
        cy.get('.ui-modal').should('have.class', 'ui-modal--saliendo').then(($m) => {
            expect(
                nombreDeAnimacion($m[0]),
                'la hoja VUELVE POR DONDE VINO; «sheet-up» aquí significa que la consulta de 640px pisa la salida, y «ui-modal-out» que se está encogiendo en el sitio en vez de bajar',
            ).to.eq('sheet-down');
        });

        cy.get('.ui-modal-overlay', { timeout: 4000 }).should('not.exist');
        cy.focused().should('match', '.nota-add-btn, .nota-edit-btn');
    });

    it('en móvil con movimiento reducido la hoja no se desliza', () => {
        /*
         * El bloque de movimiento reducido también tiene que ir DESPUÉS del
         * bottom-sheet. Mientras estuvo antes, en un teléfono con la
         * preferencia activa el `sheet-up` de la consulta de 640px pisaba el
         * `animation: none` y la hoja seguía deslizándose: la preferencia se
         * respetaba en escritorio y se perdía justo donde más se usa.
         *
         * Aquí se emula la preferencia DE VERDAD en el navegador. Inyectar la
         * regla que se quiere comprobar —como hace la prueba de escritorio de
         * más arriba, por falta de alternativa entonces— habría probado la
         * inyección y no el CSS que se publica.
         */
        cy.viewport(390, 844);
        emularMovimientoReducido('reduce');
        abrirDialogoDeNota();

        cy.get('.ui-modal').then(($m) => {
            expect(
                nombreDeAnimacion($m[0]),
                'con la preferencia activa la hoja no se desliza; «sheet-up» aquí significa que la consulta de 640px pisa el bloque de movimiento reducido',
            ).to.eq('none');
        });

        // Y la salida sigue siendo instantánea, sin esperar un evento que no
        // va a llegar: es el camino por el que una capa se quedaría colgada.
        cy.get('body').type('{esc}');
        cy.get('.ui-modal-overlay').should('not.exist');
    });
});
