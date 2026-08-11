/**
 * StudentQuickView.tsx — Panel de inspección rápida del padrón.
 *
 * NO es un detalle en miniatura: es una interfaz de decisión. Responde en
 * segundos a "¿quién es?", "¿es elegible?", "¿qué falta?" y "¿qué sigue?",
 * y deja al coordinador en la lista para pasar al siguiente expediente.
 *
 * El estado abierto/cerrado vive en la URL (?preview=<id>), igual que la lente,
 * la búsqueda y la página: así el contexto del listado se preserva solo, el
 * botón Atrás cierra el panel y el enlace es compartible.
 *
 * Presentación pura: consume useStudentDossier, que reutiliza la misma cadena
 * de servicios que la vista de detalle. Sin peticiones nuevas.
 */

import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Mail, GraduationCap, Users, ArrowRight, AlertTriangle,
    ChevronUp, ChevronDown, IdCard,
} from 'lucide-react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useStudentDossier } from '../../../hooks/useStudentDossier';
import { THESIS_MIN_GRADE } from '../../../config/apiConfig';
import { VOCAB } from '../../../config/vocabulary';
import { Alert, Avatar, Badge, Button, CopyField, Skeleton } from '../../../components/ui';
import type { BadgeTone } from '../../../components/ui';
import '../styles/quick-view.css';

const CURSO_SHORT: Record<string, string> = { '043': 'PG1', '049': 'PG2' };
const ALL_CURSOS: Array<'043' | '049'> = ['043', '049'];

/**
 * Veredicto de tesis → tono del sistema de diseño + etiqueta canónica.
 *
 * Se usan los términos de estudiante (no los de conjunto): en un expediente,
 * "por qué" importa tanto como "qué". Además evita colisionar con la etapa
 * `no_elegible` del pipeline, que significa algo distinto (reprobado con ambos
 * cursos en regla).
 */
const VERDICT: Record<string, { tone: BadgeTone; label: string }> = {
    APROBADO:  { tone: 'success', label: VOCAB.verdictEligible },
    REPROBADO: { tone: 'danger',  label: VOCAB.verdictBelowMin },
    PENDIENTE: { tone: 'warning', label: VOCAB.verdictMissing },
};

export interface StudentQuickViewProps {
    /** Id del estudiante a inspeccionar; null = panel cerrado. */
    studentId: string | null;
    onClose: () => void;
    /** Abre el expediente completo (acción secundaria). */
    onOpenFull: (id: string) => void;
    /** Navegación entre expedientes sin cerrar el panel. */
    onPrev?: () => void;
    onNext?: () => void;
    /** Posición dentro de la página actual, para orientar al usuario. */
    position?: { index: number; total: number };
}

const StudentQuickView: React.FC<StudentQuickViewProps> = ({
    studentId, onClose, onOpenFull, onPrev, onNext, position,
}) => {
    const open = studentId != null;
    const panelRef = useFocusTrap<HTMLDivElement>(open, onClose);
    const dossier = useStudentDossier(studentId);

    // ↑/↓ recorren el padrón sin cerrar el panel: el flujo de revisión no se
    // interrumpe. Se ignoran mientras el foco está en un campo de texto.
    const onKeyDown = useCallback((e: KeyboardEvent) => {
        if (!open) return;
        const el = document.activeElement as HTMLElement | null;
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); onNext?.(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); onPrev?.(); }
    }, [open, onNext, onPrev]);

    useEffect(() => {
        if (!open) return;
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onKeyDown]);

    if (!open) return null;

    const { student, loading, error, grades, tesis, terna, promedio } = dossier;
    const verdict = VERDICT[tesis.estado] ?? VERDICT.PENDIENTE;

    return createPortal(
        <div className="qv-scrim" onMouseDown={onClose}>
            <aside
                ref={panelRef}
                className="qv-panel"
                role="dialog"
                aria-modal="true"
                aria-label={student ? `Vista rápida de ${student.nombre}` : 'Vista rápida del estudiante'}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* ── Barra de control: cerrar + recorrer el padrón ── */}
                <div className="qv-bar">
                    <button
                        type="button"
                        className="qv-icon-btn"
                        onClick={onClose}
                        aria-label="Cerrar vista rápida"
                        data-autofocus
                    >
                        <X size={16} aria-hidden="true" />
                    </button>

                    {position && (
                        <span className="qv-bar__pos" aria-live="polite">
                            {position.index} de {position.total}
                        </span>
                    )}

                    <div className="qv-bar__nav">
                        <button
                            type="button"
                            className="qv-icon-btn"
                            onClick={onPrev}
                            disabled={!onPrev}
                            aria-label="Estudiante anterior (flecha arriba)"
                            title="Anterior · ↑"
                        >
                            <ChevronUp size={16} aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            className="qv-icon-btn"
                            onClick={onNext}
                            disabled={!onNext}
                            aria-label="Estudiante siguiente (flecha abajo)"
                            title="Siguiente · ↓"
                        >
                            <ChevronDown size={16} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {loading && (
                    <div className="qv-body" aria-busy="true" aria-label="Cargando expediente…">
                        <Skeleton size="large" />
                        <Skeleton size="medium" />
                        <Skeleton size="short" />
                        <Skeleton size="medium" />
                    </div>
                )}

                {!loading && error && (
                    <div className="qv-body">
                        <Alert tone="danger" icon={<AlertTriangle size={16} />}>{error}</Alert>
                    </div>
                )}

                {!loading && !error && student && (
                    <>
                        {/* ── 1. Identidad: bloque anclado, no una fila más ──
                            El lavado de marca solo vive aquí. Da al panel un
                            «arriba» reconocible y evita que el contenido flote
                            sobre una superficie plana. */}
                        <header className="qv-identity">
                            <Avatar name={student.nombre} size="lg" shape="square" />
                            <div className="qv-identity__text">
                                <h2 className="qv-identity__name">{student.nombre}</h2>
                                <div className="qv-verdict">
                                    <Badge tone={verdict.tone} dot>{verdict.label}</Badge>
                                    {promedio != null && (
                                        <span className="qv-verdict__avg">
                                            Promedio <strong className="ui-tnum">{promedio}</strong>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </header>

                        <div className="qv-body">
                            {/* ── 2. Identificadores: se copian, no se leen ── */}
                            <div className="qv-ids">
                                <CopyField
                                    value={student.carnet}
                                    label="carné"
                                    icon={<IdCard size={14} />}
                                    resetKey={studentId}
                                    tnum
                                />
                                {student.email && (
                                    <CopyField
                                        value={student.email}
                                        label="correo"
                                        icon={<Mail size={14} />}
                                        resetKey={studentId}
                                    />
                                )}
                            </div>

                            {/* ── 3. ¿Qué falta? Requisito de tesis, curso a curso ── */}
                            <section className="qv-section" aria-label="Requisito de tesis">
                                <div className="qv-section__head">
                                    <h3 className="qv-section__title">Requisito de tesis</h3>
                                    <span className="qv-section__note">Mínimo {THESIS_MIN_GRADE}</span>
                                </div>
                                <ul className="qv-grades">
                                    {ALL_CURSOS.map((curso) => {
                                        const g = grades.find((x) => x.curso === curso);
                                        const nota = g?.nota_final ?? null;
                                        const passed = nota != null && nota >= THESIS_MIN_GRADE;
                                        return (
                                            <li
                                                key={curso}
                                                className={`qv-grade${nota == null ? ' qv-grade--empty' : passed ? ' qv-grade--pass' : ' qv-grade--fail'}`}
                                            >
                                                <span className="qv-grade__course">{CURSO_SHORT[curso]}</span>
                                                <span className="qv-grade__value ui-tnum">
                                                    {nota ?? '—'}
                                                </span>
                                                <span className="qv-grade__state">
                                                    {nota == null ? 'Sin registrar' : passed ? 'Cumple' : 'No cumple'}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>

                            {/* ── 4. Terna: solo si aporta. Si no, una línea ── */}
                            <section className="qv-section" aria-label={VOCAB.committee}>
                                <div className="qv-section__head">
                                    <h3 className="qv-section__title">{VOCAB.committee}</h3>
                                </div>
                                {terna ? (
                                    <div className="qv-terna">
                                        <Users size={15} className="qv-terna__icon" aria-hidden="true" />
                                        <span className="qv-terna__num">
                                            {VOCAB.committee} {terna.numero}
                                        </span>
                                        <Badge tone={terna.estado === 'completada' ? 'success' : 'neutral'}>
                                            {terna.estado === 'completada' ? 'Completada'
                                                : terna.estado === 'en_progreso' ? 'En progreso' : 'Pendiente'}
                                        </Badge>
                                    </div>
                                ) : (
                                    <p className="qv-empty-line">
                                        {tesis.estado === 'APROBADO'
                                            ? 'Sin asignar · cumple el requisito, puede conformarse.'
                                            : 'Sin asignar · se asigna al alcanzar la elegibilidad.'}
                                    </p>
                                )}
                            </section>

                        </div>

                        {/* ── Pie: continuar al expediente es LA acción del panel ──
                            Era `secondary` y se perdía. La vista rápida existe
                            para decidir; cuando la decisión pide profundidad,
                            este es el único camino y debe verse como tal. */}
                        <footer className="qv-foot">
                            <Button
                                variant="primary"
                                className="qv-cta"
                                onClick={() => onOpenFull(String(student.id))}
                                block
                            >
                                <GraduationCap size={16} aria-hidden="true" />
                                Abrir expediente completo
                                <ArrowRight size={16} aria-hidden="true" className="qv-cta__arrow" />
                            </Button>
                            <p className="qv-foot__hint">
                                <kbd className="ui-kbd">↑</kbd><kbd className="ui-kbd">↓</kbd> recorrer · <kbd className="ui-kbd">Esc</kbd> cerrar
                            </p>
                        </footer>
                    </>
                )}
            </aside>
        </div>,
        document.body,
    );
};

export default StudentQuickView;
