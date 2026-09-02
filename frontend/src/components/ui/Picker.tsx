/**
 * Picker.tsx — Combobox de selección única sobre una lista de entidades.
 *
 * Varias altas del producto piden un identificador numérico que nadie conoce de
 * memoria: el proyecto necesita a QUIÉN pertenece, la terna necesita SOBRE QUÉ
 * se evalúa. Un `<select>` no sirve para eso: no se busca, y un título de tesis
 * o un nombre completo no caben en una opción nativa.
 *
 * La primitiva es tonta: recibe los elementos ya cargados y funciones para
 * leerlos. Quien la envuelve decide de dónde salen (padrón, proyectos…) y qué
 * significa cada línea.
 *
 * Patrón combobox de la APG: el campo declara su estado (`aria-expanded`),
 * apunta a la opción activa (`aria-activedescendant`) y se maneja entero con
 * teclado — flechas, Inicio/Fin, Enter y Escape.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X, Check } from 'lucide-react';

const MAX_SUGERENCIAS = 8;

export interface PickerProps<T> {
    id: string;
    items: readonly T[];
    value: T | null;
    onChange: (item: T | null) => void;

    getKey: (item: T) => string | number;
    /** Línea principal de la opción. */
    getLabel: (item: T) => string;
    /** Línea secundaria (carné, estudiante…). Opcional. */
    getMeta?: (item: T) => string | undefined;
    /** Texto sobre el que se busca. Por defecto, etiqueta + meta. */
    getSearchText?: (item: T) => string;
    /** Elemento a la izquierda de cada opción (monograma, icono…). */
    renderLeading?: (item: T) => React.ReactNode;

    /** Predicado de coincidencia. Se inyecta para reutilizar el de la app. */
    match: (haystack: string, query: string) => boolean;

    loading?: boolean;
    loadingText?: string;
    /** Mensaje cuando la carga de la fuente falló. */
    failureText?: string | null;
    emptyText?: string;

    disabled?: boolean;
    error?: string | null;
    /** Nota bajo el campo cuando no hay error. */
    hint?: string;
    placeholder?: string;
    /** Etiqueta accesible del desplegable. */
    listLabel: string;
    /** Se dispara la primera vez que el desplegable se abre (carga perezosa). */
    onFirstOpen?: () => void;
}

function Picker<T>({
    id,
    items,
    value,
    onChange,
    getKey,
    getLabel,
    getMeta,
    getSearchText,
    renderLeading,
    match,
    loading = false,
    loadingText = 'Cargando…',
    failureText = null,
    emptyText = 'No hay opciones disponibles.',
    disabled = false,
    error,
    hint,
    placeholder = 'Escribe para buscar…',
    listLabel,
    onFirstOpen,
}: PickerProps<T>) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);

    const listboxId = `${id}-listbox`;
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abierto = useRef(false);
    const reactId = useId();

    useEffect(() => {
        if (!open || abierto.current) return;
        abierto.current = true;
        onFirstOpen?.();
    }, [open, onFirstOpen]);

    // Cerrar al pulsar fuera. Moverse dentro del componente no cierra nada.
    useEffect(() => {
        if (!open) return;
        const fuera = (ev: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(ev.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', fuera);
        return () => document.removeEventListener('mousedown', fuera);
    }, [open]);

    const sugerencias = useMemo(() => {
        const q = query.trim();
        // Sin consulta se muestran los primeros: un desplegable vacío no enseña
        // que haya algo que elegir.
        if (!q) return items.slice(0, MAX_SUGERENCIAS);
        const texto = getSearchText ?? ((it: T) => `${getLabel(it)} ${getMeta?.(it) ?? ''}`);
        return items.filter((it) => match(texto(it), q)).slice(0, MAX_SUGERENCIAS);
    }, [items, query, match, getLabel, getMeta, getSearchText]);

    useEffect(() => { setActive(0); }, [query]);

    const elegir = (it: T) => {
        onChange(it);
        setQuery('');
        setOpen(false);
        inputRef.current?.focus();
    };

    const onKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
            ev.preventDefault();
            if (!open) { setOpen(true); return; }
            if (sugerencias.length === 0) return;
            const paso = ev.key === 'ArrowDown' ? 1 : -1;
            setActive((i) => (i + paso + sugerencias.length) % sugerencias.length);
            return;
        }
        if (ev.key === 'Home' && open) { ev.preventDefault(); setActive(0); return; }
        if (ev.key === 'End'  && open) { ev.preventDefault(); setActive(sugerencias.length - 1); return; }
        if (ev.key === 'Enter') {
            if (open && sugerencias[active]) { ev.preventDefault(); elegir(sugerencias[active]); }
            return;
        }
        if (ev.key === 'Escape' && open) {
            // Cierra el desplegable y NADA más: no debe cerrar el diálogo que
            // lo contiene, que es lo que haría si dejáramos propagar la tecla.
            ev.preventDefault();
            ev.stopPropagation();
            setOpen(false);
        }
    };

    // ── Ya hay elección: el campo cede su sitio a la ficha de lo elegido ──
    if (value) {
        return (
            <div className="ui-picker" ref={rootRef}>
                <div className="ui-picker__chosen">
                    {renderLeading?.(value)}
                    <span className="ui-picker__chosen-text">
                        <strong className="ui-picker__chosen-name">{getLabel(value)}</strong>
                        {getMeta?.(value) && (
                            <span className="ui-picker__chosen-meta">{getMeta(value)}</span>
                        )}
                    </span>
                    <button
                        type="button"
                        className="ui-icon-btn"
                        onClick={() => { onChange(null); setQuery(''); setOpen(false); inputRef.current?.focus(); }}
                        disabled={disabled}
                        aria-label={`Quitar «${getLabel(value)}» de la selección`}
                    >
                        <X size={16} aria-hidden="true" />
                    </button>
                </div>
                <p
                    id={`${id}-error`}
                    className={`ui-picker__msg${error ? ' ui-picker__msg--error' : ''}`}
                    aria-live="polite"
                >
                    {error ?? ''}
                </p>
            </div>
        );
    }

    return (
        <div className="ui-picker" ref={rootRef}>
            <div className={`ui-picker__box${error ? ' ui-picker__box--error' : ''}`}>
                <Search size={16} className="ui-picker__icon" aria-hidden="true" />
                <input
                    id={id}
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    className="ui-picker__input"
                    autoComplete="off"
                    value={query}
                    disabled={disabled}
                    placeholder={placeholder}
                    aria-expanded={open}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-describedby={`${id}-error`}
                    aria-activedescendant={open && sugerencias[active] ? `${reactId}-op-${active}` : undefined}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                />
            </div>

            {open && (
                <ul className="ui-picker__list" id={listboxId} role="listbox" aria-label={listLabel}>
                    {loading && <li className="ui-picker__note" role="presentation">{loadingText}</li>}

                    {!loading && failureText && (
                        <li className="ui-picker__note" role="presentation">{failureText}</li>
                    )}

                    {!loading && !failureText && sugerencias.length === 0 && (
                        <li className="ui-picker__note" role="presentation">
                            {query.trim() ? `Nada coincide con «${query.trim()}».` : emptyText}
                        </li>
                    )}

                    {!loading && sugerencias.map((it, i) => (
                        <li
                            key={getKey(it)}
                            id={`${reactId}-op-${i}`}
                            role="option"
                            aria-selected={i === active}
                            className={`ui-picker__option${i === active ? ' is-active' : ''}`}
                            onMouseDown={(ev) => { ev.preventDefault(); elegir(it); }}
                            onMouseEnter={() => setActive(i)}
                        >
                            {renderLeading?.(it)}
                            <span className="ui-picker__option-text">
                                <span className="ui-picker__option-name">{getLabel(it)}</span>
                                {getMeta?.(it) && (
                                    <span className="ui-picker__option-meta">{getMeta(it)}</span>
                                )}
                            </span>
                            {i === active && <Check size={15} className="ui-picker__tick" aria-hidden="true" />}
                        </li>
                    ))}
                </ul>
            )}

            {/* Un mismo hueco para la nota y para el error, pero NO el mismo
                color: la nota explica y el error corrige. Pintadas igual, el
                dialogo de «Nuevo Proyecto» se abria con una linea roja bajo el
                primer campo sin que nadie hubiera hecho nada todavia. */}
            <p
                id={`${id}-error`}
                className={`ui-picker__msg${error ? ' ui-picker__msg--error' : ''}`}
                aria-live="polite"
            >
                {error ?? hint ?? ''}
            </p>
        </div>
    );
}

export default Picker;
