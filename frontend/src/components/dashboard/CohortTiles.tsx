/**
 * CohortTiles.tsx — Indicadores de cohorte, en cristal, dentro de la portada.
 *
 * POR QUÉ VIVEN AQUÍ Y NO EN UNA BANDA APARTE
 *
 * Antes el panel abría con tres bloques apilados: portada, rejilla de
 * indicadores y, por fin, el trabajo pendiente. Los indicadores repetían en
 * cuerpo grande lo que la portada ya introducía y empujaban la cola de trabajo
 * —lo único accionable de la pantalla— por debajo del pliegue en portátiles.
 * Al meterlos en la portada desaparece una banda entera: el panel pasa de ser
 * una página de bienvenida a ser un centro de trabajo.
 *
 * POR QUÉ SON DE CRISTAL
 *
 * La portada ya tiene detrás una aurora que deriva y una textura de puntos.
 * Estas fichas TAPAN ese fondo, que sigue estando ahí y se ve a través: es el
 * único sitio del panel donde el nivel 3 del sistema de superficies describe lo
 * que de verdad ocurre. Sobre una superficie plana serían una tarjeta opaca con
 * un desenfoque inútil, y por eso el resto de tarjetas del producto no lo usan.
 *
 * El cristal es SIEMPRE claro sobre oscuro, en ambos temas, porque la portada
 * es oscura en ambos temas: no hereda `--glass-surface`, que está calibrado
 * para láminas claras sobre el papel de la aplicación.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { resolveIcon } from '../../utils/iconRegistry';
import { useCountUp } from '../../hooks/useCountUp';
import type { KpiData } from '../../services/dashboardService';

interface Props {
    kpis: KpiData[];
}

function toNumeric(val: string | number): number | null {
    const n = Number(val);
    return Number.isFinite(n) && String(val).trim() !== '' ? n : null;
}

const AnimatedValue: React.FC<{ value: number }> = ({ value }) => <>{useCountUp(value)}</>;

const CohortTile: React.FC<{ data: KpiData }> = ({ data }) => {
    const history = useHistory();
    const Icon = resolveIcon(data.iconName);
    const numeric = toNumeric(data.value);
    const destino = data.navigateTo;
    /*
     * `iconVariant` pasa a 'red' cuando hay estudiantes sin aprobar. Era la
     * única señal de alarma de la banda anterior y se conserva: sin ella, «0
     * pendientes» y «7 pendientes» se leen exactamente igual de un vistazo.
     * El color NO es el único portador —la cifra y la etiqueta dicen lo mismo—,
     * así que sirve de refuerzo y no de mensaje.
     */
    const alerta = data.iconVariant === 'red';

    const contenido = (
        <>
            <span className="cohort-tile__label">
                {Icon && <Icon size={14} aria-hidden="true" />}
                {data.label}
            </span>
            <span className="cohort-tile__value">
                {numeric !== null ? <AnimatedValue value={numeric} /> : data.value}
            </span>
            <span className="cohort-tile__desc">{data.description}</span>
        </>
    );

    const clase = `cohort-tile${alerta ? ' cohort-tile--alerta' : ''}`;

    if (!destino) {
        return <div className={clase}>{contenido}</div>;
    }

    return (
        <button
            type="button"
            className={`${clase} cohort-tile--clickable`}
            onClick={() => history.push(destino)}
            /* El nombre accesible dice el número Y a dónde lleva: pulsar un
               indicador es navegar, y eso no puede deducirse del estilo. */
            aria-label={`${data.label}: ${data.value}. Ver el detalle en el padrón.`}
        >
            {contenido}
        </button>
    );
};

const CohortTiles: React.FC<Props> = ({ kpis }) => (
    <div className="cohort-tiles" role="group" aria-label="Estado de la cohorte">
        {kpis.map((k) => (
            <CohortTile key={k.id} data={k} />
        ))}
    </div>
);

export default CohortTiles;
