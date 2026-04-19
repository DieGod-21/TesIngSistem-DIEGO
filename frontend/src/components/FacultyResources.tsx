/**
 * FacultyResources.tsx
 *
 * Lista de recursos de la Facultad de Ingeniería.
 * Cada item tiene un icono lucide-react resuelto dinámicamente.
 * Los datos vienen de dashboardService.
 */

import React from 'react';
import { resolveIcon } from '../utils/iconRegistry';
import type { FacultyResource } from '../services/dashboardService';

interface FacultyResourcesProps {
    resources: FacultyResource[];
}

const FacultyResources: React.FC<FacultyResourcesProps> = ({ resources }) => {
    return (
        <section className="dash-resources">
            <h4 className="dash-resources__title">Recursos de Facultad</h4>

            <ul className="dash-resources__list">
                {resources.map((item) => {
                    const IconComponent = resolveIcon(item.iconName);


                    return (
                        <li key={item.id} className="dash-resources__item">
                            <a href={item.href} className="dash-resources__link">
                                {IconComponent && (
                                    <IconComponent size={16} className="dash-resources__icon" />
                                )}
                                <span className="dash-resources__label">{item.label}</span>
                            </a>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

export default FacultyResources;
