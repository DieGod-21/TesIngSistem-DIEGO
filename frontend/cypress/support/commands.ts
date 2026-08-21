/// <reference types="cypress" />

/**
 * commands.ts — Comandos compartidos por los specs de navegador.
 *
 * Los tres specs de esta carpeta protegen defectos de INTERACCIÓN: cosas que
 * compilan, pasan las pruebas unitarias y aun así están rotas en pantalla.
 * Todo lo que aquí se resuelve una vez es un detalle que, repetido en cada
 * spec, los volvería frágiles.
 */

/**
 * Visita una ruta CON el conjunto de demostración activado.
 *
 * `?demo=1` se recuerda en `sessionStorage` durante la pestaña, y Cypress
 * limpia ese almacenamiento entre pruebas: sin volver a pedirlo en cada visita,
 * la segunda prueba de un fichero hablaría con el servidor real y fallaría por
 * falta de credenciales, no por el producto.
 */
Cypress.Commands.add('visitaDemo', (ruta: string) => {
    const sep = ruta.includes('?') ? '&' : '?';
    cy.visit(`${ruta}${sep}demo=1`);
});

/**
 * Entra al sistema con una cuenta del conjunto de demostración.
 *
 * Dos detalles que no son opcionales:
 *
 *   · `#email` es un `<ion-input>`, no un `<input>`. El campo real vive dentro,
 *     en el DOM claro: escribir sobre el envoltorio no escribe nada.
 *   · El botón que se ve es un `<ion-button>`, no un `<button>`. El único
 *     `<button>` del formulario es el nativo oculto que Ionic añade para que
 *     Intro envíe: `button[type="submit"]` seleccionaba ESE, que mide 0×0.
 */
Cypress.Commands.add('entrar', (email = 'coordinacion@miumg.edu.gt') => {
    cy.visitaDemo('/login');
    cy.get('#email input').should('be.visible').type(email);
    cy.get('#password input').type('demo');
    cy.get('[data-testid="login-form"] ion-button[type="submit"]').should('be.visible').click();
    cy.location('pathname', { timeout: 20000 }).should('eq', '/dashboard');
});

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            visitaDemo(ruta: string): Chainable<void>;
            entrar(email?: string): Chainable<void>;
        }
    }
}

export {};
