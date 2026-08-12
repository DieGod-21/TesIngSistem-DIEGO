/**
 * ImportOutcome.tsx — Lo que ocurrió al importar.
 *
 * Importar un acta es la operación de mayor alcance del producto: cambia la
 * elegibilidad de una cohorte entera de una sola vez. Y era la que menos
 * contaba de lo que había hecho: un recuadro verde con «Importación
 * completada».
 *
 * El servidor sí lo cuenta —cuántos registros traía el PDF, cuántos casaron con
 * el padrón, cuáles no, el reparto por estado y el detalle nombre a nombre— y
 * todo eso se estaba descartando en el cliente.
 *
 * La fila que de verdad importa es `NO_ENCONTRADO`: alguien que aparece en el
 * acta oficial y no existe en el padrón. Es la única que exige una acción
 * humana, así que se muestra primero y no se puede pasar por alto.
 */

import React, { useMemo, useState } from 'react';
import { ChevronDown, UserX } from 'lucide-react';
import { Alert, Badge } from './ui';
import type { BadgeTone } from './ui';
import type { FilaNotaImportada, ImportarNotasResult } from '../services/importarService';

const ESTADO_TONE: Record<string, BadgeTone> = {
    APROBADO:  'success',
    REPROBADO: 'danger',
    NSP:       'warning',
};

/** Cuántas filas se listan antes de plegar el resto. */
const TOPE_VISIBLE = 8;

export interface ImportOutcomeProps {
    resultado: ImportarNotasResult;
}

const ImportOutcome: React.FC<ImportOutcomeProps> = ({ resultado }) => {
    const [expandido, setExpandido] = useState(false);

    const { noEncontrados, resto } = useMemo(() => {
        const filas = resultado.detalle ?? [];
        return {
            noEncontrados: filas.filter((f) => f.resultado === 'NO_ENCONTRADO'),
            resto:         filas.filter((f) => f.resultado !== 'NO_ENCONTRADO'),
        };
    }, [resultado.detalle]);

    const { totales, estados, operaciones } = resultado;
    const visibles = expandido ? resto : resto.slice(0, TOPE_VISIBLE);
    const ocultas = resto.length - visibles.length;

    return (
        <div className="imo">
            {/* ── Qué se leyó y qué se guardó ── */}
            <div className="imo-stats">
                <Stat valor={totales.en_pdf}       etiqueta="en el archivo" />
                <Stat valor={totales.procesados}   etiqueta="registradas" tono="ok" />
                <Stat valor={totales.no_encontrados} etiqueta="sin coincidencia"
                      tono={totales.no_encontrados > 0 ? 'alerta' : undefined} />
            </div>

            <p className="imo-line">
                {operaciones.insertados} nota{operaciones.insertados !== 1 ? 's' : ''} nueva
                {operaciones.insertados !== 1 ? 's' : ''}
                {' · '}
                {operaciones.actualizados} actualizada{operaciones.actualizados !== 1 ? 's' : ''}
                {(resultado.ciclo || resultado.fecha_acta) && (
                    <>
                        {' · '}
                        {[resultado.ciclo, resultado.fecha_acta].filter(Boolean).join(' · ')}
                    </>
                )}
            </p>

            <p className="imo-line imo-line--estados">
                <span className="imo-dot imo-dot--ok" aria-hidden="true" />{estados.aprobados} aprobados
                <span className="imo-dot imo-dot--bad" aria-hidden="true" />{estados.reprobados} reprobados
                <span className="imo-dot imo-dot--nsp" aria-hidden="true" />{estados.nsp} NSP
            </p>

            {/* ── Lo único que exige una acción ── */}
            {noEncontrados.length > 0 && (
                <Alert
                    tone="warning"
                    icon={<UserX size={16} />}
                    title={`${noEncontrados.length} carné${noEncontrados.length !== 1 ? 's' : ''} del acta no está${noEncontrados.length !== 1 ? 'n' : ''} en el padrón`}
                >
                    <ul className="imo-missing">
                        {noEncontrados.map((f) => (
                            <li key={f.carnet}>
                                <span className="ui-tnum">{f.carnet}</span>
                                {f.nombre ? ` · ${f.nombre}` : ''}
                            </li>
                        ))}
                    </ul>
                    Su nota no se registró. Regístralos en el padrón y vuelve a importar el acta.
                </Alert>
            )}

            {/* ── Detalle nombre a nombre ── */}
            {resto.length > 0 && (
                <div className="imo-detalle">
                    <ul className="imo-filas">
                        {visibles.map((f) => <Fila key={`${f.carnet}-${f.resultado}`} fila={f} />)}
                    </ul>
                    {ocultas > 0 && (
                        <button
                            type="button"
                            className="imo-mas"
                            onClick={() => setExpandido(true)}
                        >
                            <ChevronDown size={14} aria-hidden="true" />
                            Ver las {ocultas} restantes
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const Stat: React.FC<{ valor: number; etiqueta: string; tono?: 'ok' | 'alerta' }> = ({
    valor, etiqueta, tono,
}) => (
    <div className={`imo-stat${tono ? ` imo-stat--${tono}` : ''}`}>
        <span className="imo-stat__valor ui-tnum">{valor}</span>
        <span className="imo-stat__etiqueta">{etiqueta}</span>
    </div>
);

const Fila: React.FC<{ fila: FilaNotaImportada }> = ({ fila }) => (
    <li className="imo-fila">
        <span className="imo-fila__carnet ui-tnum">{fila.carnet}</span>
        <span className="imo-fila__nombre">{fila.nombre}</span>
        <span className="imo-fila__nota ui-tnum">
            {fila.nota_final == null || fila.nota_final === '' ? '—' : fila.nota_final}
        </span>
        <Badge tone={ESTADO_TONE[fila.estado] ?? 'neutral'}>{fila.estado}</Badge>
        {/* «Actualizada» significa que esa persona YA tenía nota y se ha
            sobrescrito. No es lo mismo que registrarla por primera vez y
            conviene poder distinguirlo de un vistazo. */}
        <span className="imo-fila__op">
            {fila.resultado === 'ACTUALIZADO' ? 'actualizada' : 'nueva'}
        </span>
    </li>
);

export default ImportOutcome;
