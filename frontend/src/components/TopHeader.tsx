import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Menu, Sun, Moon, CornerDownLeft } from 'lucide-react';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleLabel } from '../config/permissions';
import { formatCarrera } from '../utils/strings';
import { useTheme } from '../context/ThemeContext';
import { useStudentSearch } from '../hooks/useStudentSearch';
import { useGlobalHotkey } from '../hooks/useGlobalHotkey';
import { highlightRanges } from '../utils/text';
import { Avatar } from './ui';
import { routes } from '../config/routes';

interface TopHeaderProps {
    onMenuToggle?: () => void;
}

/**
 * Buscador único del sistema.
 *
 * No navega automáticamente: mientras se escribe (≥ 2 caracteres) muestra un
 * panel de sugerencias bajo el input, sin romper el contexto de la pantalla
 * actual. La navegación solo ocurre al:
 *   - seleccionar un estudiante (→ detalle), o
 *   - presionar Enter (→ listado filtrado por el término).
 */
/**
 * Resalta en el texto lo que el usuario escribió.
 *
 * Sin esto la lista obliga a releer cada nombre entero para descubrir POR QUÉ
 * está ahí: con la búsqueda tolerante a acentos y por tokens, la coincidencia
 * puede estar en cualquier parte de la cadena.
 */
const Resaltado: React.FC<{ texto: string; query: string }> = ({ texto, query }) => {
    const tramos = highlightRanges(texto, query);
    if (tramos.length === 0) return <>{texto}</>;
    const out: React.ReactNode[] = [];
    let cur = 0;
    tramos.forEach(([ini, fin], k) => {
        if (ini > cur) out.push(texto.slice(cur, ini));
        out.push(<mark key={k} className="dash-search-sug__hit">{texto.slice(ini, fin)}</mark>);
        cur = fin;
    });
    if (cur < texto.length) out.push(texto.slice(cur));
    return <>{out}</>;
};

const TopHeader: React.FC<TopHeaderProps> = ({ onMenuToggle }) => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const history  = useHistory();
    const location = useLocation();

    const [inputValue, setInputValue] = useState('');
    const [focused, setFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);

    const { suggestions, loading, minChars } = useStudentSearch(inputValue, focused);

    /*
     * Única fuente de verdad para la sincronización: la URL. Un solo efecto
     * refleja ?search= en el input al entrar/estar en /students (URL
     * compartible). El texto que el usuario escribe vive en `inputValue` y NO
     * navega automáticamente; la navegación es siempre explícita (Enter o
     * selección). El resto de estado (activeIndex, focused) se deriva de
     * eventos, no de efectos, para evitar acoplamiento entre useEffect.
     */
    useEffect(() => {
        if (location.pathname === '/students') {
            const params = new URLSearchParams(location.search);
            setInputValue(params.get('search') ?? params.get('q') ?? '');
        } else {
            setInputValue('');
        }
    }, [location.pathname, location.search]);

    const query = inputValue.trim();
    const panelOpen = focused && query.length >= minChars;

    /*
     * Buscar un estudiante es la operación atómica de la jornada. Sin atajo,
     * cada una obligaba a soltar el teclado y alcanzar el ratón.
     *   "/"      → convención de GitHub y Stripe (una sola tecla).
     *   ⌘K/Ctrl+K → convención de Linear, Notion y Vercel.
     * Se aceptan las dos: son gratis y cada usuario llega con una en los dedos.
     */
    useGlobalHotkey([{ key: '/' }, { key: 'k', mod: true }], () => {
        inputRef.current?.focus();
        inputRef.current?.select();
    });

    const onInputChange = (value: string) => {
        setInputValue(value);
        setActiveIndex(-1); // reset del resaltado al teclear (sin efecto aparte)
    };

    const goToList = (q: string) => {
        inputRef.current?.blur();
        history.push(`/students?search=${encodeURIComponent(q)}`);
    };

    const goToStudent = (id: number) => {
        setInputValue('');
        inputRef.current?.blur();
        history.push(routes.studentDetail(id));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            if (!panelOpen || suggestions.length === 0) return;
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            if (!panelOpen || suggestions.length === 0) return;
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && suggestions[activeIndex]) {
                goToStudent(suggestions[activeIndex].id);
            } else if (query.length >= minChars) {
                goToList(query);
            }
        } else if (e.key === 'Escape') {
            if (panelOpen) {
                e.preventDefault();
                inputRef.current?.blur();
            }
        }
    };

    const listboxId = 'th-search-listbox';

    /*
     * Anuncio conciso para lectores de pantalla. Un solo mensaje de estado
     * (aria-live="polite") evita que se relea toda la lista en cada tecla:
     * comunica cuántas coincidencias hay y cómo navegarlas.
     */
    const searchStatus = !panelOpen
        ? ''
        : loading
            ? 'Buscando estudiantes…'
            : suggestions.length === 0
                ? `Sin coincidencias para ${query}`
                : `${suggestions.length} estudiante${suggestions.length !== 1 ? 's' : ''} encontrado${suggestions.length !== 1 ? 's' : ''}. Usa las flechas para navegar y Enter para abrir.`;

    const panelBody = useMemo(() => {
        if (loading) {
            return <div className="dash-search-panel__state">Buscando estudiantes…</div>;
        }
        if (suggestions.length === 0) {
            return (
                <div className="dash-search-panel__state">
                    Sin coincidencias para <strong>“{query}”</strong>
                </div>
            );
        }
        return (
            <ul className="dash-search-panel__list" role="listbox" id={listboxId} aria-label="Sugerencias de estudiantes">
                {suggestions.map((s, i) => (
                    <li key={s.id} role="option" id={`th-sug-${i}`} aria-selected={i === activeIndex}>
                        <button
                            type="button"
                            className={`dash-search-sug${i === activeIndex ? ' dash-search-sug--active' : ''}`}
                            // Evita que el blur del input dispare antes del click.
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => setActiveIndex(i)}
                            onClick={() => goToStudent(s.id)}
                        >
                            <Avatar name={s.nombre} size="sm" />
                            <span className="dash-search-sug__text">
                                <span className="dash-search-sug__name"><Resaltado texto={s.nombre} query={query} /></span>
                                <span className="dash-search-sug__meta">
                                    <Resaltado texto={s.carnet} query={query} />
                                    {s.carrera ? ` · ${formatCarrera(s.carrera)}` : ''}
                                </span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, suggestions, activeIndex, query]);

    return (
        <header className="dash-header ui-glass">
            <button
                className="dash-header__menu-btn"
                onClick={onMenuToggle}
                aria-label="Abrir menú de navegación"
            >
                <Menu size={24} />
            </button>

            <div
                className="dash-header__search-wrapper"
                role="search"
            >
                <Search size={16} className="dash-header__search-icon" aria-hidden="true" />
                <input
                    ref={inputRef}
                    type="text"
                    className="dash-header__search"
                    placeholder="Buscar estudiantes..."
                    aria-label="Buscar estudiantes"
                    role="combobox"
                    aria-expanded={panelOpen}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-activedescendant={activeIndex >= 0 ? `th-sug-${activeIndex}` : undefined}
                    autoComplete="off"
                    value={inputValue}
                    onChange={(e) => onInputChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onKeyDown={handleKeyDown}
                />

                {/* Un atajo que nadie descubre no existe. La pista se muestra
                    solo con el campo vacío y sin foco: enseña y desaparece. */}
                {!focused && inputValue === '' && (
                    <kbd className="ui-kbd dash-header__search-kbd" aria-hidden="true">/</kbd>
                )}

                <span className="ui-sr-only" role="status" aria-live="polite">
                    {searchStatus}
                </span>

                {panelOpen && (
                    <div className="dash-header__search-panel" role="presentation">
                        {panelBody}
                        {suggestions.length > 0 && (
                            <div className="dash-search-panel__hint">
                                <CornerDownLeft size={13} aria-hidden="true" />
                                <span>Enter para ver todos los resultados</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="dash-header__actions">
                <button
                    className="dash-header__theme-toggle"
                    onClick={toggleTheme}
                    aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                    title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                    type="button"
                >
                    {theme === 'dark'
                        ? <Sun size={20} aria-hidden="true" />
                        : <Moon size={20} aria-hidden="true" />
                    }
                </button>

                <div className="dash-header__profile">
                    <div className="dash-header__profile-info">
                        <p className="dash-header__profile-name">{user?.nombre ?? 'Coordinador'}</p>
                        <p className="dash-header__profile-role">
                            {getRoleLabel(user?.role)}
                        </p>
                    </div>
                    <Avatar name={user?.nombre ?? 'Coordinador'} />
                </div>
            </div>
        </header>
    );
};

export default TopHeader;
