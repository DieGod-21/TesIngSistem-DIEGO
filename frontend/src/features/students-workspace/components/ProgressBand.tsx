/**
 * ProgressBand.tsx — Banda de progreso + lente compartida (Wave 1).
 *
 * Capa de RENDER DELGADA sobre la salida del dominio: no deriva etapas ni
 * genera trabajo; solo dibuja `result.stageCounts` / `result.coverage` y expone
 * la lente compartida. Toda la verdad viene de `deriveWorkQueue`.
 *
 * Progresivo y resiliente: la lente (los chips) se renderiza SIEMPRE, aunque el
 * panorama esté cargando, falle o el usuario no tenga permiso. Así el filtrado
 * nunca depende de que el panorama cargue (compatibilidad hacia atrás).
 */

import React from 'react';
import { Skeleton } from '../../../components/ui';
import { LENSES, type LensId } from '../lens/lens';
import { STAGE_ORDER } from '../domain/pipelineMeta';
import type { PipelineStage, WorkQueueResult } from '../domain/types';
import type { LensCounts } from '../hooks/useStudentsPipeline';
import '../styles/progress-band.css';

/**
 * Etiqueta de cada etapa (el orden canónico se reusa del dominio).
 * Se exporta para que la cola de trabajo nombre el lote acotado con el MISMO
 * texto que el panorama: una sola fuente de verdad para las etiquetas.
 */
export const STAGE_LABEL: Record<PipelineStage, string> = {
    sin_datos: 'Sin estado',
    pg1_pendiente: 'PG1 pendiente',
    pg2_pendiente: 'PG2 pendiente',
    no_elegible: 'No elegible',
    elegible_sin_caso: 'Elegible sin caso',
    en_terna: 'En terna',
    terna_estancada: 'Terna estancada',
    resuelto: 'Resuelto',
};

interface ProgressBandProps {
    activeLens: LensId;
    onSelectLens: (lens: LensId) => void;
    result: WorkQueueResult | null;
    lensCounts: LensCounts | null;
    loading: boolean;
    error: string | null;
    /** Etapa por la que está acotada la cola de trabajo (null = sin acotar). */
    activeStage?: PipelineStage | null;
    /** Acota la cola a una etapa; misma etapa = alternar y limpiar. */
    onSelectStage?: (stage: PipelineStage | null) => void;
}

const ProgressBand: React.FC<ProgressBandProps> = ({
    activeLens, onSelectLens, result, lensCounts, loading, error,
    activeStage = null, onSelectStage,
}) => {
    const stages = result
        ? STAGE_ORDER.filter((s) => result.stageCounts[s] > 0)
        : [];

    // Solo se ofrece filtrar por etapas que realmente generan trabajo. Etapas
    // sanas (en terna, resuelto) tienen conteo pero nada que hacer: convertirlas
    // en filtro prometería una lista vacía.
    const actionableStages = React.useMemo(
        () => new Set(result ? result.items.map((i) => i.stage) : []),
        [result],
    );
    const hasPulse = !!result && result.coverage.totalStudents > 0 && stages.length > 0;

    const pulseSummary = hasPulse
        ? stages.map((s) => `${STAGE_LABEL[s]}: ${result!.stageCounts[s]}`).join('; ')
        : '';

    return (
        <section className="pb" aria-label="Panorama del pipeline y filtro de estudiantes">
            {/* ── Lente compartida: siempre visible (no depende del panorama) ── */}
            <div className="pb__lens" role="group" aria-label="Filtrar estudiantes por estado de tesis">
                <span className="pb__lens-label">Ver</span>
                <div className="pb__chips">
                    {LENSES.map((l) => {
                        const count = lensCounts ? lensCounts[l.id] : null;
                        const active = activeLens === l.id;
                        return (
                            <button
                                key={l.id}
                                type="button"
                                className={`pb__chip${active ? ' pb__chip--active' : ''}`}
                                aria-pressed={active}
                                onClick={() => onSelectLens(l.id)}
                            >
                                {l.label}
                                {count != null && <span className="pb__chip-count">{count}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Pulso del pipeline: solo cuando hay datos del dominio ── */}
            {loading && (
                <div className="pb__pulse" aria-hidden="true">
                    <Skeleton style={{ height: 10, borderRadius: 999 }} />
                </div>
            )}

            {!loading && error && (
                <p className="pb__note" role="status">No se pudo cargar el panorama del pipeline.</p>
            )}

            {!loading && !error && hasPulse && (
                <div className="pb__pulse">
                    <div className="pb__bar" role="img" aria-label={`Distribución del pipeline. ${pulseSummary}`}>
                        {stages.map((s) => (
                            <span
                                key={s}
                                className={`pb__seg pb__seg--${s}`}
                                style={{ flexGrow: result!.stageCounts[s] }}
                                title={`${STAGE_LABEL[s]}: ${result!.stageCounts[s]}`}
                            />
                        ))}
                    </div>

                    {/* Cada conteo es un punto de entrada al trabajo: acota la
                        cola a esa etapa. Sin esto, el número respondía "cuántos"
                        pero nunca "quiénes". */}
                    <ul className="pb__legend">
                        {stages.map((s) => {
                            const active = activeStage === s;
                            const dot = <span className={`pb__dot pb__seg--${s}`} aria-hidden="true" />;
                            const label = <span className="pb__legend-label">{STAGE_LABEL[s]}</span>;
                            const count = <span className="pb__legend-count">{result!.stageCounts[s]}</span>;

                            // Etapa sin trabajo accionable: informa, pero no finge
                            // ser un filtro.
                            if (!onSelectStage || !actionableStages.has(s)) {
                                return (
                                    <li key={s} className="pb__legend-item pb__legend-item--static">
                                        {dot}{label}{count}
                                    </li>
                                );
                            }

                            return (
                                <li key={s}>
                                    <button
                                        type="button"
                                        className={`pb__legend-item pb__legend-item--action${active ? ' pb__legend-item--active' : ''}`}
                                        aria-pressed={active}
                                        onClick={() => onSelectStage(active ? null : s)}
                                        title={
                                            active
                                                ? 'Quitar el filtro de la cola de trabajo'
                                                : `Ver en la cola de trabajo: ${STAGE_LABEL[s]}`
                                        }
                                    >
                                        {dot}{label}{count}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <p className="pb__coverage">
                        <strong>{result!.coverage.withStatus}</strong> de{' '}
                        <strong>{result!.coverage.totalStudents}</strong> con estado
                        {result!.coverage.withoutStatus > 0 && (
                            <> {' · '}{result!.coverage.withoutStatus} sin datos</>
                        )}
                    </p>
                </div>
            )}
        </section>
    );
};

export default ProgressBand;
