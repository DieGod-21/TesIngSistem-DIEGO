import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useOverlayTransition } from '../hooks/useOverlayTransition';
import {
    X, Upload, CheckCircle2, AlertTriangle,
    FileText, Users,
} from 'lucide-react';
import { importarEstudiantes, importarNotas } from '../services/importarService';
import type { ImportarEstudiantesResult, ImportarNotasResult } from '../services/importarService';
import ImportOutcome from './ImportOutcome';
import { ApiError } from '../services/apiClient';
import { userMessageFor } from '../services/errorMessages';
import { COURSE_CODES } from '../config/apiConfig';
import { listCursosCached } from '../services/cursosService';
import type { Curso } from '../types/api';
import { Alert, Badge, Button } from './ui';
import '../styles/import-modal.css';

/**
 * `partial` es un TERCER resultado, no un matiz del éxito.
 *
 * El estado se decidía por si la petición había resuelto o lanzado, no por lo
 * que decía la respuesta. Con `errores: [...]` el modal pintaba un recuadro
 * VERDE con un check y el texto «3 error(es)»: una importación que rechazó
 * filas se anunciaba como correcta, y los motivos —que el servidor sí manda—
 * se descartaban, así que no había forma de saber qué corregir.
 */
interface SectionState<R> {
    file: File | null;
    loading: boolean;
    status: 'idle' | 'success' | 'partial' | 'error';
    /** Solo para el estado de error: el resto lo cuenta el propio resultado. */
    message: string;
    resultado: R | null;
}

function blank<R>(): SectionState<R> {
    return { file: null, loading: false, status: 'idle', message: '', resultado: null };
}

/** Describe una fila que el servidor rechazó, sea cual sea su forma. */
function describirInvalido(x: Record<string, unknown> | string): string {
    if (typeof x === 'string') return x;
    const fila   = x.fila ?? x.row;
    const carnet = x.carnet;
    const motivo = x.error ?? x.motivo ?? x.message ?? 'Fila rechazada';
    const donde = fila != null ? `Fila ${fila}` : carnet ? `Carné ${carnet}` : null;
    return donde ? `${donde}: ${String(motivo)}` : String(motivo);
}

/** Filas rechazadas que se listan antes de resumir el resto. */
const MAX_ISSUES = 5;

const CURSOS = [
    { label: 'PG1 – Proyecto de Graduación I',  value: COURSE_CODES.PG1 },
    { label: 'PG2 – Proyecto de Graduación II', value: COURSE_CODES.PG2 },
] as const;

/**
 * Resumen del alta masiva de estudiantes.
 *
 * Antes leía `creados`, `procesados` y `duplicados`, tres campos que el
 * contrato no declara en ninguna parte: no llegaban nunca y el resumen caía
 * siempre en su texto por defecto, «Importación completada», que no dice nada.
 */
function resumirEstudiantes(r: ImportarEstudiantesResult): string {
    const p: string[] = [];
    if (r.estudiantes.insertados)   p.push(`${r.estudiantes.insertados} nuevos`);
    if (r.estudiantes.actualizados) p.push(`${r.estudiantes.actualizados} actualizados`);
    if (r.inscripciones_nuevas)     p.push(`${r.inscripciones_nuevas} inscripciones`);
    const cabeza = r.total_en_archivo
        ? `${r.total_en_archivo} fila${r.total_en_archivo !== 1 ? 's' : ''} en el archivo`
        : 'Importación completada';
    return p.length ? `${cabeza} · ${p.join(' · ')}` : cabeza;
}

function extractError(e: unknown): string {
    // Timeout de una importación grande: el proceso puede continuar en el servidor.
    if (e instanceof ApiError && e.kind === 'timeout') {
        return 'La importación está tardando más de lo normal. Es posible que continúe procesándose en el servidor; verifica el listado en unos minutos.';
    }
    // Resto de casos → mapeador central (nunca mensajes HTTP crudos).
    return userMessageFor(e) || 'Error inesperado al importar.';
}

function isExcelFile(file: File): boolean {
    return /\.(xlsx|xls|csv)$/i.test(file.name);
}

function isPdfFile(file: File): boolean {
    return /\.pdf$/i.test(file.name);
}

interface Props {
    open: boolean;
    onClose: () => void;
}

const ImportModal: React.FC<Props> = ({ open, onClose }) => {
    const [est, setEst] = useState<SectionState<ImportarEstudiantesResult>>(blank);
    const [not, setNot] = useState<SectionState<ImportarNotasResult>>(blank);
    const [curso, setCurso] = useState<string>(COURSE_CODES.PG1);
    const estRef = useRef<HTMLInputElement>(null);
    const notRef = useRef<HTMLInputElement>(null);

    /*
     * Catálogo real de cursos. Es una tabla maestra cacheada: si aún no ha
     * llegado —o si el servidor no responde— el diálogo sigue funcionando y
     * simplemente no anuncia el periodo. Nunca bloquea la importación.
     */
    const [cursos, setCursos] = useState<Curso[]>([]);
    useEffect(() => {
        if (!open) return;
        let vivo = true;
        listCursosCached()
            .then((c) => { if (vivo) setCursos(c); })
            .catch(() => { /* el periodo es enriquecimiento, no requisito */ });
        return () => { vivo = false; };
    }, [open]);
    const cursoElegido = cursos.find((c) => c.codigo === curso) ?? null;

    const busy = est.loading || not.loading;

    /*
     * Las secciones se vacían al ABRIR, no al cerrar.
     *
     * Cerrar ya no desmonta en el acto: la capa sobrevive lo que dura su
     * salida. Vaciar aquí el estado borraba el RESUMEN de la importación
     * —«120 filas · 118 nuevos»— justo cuando el usuario acababa de cerrarlo,
     * dejando el diálogo vacío a la vista durante el fundido.
     *
     * Al abrir, el resultado es el mismo (el diálogo siempre nace limpio) y
     * nadie llega a ver el paso intermedio.
     */
    useEffect(() => {
        if (!open) return;
        setEst(blank());
        setNot(blank());
    }, [open]);

    const handleClose = () => {
        if (busy) return;
        onClose();
    };

    /* Misma ventana de salida que el resto de diálogos del producto: la capa
       sobrevive a `open === false` lo que dure su animación. El atrapador de
       foco NO espera —recibe `open`— así que el foco vuelve a quien abrió en
       cuanto se pide cerrar. Ver useOverlayTransition. */
    const { montado, saliendo, overlayRef } = useOverlayTransition(open);
    const modalRef = useFocusTrap<HTMLDivElement>(open, handleClose);

    if (!montado) return null;

    const pickEstFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (file && !isExcelFile(file)) {
            if (estRef.current) estRef.current.value = '';
            setEst((s) => ({ ...s, file: null, status: 'error', message: 'Solo se permiten archivos .xlsx, .xls o .csv.', resultado: null }));
            return;
        }
        setEst((s) => ({ ...s, file, status: 'idle', message: '', resultado: null }));
    };

    const pickNotFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (file && !isPdfFile(file)) {
            if (notRef.current) notRef.current.value = '';
            setNot((s) => ({ ...s, file: null, status: 'error', message: 'Solo se permiten archivos .pdf.', resultado: null }));
            return;
        }
        setNot((s) => ({ ...s, file, status: 'idle', message: '', resultado: null }));
    };

    const uploadEst = async () => {
        if (!est.file) {
            setEst((s) => ({ ...s, status: 'error', message: 'Selecciona un archivo antes de importar.', resultado: null }));
            return;
        }
        setEst((s) => ({ ...s, loading: true, status: 'idle', message: '', resultado: null }));
        try {
            const r = await importarEstudiantes(est.file);
            if (estRef.current) estRef.current.value = '';
            setEst((s) => ({
                ...s, file: null,
                status: r.filas_invalidas > 0 ? 'partial' : 'success',
                message: '', resultado: r,
            }));
        } catch (e) {
            setEst((s) => ({ ...s, status: 'error', message: extractError(e), resultado: null }));
        } finally {
            setEst((s) => ({ ...s, loading: false }));
        }
    };

    const uploadNot = async () => {
        if (!not.file) {
            setNot((s) => ({ ...s, status: 'error', message: 'Selecciona un archivo antes de importar.', resultado: null }));
            return;
        }
        setNot((s) => ({ ...s, loading: true, status: 'idle', message: '', resultado: null }));
        try {
            const r = await importarNotas(curso, not.file);
            if (notRef.current) notRef.current.value = '';
            setNot((s) => ({
                ...s, file: null,
                // Un carné del acta que no está en el padrón NO es un éxito: esa
                // nota no se registró y alguien tiene que actuar.
                status: r.totales.no_encontrados > 0 ? 'partial' : 'success',
                message: '', resultado: r,
            }));
        } catch (e) {
            setNot((s) => ({ ...s, status: 'error', message: extractError(e), resultado: null }));
        } finally {
            setNot((s) => ({ ...s, loading: false }));
        }
    };

    return createPortal(
        <div
            ref={overlayRef}
            className={`ui-modal-overlay${saliendo ? ' ui-modal-overlay--saliendo' : ''}`}
            aria-hidden={saliendo || undefined}
            role="dialog"
            aria-modal="true"
            aria-label="Importación masiva"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div className={`ui-modal ui-modal--form ui-modal--wide${saliendo ? ' ui-modal--saliendo' : ''}`} ref={modalRef}>
                <header className="ui-modal__header">
                    <h2 className="ui-modal__title">Importación masiva</h2>
                    <button
                        type="button"
                        className="ui-icon-btn"
                        onClick={handleClose}
                        aria-label="Cerrar modal"
                        disabled={busy}
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>

                <div className="ui-modal__body">
                    {/* ── Estudiantes ── */}
                    <section className="im-section" aria-labelledby="im-est-heading">
                        <div className="im-section__heading">
                            <Users size={16} aria-hidden="true" />
                            <h3 id="im-est-heading">Importar Estudiantes</h3>
                            {/* Tono NEUTRO, no semantico. `success` y `danger` significan «salio
                                bien» y «salio mal» en todo el producto, y aqui se estaban
                                usando para decir «formato Excel» y «formato PDF»: en este
                                mismo dialogo, unos centimetros mas abajo, el rojo significa
                                fila rechazada. El formato es metadato, no estado. */}
                            <Badge tone="neutral" className="im-section__badge">Excel</Badge>
                        </div>
                        <p className="im-section__hint">
                            Archivo <code>.xlsx</code> o <code>.csv</code> con los datos de los estudiantes.
                        </p>
                        <div className="im-file-row">
                            <input
                                ref={estRef}
                                id="im-est-file"
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="im-file-input"
                                onChange={pickEstFile}
                                disabled={est.loading}
                            />
                            <label htmlFor="im-est-file" className="im-file-label">
                                {est.file ? est.file.name : 'Seleccionar archivo…'}
                            </label>
                            <Button
                                size="sm"
                                onClick={uploadEst}
                                loading={est.loading}
                                disabled={est.loading || !est.file}
                            >
                                {!est.loading && <Upload size={14} aria-hidden="true" />}
                                {est.loading ? 'Importando…' : 'Importar'}
                            </Button>
                        </div>
                        {est.status === 'error' && (
                            <Alert tone="danger" icon={<AlertTriangle size={15} />}>{est.message}</Alert>
                        )}
                        {est.resultado && (
                            <Alert
                                tone={est.status === 'partial' ? 'warning' : 'success'}
                                icon={est.status === 'partial' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                            >
                                {resumirEstudiantes(est.resultado)}
                                {est.resultado.filas_invalidas > 0 && (
                                    <>
                                        <br />
                                        {est.resultado.filas_invalidas} fila
                                        {est.resultado.filas_invalidas !== 1 ? 's' : ''} rechazada
                                        {est.resultado.filas_invalidas !== 1 ? 's' : ''}.
                                        {est.resultado.detalle_invalidos.length > 0 && (
                                            <ul className="im-issues">
                                                {est.resultado.detalle_invalidos.slice(0, MAX_ISSUES).map((x, i) => (
                                                    <li key={i}>{describirInvalido(x)}</li>
                                                ))}
                                                {est.resultado.detalle_invalidos.length > MAX_ISSUES && (
                                                    <li className="im-issues__more">
                                                        y {est.resultado.detalle_invalidos.length - MAX_ISSUES} más…
                                                    </li>
                                                )}
                                            </ul>
                                        )}
                                    </>
                                )}
                            </Alert>
                        )}
                    </section>

                    <div className="im-divider" role="separator" />

                    {/* ── Notas ── */}
                    <section className="im-section" aria-labelledby="im-not-heading">
                        <div className="im-section__heading">
                            <FileText size={16} aria-hidden="true" />
                            <h3 id="im-not-heading">Importar Notas</h3>
                            <Badge tone="neutral" className="im-section__badge">PDF</Badge>
                        </div>
                        <p className="im-section__hint">
                            Archivo <code>.pdf</code> con las notas del curso seleccionado.
                        </p>
                        <div className="im-field-row">
                            <label htmlFor="im-curso" className="im-label">Curso:</label>
                            <select
                                id="im-curso"
                                className="ui-control im-select"
                                value={curso}
                                onChange={(e) => setCurso(e.target.value)}
                                disabled={not.loading}
                                aria-describedby={cursoElegido ? 'im-curso-periodo' : undefined}
                            >
                                {CURSOS.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        {/*
                          * QUÉ PERIODO se va a escribir.
                          *
                          * Importar un acta sobrescribe las notas del curso, y hasta
                          * aquí el diálogo solo decía «PG1» — un código que se repite
                          * cada ciclo. El catálogo (`GET /api/cursos`) publica `ciclo`,
                          * `seccion` y `anio` desde siempre; el producto los pedía y
                          * se quedaba únicamente con el código y el nombre. Sin
                          * peticiones nuevas: la tabla ya está en caché.
                          */}
                        {cursoElegido && (
                            <p className="im-periodo" id="im-curso-periodo">
                                Se registrarán en <strong>{cursoElegido.nombre}</strong>
                                {cursoElegido.ciclo   ? <> · {cursoElegido.ciclo}</> : null}
                                {cursoElegido.seccion ? <> · Sección {cursoElegido.seccion}</> : null}
                            </p>
                        )}
                        <div className="im-file-row">
                            <input
                                ref={notRef}
                                id="im-not-file"
                                type="file"
                                accept=".pdf"
                                className="im-file-input"
                                onChange={pickNotFile}
                                disabled={not.loading}
                            />
                            <label htmlFor="im-not-file" className="im-file-label">
                                {not.file ? not.file.name : 'Seleccionar archivo…'}
                            </label>
                            <Button
                                size="sm"
                                onClick={uploadNot}
                                loading={not.loading}
                                disabled={not.loading || !not.file}
                            >
                                {!not.loading && <Upload size={14} aria-hidden="true" />}
                                {not.loading ? 'Importando…' : 'Importar'}
                            </Button>
                        </div>
                        {not.status === 'error' && (
                            <Alert tone="danger" icon={<AlertTriangle size={15} />}>{not.message}</Alert>
                        )}
                        {/* El resultado del acta NO cabe en una línea de texto: el
                            servidor manda el reparto por estado y el detalle nombre
                            a nombre, y esa es justamente la información que hace
                            falta para saber si el acta entró bien. */}
                        {not.resultado && <ImportOutcome resultado={not.resultado} />}
                    </section>
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default ImportModal;
