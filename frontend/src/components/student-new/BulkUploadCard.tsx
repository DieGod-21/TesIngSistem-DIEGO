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
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, X, AlertTriangle } from 'lucide-react';
import { importarEstudiantes, type ImportarEstudiantesResult } from '../../services/importarService';
import { Alert, Button, Card } from '../ui';
import { userMessageFor } from '../../services/errorMessages';

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
                message: res.mensaje ?? `${res.estudiantes.total_procesados} estudiante${res.estudiantes.total_procesados !== 1 ? 's' : ''} procesado${res.estudiantes.total_procesados !== 1 ? 's' : ''}.`,
                color: 'success',
            });
        } catch (err: unknown) {
            const msg = userMessageFor(err) || 'No se pudo importar el archivo.';
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
            <Card className="sn-panel sn-panel--quiet">
                <div className="sn-panel__head">
                    <UploadCloud size={18} className="sn-panel__icon" aria-hidden="true" />
                    <h2 className="sn-panel__title">Carga masiva</h2>
                    <span className="sn-panel__note">Una cohorte completa</span>
                </div>

                <div className="sn-panel__body">
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
                        <UploadCloud size={26} className="sn-dropzone__icon" aria-hidden="true" />
                        <p className="sn-dropzone__title">Arrastra tu archivo aquí</p>
                        <p className="sn-dropzone__hint">
                            o <span className="sn-dropzone__link">haz clic para seleccionarlo</span>
                        </p>
                        <p className="sn-dropzone__formats">.xlsx · .xls · .pdf</p>

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
                            <FileSpreadsheet size={18} className="sn-file-chip__icon" aria-hidden="true" />
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
                        <Alert tone="danger" icon={<AlertCircle size={16} />} className="sn-alert">
                            {error}
                        </Alert>
                    )}

                    {/* Los campos que esta lista leía —`total`, `creados`,
                        `duplicados`, `errores`— no existen en el contrato: no
                        llegaban nunca y el bloque salía siempre vacío bajo el
                        título «Importación completada». Estos otros sí los declara
                        el servidor, y `filas_invalidas` decide además el tono: un
                        archivo con filas rechazadas no es un éxito. */}
                    {result && (
                        <Alert
                            tone={result.filas_invalidas > 0 ? 'warning' : 'success'}
                            icon={result.filas_invalidas > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                            title={result.filas_invalidas > 0
                                ? 'Importación completada con incidencias'
                                : 'Importación completada'}
                            className="sn-alert"
                        >
                            <ul className="ui-alert__list">
                                <li>{result.total_en_archivo} fila{result.total_en_archivo !== 1 ? 's' : ''} en el archivo</li>
                                <li>{result.estudiantes.insertados} nuevo{result.estudiantes.insertados !== 1 ? 's' : ''}
                                    {' · '}{result.estudiantes.actualizados} actualizado{result.estudiantes.actualizados !== 1 ? 's' : ''}</li>
                                {result.inscripciones_nuevas > 0 && (
                                    <li>{result.inscripciones_nuevas} inscripción{result.inscripciones_nuevas !== 1 ? 'es' : ''} nueva{result.inscripciones_nuevas !== 1 ? 's' : ''}</li>
                                )}
                                {result.filas_invalidas > 0 && (
                                    <li>{result.filas_invalidas} fila{result.filas_invalidas !== 1 ? 's' : ''} rechazada{result.filas_invalidas !== 1 ? 's' : ''}</li>
                                )}
                            </ul>
                        </Alert>
                    )}

                    <div className="sn-form__actions">
                        <Button
                            onClick={upload}
                            loading={uploading}
                            disabled={!file || uploading}
                        >
                            {!uploading && <UploadCloud size={16} aria-hidden="true" />}
                            {uploading ? 'Importando…' : 'Importar archivo'}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={clear}
                            disabled={uploading || (!file && !result && !error)}
                        >
                            Limpiar
                        </Button>
                    </div>
                </div>
            </Card>

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
