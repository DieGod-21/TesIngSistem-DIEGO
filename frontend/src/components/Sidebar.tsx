/**
 * Sidebar.tsx
 *
 * Barra lateral de navegación institucional UMG.
 *
 * ❌ NO usar <a href> — causa recarga completa y destruye el estado React.
 * ✅ Usar NavLink de react-router-dom — navegación client-side, sin reload.
 *
 * NavLink detecta la ruta activa automáticamente con `isActive` (v5 API).
 */

import React from 'react';
import { NavLink, useHistory } from 'react-router-dom';
import {
    Home,
    UserPlus,
    Users,
    Briefcase,
    CalendarDays,
    GraduationCap,
    Settings,
    LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import umgLogo from '../assets/umg_logo.png';

// ─── Tipos ───────────────────────────────────────────────────────────

interface SidebarProps {
    open?: boolean;
    onClose?: () => void;
}

interface NavItem {
    label: string;
    to: string;
    icon: React.ReactNode;
    exact?: boolean;
    disabled?: boolean;
    adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Inicio',               to: '/dashboard',        icon: <Home size={20} />,           exact: true },
    { label: 'Nuevo Registro',       to: '/students/new',     icon: <UserPlus size={20} />,        exact: true },
    { label: 'Estudiantes',          to: '/students',         icon: <Users size={20} />,           exact: true },
    { label: 'Proyectos',            to: '/projects',         icon: <Briefcase size={20} />,       disabled: true },
    { label: 'Calendario Académico', to: '/calendar',         icon: <CalendarDays size={20} />,    exact: true },
    { label: 'Fases Académicas',     to: '/academic-phases',  icon: <GraduationCap size={20} />,   exact: true, adminOnly: true },
];

// ─── Componente ──────────────────────────────────────────────────────

const Sidebar: React.FC<SidebarProps> = ({ open = false, onClose }) => {
    const { user, logout } = useAuth();
    const history = useHistory();
    const isAdmin = user?.role === 'admin';

    const handleLogout = async () => {
        await logout();
        history.push('/login');
    };

    return (
        <>
            {/* Overlay móvil */}
            {open && (
                <div
                    className="dash-sidebar-overlay"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            <aside
                className={`dash-sidebar${open ? ' dash-sidebar--open' : ''}`}
                aria-label="Menú de navegación"
            >
                {/* Marca / Logo institucional */}
                <div className="dash-sidebar__brand">
                    <div className="dash-sidebar__logo-box">
                        <img src={umgLogo} alt="Logo Universidad Mariano Gálvez" className="dash-sidebar__logo" />
                    </div>
                    <div>
                        <p className="dash-sidebar__brand-name">UMG</p>
                        <p className="dash-sidebar__brand-sub">Coordinación de Proyectos</p>
                    </div>
                </div>

                {/* Navegación principal */}
                <nav className="dash-sidebar__nav" aria-label="Navegación principal">
                    {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) =>
                        item.disabled ? (
                            <span
                                key={item.label}
                                className="dash-sidebar__nav-item dash-sidebar__nav-item--disabled"
                                aria-disabled="true"
                                title="Módulo próximamente disponible"
                            >
                                {item.icon}
                                <span>{item.label}</span>
                                <span className="dash-sidebar__coming-soon">Pronto</span>
                            </span>
                        ) : (
                            <NavLink
                                key={item.label}
                                to={item.to}
                                exact={item.exact}
                                className="dash-sidebar__nav-item"
                                activeClassName="dash-sidebar__nav-item--active"
                                onClick={onClose}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </NavLink>
                        )
                    )}
                </nav>

                {/* Acciones inferiores */}
                <div className="dash-sidebar__footer">
                    <span
                        className="dash-sidebar__nav-item dash-sidebar__nav-item--disabled"
                        aria-disabled="true"
                        title="Módulo próximamente disponible"
                    >
                        <Settings size={20} />
                        <span>Configuración</span>
                        <span className="dash-sidebar__coming-soon">Pronto</span>
                    </span>

                    <button
                        className="dash-sidebar__nav-item dash-sidebar__logout"
                        onClick={handleLogout}
                        type="button"
                    >
                        <LogOut size={20} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>

            </aside>
        </>
    );
};

export default Sidebar;
