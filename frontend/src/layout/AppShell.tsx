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
            <IonContent scrollY={true} fullscreen>
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
                        <div key={pathname} className="page-enter-animate">
                            {children}
                        </div>
                    </main>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default AppShell;
