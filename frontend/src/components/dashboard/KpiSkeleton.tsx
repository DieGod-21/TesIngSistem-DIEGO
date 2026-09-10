/**
 * KpiSkeleton.tsx — Hueco de las fichas de indicadores mientras cargan.
 *
 * Tres filas —rótulo, cifra y descripción—, las mismas que la ficha real y con
 * los mismos tamaños: el hueco reservado es el que se va a ocupar, así que al
 * llegar los datos la página no da ningún salto.
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
