/**
 * demo.cy.ts — El entorno de demostración sigue vivo.
 *
 * La demo es la única forma de mirar el producto lleno sin credenciales del
 * servidor real, así que es infraestructura de pruebas: si se rompe en
 * silencio, se pierde la capacidad de verificar todo lo demás.
 *
 * También se comprueba aquí que la banda de aviso NO tapa controles del
 * producto. Se sentaba encima de «Cerrar Sesión» y, como no intercepta el
 * puntero, el botón seguía respondiendo aunque no se viera: exactamente el
 * tipo de defecto que nadie reporta porque «funciona».
 */

describe('entorno de demostración', () => {
    it('se activa y lo anuncia', () => {
        cy.visitaDemo('/login');
        /*
         * NO se usa `be.visible`. La banda lleva `pointer-events: none` a
         * propósito —avisa, no estorba—, y la comprobación de visibilidad de
         * Cypress pregunta por `elementFromPoint`, que en un elemento que no
         * recibe el puntero devuelve lo que hay DEBAJO y concluye que está
         * tapada. Comprobado con captura: se pinta perfectamente.
         *
         * Así que se comprueba lo que de verdad importa: que existe, que tiene
         * cuerpo y que está dentro de la ventana.
         */
        cy.get('.demo-banner').should('exist').and('contain.text', 'Datos de demostración')
            .then(($b) => {
                const r = $b[0].getBoundingClientRect();
                expect(r.height, 'alto de la banda').to.be.greaterThan(0);
                expect(r.width, 'ancho de la banda').to.be.greaterThan(0);
                expect(r.bottom, 'dentro de la ventana')
                    .to.be.at.most(Number(Cypress.config('viewportHeight')) + 1);
            });
    });

    it('permite entrar y trae datos coherentes', () => {
        cy.entrar();
        cy.get('.cohort-tile', { timeout: 20000 }).should('have.length.greaterThan', 0);
        cy.contains('Coordinación de Graduación').should('exist');
    });

    it('el padrón responde con estudiantes del conjunto', () => {
        cy.entrar();
        cy.visitaDemo('/students');
        cy.get('.sl-table__tr', { timeout: 20000 }).should('have.length.greaterThan', 5);
        cy.get('.sl-pager__info').should('exist');
    });

    it('el rol decide qué se ve: un evaluador no recibe el padrón', () => {
        cy.entrar('rmendez@miumg.edu.gt');
        cy.get('.dash-sidebar__nav a').should('not.contain.text', 'Estudiantes');
        cy.visitaDemo('/students');
        cy.contains(/acceso restringido|no tienes (permiso|acceso)/i, { timeout: 20000 })
            .should('exist');
    });

    it('la banda no tapa «Cerrar Sesión» en ninguna altura de ventana', () => {
        cy.entrar();
        [720, 800, 900].forEach((alto) => {
            cy.viewport(1280, alto);
            cy.get('.dash-sidebar__logout').then(($btn) => {
                const b = $btn[0].getBoundingClientRect();
                cy.get('.demo-banner').then(($banda) => {
                    const d = $banda[0].getBoundingClientRect();
                    expect(b.bottom, `solape a ${alto}px de alto`).to.be.at.most(d.top + 1);
                });
            });
        });
    });

    it('las fechas del conjunto son recientes, no de otro año', () => {
        // Un conjunto con fechas fijas envejece, y el producto acaba
        // enseñándose como si llevara meses abandonado.
        cy.entrar();
        cy.contains(/hace \d+ (día|días|hora|horas)/i, { timeout: 20000 }).should('exist');
    });
});
