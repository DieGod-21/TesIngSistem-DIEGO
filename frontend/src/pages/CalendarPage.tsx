import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, LayoutGrid, AlignJustify, Trash2 } from 'lucide-react';
import AppShell from '../layout/AppShell';
import {
    getCalendarEvents,
    getCalendarDeadlines,
    createEvent,
    updateEvent,
    deleteEvent,
    deleteDeadline,
} from '../services/calendarService';
import type { CalendarEvent, CalendarDeadline, EventPayload } from '../services/calendarService';
import EventModal from '../components/EventModal';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import '../styles/calendar.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_FULL  = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const DAYS_SHORT = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateKey(dateStr: string): string {
    const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function localKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
    const first    = new Date(year, month, 1);
    const startDow = (first.getDay() + 6) % 7;
    const days     = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = Array(startDow).fill(null);
    for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

function getWeekDates(anchor: Date): Date[] {
    const day = (anchor.getDay() + 6) % 7; // Mon=0
    const mon = new Date(anchor);
    mon.setDate(anchor.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        return d;
    });
}

function chipColorClass(tipo: string, isDeadline: boolean): string {
    if (isDeadline) return 'cal-chip--orange';
    switch (tipo.toLowerCase()) {
        case 'examen':                       return 'cal-chip--red';
        case 'defensa': case 'revision':
        case 'reunion':                      return 'cal-chip--blue';
        case 'entrega':                      return 'cal-chip--orange';
        default:                             return 'cal-chip--gray';
    }
}

function cardColorClass(tipo: string, isDeadline: boolean): string {
    if (isDeadline) return 'cal-event-card--orange';
    switch (tipo.toLowerCase()) {
        case 'examen':                       return 'cal-event-card--red';
        case 'defensa': case 'revision':
        case 'reunion':                      return 'cal-event-card--blue';
        case 'entrega':                      return 'cal-event-card--orange';
        default:                             return 'cal-event-card--gray';
    }
}

function formatDisplayDate(key: string): string {
    const [y, m, d] = key.split('-').map(Number);
    return `${d} de ${MONTHS_ES[m - 1]} de ${y}`;
}

function eventsThisWeek(map: Map<string, DayItem[]>, anchor: Date): number {
    return getWeekDates(anchor).reduce((acc, d) => acc + (map.get(localKey(d))?.length ?? 0), 0);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayItem {
    id: string;
    title: string;
    tipo: string;
    isDeadline: boolean;
    raw?: CalendarEvent;
}

type ViewMode = 'month' | 'week';

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface TooltipState { x: number; y: number; item: DayItem; }

// ─── Component ───────────────────────────────────────────────────────────────

const CalendarPage: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const canWrite = user?.role === 'admin' || user?.role === 'asesor';
    const today    = new Date();
    const todayKey = localKey(today);

    const [events,      setEvents]      = useState<CalendarEvent[]>([]);
    const [deadlines,   setDeadlines]   = useState<CalendarDeadline[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [year,        setYear]        = useState(today.getFullYear());
    const [month,       setMonth]       = useState(today.getMonth());
    const [weekAnchor,  setWeekAnchor]  = useState(today);
    const [viewMode,    setViewMode]    = useState<ViewMode>('month');
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [tooltip,     setTooltip]     = useState<TooltipState | null>(null);
    const [modalEvent,  setModalEvent]  = useState<CalendarEvent | null | undefined>(undefined);
    const [modalDate,   setModalDate]   = useState<string | undefined>(undefined);
    const [confirmDeadlineId,  setConfirmDeadlineId]  = useState<string | null>(null);
    const [deletingDeadline,   setDeletingDeadline]   = useState(false);

    // modalEvent = undefined → closed, null → create, CalendarEvent → edit

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [evts, dls] = await Promise.all([getCalendarEvents(), getCalendarDeadlines()]);
            setEvents(evts);
            setDeadlines(dls);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const eventMap = useMemo<Map<string, DayItem[]>>(() => {
        const map = new Map<string, DayItem[]>();
        const push = (key: string, item: DayItem) => {
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(item);
        };
        events.forEach((ev) =>
            push(toDateKey(ev.fecha_inicio), {
                id: ev.id, title: ev.titulo, tipo: ev.tipo, isDeadline: false, raw: ev,
            })
        );
        deadlines.forEach((dl) =>
            push(toDateKey(dl.fecha), { id: dl.id, title: dl.titulo, tipo: 'deadline', isDeadline: true })
        );
        return map;
    }, [events, deadlines]);

    const weekDates = useMemo(() => getWeekDates(weekAnchor), [weekAnchor]);
    const monthCells = useMemo(() => buildMonthGrid(year, month), [year, month]);

    // ── Navigation ──────────────────────────────────────────────────────────

    const prevPeriod = () => {
        if (viewMode === 'month') {
            if (month === 0) { setYear(y => y - 1); setMonth(11); }
            else setMonth(m => m - 1);
            setSelectedDay(null);
        } else {
            setWeekAnchor((d) => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; });
        }
    };
    const nextPeriod = () => {
        if (viewMode === 'month') {
            if (month === 11) { setYear(y => y + 1); setMonth(0); }
            else setMonth(m => m + 1);
            setSelectedDay(null);
        } else {
            setWeekAnchor((d) => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; });
        }
    };
    const goToday = () => {
        setYear(today.getFullYear());
        setMonth(today.getMonth());
        setWeekAnchor(today);
        setSelectedDay(null);
    };

    // ── Day click ────────────────────────────────────────────────────────────

    // Empty cell + canWrite → create modal; otherwise → toggle day panel
    const handleCellClick = (key: string, hasEvents: boolean) => {
        if (canWrite && !hasEvents) {
            setModalDate(key);
            setModalEvent(null);
        } else {
            setSelectedDay((prev) => (prev === key ? null : key));
        }
    };

    const handleChipClick = (e: React.MouseEvent, item: DayItem, dateKey?: string) => {
        e.stopPropagation();
        if (item.isDeadline) {
            if (dateKey) setSelectedDay(dateKey);
            return;
        }
        if (!item.raw) return;
        setModalEvent(item.raw);
        setModalDate(undefined);
    };

    const handleDeleteDeadline = (id: string) => {
        setConfirmDeadlineId(id);
    };

    const executeDeleteDeadline = async () => {
        if (!confirmDeadlineId) return;
        setDeletingDeadline(true);
        try {
            await deleteDeadline(confirmDeadlineId);
            setDeadlines((prev) => prev.filter((d) => d.id !== confirmDeadlineId));
            toast.success('Fecha límite eliminada');
            setConfirmDeadlineId(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al eliminar');
        } finally {
            setDeletingDeadline(false);
        }
    };

    // ── Tooltip ──────────────────────────────────────────────────────────────

    const showTooltip = (e: React.MouseEvent, item: DayItem) => {
        setTooltip({ x: e.clientX, y: e.clientY, item });
    };
    const hideTooltip = () => setTooltip(null);

    // ── CRUD ────────────────────────────────────────────────────────────────

    const handleSave = async (payload: EventPayload) => {
        try {
            if (modalEvent) {
                const updated = await updateEvent(modalEvent.id, payload);
                setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
                toast.success('Evento actualizado correctamente');
            } else {
                const created = await createEvent(payload);
                setEvents((prev) => [...prev, created]);
                toast.success('Evento creado correctamente');
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al guardar el evento');
            throw err;
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteEvent(id);
            setEvents((prev) => prev.filter((e) => e.id !== id));
            toast.success('Evento eliminado');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al eliminar el evento');
            throw err;
        }
    };

    // ── Upcoming summary ─────────────────────────────────────────────────────

    const weekCount   = eventsThisWeek(eventMap, viewMode === 'week' ? weekAnchor : today);
    const selectedItems = selectedDay ? (eventMap.get(selectedDay) ?? []) : [];

    // ── Header label ─────────────────────────────────────────────────────────

    const periodLabel = viewMode === 'month'
        ? `${MONTHS_ES[month]} ${year}`
        : (() => {
            const [mon, sun] = [weekDates[0], weekDates[6]];
            if (mon.getMonth() === sun.getMonth())
                return `${mon.getDate()}–${sun.getDate()} ${MONTHS_ES[mon.getMonth()]} ${mon.getFullYear()}`;
            return `${mon.getDate()} ${MONTHS_ES[mon.getMonth()]} – ${sun.getDate()} ${MONTHS_ES[sun.getMonth()]} ${sun.getFullYear()}`;
        })();

    return (
        <AppShell>
            <div className="cal-body">
                {/* Page header */}
                <div className="cal-page-header">
                    <div className="cal-page-header__text">
                        <h1 className="cal-page-title">Calendario Académico</h1>
                        <p className="cal-page-subtitle">
                            {weekCount > 0
                                ? `${weekCount} evento${weekCount > 1 ? 's' : ''} esta semana`
                                : 'Sin eventos esta semana'}
                        </p>
                    </div>
                    {canWrite && (
                        <button
                            className="cal-btn-new"
                            onClick={() => { setModalDate(todayKey); setModalEvent(null); }}
                        >
                            <Plus size={16} />
                            Nuevo evento
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="cal-loading">
                        <div className="cal-loading__spinner" aria-hidden="true" />
                        Cargando calendario…
                    </div>
                ) : (
                    <div className="cal-month-wrapper">

                        {/* Toolbar */}
                        <div className="cal-toolbar">
                            <div className="cal-toolbar__nav">
                                <button className="cal-nav__btn" onClick={prevPeriod} aria-label="Periodo anterior">
                                    <ChevronLeft size={18} />
                                </button>
                                <h2 className="cal-nav__title">{periodLabel}</h2>
                                <button className="cal-nav__btn" onClick={nextPeriod} aria-label="Periodo siguiente">
                                    <ChevronRight size={18} />
                                </button>
                                <button className="cal-today-btn" onClick={goToday}>Hoy</button>
                            </div>

                            <div className="cal-toolbar__right">
                                {/* Legend */}
                                <div className="cal-legend">
                                    <span className="cal-chip cal-chip--blue">Académico</span>
                                    <span className="cal-chip cal-chip--orange">Entregas</span>
                                    <span className="cal-chip cal-chip--gray">Otros</span>
                                </div>

                                {/* View toggle */}
                                <div className="cal-view-toggle" role="group" aria-label="Vista del calendario">
                                    <button
                                        className={`cal-view-btn ${viewMode === 'month' ? 'cal-view-btn--active' : ''}`}
                                        onClick={() => setViewMode('month')}
                                        aria-pressed={viewMode === 'month'}
                                        title="Vista mensual"
                                    >
                                        <LayoutGrid size={15} />
                                    </button>
                                    <button
                                        className={`cal-view-btn ${viewMode === 'week' ? 'cal-view-btn--active' : ''}`}
                                        onClick={() => setViewMode('week')}
                                        aria-pressed={viewMode === 'week'}
                                        title="Vista semanal"
                                    >
                                        <AlignJustify size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── Month View ────────────────────────────────────── */}
                        {viewMode === 'month' && (
                            <>
                                <div className="cal-grid-month" role="grid" aria-label={`Calendario ${MONTHS_ES[month]} ${year}`}>
                                    {DAYS_SHORT.map((d) => (
                                        <div key={d} className="cal-grid__dow" role="columnheader">{d}</div>
                                    ))}
                                    {monthCells.map((day, idx) => {
                                        if (!day) return (
                                            <div key={`e-${idx}`} className="cal-cell cal-cell--empty" aria-hidden="true" />
                                        );
                                        const key   = localKey(day);
                                        const items = eventMap.get(key) ?? [];
                                        const cls   = [
                                            'cal-cell',
                                            key === todayKey  && 'cal-cell--today',
                                            key === selectedDay && 'cal-cell--selected',
                                            items.length > 0  && 'cal-cell--has-events',
                                        ].filter(Boolean).join(' ');

                                        return (
                                            <div
                                                key={key}
                                                className={cls}
                                                onClick={() => handleCellClick(key, items.length > 0)}
                                                role="gridcell"
                                                tabIndex={0}
                                                aria-label={`${day.getDate()} ${MONTHS_ES[month]}${items.length ? `, ${items.length} evento${items.length > 1 ? 's' : ''}` : ''}`}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCellClick(key, items.length > 0)}
                                            >
                                                <div className="cal-cell__top">
                                                    <span className="cal-cell__dow">{DAYS_SHORT[(day.getDay() + 6) % 7]}</span>
                                                    <span className="cal-cell__num">{day.getDate()}</span>
                                                    {canWrite && (
                                                        <button
                                                            className="cal-cell__add-btn"
                                                            onClick={(e) => { e.stopPropagation(); setModalDate(key); setModalEvent(null); }}
                                                            aria-label="Agregar evento"
                                                            tabIndex={-1}
                                                            title="Agregar evento"
                                                        >
                                                            <Plus size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="cal-cell__events">
                                                    {items.length === 0 && canWrite && (
                                                        <span className="cal-cell__empty-hint">+ Agregar</span>
                                                    )}
                                                    {items.slice(0, 3).map((it) => (
                                                        <div
                                                            key={it.id}
                                                            className={`cal-event-card ${cardColorClass(it.tipo, it.isDeadline)}`}
                                                            title={it.title}
                                                            onClick={(e) => handleChipClick(e, it, key)}
                                                            onMouseEnter={(e) => showTooltip(e, it)}
                                                            onMouseLeave={hideTooltip}
                                                        >
                                                            <span className="cal-event-card__title">{it.title}</span>
                                                        </div>
                                                    ))}
                                                    {items.length > 3 && (
                                                        <span className="cal-cell__more">+{items.length - 3} más</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Empty month state */}
                                {!loading && eventMap.size === 0 && (
                                    <div className="cal-empty-state">
                                        <Calendar size={40} className="cal-empty-state__icon" />
                                        <p className="cal-empty-state__title">Sin eventos este mes</p>
                                        {canWrite && (
                                            <p className="cal-empty-state__hint">
                                                Haz clic en un día o usa el botón "Nuevo evento"
                                            </p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── Week View ─────────────────────────────────────── */}
                        {viewMode === 'week' && (
                            <div className="cal-week-scroll-wrap">
                            <div className="cal-week-grid">
                                {weekDates.map((day, i) => {
                                    const key   = localKey(day);
                                    const items = eventMap.get(key) ?? [];
                                    const isToday = key === todayKey;
                                    return (
                                        <div
                                            key={key}
                                            className={`cal-week-col ${isToday ? 'cal-week-col--today' : ''}${canWrite ? ' cal-week-col--interactive' : ''}`}
                                            onClick={() => { if (canWrite) { setModalDate(key); setModalEvent(null); } }}
                                        >
                                            <div className="cal-week-col__header">
                                                <span className="cal-week-col__dow">{DAYS_FULL[i].slice(0, 3)}</span>
                                                <span className={`cal-week-col__num ${isToday ? 'cal-week-col__num--today' : ''}`}>
                                                    {day.getDate()}
                                                </span>
                                            </div>
                                            <div className="cal-week-col__events">
                                                {items.length === 0 ? (
                                                    canWrite
                                                        ? <span className="cal-week-col__empty-interactive">+ Agregar</span>
                                                        : <span className="cal-week-col__empty">–</span>
                                                ) : items.map((it) => (
                                                    <div
                                                        key={it.id}
                                                        className={`cal-week-event ${chipColorClass(it.tipo, it.isDeadline).replace('cal-chip--', 'cal-week-event--')}`}
                                                        onClick={(e) => { e.stopPropagation(); handleChipClick(e, it); }}
                                                        onMouseEnter={(e) => showTooltip(e, it)}
                                                        onMouseLeave={hideTooltip}
                                                        title={it.title}
                                                    >
                                                        <span className="cal-week-event__dot" />
                                                        <span className="cal-week-event__title">{it.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            </div>
                        )}

                        {/* ── Day Detail Panel (month view) ─────────────────── */}
                        {viewMode === 'month' && selectedDay && (
                            <div className="cal-day-panel" role="region" aria-label="Eventos del día">
                                <div className="cal-day-panel__header">
                                    <div className="cal-day-panel__header-left">
                                        <h3 className="cal-day-panel__title">{formatDisplayDate(selectedDay)}</h3>
                                        {canWrite && selectedItems.length > 0 && (
                                            <button
                                                className="cal-day-panel__add"
                                                onClick={() => { setModalDate(selectedDay); setModalEvent(null); }}
                                                title="Crear evento en este día"
                                            >
                                                <Plus size={14} /> Agregar
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        className="cal-day-panel__close"
                                        onClick={() => setSelectedDay(null)}
                                        aria-label="Cerrar panel"
                                    >
                                        <ChevronLeft size={16} style={{ transform: 'rotate(270deg)' }} />
                                    </button>
                                </div>

                                {selectedItems.length === 0 ? (
                                    <div className="cal-day-panel__empty-wrap">
                                        <p className="cal-day-panel__empty">Sin eventos para este día.</p>
                                        {canWrite && (
                                            <button
                                                className="cal-day-panel__add-hint"
                                                onClick={() => { setModalDate(selectedDay); setModalEvent(null); }}
                                            >
                                                <Plus size={13} /> Crear primer evento
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <ul className="cal-day-panel__list">
                                        {selectedItems.map((it) => (
                                            <li
                                                key={it.id}
                                                className={`cal-day-panel__item ${!it.isDeadline && canWrite ? 'cal-day-panel__item--clickable' : ''} ${chipColorClass(it.tipo, it.isDeadline).replace('cal-chip--', 'cal-day-panel__item--')}`}
                                                onClick={() => !it.isDeadline && handleChipClick({ stopPropagation: () => {} } as React.MouseEvent, it)}
                                            >
                                                <span className={`cal-chip ${chipColorClass(it.tipo, it.isDeadline)}`}>
                                                    {it.isDeadline ? 'Entrega' : it.tipo}
                                                </span>
                                                <span className="cal-day-panel__item-title">{it.title}</span>
                                                {!it.isDeadline && it.raw?.ubicacion && (
                                                    <span className="cal-day-panel__item-loc">{it.raw.ubicacion}</span>
                                                )}
                                                {it.isDeadline && canWrite && (
                                                    <button
                                                        className="cal-day-panel__item-del"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteDeadline(it.id); }}
                                                        title="Eliminar fecha límite"
                                                        aria-label="Eliminar fecha límite"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Hover Tooltip ──────────────────────────────────────────── */}
            {tooltip && (
                <div
                    className="cal-tooltip"
                    style={{ top: tooltip.y + 12, left: tooltip.x + 12 }}
                    aria-hidden="true"
                >
                    <p className="cal-tooltip__title">{tooltip.item.title}</p>
                    <p className="cal-tooltip__tipo">{tooltip.item.isDeadline ? 'Fecha límite' : tooltip.item.tipo}</p>
                    {!tooltip.item.isDeadline && tooltip.item.raw?.ubicacion && (
                        <p className="cal-tooltip__loc">{tooltip.item.raw.ubicacion}</p>
                    )}
                </div>
            )}

            {/* ── Confirm Delete Deadline ───────────────────────────────── */}
            {confirmDeadlineId && (
                <ConfirmModal
                    title="Eliminar fecha límite"
                    message="¿Seguro que deseas eliminar esta fecha límite del calendario? Esta acción no se puede deshacer."
                    loading={deletingDeadline}
                    onConfirm={executeDeleteDeadline}
                    onCancel={() => setConfirmDeadlineId(null)}
                />
            )}

            {/* ── Event Modal ────────────────────────────────────────────── */}
            {modalEvent !== undefined && (
                <EventModal
                    event={modalEvent}
                    defaultDate={modalDate}
                    canWrite={canWrite}
                    onSave={handleSave}
                    onDelete={canWrite ? handleDelete : undefined}
                    onClose={() => setModalEvent(undefined)}
                />
            )}
        </AppShell>
    );
};

export default CalendarPage;
