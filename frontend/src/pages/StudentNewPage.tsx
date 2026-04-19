/**
 * StudentNewPage.tsx
 *
 * Página de Registro de Estudiantes — /students/new
 *
 * Usa AppShell para el layout común (Sidebar + TopHeader).
 * Grid 3/5 formulario + 2/5 carga masiva.
 * RecentUploads se refresca cuando BulkUploadCard finaliza una carga.
 */

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import AppShell from '../layout/AppShell';
import StudentManualForm from '../components/student-new/StudentManualForm';
import BulkUploadCard from '../components/student-new/BulkUploadCard';
import RecentUploads from '../components/student-new/RecentUploads';

import '../styles/student-new.css';

const StudentNewPage: React.FC = () => {
    // Incrementar este valor provoca que RecentUploads re-cargue datos
    const [uploadRefreshKey, setUploadRefreshKey] = useState(0);

    const handleUploaded = () => setUploadRefreshKey((k) => k + 1);

    return (
        <AppShell>
            <div className="sn-body">
                {/* Breadcrumb */}
                <nav className="sn-breadcrumb" aria-label="Navegación secundaria">
                    <span className="sn-breadcrumb__item">Inicio</span>
                    <ChevronRight size={14} className="sn-breadcrumb__sep" aria-hidden="true" />
                    <span className="sn-breadcrumb__item sn-breadcrumb__item--active">
                        Nuevo Registro
                    </span>
                </nav>

                {/* Encabezado */}
                <div className="sn-page-header">
                    <h1 className="sn-page-title">Registro de Estudiantes</h1>
                    <p className="sn-page-subtitle">
                        Inscriba nuevos estudiantes de Proyecto de Graduación de forma
                        individual o masiva.
                    </p>
                </div>

                {/* Grid principal */}
                <div className="sn-grid">
                    {/* Columna izquierda — Formulario manual */}
                    <div className="sn-grid__main">
                        <StudentManualForm />
                    </div>

                    {/* Columna derecha — Carga masiva + Últimas cargas */}
                    <aside className="sn-grid__aside">
                        <BulkUploadCard onUploaded={handleUploaded} />
                        <RecentUploads refreshKey={uploadRefreshKey} />
                    </aside>
                </div>
            </div>
        </AppShell>
    );
};

export default StudentNewPage;
