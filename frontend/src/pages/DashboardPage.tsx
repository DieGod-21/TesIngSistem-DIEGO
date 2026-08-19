/**
 * DashboardPage.tsx — Reparto del inicio según el WORKSPACE.
 *
 * Este componente no dibuja nada: elige. Es deliberadamente delgado y no llama
 * a ningún hook de datos, porque de eso depende que cada rol pida SOLO lo suyo.
 *
 * ── POR QUÉ EL REPARTO VA AQUÍ Y NO DENTRO DEL PANEL ────────────────────────
 *
 * Los hooks de React se ejecutan antes que cualquier condicional del JSX. Con
 * un panel único que se adaptaba con `capabilities.x ? … : …`, un evaluador
 * ejecutaba igualmente los hooks de coordinación: pedía `/api/tesis/resumen`
 * —el estado de tesis de la cohorte entera— para después no enseñarlo. La
 * información administrativa viajaba por la red aunque la interfaz la ocultara.
 *
 * Al repartir ANTES de montar, el panel del evaluador no puede pedir datos de
 * coordinación ni por accidente: ese código no llega a existir en su árbol.
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import EvaluatorDashboard from '../features/evaluator/pages/EvaluatorDashboard';

const DashboardPage: React.FC = () => {
    const { workspace } = useAuth();
    return workspace === 'admin' ? <AdminDashboard /> : <EvaluatorDashboard />;
};

export default DashboardPage;
