/**
 * vista-rapida.cy.ts — Hojear el padrón sin abrir un panel nuevo cada vez.
 *
 * ── QUÉ DEFECTO PROTEGE ─────────────────────────────────────────────────
 *
 * El panel de inspección dependía de `loading` a secas: al pulsar la flecha,
 * identidad, cuerpo y pie se desmontaban, aparecían cuatro barras grises y
 * todo se volvía a montar. El marco no se movía, pero lo de dentro se
 * reconstruía entero, así que recorrer veinte expedientes se sentía como abrir
 * veinte paneles en lugar de hojear uno.
 *
 * Lo que se protege aquí es esa sensación, que ninguna prueba unitaria puede
 * ver: que al recorrer cambie el CONTENIDO y no la superficie que lo sostiene.
 */

const OPCIONES_CLIC = { scrollBehavior: 'center' } as const;

/**
 * Abre la vista rápida por la primera fila del padrón.
 *
 * ESPERAR A QUE EL PADRÓN SE ASIENTE ANTES DE PULSAR: la tabla se dibuja en
 * cuanto llega el listado, pero el lote del workspace (veredictos, conteos de
 * la lente) llega después y vuelve a dibujarla. Pulsar en ese hueco deja el
 * clic sobre una fila ya desprendida del documento: no pasa nada y el panel no
 * llega a abrirse. Los conteos de la lente solo existen cuando ese lote
 * aterrizó, así que esperarlos es esperar a que no queden redibujados.
 */
function abrirPrimera() {
    cy.entrar();
    cy.visitaDemo('/students');
    cy.get('.pb__chip-count', { timeout: 20000 }).should('exist');
    cy.get('.sl-table__tr', { timeout: 20000 }).should('have.length.greaterThan', 3);
    // Por la PRIMERA fila: así «anterior» queda en un extremo conocido y
    // «siguiente» siempre tiene destino.
    cy.get('.sl-table__tr').first().click(OPCIONES_CLIC);
    cy.get('.qv-panel', { timeout: 20000 }).should('be.visible');
}

/* Los controles se acotan al paginador: el listado de detrás tiene su propia
   paginación, y «siguiente» a secas encontraba dos botones. */
const SIGUIENTE = '.qv-pager button[aria-label*="siguiente"]';
const ANTERIOR = '.qv-pager button[aria-label*="anterior"]';

describe('vista rápida: recorrer el padrón', () => {
    beforeEach(abrirPrimera);

    it('el contador separa la posición del total y empieza en la primera fila', () => {
        cy.get('.qv-pager__now').should('have.text', '1');
        cy.get('.qv-pager__total').invoke('text').then((total) => {
            expect(Number(total)).to.be.greaterThan(1);
        });
        // El nombre accesible se enuncia entero: «19 / 20» se lee fatal en voz alta.
        cy.get('.qv-pager__pos').should('have.attr', 'aria-label').and('match', /^Expediente 1 de \d+$/);
    });

    it('avanzar cambia de persona y adelanta el contador', () => {
        cy.get('.qv-identity__name').invoke('text').then((primero) => {
            cy.get(SIGUIENTE).click();
            cy.get('.qv-pager__now', { timeout: 20000 }).should('have.text', '2');
            cy.get('.qv-identity__name').should('not.have.text', primero);
        });
    });

    it('recorrer NO reconstruye el panel: el marco es el mismo nodo', () => {
        // El corazón del asunto. Se marca el nodo del panel y el del paginador:
        // si el recorrido los remontara, la marca desaparecería con ellos y la
        // animación de entrada volvería a correr en cada pulsación.
        cy.get('.qv-panel').then(($p) => { $p[0].dataset.testigo = 'mismo-panel'; });
        cy.get('.qv-pager').then(($b) => { $b[0].dataset.testigo = 'misma-barra'; });

        cy.get(SIGUIENTE).click();
        cy.get('.qv-pager__now', { timeout: 20000 }).should('have.text', '2');
        cy.get(SIGUIENTE).click();
        cy.get('.qv-pager__now', { timeout: 20000 }).should('have.text', '3');

        cy.get('.qv-panel').should('have.attr', 'data-testigo', 'mismo-panel');
        cy.get('.qv-pager').should('have.attr', 'data-testigo', 'misma-barra');
    });

    it('durante el relevo nunca aparece el esqueleto de la primera apertura', () => {
        // El esqueleto es correcto al abrir de cero y un error al hojear: ahí
        // ya hay un expediente en pantalla al que relevar.
        cy.get(SIGUIENTE).click();
        cy.get('[aria-label="Cargando expediente…"]').should('not.exist');
        cy.get('.qv-identity__name').should('be.visible');
        cy.get('.qv-pager__now', { timeout: 20000 }).should('have.text', '2');
        cy.get('[aria-label="Cargando expediente…"]').should('not.exist');
    });

    it('las flechas del teclado recorren igual que los controles', () => {
        cy.get('body').type('{downarrow}');
        cy.get('.qv-pager__now', { timeout: 20000 }).should('have.text', '2');
        cy.get('body').type('{uparrow}');
        cy.get('.qv-pager__now', { timeout: 20000 }).should('have.text', '1');
    });

    it('en el primer expediente, «anterior» está inerte y «siguiente» no', () => {
        cy.get(ANTERIOR).should('be.disabled');
        cy.get(SIGUIENTE).should('be.enabled');
    });

    it('el recorrido deja el contexto en la URL y un solo Atrás para salir', () => {
        cy.location('search').should('match', /preview=\d+/);
        cy.get(SIGUIENTE).click();
        cy.get('.qv-pager__now', { timeout: 20000 }).should('have.text', '2');
        // Recorrer usa `replace`: veinte expedientes revisados siguen siendo
        // un solo Atrás, que devuelve al padrón sin panel.
        cy.go('back');
        cy.get('.qv-panel').should('not.exist');
        cy.get('.sl-table__tr').should('have.length.greaterThan', 3);
    });

    it('Escape cierra el panel y deja el padrón intacto', () => {
        cy.get('body').type('{esc}');
        cy.get('.qv-panel').should('not.exist');
        cy.get('.sl-table__tr').should('have.length.greaterThan', 3);
        cy.location('search').should('not.match', /preview=/);
    });
});
