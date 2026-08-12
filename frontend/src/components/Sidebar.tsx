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

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useHistory, useLocation } from 'react-router-dom';
import {
    Home,
    UserPlus,
    Users,
    FolderOpen,
    ClipboardList,
    BarChart3,
    UserCog,
    LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { Capabilities } from '../config/permissions';
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
    /** Capacidad requerida para ver la entrada. Si se omite, es visible para todos. */
    capability?: keyof Capabilities;
    /**
     * Resaltado por sección: mantiene el ítem activo también en rutas de detalle
     * (p. ej. /students/:id resalta "Estudiantes"). Si se define, gobierna el
     * estado activo por completo (ignora `exact`).
     */
    matchSection?: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Inicio',         to: '/dashboard',    icon: <Home size={20} />,           exact: true },
    { label: 'Nuevo Registro', to: '/students/new', icon: <UserPlus size={20} />,        exact: true },
    {
        label: 'Estudiantes', to: '/students', icon: <Users size={20} />,
        // Activo en /students y /students/:id, pero NO en /students/new (ítem propio).
        matchSection: (p) => p === '/students' || (p.startsWith('/students/') && p !== '/students/new'),
    },
    { label: 'Proyectos',       to: '/proyectos',    icon: <FolderOpen size={20} />,
        matchSection: (p) => p === '/proyectos' || p.startsWith('/proyectos/') },
    { label: 'Ternas',         to: '/ternas',       icon: <ClipboardList size={20} />,
        matchSection: (p) => p === '/ternas' || p.startsWith('/ternas/') },
    { label: 'Reportes',       to: '/reports',      icon: <BarChart3 size={20} />,       capability: 'canViewReports',
        matchSection: (p) => p === '/reports' || p.startsWith('/reports/') },
    { label: 'Usuarios',       to: '/usuarios',     icon: <UserCog size={20} />,         capability: 'canManageUsers',
        matchSection: (p) => p === '/usuarios' || p.startsWith('/usuarios/') },
];

// ─── Componente ──────────────────────────────────────────────────────

const Sidebar: React.FC<SidebarProps> = ({ open = false, onClose }) => {
    const { capabilities, logout } = useAuth();
    const history = useHistory();
    const location = useLocation();

    const items = NAV_ITEMS.filter((item) => !item.capability || capabilities[item.capability]);

    // ── Indicador activo que "viaja": mide el ítem activo y lo desplaza. ──
    const navRef = useRef<HTMLElement>(null);
    const [indicator, setIndicator] = useState<{ y: number; h: number; ready: boolean }>({ y: 0, h: 0, ready: false });
    const [travel, setTravel] = useState(false);

    const measure = useCallback(() => {
        const nav = navRef.current;
        if (!nav) return;
        const active = nav.querySelector<HTMLElement>('.dash-sidebar__nav-item--active');
        if (!active) { setIndicator((s) => ({ ...s, ready: false })); return; }
        setIndicator({ y: active.offsetTop, h: active.offsetHeight, ready: true });
    }, []);

    // Reposiciona al cambiar de ruta o el conjunto de ítems (capacidades).
    useLayoutEffect(() => { measure(); }, [location.pathname, items.length, measure]);

    // Habilita la transición de desplazamiento tras la primera colocación
    // (evita un "salto" desde el origen al montar).
    useEffect(() => {
        const id = requestAnimationFrame(() => setTravel(true));
        return () => cancelAnimationFrame(id);
    }, []);

    // Recalcula ante cambios de tamaño (padding responsive del menú).
    useEffect(() => {
        const onResize = () => measure();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [measure]);

    // El cajon solo es modal cuando `open` es true (movil): en escritorio la
    // barra es navegacion permanente y el hook no debe hacer nada.
    const drawerRef = useFocusTrap<HTMLElement>(Boolean(open), onClose);

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

            {/* En movil esta barra ES un cajon modal: entra sobre el contenido y
                lo tapa con un velo. Se comportaba como tal a medias —el velo
                cerraba al pulsar, pero Escape no hacia nada y el foco se quedaba
                fuera, en el boton de menu—, mientras los otros cuatro dialogos
                del producto cierran con Escape y atrapan el foco. El usuario
                aprende una regla en todo el sistema y aqui dejaba de valer.
                `useFocusTrap` es inerte cuando `open` es false, asi que la barra
                fija de escritorio no se ve afectada. */}
            <aside
                ref={drawerRef}
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
                <nav className="dash-sidebar__nav" aria-label="Navegación principal" ref={navRef}>
                    {items.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.to}
                            exact={item.exact}
                            isActive={
                                item.matchSection
                                    ? (_, loc) => item.matchSection!(loc.pathname)
                                    : undefined
                            }
                            className="dash-sidebar__nav-item"
                            activeClassName="dash-sidebar__nav-item--active"
                            onClick={onClose}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}

                    {/* Indicador activo que se desplaza entre destinos. */}
                    <span
                        className={`dash-sidebar__active-indicator${travel ? ' dash-sidebar__active-indicator--travel' : ''}`}
                        aria-hidden="true"
                        style={{
                            transform: `translateY(${indicator.y}px)`,
                            height: indicator.h,
                            opacity: indicator.ready ? 1 : 0,
                        }}
                    />
                </nav>

                <div className="dash-sidebar__footer">
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
