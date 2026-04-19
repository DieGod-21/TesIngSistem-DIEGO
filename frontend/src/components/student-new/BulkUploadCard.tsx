/**
 * BulkUploadCard.tsx
 *
 * Dropzone con drag & drop para carga masiva de estudiantes.
 * - Excel/CSV: parsea con `xlsx`, muestra preview (máx 20 filas) + validaciones por fila.
 * - PDF: muestra nombre y tamaño (sin parsear contenido — parseo real será backend).
 * Llama importStudents() o uploadPdf() del servicio.
 * onUploaded() notifica al padre para refrescar RecentUploads.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { CloudUpload, FileSpreadsheet, FileText, AlertCircle, CheckCircle2, XCircle, X, Download } from 'lucide-react';
import { importStudents, uploadPdf, downloadTemplate } from '../../services/studentsService';
import type { ImportResult, ParsedRow } from '../../services/studentsService';

const ACCEPTED_TYPES = '.xlsx,.xls,.csv,.pdf';
const PDF_TYPES = ['application/pdf'];
const EXCEL_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
];

interface BulkUploadCardProps {
    onUploaded?: () => void;
}

type UploadState =
    | { status: 'idle' }
    | { status: 'dragging' }
    | { status: 'parsing' }
    | { status: 'preview'; rows: ParsedRow[]; filename: string }
    | { status: 'pdf'; filename: string; sizeKb: string }
    | { status: 'uploading' }
    | { status: 'success'; result: ImportResult }
    | { status: 'pdf-success'; filename: string }
    | { status: 'error'; message: string };

// ─── Helpers ────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isPdf(file: File): boolean {
    return PDF_TYPES.includes(file.type) || file.name.toLowerCase().endsWith('.pdf');
}

function isExcel(file: File): boolean {
    return EXCEL_TYPES.includes(file.type) || /\.(xlsx?|csv)$/i.test(file.name);
}

function norm(val: unknown): string {
    return String(val ?? '').trim().replace(/\s+/g, ' ').replace(/\*/g, '').trim();
}

/** Busca un campo en la fila probando múltiples nombres de columna posibles */
function pick(row: Record<string, unknown>, ...keys: string[]): string {
    for (const k of keys) {
        const val = row[k];
        if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
    }
    // Búsqueda tolerante: ignora asteriscos y espacios extra en los headers del archivo
    const rowKeys = Object.keys(row);
    for (const k of keys) {
        const kNorm = k.replace(/\*/g, '').trim().toLowerCase();
        const match = rowKeys.find((rk) => rk.replace(/\*/g, '').trim().toLowerCase() === kNorm);
        if (match !== undefined) {
            const val = row[match];
            if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
        }
    }
    return '';
}

async function parseExcel(file: File): Promise<ParsedRow[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false });
                const rows: ParsedRow[] = json.map((row, i) => ({
                    rowIndex: i + 2,
                    fullName:      pick(row, 'Full Name *', 'Full Name', 'nombreCompleto', 'nombre_completo'),
                    carnetId:      pick(row, 'Carnet ID *', 'Carnet ID', 'carnetId', 'carnet_id'),
                    email:         pick(row, 'Email (optional)', 'correoInstitucional', 'correo_institucional'),
                    academicPhase: pick(row, 'Academic Phase *', 'Academic Phase', 'faseAcademica', 'fase_academica'),
                    approved:      pick(row, 'Status *', 'Status', 'Approved', 'aprobado'),
                    ...row,
                }));
                // Filtrar filas completamente vacías
                resolve(rows.filter((r) => norm(r.fullName) || norm(r.carnetId)));
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Error leyendo el archivo.'));
        reader.readAsArrayBuffer(file);
    });
}

// Claves internas del ParsedRow y nombres conocidos de columnas Excel
// que NO deben aparecer como columnas extra en el preview.
const KNOWN_KEYS = new Set([
    'rowIndex', 'fullName', 'carnetId', 'email', 'academicPhase', 'approved',
    'Full Name *', 'Full Name', 'nombreCompleto', 'nombre_completo',
    'Carnet ID *', 'Carnet ID', 'carnet_id',
    'Email (optional)', 'correoInstitucional', 'correo_institucional',
    'Academic Phase *', 'Academic Phase', 'faseAcademica', 'fase_academica',
    'Status *', 'Status', 'Approved', 'aprobado',
]);

/** Celda de Estado: refleja el valor real del campo "Status" del Excel. */
function StatusCell({ value }: { value: string | boolean | undefined }) {
    const v = String(value ?? '').trim().toLowerCase();
    if (v === 'aprobado' || v === 'true') {
        return <span className="sn-status-badge sn-status-badge--ok"><CheckCircle2 size={12} />Aprobado</span>;
    }
    if (v === 'desaprobado' || v === 'false') {
        return <span className="sn-status-badge sn-status-badge--ko"><XCircle size={12} />Desaprobado</span>;
    }
    return <span className="sn-status-badge sn-status-badge--warn"><AlertCircle size={12} />{value ? String(value) : 'sin valor'}</span>;
}

// ─── Componente ─────────────────────────────────────────────────────

const BulkUploadCard: React.FC<BulkUploadCardProps> = ({ onUploaded }) => {
    const [state, setState] = useState<UploadState>({ status: 'idle' });
    const fileInputRef      = useRef<HTMLInputElement>(null);
    const selectedFileRef   = useRef<File | null>(null);

    // Columnas extra que el Excel pueda traer más allá de las 5 conocidas
    const extraCols = useMemo<string[]>(() => {
        if (state.status !== 'preview' || !state.rows.length) return [];
        return Object.keys(state.rows[0]).filter((k) => !KNOWN_KEYS.has(k));
    }, [state]);

    const handleFile = useCallback(async (file: File) => {
        selectedFileRef.current = file;
        setState({ status: 'parsing' });
        try {
            if (isPdf(file)) {
                setState({ status: 'pdf', filename: file.name, sizeKb: formatSize(file.size) });
            } else if (isExcel(file)) {
                const rows = await parseExcel(file);
                setState({ status: 'preview', rows, filename: file.name });
            } else {
                selectedFileRef.current = null;
                setState({ status: 'error', message: 'Formato no soportado. Usa .xlsx, .xls, .csv o .pdf.' });
            }
        } catch {
            selectedFileRef.current = null;
            setState({ status: 'error', message: 'No se pudo leer el archivo.' });
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setState({ status: 'idle' });
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile],
    );

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setState((s) => s.status !== 'dragging' ? { status: 'dragging' } : s);
    };

    const handleDragLeave = () => {
        setState((s) => s.status === 'dragging' ? { status: 'idle' } : s);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = '';
    };

    const handleImport = async () => {
        if (state.status === 'preview') {
            setState({ status: 'uploading' });
            try {
                const result = await importStudents(state.rows);
                setState({ status: 'success', result });
                onUploaded?.();
            } catch {
                setState({ status: 'error', message: 'Error al importar. Intenta de nuevo.' });
            }
        } else if (state.status === 'pdf') {
            const filename = state.filename;
            const realFile = selectedFileRef.current;
            setState({ status: 'uploading' });
            try {
                await uploadPdf(realFile ?? new File([''], filename, { type: 'application/pdf' }));
                setState({ status: 'pdf-success', filename });
                onUploaded?.();
            } catch {
                setState({ status: 'error', message: 'Error al subir el PDF.' });
            }
        }
    };

    const handleReset = () => {
        selectedFileRef.current = null;
        setState({ status: 'idle' });
    };

    const handleDownloadTemplate = async () => {
        try { await downloadTemplate(); } catch { /* silencioso */ }
    };

    const isDragging = state.status === 'dragging';

    return (
        <div className="sn-card sn-card--bulk">
            <div className="sn-card__header">
                <CloudUpload size={20} className="sn-card__header-icon" />
                <h3 className="sn-card__title">Carga Masiva</h3>
                <button
                    type="button"
                    className="sn-btn-ghost sn-card__header-action"
                    onClick={handleDownloadTemplate}
                    title="Descargar plantilla Excel"
                >
                    <Download size={14} />
                    Plantilla
                </button>
            </div>

            <div className="sn-bulk-body">
                {/* ── Zona de arrastre ─────────────────────────────────── */}
                {(state.status === 'idle' || state.status === 'dragging' || state.status === 'parsing') && (
                    <div
                        className={`sn-dropzone${isDragging ? ' sn-dropzone--over' : ''}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        role="region"
                        aria-label="Zona de arrastre de archivos"
                    >
                        <div className="sn-dropzone__icon-wrap">
                            <CloudUpload size={36} className="sn-dropzone__icon" />
                        </div>
                        <p className="sn-dropzone__title">
                            {state.status === 'parsing' ? 'Procesando archivo…' : 'Arrastra archivos aquí'}
                        </p>
                        <p className="sn-dropzone__sub">Acepta .pdf, .xlsx, .xls y .csv</p>
                        {state.status !== 'parsing' && (
                            <button
                                type="button"
                                className="sn-btn-primary sn-dropzone__btn"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Seleccionar Archivo
                            </button>
                        )}
                    </div>
                )}

                {/* ── Preview Excel ────────────────────────────────────── */}
                {state.status === 'preview' && (
                    <div className="sn-preview">
                        <div className="sn-preview__header">
                            <FileSpreadsheet size={16} className="sn-preview__file-icon" />
                            <span className="sn-preview__filename">{state.filename}</span>
                            <button className="sn-preview__close" aria-label="Cancelar" onClick={handleReset}>
                                <X size={14} />
                            </button>
                        </div>
                        <p className="sn-preview__meta">
                            <strong>{state.rows.length}</strong> estudiante{state.rows.length !== 1 ? 's' : ''} detectado{state.rows.length !== 1 ? 's' : ''} &mdash; todos visibles con scroll
                        </p>

                        <div className="sn-preview__table-wrap">
                            <table className="sn-preview__table">
                                <thead>
                                    <tr>
                                        <th className="sn-preview__th sn-preview__th--num">#</th>
                                        <th className="sn-preview__th">Nombre</th>
                                        <th className="sn-preview__th">Carnet</th>
                                        <th className="sn-preview__th">Email</th>
                                        <th className="sn-preview__th">Fase Académica</th>
                                        <th className="sn-preview__th">Estado</th>
                                        {extraCols.map((col) => (
                                            <th key={col} className="sn-preview__th sn-preview__th--extra">{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {state.rows.map((row) => {
                                        const hasError = !row.carnetId?.trim() || !row.fullName?.trim();
                                        return (
                                            <tr
                                                key={row.rowIndex}
                                                className={`sn-preview__row${hasError ? ' sn-preview__row--error' : ''}`}
                                            >
                                                <td className="sn-preview__td sn-preview__td--num">{row.rowIndex}</td>
                                                <td className="sn-preview__td">{row.fullName || <span className="sn-preview__empty">vacío</span>}</td>
                                                <td className="sn-preview__td sn-preview__td--mono">{row.carnetId || <span className="sn-preview__empty">vacío</span>}</td>
                                                <td className="sn-preview__td sn-preview__td--email">{row.email?.trim() ? row.email : <span className="sn-preview__empty">—</span>}</td>
                                                <td className="sn-preview__td">{row.academicPhase || <span className="sn-preview__empty">—</span>}</td>
                                                <td className="sn-preview__td sn-preview__td--status">
                                                    <StatusCell value={row.approved} />
                                                </td>
                                                {extraCols.map((col) => (
                                                    <td key={col} className="sn-preview__td sn-preview__td--extra">
                                                        {row[col] != null && String(row[col]).trim() !== ''
                                                            ? String(row[col])
                                                            : <span className="sn-preview__empty">—</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="sn-preview__actions">
                            <button
                                type="button"
                                className="sn-btn-primary"
                                onClick={handleImport}
                            >
                                Importar {state.rows.length} Registro{state.rows.length !== 1 ? 's' : ''}
                            </button>
                            <button type="button" className="sn-btn-ghost" onClick={handleReset}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PDF info ─────────────────────────────────────────── */}
                {state.status === 'pdf' && (
                    <div className="sn-pdf-info">
                        <FileText size={32} className="sn-pdf-info__icon" />
                        <p className="sn-pdf-info__name">{state.filename}</p>
                        <p className="sn-pdf-info__size">{state.sizeKb}</p>
                        <p className="sn-pdf-info__note">El contenido del PDF se procesará en el servidor.</p>
                        <div className="sn-preview__actions">
                            <button type="button" className="sn-btn-primary" onClick={handleImport}>Subir PDF</button>
                            <button type="button" className="sn-btn-ghost"    onClick={handleReset}>Cancelar</button>
                        </div>
                    </div>
                )}

                {/* ── Uploading ─────────────────────────────────────────── */}
                {state.status === 'uploading' && (
                    <div className="sn-uploading">
                        <div className="sn-uploading__spinner" aria-label="Subiendo…" />
                        <p className="sn-uploading__text">Procesando…</p>
                    </div>
                )}

                {/* ── Success Excel ─────────────────────────────────────── */}
                {state.status === 'success' && (
                    <div className={`sn-result ${state.result.rejected === state.result.total ? 'sn-result--error' : 'sn-result--success'}`}>
                        {state.result.rejected === state.result.total
                            ? <AlertCircle size={28} className="sn-result__icon" />
                            : <CheckCircle2 size={28} className="sn-result__icon" />}
                        <p className="sn-result__title">
                            {state.result.rejected === state.result.total
                                ? 'Ningún registro importado'
                                : 'Importación completada'}
                        </p>
                        <div className="sn-result__stats">
                            <span className="sn-result__stat sn-result__stat--ok">
                                <CheckCircle2 size={13} /> {state.result.imported} importados
                            </span>
                            {state.result.rejected > 0 && (
                                <span className="sn-result__stat sn-result__stat--ko">
                                    <XCircle size={13} /> {state.result.rejected} rechazados
                                </span>
                            )}
                        </div>
                        {state.result.errors.length > 0 && (
                            <div className="sn-result__errors-wrap">
                                <div className="sn-result__reject-header">
                                    <div className="sn-result__reject-icon-wrap">
                                        <XCircle size={18} className="sn-result__reject-main-icon" />
                                    </div>
                                    <div className="sn-result__reject-text">
                                        <span className="sn-result__reject-primary">Errors detected in upload</span>
                                        <span className="sn-result__reject-secondary">Registros Rechazados</span>
                                    </div>
                                    <span className="sn-result__reject-count">{state.result.rejected}</span>
                                </div>
                                <ul className="sn-result__errors">
                                    {state.result.errors.map((e) => (
                                        <li key={`${e.row}-${e.carnetId}`} className="sn-result__err-item">
                                            <XCircle size={12} className="sn-result__err-icon" aria-hidden="true" />
                                            <span className="sn-result__err-row">Fila {e.row}</span>
                                            {e.carnetId && <span className="sn-result__err-carnet">{e.carnetId}</span>}
                                            <span className="sn-result__err-reason">{e.reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <button type="button" className="sn-btn-ghost" onClick={handleReset}>Nueva Carga</button>
                    </div>
                )}

                {/* ── Success PDF ───────────────────────────────────────── */}
                {state.status === 'pdf-success' && (
                    <div className="sn-result sn-result--success">
                        <CheckCircle2 size={28} className="sn-result__icon" />
                        <p className="sn-result__title">PDF subido correctamente</p>
                        <p className="sn-result__detail">{state.filename}</p>
                        <button type="button" className="sn-btn-ghost" onClick={handleReset}>Nueva Carga</button>
                    </div>
                )}

                {/* ── Error ─────────────────────────────────────────────── */}
                {state.status === 'error' && (
                    <div className="sn-result sn-result--error">
                        <AlertCircle size={28} className="sn-result__icon" />
                        <p className="sn-result__title">Error</p>
                        <p className="sn-result__detail">{state.message}</p>
                        <button type="button" className="sn-btn-ghost" onClick={handleReset}>Intentar de nuevo</button>
                    </div>
                )}

                {/* Info banner */}
                {(state.status === 'idle' || state.status === 'dragging') && (
                    <div className="sn-info-block">
                        <AlertCircle size={16} className="sn-info-block__icon" />
                        <div>
                            <p className="sn-info-block__title">Columnas requeridas en el archivo</p>
                            <p className="sn-info-block__body">
                                Requeridas: <code>Nombre completo</code>, <code>Carné</code>,{' '}
                                <code>Fase académica</code>, <code>Estado</code> ("aprobado"/"desaprobado").{' '}
                                Opcional: <code>Correo electrónico</code>.
                            </p>
                        </div>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    className="sn-file-input"
                    onChange={handleInputChange}
                    aria-label="Seleccionar archivo"
                />
            </div>
        </div>
    );
};

export default BulkUploadCard;
