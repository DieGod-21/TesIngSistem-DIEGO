/**
 * navegacion-contextual.cy.ts — Del aviso a la persona, sin buscar a mano.
 *
 * ── QUÉ DEFECTO PROTEGE ─────────────────────────────────────────────────
 *
 * El panel avisa de expedientes que necesitan revisión y los nombra. Pulsar un
 * nombre llevaba al padrón filtrado por su carné: la lista quedaba reducida a
 * una fila, sin abrir, y había que pulsar otra vez. Si además esa persona
 * estaba en otra página del listado, ni siquiera eso: el filtro dependía de
 * que el servidor buscase por carné.
 *
 * Lo que se protege aquí es la promesa completa: pulsar a alguien lleva a ESA
 * persona, en la página donde de verdad está su fila, con su inspección
 * abierta y sin perder de vista al resto del padrón.
 */

/*
 * La cabecera del producto es pegajosa. Cypress, al desplazar un elemento para
 * pulsarlo, lo alinea con el borde superior del área de scroll… que es
 * exactamente donde está la cabecera, así que lo deja debajo y se niega a
 * pulsar «un elemento tapado». Centrarlo es lo que haría una persona.
 */
const OPCIONES_CLIC = { scrollBehavior: 'center' } as const;

describe('del panel al expediente concreto', () => {
    beforeEach(() => {
        cy.entrar();
        /*
         * Se espera al TITULAR del panel, no al panel entero.
         *
         * `be.visible` sobre un contenedor dentro de un ancestro `position:
         * fixed` se decide por su punto CENTRAL, y este panel mide más que el
         * hueco que queda bajo el pliegue. MEDIDO en el viewport de Cypress
         * (1000x660), con el panel arrancando en y=550:
         *
         *     centro del panel  →  y=685   (fuera de los 660 de alto)
         *
         * Es decir: la aserción no hablaba de si el panel está en pantalla
         * sino de si CABE ENTERO en ella, que no es lo que esta prueba
         * necesita ni lo que promete su nombre. El titular sí está a la vista
         * —es lo primero que se lee del bloque— y es la señal correcta de que
         * el panel ya está dibujado y se puede interactuar con él.
         */
        cy.get('.elig-audit__titulo', { timeout: 20000 }).should('be.visible');
        // El panel se alimenta de varias fuentes y vuelve a dibujarse cuando
        // termina la última. Si se pulsa un enlace en ese hueco, el elemento
        // ya está desprendido del documento cuando llega el clic. Esperar a la
        // cola —que sale del mismo lote— es esperar a que todo haya llegado.
        cy.get('.wq__item', { timeout: 20000 }).should('have.length.greaterThan', 0);
    });

    it('la cifra encabeza el aviso y coincide con las filas que lista', () => {
        cy.get('.elig-audit__cifra').invoke('text').then((cifra) => {
            cy.get('.elig-audit__row').should('have.length', Number(String(cifra).trim()));
        });
    });

    it('cada nombre enlaza por identificador, nunca por nombre', () => {
        // Buscar por nombre confundiría a dos homónimos y abriría el expediente
        // equivocado sin que nadie se entere.
        cy.get('.elig-audit__link').each(($a) => {
            const href = $a.attr('href') ?? '';
            expect(href, href).to.match(/^\/students\?(page=\d+&)?preview=\d+$|^\/students\?search=/);
        });
    });

    it('abre a la persona correcta aunque esté en otra página del padrón', () => {
        // Se elige a propósito el enlace que lleva página: es el caso que
        // fallaba, y el que ninguna prueba de unidad puede ver.
        cy.get('.elig-audit__link[href*="page="]').first().then(($a) => {
            const esperado = $a.find('.elig-audit__nombre').text().trim();
            const href = String($a.attr('href'));

            cy.wrap($a).click(OPCIONES_CLIC);

            // 0. La URL lleva el contexto entero: página + persona.
            cy.location('search', { timeout: 20000 })
                .should('eq', href.slice(href.indexOf('?')));

            // 1. La inspección está abierta y habla de esa persona.
            cy.contains('[class*="qv"]', esperado, { timeout: 20000 }).should('be.visible');

            // 2. Su fila está marcada en el listado de detrás, y es la única.
            cy.get('.sl-table__tr--previewing')
                .should('have.length', 1)
                .and('contain.text', esperado);

            // 3. No se perdió el padrón: no quedó una búsqueda puesta.
            cy.get('.ui-search__input').should('have.value', '');
        });
    });

    it('la fila señalada queda dentro de la ventana, no bajo el pliegue', () => {
        cy.get('.elig-audit__link[href*="page="]').first().click(OPCIONES_CLIC);
        cy.get('.sl-table__tr--previewing', { timeout: 20000 }).should(($fila) => {
            const r = $fila[0].getBoundingClientRect();
            expect(r.top, 'borde superior').to.be.greaterThan(-1);
            expect(r.bottom, 'borde inferior').to.be.lessThan(Number(Cypress.config('viewportHeight')) + 1);
        });
    });

    it('el botón Atrás devuelve al panel', () => {
        cy.get('.elig-audit__link').first().click(OPCIONES_CLIC);
        cy.location('pathname', { timeout: 20000 }).should('eq', '/students');
        cy.go('back');
        cy.location('pathname').should('eq', '/dashboard');
        // El titular, por el mismo motivo que en el `beforeEach`: el panel mide
        // más que el hueco bajo el pliegue y `be.visible` se decide por su
        // punto central.
        cy.get('.elig-audit__titulo').should('be.visible');
    });

    it('recargar sobre el enlace deja el mismo estado, no uno roto', () => {
        cy.get('.elig-audit__link[href*="page="]').first().click(OPCIONES_CLIC);
        cy.location('search').then((qs) => {
            cy.reload();
            cy.location('search').should('eq', qs);
            cy.get('.sl-table__tr--previewing', { timeout: 20000 }).should('have.length', 1);
        });
    });

    it('un identificador inexistente no deja la pantalla colgada', () => {
        // Degradar con claridad es parte del contrato: a esa persona pudieron
        // darla de baja entre que se pintó el aviso y se pulsó el enlace.
        cy.visitaDemo('/students?preview=999999');
        cy.get('.sl-table__tr', { timeout: 20000 }).should('exist');
        cy.get('[aria-busy="true"]').should('not.exist');
        cy.get('.sl-table__tr--previewing').should('not.exist');
    });
});
