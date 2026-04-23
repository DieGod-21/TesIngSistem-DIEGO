/**
 * BulkUploadCard.tsx
 *
 * Carga masiva de estudiantes → POST /api/importar/estudiantes.
 * Drag & drop + input file. Muestra estado de carga, resultado y errores.
 * Endpoint único; no existe historial de cargas en el backend, por lo
 * que no se intenta mostrar uno.
 */

import React, { useRef, useState } from 'react';
import { IonToast } from '@ionic/react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { importarEstudiantes, type ImportarEstudiantesResult } from '../../services/importarService';

const ACCEPTED_EXT = ['.xlsx', '.xls', '.pdf'];
const ACCEPTED_MIME = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/pdf',
];

function isAcceptedFile(f: File): boolean {
    const name = f.name.toLowerCase();
    if (ACCEPTED_EXT.some((ext) => name.endsWith(ext))) return true;
    return ACCEPTED_MIME.includes(f.type);
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const BulkUploadCard: React.FC = () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile]         = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult]     = useState<ImportarEstudiantesResult | null>(null);
    const [error, setError]       = useState<string | null>(null);
    const [toast, setToast]       = useState<{ open: boolean; message: string; color: string }>({
        open: false, message: '', color: 'success',
    });

    const pickFile = (f: File | null) => {
        setResult(null);
        setError(null);
        if (!f) { setFile(null); return; }
        if (!isAcceptedFile(f)) {
            setError('Formato no válido. Usa .xlsx, .xls o .pdf.');
            setFile(null);
            return;
        }
        setFile(f);
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0] ?? null;
        pickFile(f);
    };

    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(true);
    };

    const upload = async () => {
        if (!file || uploading) return;
        setUploading(true);
        setError(null);
        setResult(null);
        try {
            const res = await importarEstudiantes(file);
            setResult(res);
            setToast({
                open: true,
                message: res.mensaje ?? res.message ?? 'Importación completada.',
                color: 'success',
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'No se pudo importar el archivo.';
            setError(msg);
            setToast({ open: true, message: msg, color: 'danger' });
        } finally {
            setUploading(false);
        }
    };

    const clear = () => {
        setFile(null);
        setResult(null);
        setError(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <>
            <div className="sn-card">
                <div className="sn-card__header">
                    <UploadCloud size={20} className="sn-card__header-icon" />
                    <h3 className="sn-card__title">Carga Masiva</h3>
                </div>

                <div
                    className={`sn-dropzone${dragging ? ' sn-dropzone--dragging' : ''}`}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={() => setDragging(false)}
                    onClick={() => inputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            inputRef.current?.click();
                        }
                    }}
                    aria-label="Zona de carga: arrastra un archivo o haz clic para seleccionarlo"
                >
                    <UploadCloud size={32} className="sn-dropzone__icon" aria-hidden="true" />
                    <p className="sn-dropzone__title">Arrastra tu archivo aquí</p>
                    <p className="sn-dropzone__hint">
                        o <span className="sn-dropzone__link">haz clic para seleccionarlo</span>
                    </p>
                    <p className="sn-dropzone__formats">Formatos: .xlsx · .xls · .pdf</p>

                    <input
                        ref={inputRef}
                        type="file"
                        accept={ACCEPTED_EXT.join(',')}
                        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                        className="sn-dropzone__input"
                        aria-hidden="true"
                        tabIndex={-1}
                    />
                </div>

                {file && (
                    <div className="sn-file-chip" role="status">
                        <FileSpreadsheet size={18} aria-hidden="true" />
                        <div className="sn-file-chip__meta">
                            <p className="sn-file-chip__name">{file.name}</p>
                            <p className="sn-file-chip__size">{formatBytes(file.size)}</p>
                        </div>
                        <button
                            type="button"
                            className="sn-file-chip__clear"
                            onClick={(e) => { e.stopPropagation(); clear(); }}
                            aria-label="Quitar archivo"
                            disabled={uploading}
                        >
                            <X size={16} aria-hidden="true" />
                        </button>
                    </div>
                )}

                {error && (
                    <div className="sn-upload-msg sn-upload-msg--error" role="alert">
                        <AlertCircle size={16} aria-hidden="true" />
                        <span>{error}</span>
                    </div>
                )}

                {result && (
                    <div className="sn-upload-msg sn-upload-msg--success" role="status">
                        <CheckCircle2 size={16} aria-hidden="true" />
                        <div>
                            <strong>Importación completada.</strong>
                            <ul className="sn-upload-msg__list">
                                {typeof result.total      === 'number' && <li>Total procesados: {result.total}</li>}
                                {typeof result.creados    === 'number' && <li>Creados: {result.creados}</li>}
                                {typeof result.duplicados === 'number' && <li>Duplicados: {result.duplicados}</li>}
                                {Array.isArray(result.errores) && result.errores.length > 0 && (
                                    <li>Con errores: {result.errores.length}</li>
                                )}
                            </ul>
                        </div>
                    </div>
                )}

                <div className="sn-form__actions">
                    <button
                        type="button"
                        className="sn-btn-primary"
                        onClick={upload}
                        disabled={!file || uploading}
                        aria-busy={uploading}
                    >
                        <UploadCloud size={16} />
                        {uploading ? 'Importando…' : 'Importar archivo'}
                    </button>
                    <button
                        type="button"
                        className="sn-btn-secondary"
                        onClick={clear}
                        disabled={uploading || (!file && !result && !error)}
                    >
                        Limpiar
                    </button>
                </div>
            </div>

            <IonToast
                isOpen={toast.open}
                message={toast.message}
                color={toast.color}
                duration={3000}
                position="bottom"
                onDidDismiss={() => setToast((t) => ({ ...t, open: false }))}
            />
        </>
    );
};

export default BulkUploadCard;
