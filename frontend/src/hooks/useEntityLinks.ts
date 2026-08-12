/**
 * useEntityLinks.ts — Puentes entre las tres entidades del sistema.
 *
 * El dominio es una cadena: un estudiante tiene un proyecto y sobre ese
 * proyecto se forma una terna. Las tres pantallas de detalle enseñaban su
 * eslabón y dejaban al usuario buscar los otros dos a mano, volviendo al
 * listado correspondiente y filtrando por nombre.
 *
 * El contrato no publica los identificadores cruzados —una terna no trae
 * `proyecto_id`, un proyecto no trae `terna_id`—, pero las tres colecciones sí
 * llevan el CARNÉ, que es la clave con la que el resto del sistema referencia a
 * una persona. Cruzar por carné responde la pregunta real sin inventar campos.
 *
 * Las tres colecciones están cacheadas y son las mismas que ya consumen el
 * padrón, el listado de proyectos y el de ternas: resolver un enlace no cuesta
 * una petición si el usuario llegó navegando, que es el caso normal.
 *
 * Se pide EXPLÍCITAMENTE lo que hace falta (`necesita`). El detalle de proyecto
 * ya conoce a su estudiante y solo le falta la terna; pedir las tres siempre
 * habría descargado colecciones para no mirarlas.
 */

import { useEffect, useMemo, useState } from 'react';
import { getEstudiantesRegistry } from '../services/estudiantesService';
import { listProyectosCached } from '../services/proyectosService';
import { listTernasCached } from '../services/ternasService';
import { isCancel } from '../services/apiClient';
import type { Estudiante, Proyecto, TernaResumen } from '../types/api';

export type Vinculo = 'estudiante' | 'proyecto' | 'terna';

export interface EntityLinks {
    /** Ruta al expediente, o `null` si no se pidió o no se encontró. */
    estudianteHref: string | null;
    estudianteNombre: string | null;
    proyectoHref: string | null;
    proyectoTitulo: string | null;
    ternaHref: string | null;
    ternaNumero: number | null;
    /** Alguna de las colecciones pedidas sigue en vuelo. */
    loading: boolean;
}

const VACIO: EntityLinks = {
    estudianteHref: null, estudianteNombre: null,
    proyectoHref: null, proyectoTitulo: null,
    ternaHref: null, ternaNumero: null,
    loading: false,
};

export function useEntityLinks(
    carnet: string | null | undefined,
    necesita: readonly Vinculo[],
): EntityLinks {
    const [estudiantes, setEstudiantes] = useState<Estudiante[] | null>(null);
    const [proyectos, setProyectos]     = useState<Proyecto[] | null>(null);
    const [ternas, setTernas]           = useState<TernaResumen[] | null>(null);

    // `necesita` suele llegar como literal en línea: se estabiliza por contenido
    // para no relanzar el efecto en cada render.
    const clave = necesita.join(',');

    useEffect(() => {
        if (!carnet) return;
        let vivo = true;
        const quiere = clave.split(',') as Vinculo[];

        /*
         * Un fallo aquí NO es un error de la pantalla: significa que no se pudo
         * resolver un atajo. La vista principal ya cargó y sigue siendo útil;
         * lo único que ocurre es que el enlace no aparece.
         */
        if (quiere.includes('estudiante')) {
            getEstudiantesRegistry()
                .then((r) => { if (vivo) setEstudiantes(r.estudiantes); })
                .catch((e) => { if (vivo && !isCancel(e)) setEstudiantes([]); });
        }
        if (quiere.includes('proyecto')) {
            listProyectosCached()
                .then((r) => { if (vivo) setProyectos(r); })
                .catch((e) => { if (vivo && !isCancel(e)) setProyectos([]); });
        }
        if (quiere.includes('terna')) {
            listTernasCached()
                .then((r) => { if (vivo) setTernas(r); })
                .catch((e) => { if (vivo && !isCancel(e)) setTernas([]); });
        }

        return () => { vivo = false; };
    }, [carnet, clave]);

    return useMemo(() => {
        if (!carnet) return VACIO;
        const quiere = clave.split(',') as Vinculo[];

        const e = estudiantes?.find((x) => x.carnet === carnet) ?? null;
        const p = proyectos?.find((x) => x.carnet === carnet) ?? null;
        const t = ternas?.find((x) => x.carnet === carnet) ?? null;

        const pendiente =
            (quiere.includes('estudiante') && estudiantes === null) ||
            (quiere.includes('proyecto')   && proyectos === null) ||
            (quiere.includes('terna')      && ternas === null);

        return {
            estudianteHref:   e ? `/students/${e.id}` : null,
            estudianteNombre: e?.nombre ?? null,
            proyectoHref:     p ? `/proyectos/${p.id}` : null,
            proyectoTitulo:   p?.titulo ?? null,
            ternaHref:        t ? `/ternas/${t.id}` : null,
            ternaNumero:      t?.numero ?? null,
            loading: pendiente,
        };
    }, [carnet, clave, estudiantes, proyectos, ternas]);
}
