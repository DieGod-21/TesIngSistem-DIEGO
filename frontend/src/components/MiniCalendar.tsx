import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { getCalendarEvents, getCalendarDeadlines } from '../services/calendarService';
import type { CalendarEvent, CalendarDeadline } from '../services/calendarService';
import '../styles/calendar.css';

const DAYS_LETTER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS_ES   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function toDateKey(dateStr: string): string {
    const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function localKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekDays(from: Date): Date[] {
    const dow = (from.getDay() + 6) % 7; // Mon = 0
    const monday = new Date(from);
    monday.setDate(from.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

function chipClass(tipo: string, isDeadline: boolean): string {
    if (isDeadline) return 'mini-chip--orange';
    switch (tipo.toLowerCase()) {
        case 'examen':                       return 'mini-chip--red';
        case 'defensa':
        case 'revision':
        case 'reunion':                      return 'mini-chip--blue';
        case 'entrega':                      return 'mini-chip--orange';
        default:                             return 'mini-chip--gray';
    }
}

interface UpcomingItem {
    id: string;
    date: string;
    title: string;
    tipo: string;
    isDeadline: boolean;
}

const MiniCalendar: React.FC = () => {
    const history  = useHistory();
    const today    = new Date();
    const todayKey = localKey(today);
    const weekDays = useMemo(() => getWeekDays(today), []); // eslint-disable-line react-hooks/exhaustive-deps

    const [events,    setEvents]    = useState<CalendarEvent[]>([]);
    const [deadlines, setDeadlines] = useState<CalendarDeadline[]>([]);
    const [loading,   setLoading]   = useState(true);

    useEffect(() => {
        let canceled = false;
        Promise.all([getCalendarEvents(), getCalendarDeadlines()])
            .then(([evts, dls]) => {
                if (canceled) return;
                setEvents(evts);
                setDeadlines(dls);
            })
            .catch(() => {})
            .finally(() => { if (!canceled) setLoading(false); });
        return () => { canceled = true; };
    }, []);

    // Count per day for the week strip dots
    const dotMap = useMemo(() => {
        const map = new Map<string, number>();
        const inc = (k: string) => map.set(k, (map.get(k) ?? 0) + 1);
        events.forEach((ev) => inc(toDateKey(ev.fecha_inicio)));
        deadlines.forEach((dl) => inc(toDateKey(dl.fecha)));
        return map;
    }, [events, deadlines]);

    // Next 5 upcoming items from today
    const upcoming = useMemo<UpcomingItem[]>(() => {
        const items: UpcomingItem[] = [];
        events.forEach((ev) => {
            if (toDateKey(ev.fecha_inicio) >= todayKey)
                items.push({ id: ev.id, date: toDateKey(ev.fecha_inicio), title: ev.titulo, tipo: ev.tipo, isDeadline: false });
        });
        deadlines.forEach((dl) => {
            if (toDateKey(dl.fecha) >= todayKey)
                items.push({ id: dl.id, date: toDateKey(dl.fecha), title: dl.titulo, tipo: 'deadline', isDeadline: true });
        });
        return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    }, [events, deadlines, todayKey]);

    return (
        <section className="mini-cal">
            <h4 className="mini-cal__title">Próximos Eventos</h4>

            {/* Week strip */}
            <div className="mini-cal__week" aria-label="Semana actual">
                {weekDays.map((day, i) => {
                    const key   = localKey(day);
                    const count = dotMap.get(key) ?? 0;
                    const isToday = key === todayKey;
                    return (
                        <div
                            key={i}
                            className={`mini-cal__day${isToday ? ' mini-cal__day--today' : ''}`}
                            aria-label={`${DAYS_LETTER[i]} ${day.getDate()}${count > 0 ? `, ${count} evento${count > 1 ? 's' : ''}` : ''}`}
                        >
                            <span className="mini-cal__dow">{DAYS_LETTER[i]}</span>
                            <span className="mini-cal__num">{day.getDate()}</span>
                            {count > 0 && <span className="mini-cal__dot" aria-hidden="true" />}
                        </div>
                    );
                })}
            </div>

            {/* Upcoming events list */}
            <div className="mini-cal__upcoming">
                {loading ? (
                    <p className="mini-cal__empty">Cargando…</p>
                ) : upcoming.length === 0 ? (
                    <p className="mini-cal__empty">Sin próximos eventos registrados</p>
                ) : (
                    <ul className="mini-cal__list">
                        {upcoming.map((it) => {
                            const [, m, d] = it.date.split('-').map(Number);
                            return (
                                <li key={it.id} className="mini-cal__item">
                                    <div className="mini-cal__date-box" aria-label={`${d} de ${MONTHS_ES[m-1]}`}>
                                        <span className="mini-cal__date-month">{MONTHS_ES[m - 1]}</span>
                                        <span className="mini-cal__date-day">{d}</span>
                                    </div>
                                    <div className="mini-cal__item-info">
                                        <p className="mini-cal__item-title">{it.title}</p>
                                        <span className={`mini-chip ${chipClass(it.tipo, it.isDeadline)}`}>
                                            {it.isDeadline ? 'Entrega' : it.tipo}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <button className="mini-cal__btn" onClick={() => history.push('/calendar')}>
                Ver calendario completo
            </button>
        </section>
    );
};

export default MiniCalendar;
