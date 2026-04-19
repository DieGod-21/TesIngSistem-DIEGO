import React from 'react';
import { IonPage, IonContent } from '@ionic/react';
import '../styles/login.css';

/**
 * AuthLayout.tsx
 *
 * Layout contenedor para las páginas de autenticación (Login, Reset Password, etc.).
 *
 * DECISIÓN: Extraer el layout evita repetir la estructura IonPage + IonContent
 * en cada página de autenticación. Si en el futuro se agrega /register o
 * /forgot-password, solo se importa este layout.
 *
 * El padding y el scroll están desactivados en IonContent para que el componente
 * hijo controle completamente su propio layout (split-screen a pantalla completa).
 */

interface AuthLayoutProps {
    children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
    return (
        <IonPage>
            <IonContent scrollY={false} fullscreen>
                {children}
            </IonContent>
        </IonPage>
    );
};

export default AuthLayout;
