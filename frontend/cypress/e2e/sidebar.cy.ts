/**
 * sidebar.cy.ts — El indicador de la barra lateral, desde la PRIMERA carga.
 *
 * ── QUÉ DEFECTO PROTEGE ─────────────────────────────────────────────────
 *
 * El indicador activo se coloca MIDIENDO el ítem activo. En una carga en frío
 * medía un elemento que todavía no tenía caja, se quedaba con «altura 0» y
 * «posición 0», y se dibujaba igualmente: una raya de altura cero, a plena
 * opacidad y 16px por encima del ítem que decía señalar. No se arreglaba solo;
 * hacía falta navegar a otro módulo y volver, que es lo que hacía parecer el
 * defecto intermitente.
 *
 * Nada de eso rompía una prueba unitaria: el componente renderizaba, el estado
 * era coherente y el error solo existía en la geometría del navegador. Por eso
 * esta comprobación vive aquí y no en jsdom, donde todo mide cero por
 * definición y el defecto sería literalmente invisible.
 *
 * La aserción es siempre la misma: el indicador tiene que COINCIDIR con el
 * ítem activo. No «ser visible» —lo era— sino estar donde dice estar.
 */

/** El indicador cubre exactamente al ítem activo, y se ve. */
function indicadorCuadraConElActivo() {
    cy.get('.dash-sidebar__nav-item--active').should('exist').then(($activo) => {
        const a = $activo[0].getBoundingClientRect();
        cy.get('.dash-sidebar__active-indicator').should(($ind) => {
            const i = $ind[0].getBoundingClientRect();
            expect(i.height, 'alto del indicador').to.be.greaterThan(0);
            expect(Number($ind.css('opacity')), 'opacidad').to.be.greaterThan(0);
            expect(Math.abs(i.top - a.top), 'desfase vertical').to.be.lessThan(2);
            expect(Math.abs(i.height - a.height), 'diferencia de alto').to.be.lessThan(2);
        });
    });
}

describe('barra lateral — indicador activo', () => {
    it('queda colocado tras entrar, sin navegar a ninguna otra parte', () => {
        cy.entrar();
        indicadorCuadraConElActivo();
        cy.get('.dash-sidebar__nav-item--active').should('contain.text', 'Inicio');
    });

    it('sigue colocado tras recargar la página', () => {
        cy.entrar();
        cy.reload();
        indicadorCuadraConElActivo();
    });

    it('se coloca al entrar por una URL directa, no solo en Inicio', () => {
        cy.entrar();
        cy.visitaDemo('/students');
        indicadorCuadraConElActivo();
        cy.get('.dash-sidebar__nav-item--active').should('contain.text', 'Estudiantes');
    });

    it('viaja al navegar dentro de la aplicación y al volver', () => {
        cy.entrar();
        cy.get('.dash-sidebar__nav a').contains('Estudiantes').click();
        cy.location('pathname').should('eq', '/students');
        indicadorCuadraConElActivo();

        cy.get('.dash-sidebar__nav a').contains('Inicio').click();
        cy.location('pathname').should('eq', '/dashboard');
        indicadorCuadraConElActivo();
    });

    it('sobrevive a un cambio de tamaño de ventana', () => {
        cy.entrar();
        cy.viewport(1024, 768);
        indicadorCuadraConElActivo();
        cy.viewport(1440, 900);
        indicadorCuadraConElActivo();
    });

    it('en el cajón móvil se coloca al abrirlo, no antes', () => {
        cy.viewport(390, 844);
        cy.entrar();
        cy.get('.dash-header__menu-btn').click();
        cy.get('.dash-sidebar--open').should('be.visible');
        indicadorCuadraConElActivo();
    });
});
