import React, { useEffect, useRef, useState } from 'react';
import { Search, Menu, Sun, Moon } from 'lucide-react';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface TopHeaderProps {
    onMenuToggle?: () => void;
}

/**
 * Buscador global:
 *  - En /students: sincroniza el input con el query param `search`
 *    usando history.replace para mantener una URL compartible.
 *  - En otras rutas: al presionar Enter o tras debounce (≥ 2 chars)
 *    navega a /students?search=<query>.
 */
const TopHeader: React.FC<TopHeaderProps> = ({ onMenuToggle }) => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const history  = useHistory();
    const location = useLocation();

    const [inputValue, setInputValue] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef    = useRef<HTMLInputElement>(null);

    // Sincroniza el input cuando cambia la URL manualmente (p.ej. botón atrás,
    // clic en KPI o navegación directa).
    useEffect(() => {
        if (location.pathname === '/students') {
            const params = new URLSearchParams(location.search);
            const q = params.get('search') ?? params.get('q') ?? '';
            setInputValue(q);
        } else {
            setInputValue('');
        }
    }, [location.pathname, location.search]);

    // Debounce de búsqueda: empuja el término a la URL.
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            const q = inputValue.trim();
            if (location.pathname === '/students') {
                const current = new URLSearchParams(window.location.search).get('search') ?? '';
                if (q === current) return;
                const params = new URLSearchParams(window.location.search);
                if (q) params.set('search', q); else params.delete('search');
                // limpiamos el alias legacy ?q=
                params.delete('q');
                history.replace(`/students${params.toString() ? `?${params}` : ''}`);
            } else if (q.length >= 2) {
                history.push(`/students?search=${encodeURIComponent(q)}`);
            }
        }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = inputValue.trim();
        if (!q) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        history.push(`/students?search=${encodeURIComponent(q)}`);
    };

    return (
        <header className="dash-header">
            <button
                className="dash-header__menu-btn"
                onClick={onMenuToggle}
                aria-label="Abrir menú de navegación"
            >
                <Menu size={24} />
            </button>

            <form
                className="dash-header__search-wrapper"
                onSubmit={handleSubmit}
                role="search"
            >
                <Search size={16} className="dash-header__search-icon" aria-hidden="true" />
                <input
                    ref={inputRef}
                    type="search"
                    className="dash-header__search"
                    placeholder="Buscar por nombre o carné…"
                    aria-label="Buscar estudiante por nombre o carné"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />
            </form>

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
                            {user?.role === 'admin' ? 'Administrador' : 'Evaluador'}
                        </p>
                    </div>
                    <div className="dash-header__avatar" aria-hidden="true">
                        {(user?.nombre ?? 'CO')
                            .split(' ')
                            .map((w: string) => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default TopHeader;
