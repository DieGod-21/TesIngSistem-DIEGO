/**
 * KpiSkeleton.tsx — Hueco de las fichas de indicadores mientras cargan.
 *
 * MEDIDO en su día sobre el panel del coordinador: con dos líneas medía 94px
 * frente a los 101px de la ficha real, y al llegar los datos toda la página
 * daba un salto de 7px. Son TRES filas —rótulo, cifra y descripción—, las
 * mismas que tiene la ficha y con los mismos tamaños, así que el hueco
 * reservado es exactamente el que se va a ocupar.
 *
 * Vive aquí, y no dentro de un panel, porque los dos workspaces enseñan tres
 * fichas del mismo material: si el esqueleto se duplicara, la corrección de
 * altura se aplicaría a uno y no al otro.
 */

import React from 'react';
import { Skeleton } from '../ui';

const KpiSkeleton: React.FC = () => (
    <div className="cohort-tiles" aria-busy="true" aria-label="Cargando indicadores…">
        {[0, 1, 2].map((i) => (
            <div key={i} className="cohort-tile">
                {/* Alturas explícitas = las de las tres líneas reales (rótulo
                    11px, cifra ~28px, descripción 12px). Con las alturas por
                    defecto del esqueleto la ficha se pasaba 13px. */}
                <Skeleton height={16} width="55%" />
                <Skeleton height={28} width="40%" />
                <Skeleton height={16} width="80%" />
            </div>
        ))}
    </div>
);

export default KpiSkeleton;
