/**
 * AppShell.tsx
 *
 * Layout raíz para páginas autenticadas.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  REGLA DE ORO CON IONIC                                     │
 * │                                                             │
 * │  IonContent ES el scroll container. Nada de su interior     │
 * │  debe tener overflow:auto/scroll ni height:100vh.           │
 * │  El layout interno simplemente fluye con height:auto.       │
 * │                                                             │
 * │  Estructura correcta:                                       │
 * │    IonPage                                                  │
 * │      └─ IonContent  ← scroll aquí y solo aquí              │
 * │           └─ .dash-layout  (flex-row, height:auto)         │
 * │                ├─ .dash-sidebar  (position:fixed)          │
 * │                └─ .dash-main  (flex:1, min-height auto)     │
 * │                     ├─ TopHeader (position:sticky top:0)   │
 * │                     └─ children (fluye libremente)        │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import ErrorBoundary from '../components/ErrorBoundary';
import { PageErrorFallback } from '../components/ErrorFallback';
import '../styles/dashboard.css';
import '../styles/transitions.css';

interface AppShellProps {
    children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { pathname } = useLocation();

    return (
        <IonPage>
            {/*
              * `role="presentation"` porque Ionic le pone `role="main"` por su
              * cuenta, y aquí eso es falso por partida doble: ya existe un
              * `<main class="dash-main">` más abajo —dos landmarks principales
              * en la misma página— y este contenedor envuelve TAMBIÉN la barra
              * lateral de navegación, que no es contenido principal de nada.
              *
              * Quien navegue por landmarks tenía que elegir entre dos «main»,
              * y el primero se lo llevaba todo. Este elemento es el scroller:
              * no significa nada, y ahora lo dice.
              */}
            <IonContent role="presentation" scrollY={true} fullscreen>
                {/* Primera parada del tabulador, antes que la barra lateral:
                    es lo que le da sentido. Ver `.ui-skip-link`. */}
                <a
                    className="ui-skip-link"
                    href="#contenido-principal"
                    /*
                     * El salto se hace a mano, y no dejando que el navegador
                     * siga el fragmento.
                     *
                     * MEDIDO: al pulsarlo, `document.activeElement` se quedaba
                     * en el propio enlace. Aquí el destino vive dentro del
                     * scroller de Ionic —un shadow root—, donde la navegación
                     * por fragmento no lleva el foco, y además el `href`
                     * ensuciaría la URL de una aplicación que gestiona su
                     * propio enrutado. Un enlace que anuncia que lleva al
                     * contenido y no lleva el foco es peor que no tenerlo.
                     *
                     * El `href` se queda: es lo que hace que sea un enlace
                     * para la tecnología de apoyo, y el destino real.
                     */
                    onClick={(e) => {
                        e.preventDefault();
                        const destino = document.getElementById('contenido-principal');
                        destino?.focus();
                        destino?.scrollIntoView({ block: 'start' });
                    }}
                >
                    Ir al contenido
                </a>
                <div className="dash-layout">
                    <Sidebar
                        open={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                    />
                    {/*
                     * dash-main persists across route changes — sidebar and header
                     * never remount. Only the inner div re-keys on pathname change,
                     * triggering the entrance animation for the incoming page content.
                     */}
                    <main className="dash-main">
                        <TopHeader
                            onMenuToggle={() => setSidebarOpen((v) => !v)}
                        />
                        {/*
                         * Nivel 2 — Boundary de contenido: envuelve SOLO la página.
                         * Sidebar y header quedan fuera, así que sobreviven a un
                         * crash de página. La key por pathname re-monta el boundary
                         * al navegar → recuperación natural, sin lógica de reset.
                         */}
                        <ErrorBoundary key={pathname} level="content" fallback={<PageErrorFallback />}>
                            {/* `tabIndex={-1}`: un contenedor no es una parada
                                del tabulador, pero sin esto el salto mueve la
                                vista y NO el foco, y el siguiente tabulador
                                volvería al principio. */}
                            <div id="contenido-principal" tabIndex={-1} className="page-enter-animate">
                                {children}
                            </div>
                        </ErrorBoundary>
                    </main>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default AppShell;
