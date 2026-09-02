/**
 * apariencia.cy.ts — Detalles que solo existen sobre el render.
 *
 * ── QUÉ PROTEGE ─────────────────────────────────────────────────────────
 *
 * Cosas que compilan, pasan las pruebas unitarias, se leen bien en el archivo
 * y aun así están mal EN PANTALLA: un elemento que mide cero, un texto de
 * ayuda pintado de error, un control que se dibuja solo la mitad. Ninguna de
 * las tres se puede ver sin un navegador aplicando la cascada.
 */

describe('apariencia', () => {
    /* Los specs de esta carpeta comparten ámbito de tipos, así que los
       ayudantes viven DENTRO del bloque: declarados arriba chocarían con los
       homónimos de interaccion.cy.ts. */

    /** Estilo calculado de un elemento, tal y como lo resuelve la cascada. */
    function calculado(el: Element) {
        const win = el.ownerDocument.defaultView;
        if (!win) throw new Error('el elemento no está en una ventana');
        return win.getComputedStyle(el);
    }

    /** Valor de un token del tema, ya resuelto. */
    function token(win: Window, nombre: string): string {
        return win.getComputedStyle(win.document.documentElement).getPropertyValue(nombre).trim();
    }

    beforeEach(() => {
        cy.viewport(1280, 800);
        cy.entrar();
    });

    describe('progreso de una terna', () => {
        it('la barra ocupa el ancho de la tarjeta y se llena según los datos', () => {
            /*
             * MEDIDO antes del arreglo: la barra salía 0×6px en las CINCO
             * tarjetas. Nunca se ha visto. La tarjeta es un <button>, y la hoja
             * del navegador le impone `align-items: flex-start`, así que la
             * fila del progreso se encogía a su contenido y la barra —que
             * reparte lo que sobra con `flex: 1`— se quedaba sin nada.
             *
             * El efecto no era solo perder la barra: con la fila encogida el
             * `space-between` tampoco separaba, y el chevron quedaba pegado al
             * texto en mitad de la tarjeta, con la mitad derecha vacía.
             *
             * Se comprueban las DOS mitades. Que la barra mida no basta: si el
             * relleno no siguiera a los datos, una terna sin evaluar se vería
             * igual que una terminada.
             */
            cy.visitaDemo('/ternas');
            cy.get('.terna-card', { timeout: 20000 }).should('have.length.greaterThan', 1);
            cy.wait(900); // que termine el llenado

            cy.get('.terna-card').each(($card) => {
                const barra = $card[0].querySelector('.terna-card__progress-bar') as HTMLElement;
                const relleno = $card[0].querySelector('.terna-card__progress-fill') as HTMLElement;
                expect(barra, 'la tarjeta tiene barra').to.not.equal(null);

                const anchoBarra = barra.getBoundingClientRect().width;
                expect(anchoBarra, 'la barra se ve').to.be.greaterThan(50);

                // El texto dice «2/3 evaluaciones»: el relleno tiene que decir
                // lo mismo sin leerlo.
                const texto = $card[0].querySelector('.terna-card__progress span')?.textContent ?? '';
                const m = texto.match(/(\d+)\s*\/\s*(\d+)/);
                expect(m, `«${texto}» lleva la proporción`).to.not.equal(null);
                const esperado = Number(m![1]) / Number(m![2]);
                const real = relleno.getBoundingClientRect().width / anchoBarra;
                expect(real, `el relleno coincide con ${m![0]}`).to.be.closeTo(esperado, 0.02);
            });
        });
    });

    describe('ayuda y error no son lo mismo', () => {
        it('la nota bajo el selector no se pinta de error', () => {
            /*
             * `.ui-picker__msg` era SIEMPRE `--color-danger`, y ese hueco lo
             * comparten la nota y el error. Resultado: «Nuevo Proyecto» se
             * abría con una línea roja bajo el primer campo sin que nadie
             * hubiera tocado nada, y el diálogo parecía roto de entrada.
             *
             * Que era una excepción y no una convención lo demuestra el resto
             * del sistema: la nota de la contraseña en «Nuevo Usuario» va en
             * gris.
             *
             * Se comprueban las dos mitades sobre el MISMO elemento y la misma
             * cascada: sin error va en secundario, con error en peligro. Mirar
             * solo la primera pasaría también si alguien dejara el mensaje de
             * error en gris, que es el defecto contrario.
             */
            cy.visitaDemo('/proyectos');
            cy.get('.proy-card', { timeout: 20000 }).should('exist');
            cy.contains('button', /Nuevo Proyecto/i).click({ scrollBehavior: 'center' });
            cy.get('.ui-modal-overlay').should('be.visible');

            cy.get('.ui-picker__msg').first().should(($p) => {
                expect($p.text().trim(), 'hay una nota que leer').to.not.equal('');
                expect($p[0].className, 'y no se presenta como error').to.not.contain('--error');
            });

            cy.window().then((win) => {
                const p = win.document.querySelector('.ui-picker__msg') as HTMLElement;
                const peligro = token(win, '--color-danger');
                const secundario = token(win, '--text-secondary');
                expect(peligro, 'los dos tokens existen y se distinguen').to.not.eq(secundario);

                const enReposo = calculado(p).color;
                p.classList.add('ui-picker__msg--error');
                const enError = calculado(p).color;
                p.classList.remove('ui-picker__msg--error');

                expect(enReposo, 'la nota no va en color de error').to.not.eq(enError);
            });
        });
    });

    describe('un producto, no cinco pantallas', () => {
        /** Ruta, selector de fila, cuántas filas deja el segundo chip. */
        const LISTADOS: [string, string, string][] = [
            ['/usuarios',  '.usr-list-item',              '.ui-toolbar__group .ui-chip'],
            ['/proyectos', '.proy-card',                  '.ui-toolbar__group .ui-chip'],
            ['/reports',   '.reportes-table tbody tr',    '.ui-chip'],
        ];

        LISTADOS.forEach(([ruta, fila, chip]) => {
            it(`${ruta} dice cuántos elementos está enseñando el filtro`, () => {
                /*
                 * MEDIDO antes del arreglo: cinco listados y cinco respuestas
                 * distintas a la misma pregunta. Usuarios y Reportes no la
                 * contestaban en absoluto: pulsar «Administradores» dejaba UNA
                 * fila en pantalla mientras las tarjetas de arriba seguían
                 * anunciando 7.
                 *
                 * Se comprueban las DOS mitades: el recuento existe sin filtro
                 * Y cambia al filtrar. Mirar solo la primera pasaría con una
                 * cifra congelada, que es justo el defecto que había.
                 */
                cy.visitaDemo(ruta);
                cy.get(fila, { timeout: 20000 }).should('exist');
                cy.get('.ui-list-count', { timeout: 10000 }).should('be.visible');

                cy.get('.ui-list-count').invoke('text').then((antes) => {
                    cy.get(chip).eq(1).click({ scrollBehavior: 'center' });
                    cy.get(fila).should('exist');
                    cy.get('.ui-list-count').should(($c) => {
                        const ahora = $c.text();
                        expect(ahora, 'el recuento acusa el filtro').to.not.eq(antes);
                        expect(ahora, 'y dice sobre cuántos').to.match(/\d+ de \d+/);
                    });

                    // Y coincide con lo que de verdad hay en pantalla.
                    cy.get(fila).then(($filas) => {
                        cy.get('.ui-list-count').should(($c) => {
                            expect($c.text().trim().split(' ')[0], 'la cifra es la real')
                                .to.eq(String($filas.length));
                        });
                    });
                });
            });
        });

        it('el subtítulo de una sección no es una cifra que cambia', () => {
            /*
             * Proyectos metía el recuento EN el subtítulo, y en cuanto cargaba
             * se comía la descripción de la página: pasado el primer segundo ya
             * no quedaba nada que dijera qué son los proyectos, y el mismo 11
             * se repetía abajo. Ternas, por su parte, hablaba en segunda
             * persona («Estás viendo… (5)») mientras el resto del producto
             * describía la sección de forma impersonal.
             */
            cy.visitaDemo('/proyectos');
            cy.get('.proy-card', { timeout: 20000 }).should('exist');
            cy.get('.ui-page-header__subtitle').should(($p) => {
                expect($p.text(), 'describe la sección').to.not.match(/^\d/);
                expect($p.text(), 'y no lleva el recuento dentro').to.not.match(/\d+ proyectos?/);
            });

            cy.visitaDemo('/ternas');
            cy.get('.terna-card', { timeout: 20000 }).should('exist');
            cy.get('.ui-page-header__subtitle').should(($p) => {
                expect($p.text(), 'habla del producto, no al lector').to.not.match(/Estás|Hola/);
                expect($p.text(), 'y tampoco duplica el recuento').to.not.match(/\(\d+\)/);
            });
        });

        it('la fila de Usuarios cumple lo que promete al apuntarla', () => {
            /*
             * MEDIDO: era la única lista del producto cuyas filas NO son
             * pulsables —las otras cuatro son <button> o <tr tabindex=0>— y la
             * única que encendía el fondo al apuntar. Prometía un clic que no
             * existía, y encima el correo era el único identificador del
             * producto que había que seleccionar a mano.
             *
             * El API no ofrece editar ni borrar un usuario, así que la fila no
             * puede llevar a ninguna parte. Lo que sí puede es dar lo que ya
             * dan el expediente, la vista rápida y el detalle de reporte:
             * copiar el dato de un clic.
             */
            cy.visitaDemo('/usuarios');
            cy.get('.usr-list-item', { timeout: 20000 }).should('exist');

            cy.get('.usr-list-item').first().find('.ui-copy').should(($b) => {
                expect($b[0].tagName, 'es un control de verdad').to.eq('BUTTON');
                expect($b.attr('aria-label'), 'y dice qué copia').to.match(/Copiar el correo .+@/);
            });

            // Alcanzable con el teclado, como el resto de acciones del producto.
            cy.get('.usr-list-item').first().find('.ui-copy').focus();
            cy.focused().should('have.class', 'ui-copy');
        });

        it('las tarjetas de resumen no fingen que se pueden pulsar', () => {
            /*
             * Levantaban la sombra y encendían el borde al apuntarlas, igual
             * que los indicadores del panel —que sí llevan a algún sitio y cuya
             * sección lo promete por escrito: «toca un indicador para ver el
             * detalle»—. Estas no llevaban a ninguna parte, y el filtro por rol
             * ya tiene sus chips.
             *
             * Se lee la hoja publicada y no el estilo calculado: `:hover` lo
             * gobierna el puntero de verdad, así que un `trigger('mouseover')`
             * sintético NO aplica la regla y una prueba escrita así se pondría
             * verde sin comprobar nada.
             */
            cy.visitaDemo('/usuarios');
            cy.get('.ui-stat', { timeout: 20000 }).should('exist');

            cy.document().then((doc) => {
                const culpables: string[] = [];
                const recorrer = (reglas: CSSRuleList) => {
                    for (const regla of Array.from(reglas)) {
                        if (regla instanceof doc.defaultView!.CSSMediaRule) { recorrer(regla.cssRules); continue; }
                        if (!(regla instanceof doc.defaultView!.CSSStyleRule)) continue;
                        const sel = regla.selectorText ?? '';
                        if (!/\.ui-stat[^_-]*:hover/.test(sel)) continue;
                        if (/box-shadow|border-color|transform|background/.test(regla.style.cssText)) {
                            culpables.push(`${sel} { ${regla.style.cssText} }`);
                        }
                    }
                };
                for (const hoja of Array.from(doc.styleSheets)) {
                    try { recorrer(hoja.cssRules); } catch { continue; } // hoja de otro origen
                }
                expect(culpables, 'ninguna regla las hace parecer pulsables').to.deep.eq([]);
            });

            // Y el total dejó de contarse dos veces en la misma pantalla: la
            // tarjeta que lo daba era la suma de las otras dos, y el recuento
            // del listado ya lo dice unos pixeles más abajo.
            cy.get('.ui-stat').should('have.length', 2);
            cy.get('.ui-stat__label').should(($l) => {
                expect($l.text(), 'quedan los dos que dicen cómo se reparte').to.not.contain('Total');
            });
        });
    });

    describe('desplegables', () => {
        it('llevan la punta del producto, no la del navegador', () => {
            /*
             * La caja del <select> ya venía del sistema de diseño —mismo alto,
             * borde, radio y anillo de foco—, pero la punta seguía siendo la
             * nativa: otro grosor, otra forma, y distinta en cada sistema
             * operativo. Es de los detalles que más delatan a una herramienta
             * interna dentro de un formulario dibujado a mano.
             *
             * Un <select> no admite pseudoelementos, así que la punta solo
             * puede llegar como imagen de fondo, y una imagen de fondo no
             * hereda `currentColor`: por eso el dibujo vive en un token y el
             * modo oscuro se resuelve por herencia, como el resto del tema.
             */
            cy.visitaDemo('/students');
            cy.get('.sl-table__tr', { timeout: 20000 }).should('exist');

            cy.get('select.ui-control').first().should(($s) => {
                const cs = calculado($s[0]);
                expect(cs.appearance, 'sin apariencia nativa').to.eq('none');
                expect(cs.backgroundImage, 'con punta propia').to.contain('svg');
                // Sin hueco reservado, una opción larga pasaría por debajo.
                expect(parseFloat(cs.paddingRight), 'y sitio para ella').to.be.greaterThan(30);
            });

            // La punta cambia con el tema. Si alguien la deja fija, en uno de
            // los dos temas se pierde contra el fondo.
            cy.window().then((win) => {
                const antes = token(win, '--chevron-select');
                expect(antes, 'el token existe').to.not.eq('');
                cy.get('.dash-header__theme-toggle').click();
                cy.get('html').should('have.attr', 'data-theme');
                cy.window().then((w2) => {
                    expect(token(w2, '--chevron-select'), 'y se adapta al tema').to.not.eq(antes);
                });
            });
        });
    });
});
