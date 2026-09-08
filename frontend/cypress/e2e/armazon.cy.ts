/**
 * armazon.cy.ts — El marco que sostiene a todas las pantallas.
 *
 * ── QUÉ PROTEGE ─────────────────────────────────────────────────────────
 *
 * Defectos del ARMAZÓN, no de un módulo: una cabecera que se pega solo
 * durante los primeros 764px, un listado que vuelve a descargar lo que la
 * aplicación ya tiene en memoria, y diez tabuladores repetidos antes de poder
 * empezar a trabajar. Se ven en todas las pantallas o en ninguna, y por eso no
 * los encuentra una prueba de módulo.
 */

describe('armazon', () => {
    /* Los specs de esta carpeta comparten ámbito de tipos: ayudantes DENTRO. */

    /** El scroller REAL: el `ion-content` de Ionic, dentro de su shadow root. */
    function scrollerDe(win: Window): HTMLElement {
        return win.document.querySelector('ion-content')!
            .shadowRoot!.querySelector('.inner-scroll') as HTMLElement;
    }

    type Espia = Window & { __api?: string[]; __of?: typeof fetch };

    /**
     * Anota las llamadas a /api/*.
     *
     * Va DESPUÉS de que arranque la aplicación, nunca antes: `demoApi`
     * reemplaza `window.fetch` al arrancar y responde a /api sin delegar, así
     * que un espía instalado antes queda DEBAJO del doble y no ve ni una sola
     * llamada. Comprobado: 0 en todo el recorrido.
     */
    function espiarApi(win: Espia): void {
        if (win.__of) return;
        win.__of = win.fetch;
        win.__api = [];
        win.fetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url ?? String(args[0]);
            if (/\/api\//.test(url)) win.__api!.push(url);
            return win.__of!.apply(this, args);
        } as typeof fetch;
    }

    describe('la cabecera se queda pegada TODO el recorrido', () => {
        /*
         * MEDIDO en el padrón —la pantalla más larga— la altura de la cabecera
         * respecto a la ventana al 0 %, 50 % y 100 % del desplazamiento:
         *
         *     antes    top = 0, -671, -2029      (desaparece)
         *     despues  top = 0,    0,     0      (se queda)
         *
         * La causa no estaba en la cabecera sino en su contenedor: el
         * `.inner-scroll` de Ionic es un flex de COLUMNA, y `.dash-layout` —su
         * ítem— se ENCOGÍA hasta caber en el scrollport (764px con 3516px de
         * contenido). Un elemento `sticky` solo puede pegarse dentro de la caja
         * de su contenedor, así que pasados esos 764px se iba con el scroll y
         * se perdían el buscador global, el tema, el perfil y el contexto de la
         * página durante todo el resto de la pantalla.
         *
         * Se comprueba el RESULTADO —que siga arriba— y no la técnica.
         */
        function laCabeceraAguanta(ancho: number, alto: number) {
            cy.viewport(ancho, alto);
            cy.entrar();
            cy.visitaDemo('/students');
            cy.get('.sl-table__tr', { timeout: 20000 }).should('exist');
            cy.wait(700);

            cy.window().then((win) => {
                const s = scrollerDe(win);
                const cabecera = win.document.querySelector('.dash-header') as HTMLElement;
                const recorrido = s.scrollHeight - s.clientHeight;

                expect(recorrido, 'la pagina de prueba tiene que desplazarse de verdad')
                    .to.be.greaterThan(600);
                expect(win.getComputedStyle(cabecera).position, 'la cabecera es pegajosa')
                    .to.eq('sticky');

                [0, 0.5, 1].forEach((fraccion) => {
                    s.scrollTop = recorrido * fraccion;
                    const top = cabecera.getBoundingClientRect().top;
                    expect(Math.abs(top), `al ${Math.round(fraccion * 100)}% del recorrido sigue arriba`)
                        .to.be.at.most(1);
                });
                s.scrollTop = 0;
            });
        }

        it('en escritorio', () => laCabeceraAguanta(1280, 800));
        it('en movil', () => laCabeceraAguanta(390, 844));

        it('el armazon contiene su propio contenido', () => {
            /*
             * La causa, medida directamente. Sin esto, la prueba de arriba
             * seguiría pasando si alguien «arreglara» la cabecera sacándola del
             * contenedor, que es el arreglo equivocado.
             */
            cy.viewport(1280, 800);
            cy.entrar();
            cy.visitaDemo('/students');
            cy.get('.sl-table__tr', { timeout: 20000 }).should('exist');
            cy.wait(700);
            cy.window().then((win) => {
                const s = scrollerDe(win);
                const main = win.document.querySelector('.dash-main') as HTMLElement;
                const alto = main.getBoundingClientRect().height;
                // Holgura por el hueco inferior que reserva el propio scroller.
                expect(alto, 'la caja del armazon llega hasta donde llega su contenido')
                    .to.be.at.least(s.scrollHeight - 120);
            });
        });
    });

    describe('no se descarga lo que la aplicacion ya tiene', () => {
        it('Ternas reutiliza el listado que el panel ya trajo', () => {
            /*
             * MEDIDO trazando cada llamada desde el login: al entrar, el panel
             * ya pide `/api/ternas` entre sus siete peticiones. Aun así, abrir
             * Ternas volvía a pedirlo —y otra vez al regresar—:
             *
             *     antes    primera visita 2 llamadas · volver 2 mas
             *     despues  primera visita 0          · volver 0
             *
             * No es simetría con los otros módulos: la caché `ternas:list` ya
             * existía, ya se invalidaba con cada escritura de terna, y guardaba
             * exactamente el listado SIN filtrar, que es con el que se entra a
             * la pantalla. Solo faltaba leerla.
             */
            cy.viewport(1280, 800);
            cy.entrar();
            cy.get('.dash-header', { timeout: 20000 }).should('exist');
            cy.wait(900);
            cy.window().then((win: Espia) => espiarApi(win));

            cy.contains('.dash-sidebar__nav-item', 'Ternas').click({ scrollBehavior: 'center' });
            cy.get('.terna-card', { timeout: 20000 }).should('exist');
            cy.wait(900);
            cy.window().then((win: Espia) => {
                const pedidas = (win.__api ?? []).filter((u) => /\/api\/ternas(\?|$)/.test(u));
                expect(pedidas, `no se vuelve a pedir: ${JSON.stringify(pedidas)}`).to.have.length(0);
            });
        });

        it('pero filtrar por estado SI va al servidor', () => {
            /*
             * El reverso. El filtro de ternas se resuelve en el servidor y no
             * se cachea: son cinco combinaciones que envejecen de forma
             * distinta. Si un día se cachearan, esta prueba avisa de que el
             * chip ha dejado de traer datos frescos.
             */
            cy.viewport(1280, 800);
            cy.entrar();
            cy.visitaDemo('/ternas');
            cy.get('.terna-card', { timeout: 20000 }).should('exist');
            cy.wait(600);
            cy.window().then((win: Espia) => espiarApi(win));

            cy.contains('.ui-chip', 'Completadas').click({ scrollBehavior: 'center' });
            cy.wait(900);
            cy.window().then((win: Espia) => {
                const pedidas = (win.__api ?? []).filter((u) => /\/api\/ternas\?/.test(u));
                expect(pedidas.join(','), 'el chip pide el estado al servidor').to.contain('estado=');
            });
        });
    });

    describe('se puede saltar la barra lateral', () => {
        it('el primer tabulador lleva al contenido', () => {
            /*
             * WCAG 2.4.1 «Evitar bloques», nivel A. MEDIDO: desde el principio
             * del documento había OCHO destinos de la barra lateral más el
             * buscador global y el conmutador de tema antes de la primera
             * parada de la página.
             */
            cy.viewport(1280, 800);
            cy.entrar();
            cy.visitaDemo('/proyectos');
            cy.get('.proy-card', { timeout: 20000 }).should('exist');
            cy.wait(500);

            cy.get('.ui-skip-link').should('exist').focus();
            cy.focused().should('have.class', 'ui-skip-link');

            // Visible al enfocarse: si no, no sirve para quien mira la pantalla.
            // La espera es por la transicion de `top`: sin ella se mide el
            // fotograma de salida y el enlace todavia esta fuera.
            cy.wait(400);
            cy.window().then((win) => {
                const enlace = win.document.querySelector('.ui-skip-link') as HTMLElement;
                expect(enlace.getBoundingClientRect().top, 'al enfocarse entra en pantalla')
                    .to.be.greaterThan(-1);
            });

            cy.get('.ui-skip-link').click();
            cy.window().then((win) => {
                const activo = win.document.activeElement as HTMLElement;
                expect(activo.id, 'el foco aterriza en el contenido').to.eq('contenido-principal');
                expect(activo.contains(win.document.querySelector('.proy-page')),
                    'y eso es de verdad la pagina').to.eq(true);
            });
        });

        it('esta escondido mientras nadie lo enfoca', () => {
            cy.viewport(1280, 800);
            cy.entrar();
            cy.visitaDemo('/proyectos');
            cy.get('.proy-card', { timeout: 20000 }).should('exist');
            cy.window().then((win) => {
                const enlace = win.document.querySelector('.ui-skip-link') as HTMLElement;
                expect(enlace.getBoundingClientRect().bottom, 'fuera de la pantalla en reposo')
                    .to.be.lessThan(1);
            });
        });
    });
});
