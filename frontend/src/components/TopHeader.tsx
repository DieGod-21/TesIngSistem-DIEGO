import React, { useEffect, useRef, useState } from 'react';
import { Search, Bell, Menu, Sun, Moon, CheckCheck, Calendar } from 'lucide-react';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import '../styles/notifications.css';

interface TopHeaderProps {
    onMenuToggle?: () => void;
}

function timeAgo(dateStr: string): string {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)    return 'hace un momento';
    if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return `hace ${Math.floor(diff / 86400)} d`;
}

const TopHeader: React.FC<TopHeaderProps> = ({ onMenuToggle }) => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const history  = useHistory();
    const location = useLocation();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    const [inputValue,  setInputValue]  = useState('');
    const [bellOpen,    setBellOpen]    = useState(false);
    const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef      = useRef<HTMLInputElement>(null);
    const bellRef       = useRef<HTMLDivElement>(null);

    // Pre-populate search from URL
    useEffect(() => {
        if (location.pathname === '/students') {
            const params = new URLSearchParams(location.search);
            const q = params.get('q') ?? '';
            setInputValue(q);
            if (q) setTimeout(() => inputRef.current?.focus(), 0);
        } else {
            setInputValue('');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    // Search debounce
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            const q = inputValue.trim();
            if (location.pathname === '/students') {
                const current = new URLSearchParams(window.location.search).get('q') ?? '';
                if (q === current) return;
                const params = new URLSearchParams(window.location.search);
                if (q) { params.set('q', q); } else { params.delete('q'); }
                history.replace(`/students?${params.toString()}`);
            } else if (q.length >= 2) {
                history.push(`/students?q=${encodeURIComponent(q)}`);
            }
        }, 500);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputValue]);

    // Close bell panel on outside click
    useEffect(() => {
        if (!bellOpen) return;
        const handler = (e: MouseEvent) => {
            if (bellRef.current && !bellRef.current.contains(e.target as Node))
                setBellOpen(false);
        };
        const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setBellOpen(false); };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', escHandler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('keydown', escHandler);
        };
    }, [bellOpen]);

    const handleMarkRead = async (id: string) => {
        await markAsRead(id);
    };

    const handleMarkAll = async () => {
        await markAllAsRead();
    };

    return (
        <header className="dash-header">
            {/* Hamburger (mobile) */}
            <button
                className="dash-header__menu-btn"
                onClick={onMenuToggle}
                aria-label="Abrir menú de navegación"
            >
                <Menu size={24} />
            </button>

            {/* Search */}
            <div className="dash-header__search-wrapper">
                <Search size={16} className="dash-header__search-icon" aria-hidden="true" />
                <input
                    ref={inputRef}
                    type="text"
                    className="dash-header__search"
                    placeholder="Buscar por Carné o Nombre de Estudiante…"
                    aria-label="Buscar estudiante por nombre o carné"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />
            </div>

            {/* Right actions */}
            <div className="dash-header__actions">
                {/* Theme toggle */}
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

                {/* Notification bell */}
                <div className="notif-wrapper" ref={bellRef}>
                    <button
                        className={`notif-bell ${bellOpen ? 'notif-bell--active' : ''}`}
                        onClick={() => setBellOpen((o) => !o)}
                        aria-label={`Notificaciones${unreadCount > 0 ? ` — ${unreadCount} sin leer` : ''}`}
                        aria-expanded={bellOpen}
                        aria-haspopup="true"
                        type="button"
                    >
                        <Bell size={20} aria-hidden="true" />
                        {unreadCount > 0 && (
                            <span className="notif-badge" aria-hidden="true">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {bellOpen && (
                        <div className="notif-panel" role="dialog" aria-label="Notificaciones">
                            <div className="notif-panel__header">
                                <h3 className="notif-panel__title">Notificaciones</h3>
                                {unreadCount > 0 && (
                                    <button
                                        className="notif-panel__mark-all"
                                        onClick={handleMarkAll}
                                        title="Marcar todas como leídas"
                                    >
                                        <CheckCheck size={14} />
                                        Leer todo
                                    </button>
                                )}
                            </div>

                            <div className="notif-panel__body">
                                {notifications.length === 0 ? (
                                    <div className="notif-empty">
                                        <Bell size={28} className="notif-empty__icon" />
                                        <p className="notif-empty__text">Sin notificaciones</p>
                                        <p className="notif-empty__hint">
                                            Los recordatorios de eventos aparecerán aquí
                                        </p>
                                    </div>
                                ) : (
                                    <ul className="notif-list">
                                        {notifications.map((n) => (
                                            <li
                                                key={n.id}
                                                className={`notif-item ${n.leida ? 'notif-item--read' : 'notif-item--unread'}`}
                                            >
                                                <div className="notif-item__icon-wrap">
                                                    <Calendar size={14} className="notif-item__icon" />
                                                </div>
                                                <div className="notif-item__content">
                                                    <p className="notif-item__title">{n.titulo}</p>
                                                    <p className="notif-item__msg">{n.mensaje}</p>
                                                    <p className="notif-item__time">{timeAgo(n.created_at)}</p>
                                                </div>
                                                {!n.leida && (
                                                    <button
                                                        className="notif-item__read-btn"
                                                        onClick={() => handleMarkRead(n.id)}
                                                        title="Marcar como leída"
                                                        aria-label="Marcar como leída"
                                                    >
                                                        <span className="notif-item__dot" />
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile */}
                <div className="dash-header__profile">
                    <div className="dash-header__profile-info">
                        <p className="dash-header__profile-name">{user?.name ?? 'Coordinador'}</p>
                        <p className="dash-header__profile-role">Coordinación de PG</p>
                    </div>
                    <div className="dash-header__avatar" aria-hidden="true">
                        {(user?.name ?? 'CO')
                            .split(' ')
                            .map((w) => w[0])
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
