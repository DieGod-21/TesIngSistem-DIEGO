import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
    X, Upload, CheckCircle2, AlertTriangle,
    FileText, Users,
} from 'lucide-react';
import { importarEstudiantes, importarNotas } from '../services/importarService';
import type { ImportarResult } from '../services/importarService';
import { ApiError } from '../services/apiClient';
import { userMessageFor } from '../services/errorMessages';
import { COURSE_CODES } from '../config/apiConfig';
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
interface SectionState {
    file: File | null;
    loading: boolean;
    status: 'idle' | 'success' | 'partial' | 'error';
    message: string;
    /** Motivos de las filas rechazadas, ya normalizados a texto. */
    issues: string[];
}

const blank = (): SectionState => ({ file: null, loading: false, status: 'idle', message: '', issues: [] });

/** Los errores llegan como cadenas o como objetos {fila, carnet, error}. */
function toIssues(r: ImportarResult): string[] {
    if (!Array.isArray(r.errores)) return [];
    return r.errores.map((e) => {
        if (typeof e === 'string') return e;
        const donde = e.fila != null ? `Fila ${e.fila}` : e.carnet ? `Carné ${e.carnet}` : null;
        return donde ? `${donde}: ${e.error}` : e.error;
    });
}

const CURSOS = [
    { label: 'PG1 – Proyecto de Graduación I',  value: COURSE_CODES.PG1 },
    { label: 'PG2 – Proyecto de Graduación II', value: COURSE_CODES.PG2 },
] as const;

function summarize(r: ImportarResult): string {
    const parts: string[] = [];
    if (r.mensaje || r.message) parts.push((r.mensaje ?? r.message)!);
    if (r.creados    != null)   parts.push(`${r.creados} creados`);
    if (r.procesados != null)   parts.push(`${r.procesados} procesados`);
    if (r.duplicados != null)   parts.push(`${r.duplicados} duplicados`);
    // El recuento de errores YA NO va aquí: tiene su propio bloque, con los
    // motivos. Meterlo en la línea de éxito era lo que producía «✓ 3 error(es)».
    return parts.join(' · ') || 'Importación completada.';
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
    const [est, setEst]   = useState<SectionState>(blank);
    const [not, setNot]   = useState<SectionState>(blank);
    const [curso, setCurso] = useState<string>(COURSE_CODES.PG1);
    const estRef = useRef<HTMLInputElement>(null);
    const notRef = useRef<HTMLInputElement>(null);

    const busy = est.loading || not.loading;

    const handleClose = () => {
        if (busy) return;
        setEst(blank());
        setNot(blank());
        onClose();
    };

    const modalRef = useFocusTrap<HTMLDivElement>(open, handleClose);

    if (!open) return null;

    const pickEstFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (file && !isExcelFile(file)) {
            if (estRef.current) estRef.current.value = '';
            setEst((s) => ({ ...s, file: null, status: 'error', message: 'Solo se permiten archivos .xlsx, .xls o .csv.' }));
            return;
        }
        setEst((s) => ({ ...s, file, status: 'idle', message: '', issues: [] }));
    };

    const pickNotFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (file && !isPdfFile(file)) {
            if (notRef.current) notRef.current.value = '';
            setNot((s) => ({ ...s, file: null, status: 'error', message: 'Solo se permiten archivos .pdf.' }));
            return;
        }
        setNot((s) => ({ ...s, file, status: 'idle', message: '', issues: [] }));
    };

    const uploadEst = async () => {
        if (!est.file) {
            setEst((s) => ({ ...s, status: 'error', message: 'Selecciona un archivo antes de importar.', issues: [] }));
            return;
        }
        setEst((s) => ({ ...s, loading: true, status: 'idle', message: '', issues: [] }));
        try {
            const r = await importarEstudiantes(est.file);
            if (estRef.current) estRef.current.value = '';
            const issues = toIssues(r);
            setEst((s) => ({
                ...s, file: null,
                status: issues.length > 0 ? 'partial' : 'success',
                message: summarize(r), issues,
            }));
        } catch (e) {
            setEst((s) => ({ ...s, status: 'error', message: extractError(e), issues: [] }));
        } finally {
            setEst((s) => ({ ...s, loading: false }));
        }
    };

    const uploadNot = async () => {
        if (!not.file) {
            setNot((s) => ({ ...s, status: 'error', message: 'Selecciona un archivo antes de importar.', issues: [] }));
            return;
        }
        setNot((s) => ({ ...s, loading: true, status: 'idle', message: '', issues: [] }));
        try {
            const r = await importarNotas(curso, not.file);
            if (notRef.current) notRef.current.value = '';
            const issues = toIssues(r);
            setNot((s) => ({
                ...s, file: null,
                status: issues.length > 0 ? 'partial' : 'success',
                message: summarize(r), issues,
            }));
        } catch (e) {
            setNot((s) => ({ ...s, status: 'error', message: extractError(e), issues: [] }));
        } finally {
            setNot((s) => ({ ...s, loading: false }));
        }
    };

    return createPortal(
        <div
            className="im-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Importación masiva"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div className="im-modal" ref={modalRef}>
                <header className="im-modal__header">
                    <h2 className="im-modal__title">Importación masiva</h2>
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

                <div className="im-modal__body">
                    {/* ── Estudiantes ── */}
                    <section className="im-section" aria-labelledby="im-est-heading">
                        <div className="im-section__heading">
                            <Users size={16} aria-hidden="true" />
                            <h3 id="im-est-heading">Importar Estudiantes</h3>
                            <Badge tone="success" className="im-section__badge">Excel</Badge>
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
                        {est.status !== 'idle' && (
                            <Feedback status={est.status} message={est.message} issues={est.issues} />
                        )}
                    </section>

                    <div className="im-divider" role="separator" />

                    {/* ── Notas ── */}
                    <section className="im-section" aria-labelledby="im-not-heading">
                        <div className="im-section__heading">
                            <FileText size={16} aria-hidden="true" />
                            <h3 id="im-not-heading">Importar Notas</h3>
                            <Badge tone="danger" className="im-section__badge">PDF</Badge>
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
                            >
                                {CURSOS.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
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
                        {not.status !== 'idle' && (
                            <Feedback status={not.status} message={not.message} issues={not.issues} />
                        )}
                    </section>
                </div>
            </div>
        </div>,
        document.body,
    );
};

const MAX_ISSUES = 5;

const Feedback: React.FC<{ status: 'success' | 'partial' | 'error'; message: string; issues?: string[] }> = ({
    status, message, issues = [],
}) => (
    <Alert
        tone={status === 'success' ? 'success' : status === 'partial' ? 'warning' : 'danger'}
        icon={status === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
    >
        {status === 'partial'
            ? `${message} · ${issues.length} fila${issues.length !== 1 ? 's' : ''} rechazada${issues.length !== 1 ? 's' : ''}`
            : message}
        {issues.length > 0 && (
            <ul className="im-issues">
                {issues.slice(0, MAX_ISSUES).map((t, i) => <li key={i}>{t}</li>)}
                {issues.length > MAX_ISSUES && (
                    <li className="im-issues__more">y {issues.length - MAX_ISSUES} más…</li>
                )}
            </ul>
        )}
    </Alert>
);

export default ImportModal;
