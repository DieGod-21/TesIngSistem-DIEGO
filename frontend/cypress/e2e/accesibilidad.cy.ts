/**
 * accesibilidad.cy.ts — Lo que el producto promete a quien no usa un ratón.
 *
 * ── QUÉ PROTEGE ─────────────────────────────────────────────────────────
 *
 * Dos promesas que el producto ya hacía a medias y que ninguna prueba vigilaba,
 * porque durante varios ciclos se dio por imposible medirlas: respetar la
 * preferencia de movimiento reducido en el movimiento MÁS grande de la interfaz,
 * y dar a los controles de la cabecera el mismo objetivo táctil que el resto.
 *
 * ── POR QUÉ AHORA SÍ SE PUEDE MEDIR ─────────────────────────────────────
 *
 * `Emulation.setEmulatedMedia` se había dado por inservible aquí. Funciona: lo
 * que no funciona es aplicarlo a una página YA cargada. Emulando ANTES de
 * navegar, la preferencia llega de verdad —`matchMedia` lo confirma en la
 * primera aserción de cada prueba, para que ninguna pueda pasar en vacío—.
 */

describe('accesibilidad', () => {
    /* Los specs de esta carpeta comparten ámbito de tipos: ayudantes DENTRO. */

    function emularMedios(features: { name: string; value: string }[]) {
        cy.wrap(
            Cypress.automation('remote:debugger:protocol', {
                command: 'Emulation.setEmulatedMedia',
                params: { features },
            }),
            { log: false },
        );
    }

    function emularTacto() {
        cy.wrap(
            Cypress.automation('remote:debugger:protocol', {
                command: 'Emulation.setTouchEmulationEnabled',
                params: { enabled: true, maxTouchPoints: 5 },
            }),
            { log: false },
        );
        emularMedios([
            { name: 'pointer', value: 'coarse' },
            { name: 'any-pointer', value: 'coarse' },
        ]);
    }

    describe('movimiento reducido', () => {
        it('el cajon lateral no se desliza con la preferencia activa', () => {
            /*
             * MEDIDO a 390x844: el panel recorre 256px sobre una ventana de 390
             * —dos tercios de la pantalla— en 280ms. Es el movimiento más
             * grande del producto y era el único que la preferencia no
             * apagaba: se apagaba la cascada decorativa de los enlaces de
             * DENTRO y se dejaba encendido el barrido del panel que los lleva.
             *
             *     antes    transition-duration = 0.28s  (sin cambio)
             *     despues  transition-duration = 0s
             *
             * El cajón sigue abriéndose y cerrándose; lo que desaparece es el
             * trayecto.
             */
            cy.viewport(390, 844);
            emularMedios([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
            cy.entrar();
            cy.visitaDemo('/proyectos');
            cy.get('.proy-card', { timeout: 20000 }).should('exist');

            cy.window().then((win) => {
                // Si la emulación no hubiera llegado, la prueba pasaría en vacío.
                expect(
                    win.matchMedia('(prefers-reduced-motion: reduce)').matches,
                    'la preferencia llega de verdad al navegador',
                ).to.eq(true);

                const lateral = win.document.querySelector('.dash-sidebar') as HTMLElement;
                const dur = win.getComputedStyle(lateral).transitionDuration;
                expect(parseFloat(dur), `el cajon no viaja (duracion=${dur})`).to.eq(0);
            });
        });

        it('sin la preferencia, el cajon si se desliza', () => {
            // El reverso: sin esto, borrar la transición del todo también
            // pasaría la prueba de arriba.
            cy.viewport(390, 844);
            emularMedios([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
            cy.entrar();
            cy.visitaDemo('/proyectos');
            cy.get('.proy-card', { timeout: 20000 }).should('exist');

            cy.window().then((win) => {
                const lateral = win.document.querySelector('.dash-sidebar') as HTMLElement;
                expect(
                    parseFloat(win.getComputedStyle(lateral).transitionDuration),
                    'con movimiento normal el cajon si se desliza',
                ).to.be.greaterThan(0);
            });
        });

        it('nada se mueve para siempre', () => {
            /*
             * Ninguna animación perpetua en ninguna pantalla. MEDIDO en las
             * seis: cero. Es una restricción del producto y conviene que se
             * note si alguna vez deja de cumplirse.
             */
            cy.viewport(1280, 800);
            cy.entrar();
            ['/dashboard', '/proyectos', '/ternas', '/reports', '/usuarios'].forEach((ruta) => {
                cy.visitaDemo(ruta);
                cy.get('.dash-header', { timeout: 20000 }).should('exist');
                cy.wait(1200);
                cy.window().then((win) => {
                    const perpetuas: string[] = [];
                    win.document.querySelectorAll<HTMLElement>('*').forEach((el) => {
                        const r = el.getBoundingClientRect();
                        if (r.width === 0 || r.height === 0) return;
                        const cs = win.getComputedStyle(el);
                        if (cs.animationName !== 'none' && cs.animationIterationCount.includes('infinite')) {
                            perpetuas.push(`${(el.className || '').toString().split(' ')[0]}:${cs.animationName}`);
                        }
                    });
                    expect(perpetuas, `${ruta}: ${JSON.stringify(perpetuas)}`).to.have.length(0);
                });
            });
        });
    });

    describe('semantica', () => {
        const RUTAS = ['/dashboard', '/students', '/proyectos', '/ternas', '/reports', '/usuarios'];

        it('un solo landmark principal tambien en el login', () => {
            /*
             * La pantalla de entrada tenia el mismo defecto y se descubrio
             * tarde, comprobando el arranque del build de produccion: las
             * rutas autenticadas ya estaban cubiertas y esta no.
             * `AuthLayout` + `LoginPage` sumaban dos «main».
             */
            cy.viewport(1280, 800);
            cy.visitaDemo('/login');
            cy.get('#email input', { timeout: 20000 }).should('be.visible');
            cy.window().then((win) => {
                const principales = win.document.querySelectorAll('main, [role=main]');
                const cuales = Array.from(principales)
                    .map((e) => e.tagName.toLowerCase() + '.' + (e.className || '').toString().split(' ')[0]);
                expect(principales.length, `/login: ${JSON.stringify(cuales)}`).to.eq(1);
            });
        });

        it('un solo landmark principal por pantalla', () => {
            /*
             * MEDIDO en las seis rutas: DOS. Ionic le pone `role="main"` a su
             * `ion-content` por su cuenta, y el armazón ya tiene su propio
             * `<main class="dash-main">`. Peor aún, el de Ionic envuelve
             * TAMBIÉN la barra lateral: quien navegaba por landmarks elegía
             * entre dos «principales» y el primero se lo llevaba todo,
             * navegación incluida.
             */
            cy.viewport(1280, 800);
            cy.entrar();
            RUTAS.forEach((ruta) => {
                cy.visitaDemo(ruta);
                cy.get('.dash-header', { timeout: 20000 }).should('exist');
                cy.wait(600);
                cy.window().then((win) => {
                    const principales = win.document.querySelectorAll('main, [role=main]');
                    const cuales = Array.from(principales)
                        .map((e) => e.tagName.toLowerCase() + '.' + (e.className || '').toString().split(' ')[0]);
                    expect(principales.length, `${ruta}: ${JSON.stringify(cuales)}`).to.eq(1);
                });
            });
        });

        it('los encabezados no se saltan niveles', () => {
            /*
             * MEDIDO: `/proyectos` y `/ternas` iban de h1 a h3 —los títulos de
             * tarjeta— sin h2 por medio. Quien navega por encabezados lee eso
             * como un nivel que falta. El tamaño lo manda la clase, así que
             * corregir la etiqueta no mueve un píxel.
             */
            cy.viewport(1280, 800);
            cy.entrar();
            RUTAS.forEach((ruta) => {
                cy.visitaDemo(ruta);
                cy.get('.dash-header', { timeout: 20000 }).should('exist');
                cy.wait(600);
                cy.window().then((win) => {
                    const niveles = Array.from(win.document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
                        .filter((h) => (h as HTMLElement).getBoundingClientRect().height > 0)
                        .map((h) => Number(h.tagName[1]));
                    expect(niveles.filter((n) => n === 1).length, `${ruta}: un unico h1`).to.eq(1);
                    for (let i = 1; i < niveles.length; i++) {
                        expect(niveles[i] - niveles[i - 1],
                            `${ruta}: salto de h${niveles[i - 1]} a h${niveles[i]}`).to.be.at.most(1);
                    }
                });
            });
        });

        it('ninguna referencia ARIA apunta al vacio', () => {
            /*
             * MEDIDO en las seis rutas: el buscador global declaraba
             * `aria-controls="th-search-listbox"` siempre, y ese listbox solo
             * existe cuando hay sugerencias que enseñar. Un IDREF colgado hace
             * que el lector de pantalla anuncie un control inalcanzable.
             */
            cy.viewport(1280, 800);
            cy.entrar();
            RUTAS.forEach((ruta) => {
                cy.visitaDemo(ruta);
                cy.get('.dash-header', { timeout: 20000 }).should('exist');
                cy.wait(600);
                cy.window().then((win) => {
                    const d = win.document;
                    const rotas: string[] = [];
                    d.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls]').forEach((el) => {
                        ['aria-labelledby', 'aria-describedby', 'aria-controls'].forEach((a) => {
                            const v = el.getAttribute(a);
                            if (v && !v.split(/\s+/).every((id) => d.getElementById(id))) {
                                rotas.push(`${a}="${v}"`);
                            }
                        });
                    });
                    expect(rotas, `${ruta}: ${JSON.stringify(rotas)}`).to.have.length(0);
                });
            });
        });

        it('y el buscador SI lo declara cuando la lista existe', () => {
            // El reverso: quitar `aria-controls` del todo tambien pasaria la
            // prueba de arriba, y dejaria el combobox sin decir que controla.
            cy.viewport(1280, 800);
            cy.entrar();
            cy.visitaDemo('/proyectos');
            cy.get('.proy-card', { timeout: 20000 }).should('exist');
            // Hacen falta al menos dos caracteres (MIN_CHARS) para que el panel abra.
            cy.get('.dash-header__search').type('mar');
            cy.get('#th-search-listbox', { timeout: 10000 }).should('exist');
            cy.window().then((win) => {
                const input = win.document.querySelector('.dash-header__search') as HTMLElement;
                expect(input.getAttribute('aria-controls'), 'apunta al listbox real')
                    .to.eq('th-search-listbox');
                expect(win.document.getElementById('th-search-listbox'), 'que existe')
                    .to.not.equal(null);
            });
        });
    });

    describe('objetivos tactiles', () => {
        it('los controles de la cabecera se pueden pulsar con el dedo', () => {
            /*
             * MEDIDO a 390x844 con puntero grueso emulado —no inferido de la
             * hoja de estilos, que es todo lo que se pudo comprobar durante
             * varios ciclos—:
             *
             *     .dash-header__menu-btn      32x32  ->  44x44
             *     .dash-header__theme-toggle  38x34  ->  44x44
             *
             * El botón de menú importa más que su tamaño: en móvil la barra
             * lateral está fuera de pantalla y ese botón es el ÚNICO camino a
             * la navegación, en todas las pantallas.
             */
            cy.viewport(390, 844);
            emularTacto();
            cy.entrar();
            cy.visitaDemo('/proyectos');
            cy.get('.proy-card', { timeout: 20000 }).should('exist');

            cy.window().then((win) => {
                expect(
                    win.matchMedia('(pointer: coarse)').matches,
                    'el puntero grueso llega de verdad al navegador',
                ).to.eq(true);

                [
                    ['.dash-header__menu-btn', 'el boton de menu'],
                    ['.dash-header__theme-toggle', 'el conmutador de tema'],
                ].forEach(([sel, nombre]) => {
                    const el = win.document.querySelector(sel) as HTMLElement;
                    const r = el.getBoundingClientRect();
                    expect(Math.round(r.height), `${nombre}: alto`).to.be.at.least(44);
                    expect(Math.round(r.width), `${nombre}: ancho`).to.be.at.least(44);
                });
            });
        });

        it('la paginacion del padron tambien', () => {
            /*
             * Cuatro botones contiguos —primera, anterior, siguiente, última—
             * a 32x32. El peor caso para un dedo: fallar no significa que no
             * pase nada, significa saltar al final del padrón.
             *
             * La intención de agrandarlos ya estaba escrita en el archivo, en
             * una consulta de 640px, y NO SE CUMPLÍA: la regla base se declara
             * después con la misma especificidad y ganaba por orden.
             */
            cy.viewport(390, 844);
            emularTacto();
            cy.entrar();
            cy.visitaDemo('/students');
            cy.get('.sl-pager__btn', { timeout: 20000 }).should('exist');

            cy.window().then((win) => {
                expect(win.matchMedia('(pointer: coarse)').matches, 'puntero grueso activo').to.eq(true);
                const botones = win.document.querySelectorAll<HTMLElement>('.sl-pager__btn');
                expect(botones.length, 'hay paginacion que comprobar').to.be.greaterThan(0);
                botones.forEach((b) => {
                    const r = b.getBoundingClientRect();
                    if (r.width === 0) return;
                    expect(Math.round(r.height), 'alto del boton de pagina').to.be.at.least(44);
                    expect(Math.round(r.width), 'ancho del boton de pagina').to.be.at.least(44);
                });
            });
        });

        it('con raton la cabecera NO crece', () => {
            // El objetivo grande es para el dedo. Si creciera siempre, las
            // barras densas se inflarían sin que nadie lo hubiera pedido.
            cy.viewport(390, 844);
            // La emulacion de tacto vive en la SESION del navegador, no en la
            // prueba: sin apagarla, la de aqui arriba se cuela en esta y el
            // puntero seguiria siendo grueso.
            cy.wrap(
                Cypress.automation('remote:debugger:protocol', {
                    command: 'Emulation.setTouchEmulationEnabled',
                    params: { enabled: false },
                }),
                { log: false },
            );
            emularMedios([{ name: 'pointer', value: 'fine' }, { name: 'any-pointer', value: 'fine' }]);
            cy.entrar();
            cy.visitaDemo('/proyectos');
            cy.get('.proy-card', { timeout: 20000 }).should('exist');
            cy.window().then((win) => {
                expect(win.matchMedia('(pointer: coarse)').matches, 'el puntero es fino').to.eq(false);
                const el = win.document.querySelector('.dash-header__menu-btn') as HTMLElement;
                expect(
                    Math.round(el.getBoundingClientRect().height),
                    'con puntero fino se queda en su tamaño compacto',
                ).to.be.lessThan(44);
            });
        });
    });
});
