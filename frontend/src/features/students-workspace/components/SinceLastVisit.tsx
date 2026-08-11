/**
 * SinceLastVisit.tsx — "Desde tu última visita" (Wave 5).
 *
 * Capa de RENDER DELGADA sobre el diff que ya calculó el DOMINIO. No deriva ni
 * compara nada: solo traduce `stageDeltas` a copy y formatea el tiempo.
 *
 * Muestra CAMBIOS agregados por etapa (no la lista de la cola → no duplica el
 * Work Queue). Desaparece en silencio si el diff no es "meaningful".
 */

import React from 'react';
import { History, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { PipelineStage } from '../domain/types';
import type { SnapshotDiff } from '../domain/snapshot';
import { assertNever } from '../../../utils/assertNever';
import { formatAgo } from '../../../utils/dates';
import '../styles/since-last-visit.css';

/* El formateador relativo vive en `utils/dates`: era local aquí y la cola de
   trabajo tenía el suyo con otra abreviatura. Un solo formateador, dos
   consumidores. */

/** Copy por etapa según el signo del delta (n = magnitud). */
function describeStageDelta(stage: PipelineStage, delta: number): string {
    const n = Math.abs(delta);
    const up = delta > 0;
    switch (stage) {
        case 'pg1_pendiente':
            return up ? `${n} nota(s) PG1 nuevas por registrar` : `${n} nota(s) PG1 registrada(s)`;
        case 'pg2_pendiente':
            return up ? `${n} nota(s) PG2 nuevas por registrar` : `${n} nota(s) PG2 registrada(s)`;
        case 'no_elegible':
            return up ? `${n} marcado(s) como no elegible(s)` : `${n} ya no figuran como no elegibles`;
        case 'elegible_sin_caso':
            return up ? `${n} nuevo(s) elegible(s) a tesis` : `${n} elegible(s) avanzaron a un caso`;
        case 'en_terna':
            return up ? `${n} entraron a terna` : `${n} salieron de terna`;
        case 'terna_estancada':
            return up ? `${n} terna(s) quedaron estancadas` : `${n} terna(s) se destrabaron`;
        case 'resuelto':
            return up ? `${n} caso(s) resuelto(s)` : `${n} caso(s) reabierto(s)`;
        case 'sin_datos':
            return up ? `${n} estudiante(s) nuevo(s) sin estado` : `${n} estudiante(s) obtuvieron estado`;
    }
    return assertNever(stage);
}

interface SinceLastVisitProps {
    diff: SnapshotDiff | null;
}

const SinceLastVisit: React.FC<SinceLastVisitProps> = ({ diff }) => {
    if (!diff || !diff.meaningful) return null; // desaparece en silencio

    return (
        <section className="slv" aria-label="Cambios desde tu última visita">
            <p className="slv__head">
                <History size={14} aria-hidden="true" />
                <span>Desde tu última visita</span>
                {diff.sincePreviousMs != null && (
                    <span className="slv__since"> · {formatAgo(diff.sincePreviousMs)}</span>
                )}
            </p>
            <ul className="slv__list">
                {diff.stageDeltas.map((d) => (
                    <li key={d.stage} className={`slv__item slv__item--${d.delta > 0 ? 'up' : 'down'}`}>
                        {d.delta > 0
                            ? <ArrowUpRight size={13} aria-hidden="true" />
                            : <ArrowDownRight size={13} aria-hidden="true" />}
                        <span>{describeStageDelta(d.stage, d.delta)}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default SinceLastVisit;
