/**
 * StudentNewPage.tsx
 *
 * Registro de estudiantes:
 *   - Individual   → POST /api/estudiantes
 *   - Carga masiva → POST /api/importar/estudiantes (Excel/PDF)
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import AppShell from '../layout/AppShell';
import StudentManualForm from '../components/student-new/StudentManualForm';
import BulkUploadCard from '../components/student-new/BulkUploadCard';

import '../styles/student-new.css';

const StudentNewPage: React.FC = () => (
    <AppShell>
        <div className="sn-body">
            <nav className="sn-breadcrumb" aria-label="Navegación secundaria">
                <span className="sn-breadcrumb__item">Inicio</span>
                <ChevronRight size={14} className="sn-breadcrumb__sep" aria-hidden="true" />
                <span className="sn-breadcrumb__item sn-breadcrumb__item--active">
                    Nuevo Registro
                </span>
            </nav>

            <div className="sn-page-header">
                <h1 className="sn-page-title">Registro de Estudiantes</h1>
                <p className="sn-page-subtitle">
                    Inscriba nuevos estudiantes de Proyecto de Graduación de forma individual o masiva.
                </p>
            </div>

            <div className="sn-grid">
                <StudentManualForm />
                <BulkUploadCard />
            </div>
        </div>
    </AppShell>
);

export default StudentNewPage;
