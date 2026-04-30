import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Upload, CheckCircle2, AlertTriangle,
    Loader2, FileText, Users,
} from 'lucide-react';
import { importarEstudiantes, importarNotas } from '../services/importarService';
import type { ImportarResult } from '../services/importarService';
import { COURSE_CODES } from '../config/apiConfig';
import '../styles/import-modal.css';

interface SectionState {
    file: File | null;
    loading: boolean;
    status: 'idle' | 'success' | 'error';
    message: string;
}

const blank = (): SectionState => ({ file: null, loading: false, status: 'idle', message: '' });

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
    if (Array.isArray(r.errores) && r.errores.length > 0) parts.push(`${r.errores.length} error(es)`);
    return parts.join(' · ') || 'Importación completada.';
}

function extractError(e: unknown): string {
    if (!(e instanceof Error)) return 'Error inesperado al importar.';
    const msg = e.message;
    if (!msg) return 'Error inesperado al importar.';
    if (/fetch|network|failed to fetch|networkerror/i.test(msg)) {
        return 'Error de red. Verifica tu conexión e intenta de nuevo.';
    }
    return msg;
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

    if (!open) return null;

    const busy = est.loading || not.loading;

    const handleClose = () => {
        if (busy) return;
        setEst(blank());
        setNot(blank());
        onClose();
    };

    const pickEstFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (file && !isExcelFile(file)) {
            if (estRef.current) estRef.current.value = '';
            setEst((s) => ({ ...s, file: null, status: 'error', message: 'Solo se permiten archivos .xlsx, .xls o .csv.' }));
            return;
        }
        setEst((s) => ({ ...s, file, status: 'idle', message: '' }));
    };

    const pickNotFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (file && !isPdfFile(file)) {
            if (notRef.current) notRef.current.value = '';
            setNot((s) => ({ ...s, file: null, status: 'error', message: 'Solo se permiten archivos .pdf.' }));
            return;
        }
        setNot((s) => ({ ...s, file, status: 'idle', message: '' }));
    };

    const uploadEst = async () => {
        if (!est.file) {
            setEst((s) => ({ ...s, status: 'error', message: 'Selecciona un archivo antes de importar.' }));
            return;
        }
        setEst((s) => ({ ...s, loading: true, status: 'idle', message: '' }));
        try {
            const r = await importarEstudiantes(est.file);
            if (estRef.current) estRef.current.value = '';
            setEst((s) => ({ ...s, file: null, status: 'success', message: summarize(r) }));
        } catch (e) {
            setEst((s) => ({ ...s, status: 'error', message: extractError(e) }));
        } finally {
            setEst((s) => ({ ...s, loading: false }));
        }
    };

    const uploadNot = async () => {
        if (!not.file) {
            setNot((s) => ({ ...s, status: 'error', message: 'Selecciona un archivo antes de importar.' }));
            return;
        }
        setNot((s) => ({ ...s, loading: true, status: 'idle', message: '' }));
        try {
            const r = await importarNotas(curso, not.file);
            if (notRef.current) notRef.current.value = '';
            setNot((s) => ({ ...s, file: null, status: 'success', message: summarize(r) }));
        } catch (e) {
            setNot((s) => ({ ...s, status: 'error', message: extractError(e) }));
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
            <div className="im-modal">
                <header className="im-modal__header">
                    <h2 className="im-modal__title">Importación masiva</h2>
                    <button
                        type="button"
                        className="im-modal__close"
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
                            <span className="im-section__badge">Excel</span>
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
                            <button
                                type="button"
                                className="im-btn im-btn--primary"
                                onClick={uploadEst}
                                disabled={est.loading || !est.file}
                            >
                                {est.loading
                                    ? <><Loader2 size={14} className="im-spin" aria-hidden="true" /> Importando…</>
                                    : <><Upload size={14} aria-hidden="true" /> Importar</>}
                            </button>
                        </div>
                        {est.status !== 'idle' && (
                            <Feedback status={est.status} message={est.message} />
                        )}
                    </section>

                    <div className="im-divider" role="separator" />

                    {/* ── Notas ── */}
                    <section className="im-section" aria-labelledby="im-not-heading">
                        <div className="im-section__heading">
                            <FileText size={16} aria-hidden="true" />
                            <h3 id="im-not-heading">Importar Notas</h3>
                            <span className="im-section__badge im-section__badge--pdf">PDF</span>
                        </div>
                        <p className="im-section__hint">
                            Archivo <code>.pdf</code> con las notas del curso seleccionado.
                        </p>
                        <div className="im-field-row">
                            <label htmlFor="im-curso" className="im-label">Curso:</label>
                            <select
                                id="im-curso"
                                className="im-select"
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
                            <button
                                type="button"
                                className="im-btn im-btn--primary"
                                onClick={uploadNot}
                                disabled={not.loading || !not.file}
                            >
                                {not.loading
                                    ? <><Loader2 size={14} className="im-spin" aria-hidden="true" /> Importando…</>
                                    : <><Upload size={14} aria-hidden="true" /> Importar</>}
                            </button>
                        </div>
                        {not.status !== 'idle' && (
                            <Feedback status={not.status} message={not.message} />
                        )}
                    </section>
                </div>
            </div>
        </div>,
        document.body,
    );
};

const Feedback: React.FC<{ status: 'success' | 'error'; message: string }> = ({ status, message }) => (
    <div className={`im-feedback im-feedback--${status}`} role="status" aria-live="polite">
        {status === 'success'
            ? <CheckCircle2 size={15} aria-hidden="true" />
            : <AlertTriangle size={15} aria-hidden="true" />}
        <span>{message}</span>
    </div>
);

export default ImportModal;
