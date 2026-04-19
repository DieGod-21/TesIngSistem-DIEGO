import React from 'react';
import { initials } from '../../../utils/strings';
import type { EvaluationStudent } from '../types/evaluation';

interface StudentInfoCardProps {
    student: EvaluationStudent;
}

const StudentInfoCard: React.FC<StudentInfoCardProps> = ({ student }) => (
    <div className="ev-student" aria-label="Información del estudiante">
        <div className="ev-student__banner" aria-hidden="true" />

        <div className="ev-student__avatar" aria-hidden="true">
            {initials(student.nombreCompleto)}
        </div>

        <div className="ev-student__body">
            <h2 className="ev-student__name">{student.nombreCompleto}</h2>
            <p className="ev-student__carrera">{student.carrera}</p>

            <span className={`ev-student__phase ev-student__phase--${student.phase}`}>
                {student.phase}
            </span>

            <hr className="ev-student__divider" />

            <dl className="ev-student__meta">
                <div className="ev-student__meta-row">
                    <dt className="ev-student__meta-label">Carné</dt>
                    <dd className="ev-student__meta-value">{student.carnetId}</dd>
                </div>
            </dl>

            <div className="ev-student__project">
                <span className="ev-student__project-label">Título del Proyecto</span>
                <p className="ev-student__project-title">{student.projectTitle}</p>
            </div>
        </div>
    </div>
);

export default StudentInfoCard;
