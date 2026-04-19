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
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import '../styles/dashboard.css';
import '../styles/transitions.css';

interface AppShellProps {
    children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <IonPage>
            {/*
             * scrollY={true}  → habilita scroll vertical en Ionic
             * fullscreen       → extiende el contenido bajo la barra de estado en iOS
             * NO se pasa overflow manual — IonContent lo gestiona internamente
             */}
            <IonContent scrollY={true} fullscreen>
                {/*
                 * dash-layout: flex-row, altura automática (NO 100vh).
                 * Debe crecer con el contenido para que IonContent pueda hacer scroll.
                 */}
                <div className="dash-layout">
                    <Sidebar
                        open={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                    />
                    {/*
                     * dash-main: columna flex, min-height: 100% (relativo a IonContent),
                     * NO min-height:100vh (eso bloquea el scroll en Ionic).
                     */}
                    <main className="dash-main page-enter-animate">
                        {/*
                         * TopHeader: sticky dentro del scroll de IonContent.
                         * position:sticky funciona correctamente con IonContent en Ionic >=6.
                         */}
                        <TopHeader
                            onMenuToggle={() => setSidebarOpen((v) => !v)}
                        />
                        {children}
                    </main>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default AppShell;
