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
import { ternaHint, verdictReason } from '../../../utils/thesisStatus';
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

    // Motivo del veredicto y siguiente paso: ambos derivados del MISMO estado
    // de tesis que ya calcula el dossier, con la misma función que el
    // expediente. Sin reglas de negocio nuevas ni datos inventados.
    const razon = verdictReason({
        pg1: dossier.grades.find((g) => g.curso === '043')?.nota_final ?? null,
        pg2: dossier.grades.find((g) => g.curso === '049')?.nota_final ?? null,
    });
    const hint = ternaHint(dossier.tesis.estado);

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

    const { student, loading, error, grades, tesis, terna, promedio, proyecto } = dossier;
    const verdict = VERDICT[tesis.estado] ?? VERDICT.PENDIENTE;

    /*
     * ── DOS ESPERAS QUE NO SE PARECEN EN NADA ───────────────────────────
     *
     * Abrir el panel por primera vez es esperar a que aparezca algo: no hay
     * nada que enseñar y el esqueleto es la respuesta correcta.
     *
     * Pasar al siguiente expediente NO es eso. Ahí ya hay un panel abierto y
     * lleno, y sustituirlo por cuatro barras grises mientras llega el siguiente
     * hacía que el panel entero —identidad, cuerpo y pie— se desmontara y se
     * volviera a montar en cada pulsación de flecha. Recorrer veinte
     * expedientes se sentía como abrir veinte paneles, no como hojear uno.
     *
     * Mientras llega el siguiente se conserva EN PANTALLA el anterior. El hook
     * ya lo hace posible: al cambiar de identificador mantiene los datos
     * previos y solo levanta `loading`, y cuando el nuevo expediente llega lo
     * asienta de una vez (nunca hay mezcla de dos personas). Aquí solo se
     * decide qué significa esa espera.
     */
    const primeraCarga = loading && student == null;
    const cambiandoDeExpediente = loading && student != null;

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
                {/* ── Barra de control: cerrar + recorrer el padrón ──
                    El recorrido es UNA sola pieza: anterior, posición y
                    siguiente viven dentro del mismo marco. Estaban sueltos —la
                    posición pegada al aspa, en 12px apagados, y las flechas al
                    otro extremo—, así que el dato que dice «voy por el 19 de
                    20» no se relacionaba con los controles que lo mueven y
                    apenas se leía. */}
                <div className="qv-bar">
                    <button
                        type="button"
                        className="ui-icon-btn"
                        onClick={onClose}
                        aria-label="Cerrar vista rápida"
                        data-autofocus
                    >
                        <X size={16} aria-hidden="true" />
                    </button>

                    <div className="qv-pager">
                        <button
                            type="button"
                            className="qv-pager__btn"
                            onClick={onPrev}
                            disabled={!onPrev}
                            aria-label="Estudiante anterior (flecha arriba)"
                            title="Anterior · ↑"
                        >
                            <ChevronUp size={18} aria-hidden="true" />
                        </button>

                        {position && (
                            /* El nombre accesible se enuncia entero («Expediente
                               19 de 20»): la barra oblicua se lee bien con los
                               ojos y fatal en voz alta. */
                            <span
                                className="qv-pager__pos"
                                aria-live="polite"
                                aria-label={`Expediente ${position.index} de ${position.total}`}
                            >
                                <span className="qv-pager__now">{position.index}</span>
                                <span className="qv-pager__sep" aria-hidden="true">/</span>
                                <span className="qv-pager__total">{position.total}</span>
                            </span>
                        )}

                        <button
                            type="button"
                            className="qv-pager__btn"
                            onClick={onNext}
                            disabled={!onNext}
                            aria-label="Estudiante siguiente (flecha abajo)"
                            title="Siguiente · ↓"
                        >
                            <ChevronDown size={18} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {primeraCarga && (
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

                {student && !error && (
                    /*
                     * La `key` es lo que hace el relevo: mientras se espera al
                     * siguiente sigue siendo la misma y nada se remonta; en
                     * cuanto llega, React sustituye este subárbol y el contenido
                     * entra con su propia animación. El marco del panel, el velo
                     * y la barra de recorrido quedan fuera y no se enteran.
                     */
                    <div
                        className="qv-content"
                        key={student.id}
                        data-cambiando={cambiandoDeExpediente ? 'true' : undefined}
                        aria-busy={cambiandoDeExpediente || undefined}
                    >
                        {/* ── 1. Identidad: bloque anclado, no una fila más ──
                            El lavado de marca solo vive aquí. Da al panel un
                            «arriba» reconocible y evita que el contenido flote
                            sobre una superficie plana. */}
                        <header className="qv-identity">
                            <Avatar name={student.nombre} size="xl" shape="square" />
                            <div className="qv-identity__text">
                                <h2 className="qv-identity__name">{student.nombre}</h2>
                                {/* El complemento del veredicto tiene que APOYARLO, no
                                    competir con él. El promedio solo se muestra cuando
                                    concuerda; si no, se dice el motivo real, que es por
                                    curso. Con 69 y 92 el encabezado llegaba a poner
                                    «Nota insuficiente · Promedio 80.5» con el mínimo 70
                                    escrito justo debajo. */}
                                <div className="qv-verdict">
                                    <Badge tone={verdict.tone} dot>{verdict.label}</Badge>
                                    {razon
                                        ? <span className="qv-verdict__why">{razon}</span>
                                        : promedio != null && (
                                            <span className="qv-verdict__avg">
                                                {/* Dos decimales, como en TODO el producto (expediente,
                                                    ternas, reportes, tarjeta de elegibilidad). El panel
                                                    era el único sitio que imprimía el número crudo: el
                                                    mismo alumno pasaba de «84.5» a «84.50» al abrir el
                                                    expediente. */}
                                                Promedio <strong className="ui-tnum">{Number(promedio).toFixed(2)}</strong>
                                            </span>
                                        )}
                                </div>
                            </div>
                        </header>

                        <div className="qv-body">
                            {/* ── 2. ¿Qué falta? Requisito de tesis, curso a curso ── */}
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

                            {/* ── 3. Proyecto ──
                                Se intercala entre la nota y la terna porque ese es
                                el orden real del proceso: se aprueban los cursos, se
                                registra el proyecto y sobre ese proyecto se forma la
                                terna. El panel saltaba de la nota a la terna y dejaba
                                sin respuesta la pregunta más concreta que se hace
                                sobre alguien: sobre qué está trabajando. */}
                            <section className="qv-section" aria-label="Proyecto">
                                <div className="qv-section__head">
                                    <h3 className="qv-section__title">Proyecto</h3>
                                    {proyecto?.fase && (
                                        <span className="qv-section__note">{proyecto.fase}</span>
                                    )}
                                </div>
                                {proyecto ? (
                                    <p className="qv-proyecto">{proyecto.titulo}</p>
                                ) : (
                                    <p className="qv-empty-line">
                                        Sin registrar · es el requisito para formar {VOCAB.committee.toLowerCase()}.
                                    </p>
                                )}
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
                                        {/* Lo que falta de la terna es un dato real que el
                                            expediente ya muestra y el panel omitía: sin él
                                            «En progreso» no dice cuánto queda. */}
                                        {terna.total_evaluadores > 0 && (
                                            <span className="qv-terna__prog ui-tnum">
                                                {terna.evaluaciones_enviadas}/{terna.total_evaluadores}
                                            </span>
                                        )}
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

                            {/* ── 5. Qué sigue ──
                                Cuarta pregunta que el panel promete responder, y la
                                única que no respondía. No es relleno inventado: es la
                                misma derivación que ya usa el expediente sobre el
                                estado de tesis real de este alumno.

                                SOLO cuando NO hay terna. `ternaHint` se escribió para
                                el estado vacío de terna, y mostrarlo con una terna
                                asignada producía la contradicción de anunciar «se
                                asigna al recuperar la elegibilidad» justo debajo de
                                «Terna 7 · En progreso». Cuando hay terna, lo que sigue
                                lo dice su propio avance de evaluaciones. */}
                            {!terna && (
                                <p className="qv-next">
                                    <ArrowRight size={13} aria-hidden="true" />
                                    {hint.step}
                                </p>
                            )}

                            {/* ── 6. Identificadores: el dato de MENOR rango del panel ──
                                Estaban arriba del todo, justo bajo el nombre, ocupando
                                el mejor sitio del cuerpo con la información menos
                                decisiva: un carné no ayuda a decidir nada, se copia
                                para pegarlo en otro sistema. Al bajarlos, el orden de
                                lectura pasa a ser quién → qué estado → por qué → qué
                                sigue → cómo lo contacto, y el hueco muerto del 40% se
                                convierte en la separación entre la zona de decisión y
                                la zona de utilidad (`margin-top:auto`). */}
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
                    </div>
                )}
            </aside>
        </div>,
        document.body,
    );
};

export default StudentQuickView;
