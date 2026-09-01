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
    /**
     * Rótulo alternativo para el workspace del evaluador.
     *
     * La misma ruta no significa lo mismo según quién entre: el coordinador ve
     * «Ternas» (todas, las administra) y el evaluador ve «Mis ternas» (las
     * suyas, las evalúa). Cambiar la palabra es barato y evita que el evaluador
     * crea que está mirando el sistema entero.
     */
    labelEvaluador?: string;
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
    { label: 'Nuevo Registro', to: '/students/new', icon: <UserPlus size={20} />,        exact: true,
        capability: 'canCoordinate' },
    {
        label: 'Estudiantes', to: '/students', icon: <Users size={20} />,
        capability: 'canCoordinate',
        // Activo en /students y /students/:id, pero NO en /students/new (ítem propio).
        matchSection: (p) => p === '/students' || (p.startsWith('/students/') && p !== '/students/new'),
    },
    { label: 'Proyectos', labelEvaluador: 'Mis proyectos', to: '/proyectos', icon: <FolderOpen size={20} />,
        matchSection: (p) => p === '/proyectos' || p.startsWith('/proyectos/') },
    { label: 'Ternas', labelEvaluador: 'Mis ternas', to: '/ternas', icon: <ClipboardList size={20} />,
        matchSection: (p) => p === '/ternas' || p.startsWith('/ternas/') },
    { label: 'Reportes',       to: '/reports',      icon: <BarChart3 size={20} />,       capability: 'canViewReports',
        matchSection: (p) => p === '/reports' || p.startsWith('/reports/') },
    { label: 'Usuarios',       to: '/usuarios',     icon: <UserCog size={20} />,         capability: 'canManageUsers',
        matchSection: (p) => p === '/usuarios' || p.startsWith('/usuarios/') },
];

// ─── Componente ──────────────────────────────────────────────────────

const Sidebar: React.FC<SidebarProps> = ({ open = false, onClose }) => {
    const { capabilities, workspace, logout } = useAuth();
    const history = useHistory();
    const location = useLocation();

    const items = NAV_ITEMS
        .filter((item) => !item.capability || capabilities[item.capability])
        .map((item) => (
            workspace === 'evaluator' && item.labelEvaluador
                ? { ...item, label: item.labelEvaluador }
                : item
        ));

    /* ── Indicador activo que "viaja" ──────────────────────────────────
     *
     * MIDE el ítem activo para colocarse encima. Y medir es justo lo que no se
     * podía hacer al montar.
     *
     * MEDIDO (carga en frío, login→Inicio, recarga y URL directa): el ítem
     * activo devolvía `offsetHeight = 0` y `offsetTop = 0`, así que el
     * indicador se dibujaba con `opacity: 1` —porque la medición se dio por
     * buena— en forma de raya de altura cero, 16px por encima del ítem que
     * decía señalar. No era «invisible»: era una pieza rota a la vista, y se
     * quedaba así hasta que algo forzara otra medición. Navegar a otro módulo
     * y volver la arreglaba, que es por qué el defecto parecía intermitente.
     *
     * Dos cosas lo causaban y las dos hay que resolver:
     *
     *   1. NADIE VOLVÍA A MEDIR. El único disparador tras el montaje era el
     *      cambio de ruta o `window.resize`. Cuando el menú recibe su caja
     *      —hojas de estilo aplicadas, tipografía cargada, primer layout de
     *      Ionic ya resuelto— no ocurre ninguna de las dos cosas.
     *
     *   2. UNA MEDICIÓN DE CERO SE ACEPTABA COMO VÁLIDA. Un elemento sin caja
     *      todavía no tiene nada que decir; tratarlo como respuesta es lo que
     *      convierte «aún no sé» en «mide cero».
     *
     * `ResizeObserver` resuelve (1) de raíz porque observa exactamente el
     * suceso que importa —que el menú pase a tener tamaño— en vez de adivinar
     * cuándo habrá ocurrido con un temporizador. Además dispara una primera
     * vez al empezar a observar, así que también cubre el caso en que la caja
     * ya estuviera lista. El guardia de altura resuelve (2).
     */
    const navRef = useRef<HTMLElement>(null);
    const [indicator, setIndicator] = useState<{ y: number; h: number; ready: boolean }>({ y: 0, h: 0, ready: false });
    const [travel, setTravel] = useState(false);
    /** ¿Ya hubo una colocación válida? Gobierna cuándo empieza a animarse. */
    const colocado = useRef(false);

    const measure = useCallback(() => {
        const nav = navRef.current;
        if (!nav) return;
        const active = nav.querySelector<HTMLElement>('.dash-sidebar__nav-item--active');
        const h = active?.offsetHeight ?? 0;

        // Sin ítem activo, o con el ítem aún sin caja (estilos por aplicar, o
        // el cajón móvil cerrado): no se señala nada. Ocultar es la respuesta
        // correcta a «todavía no sé dónde», y evita la raya rota.
        if (!active || h === 0) {
            setIndicator((s) => (s.ready ? { ...s, ready: false } : s));
            return;
        }

        const y = active.offsetTop;
        // Igualdad antes de escribir: `ResizeObserver` puede disparar en cada
        // cuadro durante un arrastre del borde de la ventana, y repintar con
        // los mismos números no ayuda a nadie.
        setIndicator((s) => (s.ready && s.y === y && s.h === h ? s : { y, h, ready: true }));
    }, []);

    // Reposiciona al cambiar de ruta o el conjunto de ítems (capacidades).
    useLayoutEffect(() => { measure(); }, [location.pathname, items.length, measure]);

    // Observa el menú: primera medición al observar y una más cada vez que su
    // caja cambie (estilos, tipografía, padding responsive, cajón móvil).
    useLayoutEffect(() => {
        const nav = navRef.current;
        if (!nav) return;

        // jsdom y navegadores antiguos no traen `ResizeObserver`; ahí se
        // conserva el disparador anterior en vez de quedarse sin ninguno.
        if (typeof ResizeObserver === 'undefined') {
            const onResize = () => measure();
            window.addEventListener('resize', onResize);
            return () => window.removeEventListener('resize', onResize);
        }

        const ro = new ResizeObserver(() => measure());
        ro.observe(nav);
        return () => ro.disconnect();
    }, [measure]);

    // La transición de desplazamiento se habilita tras la PRIMERA colocación
    // válida, no tras el primer cuadro: si se habilita antes, el indicador
    // anima desde la posición de origen hasta el ítem activo la primera vez
    // que aparece, que es justo el salto que se quería evitar.
    useEffect(() => {
        if (!indicator.ready || colocado.current) return;
        colocado.current = true;
        const id = requestAnimationFrame(() => setTravel(true));
        return () => cancelAnimationFrame(id);
    }, [indicator.ready]);

    // El cajon solo es modal cuando `open` es true (movil): en escritorio la
    // barra es navegacion permanente y el hook no debe hacer nada.
    const drawerRef = useFocusTrap<HTMLElement>(Boolean(open), onClose);

    /*
     * Cerrar sesión es una llamada de RED, y hasta que responde no se navega.
     * Sin marcar que está en curso, el botón seguía admitiendo clics: dos
     * pulsaciones impacientes lanzaban dos cierres contra el servidor.
     *
     * `logout()` propaga si el servidor falla (usa try/finally sin catch), y
     * entonces no había navegación ni aviso: el usuario se quedaba mirando una
     * barra que no reaccionaba. Al fallar se devuelve el botón a su sitio para
     * que se pueda reintentar.
     */
    const [cerrandoSesion, setCerrandoSesion] = useState(false);

    const handleLogout = async () => {
        if (cerrandoSesion) return;
        setCerrandoSesion(true);
        try {
            await logout();
            history.push('/login');
        } catch {
            // Se recupera el control; el error ya lo reporta AuthContext.
            setCerrandoSesion(false);
        }
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
                        disabled={cerrandoSesion}
                        aria-busy={cerrandoSesion || undefined}
                    >
                        <LogOut size={20} aria-hidden="true" />
                        <span>{cerrandoSesion ? 'Cerrando sesión…' : 'Cerrar Sesión'}</span>
                    </button>
                </div>

            </aside>
        </>
    );
};

export default Sidebar;
