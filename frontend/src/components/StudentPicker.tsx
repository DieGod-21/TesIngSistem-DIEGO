/**
 * StudentPicker.tsx
 *
 * Selector de estudiante por nombre, carné o correo.
 *
 * Existe porque el contrato de varias altas exige un `estudianteId` numérico
 * que nadie conoce de memoria: quien coordina piensa en «Ana Coc», no en el
 * identificador 17. Este componente traduce esa manera de pensar al dato que el
 * servidor pide, sin obligar a salir de la pantalla a buscarlo.
 *
 * Lee del padrón COMPARTIDO (`getEstudiantesRegistry`): si el listado ya lo
 * descargó, abrir el selector no cuesta una petición. La descarga es perezosa,
 * solo al desplegar por primera vez.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { getEstudiantesRegistry } from '../services/estudiantesService';
import { isCancel } from '../services/apiClient';
import { matchesText } from '../utils/text';
import { Avatar, Picker } from './ui';
import type { Estudiante } from '../types/api';

export interface StudentPickerProps {
    id: string;
    value: Estudiante | null;
    onChange: (estudiante: Estudiante | null) => void;
    disabled?: boolean;
    error?: string | null;
    placeholder?: string;
    /** Carnés que no deben ofrecerse (p. ej. quienes ya tienen proyecto). */
    excludeCarnets?: ReadonlySet<string>;
    hint?: string;
}

const StudentPicker: React.FC<StudentPickerProps> = ({
    id,
    value,
    onChange,
    disabled = false,
    error,
    placeholder = 'Escribe un nombre, carné o correo…',
    excludeCarnets,
    hint,
}) => {
    const [padron, setPadron] = useState<Estudiante[]>([]);
    const [cargando, setCargando] = useState(false);
    const [fallo, setFallo] = useState<string | null>(null);

    const cargar = useCallback(() => {
        setCargando(true);
        setFallo(null);
        getEstudiantesRegistry()
            .then((res) => setPadron(res.estudiantes))
            .catch((err) => {
                if (isCancel(err)) return;
                setFallo('No se pudo cargar el padrón. Cierra y vuelve a abrir el selector.');
            })
            .finally(() => setCargando(false));
    }, []);

    const items = useMemo(
        () => (excludeCarnets?.size ? padron.filter((e) => !excludeCarnets.has(e.carnet)) : padron),
        [padron, excludeCarnets],
    );

    return (
        <Picker<Estudiante>
            id={id}
            items={items}
            value={value}
            onChange={onChange}
            getKey={(e) => e.id}
            getLabel={(e) => e.nombre}
            getMeta={(e) => e.carnet}
            getSearchText={(e) => `${e.nombre ?? ''} ${e.carnet ?? ''} ${e.email ?? ''}`}
            renderLeading={(e) => <Avatar name={e.nombre} size="sm" />}
            match={matchesText}
            loading={cargando}
            loadingText="Cargando el padrón…"
            failureText={fallo}
            emptyText="No hay estudiantes disponibles."
            disabled={disabled}
            error={error}
            hint={hint}
            placeholder={placeholder}
            listLabel="Estudiantes"
            onFirstOpen={cargar}
        />
    );
};

export default StudentPicker;
