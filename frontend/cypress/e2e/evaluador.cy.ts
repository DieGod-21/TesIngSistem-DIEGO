/**
 * evaluador.cy.ts — Lo que una recarga no puede tirar.
 *
 * ── QUÉ PROTEGE ─────────────────────────────────────────────────────────
 *
 * `onChanged()` recarga el detalle tras guardar, y las pantallas de detalle
 * enseñaban el esqueleto ante CUALQUIER `loading`: la recarga desmontaba la
 * página entera —formulario incluido— para volver a montarla. MEDIDO
 * fotograma a fotograma antes del arreglo, tras pulsar «Guardar borrador»:
 *
 *     @4f   foco en BODY (deshabilitar el botón lo tira al documento)
 *     @19f  el botón YA NO EXISTE — la página se desmontó
 *     @49f  vuelve, pero es otro elemento
 *
 * Con la página desmontándose no hay forma de devolver el foco: la referencia
 * apunta a un nodo desechado. Por eso cada prueba comprueba las DOS mitades
 * —que el nodo sobreviva y que el foco vuelva—: arreglar solo una deja el
 * defecto en pie.
 *
 * ── SINCRONIZACIÓN: SIN ESPERAS FIJAS ───────────────────────────────────
 *
 * Ninguna prueba duerme. Se sincroniza contra señales que el producto ya
 * expone:
 *
 *   · el botón vuelve a estar habilitado  → `busy` se limpia en el `finally`,
 *     que corre DESPUÉS de `await onChanged()`: prueba que la recarga terminó;
 *   · `.eval-locked` existe               → llegaron los datos nuevos;
 *   · `aria-busy` pasa a true y desaparece → un ciclo de refresco completo.
 *
 * ── UNA TRAMPA DEL CONJUNTO DE DEMOSTRACIÓN ─────────────────────────────
 *
 * `rmendez@miumg.edu.gt` es el evaluador documentado en el README y en
 * `cy.entrar()`, y es el ÚNICO cuyas tres ternas están ya enviadas: con esa
 * cuenta el formulario es inalcanzable y solo se ve la rama «ya lo hiciste».
 * Estas pruebas usan `jbatres@miumg.edu.gt`, que sí tiene trabajo pendiente.
 */

/** Marcas que las sondas dejan en la ventana de la aplicación. */
type VentanaSonda = Window & {
    __btn0?: Element | null;
    __esqueleto?: boolean;
    __cicloRefresco?: boolean;
    __obs?: MutationObserver;
};

describe('evaluador', () => {
    /* Los specs de esta carpeta comparten ámbito de tipos: ayudantes DENTRO. */

    const CON_PENDIENTES = 'jbatres@miumg.edu.gt';

    /** Abre la primera terna que este evaluador todavía tiene que calificar. */
    function abrirPendiente() {
        cy.entrar(CON_PENDIENTES);
        cy.contains('.dash-sidebar__nav-item', 'Mis ternas').click({ scrollBehavior: 'center' });

        // La cola dejó de ser esqueleto: hay tarjetas reales y filtros pintados.
        cy.get('.asig:not(.asig--esqueleto)', { timeout: 20000 }).should('exist');

        /*
         * El filtro NO es opcional: de las tres asignaciones de esta cuenta,
         * dos están sin enviar y una no. Sin filtrar, la primera tarjeta
         * podría ser la ya enviada y el formulario no existiría.
         *
         * El chip se llama «Te tocan», no «Pendientes» —buscarlo por el nombre
         * que uno supone hace que el clic no ocurra y la lista parezca rota—.
         * Se exige que exista: si cambia de nombre, esta prueba debe fallar a
         * gritos, no filtrar en silencio.
         */
        cy.contains('.ev-filtros .ui-chip', /te tocan/i)
            .click({ scrollBehavior: 'center' })
            .should('have.attr', 'aria-pressed', 'true');

        cy.get('.asig:not(.asig--esqueleto)').first().find('a[href]').first()
            .click({ scrollBehavior: 'center', force: true });

        // El detalle terminó su carga inicial: hay formulario y no está ocupado.
        cy.get('#ev-score', { timeout: 20000 }).should('be.enabled');
        cy.get('.terna-detail-body').should('not.have.attr', 'aria-busy');
    }

    /**
     * Espera a que `selector` complete un ciclo de refresco: `aria-busy` se
     * pone y se quita. Es la señal que el propio producto expone para decir
     * «me estoy actualizando sin borrar lo que hay».
     *
     * Se arma ANTES de la acción porque el ciclo puede ser muy corto; mirar
     * después solo vería el estado final y no distinguiría «ya terminó» de
     * «todavía no ha empezado».
     */
    function armarObservadorDeRefresco(selector: string) {
        cy.window().then((win) => {
            const w = win as VentanaSonda;
            w.__cicloRefresco = false;
            let ocupadoVisto = false;
            const obs = new win.MutationObserver(() => {
                const el = win.document.querySelector(selector);
                if (el?.getAttribute('aria-busy') === 'true') ocupadoVisto = true;
                else if (ocupadoVisto) w.__cicloRefresco = true;
            });
            obs.observe(win.document.body, {
                attributes: true, subtree: true, attributeFilter: ['aria-busy'],
            });
            w.__obs = obs;
        });
    }

    describe('una recarga no puede tirar lo que se está usando', () => {
        it('guardar borrador conserva la página y devuelve el foco', () => {
            cy.viewport(1280, 800);
            abrirPendiente();
            cy.get('#ev-score').clear().type('77');

            cy.window().then((win) => {
                (win as VentanaSonda).__btn0 = Array.from(win.document.querySelectorAll('button'))
                    .find((b) => /Guardar borrador/i.test(b.textContent ?? '')) ?? null;
            });

            cy.contains('button', /Guardar borrador/i).click({ scrollBehavior: 'center' });
            cy.contains(/Borrador guardado/i, { timeout: 15000 }).should('exist');

            /*
             * SEÑAL DE FIN: el botón vuelve a estar habilitado. `busy` se
             * limpia en el `finally`, que corre después de `await onChanged()`,
             * así que esto prueba que la recarga terminó. Antes había aquí un
             * `cy.wait(1200)` que solo lo suponía.
             */
            cy.contains('button', /Guardar borrador/i).should('be.enabled');

            cy.window().then((win) => {
                const w = win as VentanaSonda;
                const d = win.document;
                const btn = Array.from(d.querySelectorAll('button'))
                    .find((b) => /Guardar borrador/i.test(b.textContent ?? ''));

                expect(btn, 'el botón sigue existiendo').to.not.equal(undefined);
                expect(btn === w.__btn0, 'y es EL MISMO nodo: la página no se remontó').to.eq(true);
            });

            cy.focused().parents('.eval-form').should('exist');
        });

        it('refrescar tras guardar no repone el esqueleto sobre el contenido', () => {
            /*
             * La otra mitad del mismo defecto. Que el nodo del botón sobreviva
             * ya prueba que la página no se remontó, pero no dice nada de lo
             * que VE quien mira: si el esqueleto vuelve aunque sea un
             * fotograma, la acción se lee como una recarga completa.
             *
             * Un `should('not.exist')` posterior no lo vería —para entonces ya
             * se fue—, así que se instala un MutationObserver ANTES de guardar.
             * El esqueleto se reconoce por su `aria-label`, que es lo único que
             * lo distingue del contenido real (comparten clases a propósito,
             * para que ocupen lo mismo).
             */
            cy.viewport(1280, 800);
            abrirPendiente();
            cy.get('#ev-score').clear().type('64');

            cy.window().then((win) => {
                const w = win as VentanaSonda;
                w.__esqueleto = false;
                const obs = new win.MutationObserver((muts) => {
                    muts.forEach((m) => {
                        m.addedNodes.forEach((n) => {
                            const el = n as HTMLElement;
                            if (el.nodeType !== 1 || typeof el.matches !== 'function') return;
                            if (el.matches('[aria-label^="Cargando terna"]')
                                || el.querySelector('[aria-label^="Cargando terna"]')) {
                                w.__esqueleto = true;
                            }
                        });
                    });
                });
                obs.observe(win.document.body, { childList: true, subtree: true });
                w.__obs = obs;
            });

            cy.contains('button', /Guardar borrador/i).click({ scrollBehavior: 'center' });
            cy.contains(/Borrador guardado/i, { timeout: 15000 }).should('exist');
            cy.contains('button', /Guardar borrador/i).should('be.enabled');

            cy.window().then((win) => {
                const w = win as VentanaSonda;
                w.__obs?.disconnect();
                expect(w.__esqueleto, 'el esqueleto NO reaparece: el contenido nunca se sustituye')
                    .to.eq(false);
            });
        });

        it('enviar deja el foco en el aviso que explica el nuevo estado', () => {
            /*
             * Al enviar, el formulario desaparece y lo sustituye el aviso de
             * «ya enviada», que es lo que ahora explica el estado. El foco
             * aterriza ahí; si no, quien navega con teclado se queda en BODY y
             * tiene que recorrer otra vez la barra lateral entera.
             */
            cy.viewport(1280, 800);
            abrirPendiente();
            cy.get('#ev-score').clear().type('81');
            cy.contains('button', /Enviar evaluación/i).click({ scrollBehavior: 'center' });
            cy.get('.ui-modal-overlay', { timeout: 10000 }).should('be.visible');
            cy.get('.ui-modal').contains('button', /Enviar|Confirmar/i).click({ scrollBehavior: 'center' });

            // SEÑAL DE FIN: el aviso solo existe cuando llegaron los datos nuevos.
            cy.get('.eval-locked', { timeout: 15000 }).should('exist');

            cy.focused().should('have.class', 'eval-locked');
        });

        it('el expediente conserva el foco al guardar una nota', () => {
            /*
             * El mismo defecto, en la pantalla más usada de coordinación. Aquí
             * era más caro porque el diálogo YA devolvía el foco al botón que
             * lo abrió —trabajo deliberado del producto— y el remonte lo
             * deshacía un fotograma después:
             *
             *     @103f foco en `nota-edit-btn`  (el diálogo lo devolvió bien)
             *     @104f el nodo ya no existe, foco en BODY
             *
             * Por eso NO basta con mirar el foco en cuanto se cierra el
             * diálogo: en ese instante el foco es correcto INCLUSO con el
             * defecto puesto. Hay que esperar a que la recarga termine, y la
             * señal de que terminó es el ciclo de `aria-busy`.
             */
            cy.viewport(1280, 800);
            cy.entrar();
            cy.visitaDemo('/students/1');
            cy.get('.nota-add-btn, .nota-edit-btn', { timeout: 20000 }).should('exist');
            cy.get('.sd-record').should('not.have.attr', 'aria-busy');

            armarObservadorDeRefresco('.sd-record');

            cy.get('.nota-add-btn, .nota-edit-btn').first().click({ scrollBehavior: 'center' });
            cy.get('.ui-modal-overlay').should('be.visible');
            cy.get('.ui-modal input').first().clear().type('88');
            cy.get('.ui-modal').contains('button', /Guardar|Registrar/i).click({ scrollBehavior: 'center' });
            cy.get('.ui-modal-overlay', { timeout: 15000 }).should('not.exist');

            // SEÑAL DE FIN: el expediente completó un ciclo de refresco entero.
            cy.window({ timeout: 15000 }).should((win) => {
                expect(
                    (win as VentanaSonda).__cicloRefresco,
                    'el expediente completó un ciclo de refresco (aria-busy puesto y quitado)',
                ).to.eq(true);
            });

            cy.window().then((win) => { (win as VentanaSonda).__obs?.disconnect(); });

            cy.focused().should('match', '.nota-add-btn, .nota-edit-btn');
        });
    });
});
