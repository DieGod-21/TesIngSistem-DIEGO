/**
 * contrato.cy.ts — Las escrituras llegan al servidor con la forma del contrato.
 *
 * ── QUÉ PROTEGE ─────────────────────────────────────────────────────────
 *
 * La demo valida ahora los cuerpos como el servidor real (400/422 si no son
 * los de /api-docs.json). Estas pruebas recorren en la interfaz las escrituras
 * que antes enviaban otra cosa: si una vuelve a desviarse, la demo la rechaza
 * y la prueba lo ve como un fallo del producto, no como un detalle del doble.
 */

describe('contrato de escritura en la interfaz', () => {
    beforeEach(() => {
        cy.viewport(1280, 800);
        cy.entrar();
    });

    it('alta individual: la fila registrada enseña nombre y carné y abre su expediente', () => {
        cy.visitaDemo('/students/new');
        cy.get('#sn-nombre', { timeout: 20000 }).type('ESTUDIANTE DE CONTRATO');
        cy.get('#sn-carnet').type('1890-26-00001');
        cy.get('#sn-correo').type('econtrato@miumg.edu.gt');
        cy.contains('button', 'Registrar estudiante').click({ scrollBehavior: 'center' });

        cy.get('.sn-log__name', { timeout: 10000 }).should('have.text', 'ESTUDIANTE DE CONTRATO');
        cy.get('.sn-log__carnet').should('have.text', '1890-26-00001');
        cy.get('.sn-log__item').click({ scrollBehavior: 'center' });
        cy.location('pathname').should('match', /^\/students\/\d+$/);
    });

    it('registrar una nota se acepta y cierra el diálogo', () => {
        cy.visitaDemo('/students/1');
        cy.get('[aria-label="Editar nota de Proyecto de Graduación I"]', { timeout: 20000 })
            .first()
            .click({ scrollBehavior: 'center' });
        cy.get('#en-nota').clear().type('85');
        cy.contains('.ui-modal button', 'Guardar').click();

        cy.contains('Nota guardada correctamente.', { timeout: 10000 }).should('exist');
        cy.get('#en-title').should('not.exist');
    });

    it('alta de terna: tres cargos distintos antes de poder crear', () => {
        cy.visitaDemo('/ternas');
        cy.contains('button', 'Nueva terna', { timeout: 20000 }).click({ scrollBehavior: 'center' });
        cy.get('#nt-title').should('be.visible');

        cy.get('#nt-proyecto').click();
        cy.get('[role="option"]', { timeout: 10000 }).first().click();

        const crear = () => cy.contains('.ui-modal button', 'Crear terna');
        crear().should('be.disabled');

        cy.get('#nt-rol-presidente').select('Ing. Roberto Méndez Salguero');
        // Quien ya preside no puede ocupar otro cargo.
        cy.get('#nt-rol-secretario option').contains('Ing. Roberto Méndez Salguero').should('be.disabled');
        cy.get('#nt-rol-vocal option').contains('Ing. Roberto Méndez Salguero').should('be.disabled');
        crear().should('be.disabled');

        cy.get('#nt-rol-secretario').select('Inga. Patricia Alvarado Ruiz');
        crear().should('be.disabled');
        cy.get('#nt-rol-vocal').select('Ing. Marco Tulio Guzmán');
        crear().should('not.be.disabled').click();

        cy.contains(/Terna #\d+ creada\./, { timeout: 10000 }).should('exist');
        cy.get('#nt-title').should('not.exist');
    });

    it('el acta de la terna se descarga como PDF', () => {
        cy.visitaDemo('/ternas/1');
        cy.window().then((win) => {
            cy.stub(win.URL, 'createObjectURL').as('objeto').returns('blob:acta');
            cy.stub(win.URL, 'revokeObjectURL');
            // Sin descarga real: solo interesa qué se entregó para descargar.
            cy.stub(win.HTMLAnchorElement.prototype, 'click').as('descarga');
        });

        cy.contains('button', 'Descargar acta (PDF)', { timeout: 20000 }).click({ scrollBehavior: 'center' });

        cy.get('@descarga').should('have.been.calledOnce');
        cy.get('@objeto').should('have.been.calledOnce').then((stub) => {
            const blob = (stub as unknown as sinon.SinonStub).firstCall.args[0] as Blob;
            expect(blob.type).to.eq('application/pdf');
        });
    });
});
