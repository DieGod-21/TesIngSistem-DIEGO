/**
 * StudentNewPage.tsx
 *
 * Registro de estudiantes:
 *   - Individual   → POST /api/estudiantes
 *   - Carga masiva → POST /api/importar/estudiantes (Excel/PDF)
 */

import React from 'react';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '../components/ui';
import StudentManualForm from '../components/student-new/StudentManualForm';
import BulkUploadCard from '../components/student-new/BulkUploadCard';

import '../styles/student-new.css';

const StudentNewPage: React.FC = () => (
    <div className="sn-body">
        <PageHeader
            kicker="Padrón académico"
            icon={<UserPlus size={22} />}
            title="Registrar estudiantes"
            subtitle="Da de alta un expediente de Proyecto de Graduación uno a uno, o importa una cohorte completa desde Excel o PDF."
        />

        <div className="sn-grid">
            <StudentManualForm />
            <BulkUploadCard />
        </div>
    </div>
);

export default StudentNewPage;
