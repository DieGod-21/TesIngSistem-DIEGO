/**
 * AcademicPhasesPage.tsx
 *
 * Página /academic-phases — Administración de Fases Académicas.
 * Accesible únicamente para usuarios con rol "admin".
 *
 * Funcionalidades:
 *  - Tabla de todas las fases (activas e inactivas)
 *  - Formulario para crear nueva fase
 *  - Edición inline por fila
 *  - Toggle activa/inactiva por fila
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useHistory } from 'react-router-dom';
import { ChevronRight, Plus, Save, X, Power, PowerOff, Edit2 } from 'lucide-react';
import AppShell from '../layout/AppShell';
import { useAuth } from '../context/AuthContext';
import type { AcademicPhase } from '../services/academicPhasesService';
import {
    getAllAcademicPhases,
    createAcademicPhase,
    updateAcademicPhase,
    toggleAcademicPhase,
} from '../services/academicPhasesService';
import '../styles/academic-phases.css';
import '../styles/student-new.css';
import '../styles/students-list.css';

const AcademicPhasesPage: React.FC = () => {
    const { user } = useAuth();
    const history  = useHistory();

    const [phases,   setPhases]   = useState<AcademicPhase[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);

    // ─── Create form ──────────────────────────────────────────────────
    const [newName,      setNewName]      = useState('');
    const [newDesc,      setNewDesc]      = useState('');
    const [creating,     setCreating]     = useState(false);
    const [createError,  setCreateError]  = useState<string | null>(null);

    // ─── Inline edit ──────────────────────────────────────────────────
    const [editId,    setEditId]    = useState<number | null>(null);
    const [editName,  setEditName]  = useState('');
    const [editDesc,  setEditDesc]  = useState('');
    const [saving,    setSaving]    = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    // ─── Toggle ───────────────────────────────────────────────────────
    const [togglingId,   setTogglingId]   = useState<number | null>(null);
    const [confirmPhase, setConfirmPhase] = useState<AcademicPhase | null>(null);

    useEffect(() => {
        if (user?.role !== 'admin') {
            history.replace('/dashboard');
            return;
        }
        load();
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    async function load() {
        setLoading(true);
        setPageError(null);
        try {
            const data = await getAllAcademicPhases();
            setPhases(data);
        } catch {
            setPageError('Error al cargar las fases académicas. Intenta recargar la página.');
        } finally {
            setLoading(false);
        }
    }

    // ─── Crear ────────────────────────────────────────────────────────

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        const name        = newName.trim();
        const description = newDesc.trim();
        if (!name || !description) {
            setCreateError('Nombre y descripción son obligatorios.');
            return;
        }
        setCreating(true);
        setCreateError(null);
        try {
            const created = await createAcademicPhase({ name, description });
            setPhases((prev) => [...prev, created]);
            setNewName('');
            setNewDesc('');
        } catch (err: unknown) {
            setCreateError(err instanceof Error ? err.message : 'Error al crear la fase.');
        } finally {
            setCreating(false);
        }
    }

    // ─── Editar ───────────────────────────────────────────────────────

    function startEdit(phase: AcademicPhase) {
        setEditId(phase.id);
        setEditName(phase.name);
        setEditDesc(phase.description ?? '');
        setEditError(null);
    }

    function cancelEdit() {
        setEditId(null);
        setEditError(null);
    }

    async function handleSaveEdit(id: number) {
        const name        = editName.trim();
        const description = editDesc.trim();
        if (!name || !description) {
            setEditError('Nombre y descripción son obligatorios.');
            return;
        }
        setSaving(true);
        setEditError(null);
        try {
            const updated = await updateAcademicPhase(id, { name, description });
            setPhases((prev) => prev.map((p) => (p.id === id ? updated : p)));
            setEditId(null);
        } catch (err: unknown) {
            setEditError(err instanceof Error ? err.message : 'Error al guardar los cambios.');
        } finally {
            setSaving(false);
        }
    }

    // ─── Toggle ───────────────────────────────────────────────────────

    function requestToggle(phase: AcademicPhase) {
        if (phase.is_active) {
            setConfirmPhase(phase);
        } else {
            executeToggle(phase.id);
        }
    }

    async function executeToggle(id: number) {
        setConfirmPhase(null);
        setTogglingId(id);
        try {
            const updated = await toggleAcademicPhase(id);
            setPhases((prev) => prev.map((p) => (p.id === id ? updated : p)));
        } catch {
            /* silencioso */
        } finally {
            setTogglingId(null);
        }
    }

    // ─── Render ───────────────────────────────────────────────────────

    return (
        <>
        <AppShell>
            <div className="ap-body">

                {/* Breadcrumb */}
                <nav className="sn-breadcrumb" aria-label="Navegación secundaria">
                    <span className="sn-breadcrumb__item">Inicio</span>
                    <ChevronRight size={14} className="sn-breadcrumb__sep" />
                    <span className="sn-breadcrumb__item sn-breadcrumb__item--active">
                        Fases Académicas
                    </span>
                </nav>

                {/* Encabezado */}
                <div className="sl-page-header">
                    <div className="sl-page-title-group">
                        <h1 className="sl-page-title">Fases Académicas</h1>
                        <p className="sl-page-subtitle">
                            Administración de fases del proceso de graduación
                        </p>
                    </div>
                </div>

                {/* Formulario de creación */}
                <div className="ap-create-card">
                    <div className="ap-create-header">
                        <div className="ap-create-icon-badge">
                            <Plus size={20} />
                        </div>
                        <div className="ap-create-title-group">
                            <h2 className="ap-create-title">Nueva Fase Académica</h2>
                            <p className="ap-create-subtitle">
                                Agrega una nueva fase disponible en todo el sistema
                            </p>
                        </div>
                    </div>
                    <div className="ap-create-divider" />
                    <form className="ap-create-body" onSubmit={handleCreate} noValidate>
                        <div className="ap-create-fields">
                            <div className="ap-field">
                                <label className="ap-field__label" htmlFor="ap-new-name">
                                    Código / Nombre <span className="ap-field__required">*</span>
                                </label>
                                <input
                                    id="ap-new-name"
                                    type="text"
                                    className="ap-field__input"
                                    placeholder="Ej. ANTEPROYECTO"
                                    maxLength={80}
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>
                            <div className="ap-field">
                                <label className="ap-field__label" htmlFor="ap-new-desc">
                                    Descripción <span className="ap-field__required">*</span>
                                </label>
                                <input
                                    id="ap-new-desc"
                                    type="text"
                                    className="ap-field__input"
                                    placeholder="Ej. Fase de Anteproyecto"
                                    maxLength={200}
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                />
                            </div>
                            <div className="ap-create-actions">
                                <button
                                    type="submit"
                                    className="ap-create-btn"
                                    disabled={creating}
                                    aria-busy={creating}
                                >
                                    <Plus size={16} />
                                    {creating ? 'Creando…' : 'Crear Fase'}
                                </button>
                            </div>
                        </div>
                        {createError && (
                            <p className="ap-form-error" role="alert">{createError}</p>
                        )}
                    </form>
                </div>

                {/* Tabla */}
                <div className="sl-table-wrap">
                    {pageError && (
                        <p className="ap-page-error" role="alert">{pageError}</p>
                    )}
                    <table className="sl-table" aria-label="Fases académicas">
                        <thead>
                            <tr>
                                <th className="sl-table__th">Código</th>
                                <th className="sl-table__th">Descripción</th>
                                <th className="sl-table__th">Estado</th>
                                <th className="sl-table__th">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={4} className="sl-table__td ap-loading">
                                        Cargando fases…
                                    </td>
                                </tr>
                            )}
                            {!loading && phases.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="sl-table__td">
                                        <div className="sl-empty">
                                            <p className="sl-empty__title">Sin fases registradas</p>
                                            <p className="sl-empty__sub">
                                                Crea la primera fase usando el formulario de arriba.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!loading && [...phases]
                            .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' }))
                            .map((phase) =>
                                editId === phase.id ? (
                                    /* ── Fila en modo edición ── */
                                    <tr key={phase.id} className="sl-table__tr ap-row--editing">
                                        <td className="sl-table__td">
                                            <input
                                                type="text"
                                                className="ap-input ap-input--sm"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                maxLength={80}
                                                autoFocus
                                                aria-label="Nombre de la fase"
                                            />
                                        </td>
                                        <td className="sl-table__td">
                                            <input
                                                type="text"
                                                className="ap-input ap-input--sm"
                                                value={editDesc}
                                                onChange={(e) => setEditDesc(e.target.value)}
                                                maxLength={200}
                                                aria-label="Descripción de la fase"
                                            />
                                            {editError && (
                                                <p className="ap-form-error" role="alert">{editError}</p>
                                            )}
                                        </td>
                                        <td className="sl-table__td">
                                            <span className={`ap-status-badge${phase.is_active ? ' ap-status-badge--active' : ' ap-status-badge--inactive'}`}>
                                                {phase.is_active ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </td>
                                        <td className="sl-table__td">
                                            <div className="ap-actions">
                                                <button
                                                    className="ap-btn ap-btn--save"
                                                    onClick={() => handleSaveEdit(phase.id)}
                                                    disabled={saving}
                                                    title="Guardar cambios"
                                                >
                                                    <Save size={15} />
                                                    {saving ? 'Guardando…' : 'Guardar'}
                                                </button>
                                                <button
                                                    className="ap-btn ap-btn--cancel"
                                                    onClick={cancelEdit}
                                                    disabled={saving}
                                                    title="Cancelar edición"
                                                >
                                                    <X size={15} />
                                                    Cancelar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    /* ── Fila normal ── */
                                    <tr
                                        key={phase.id}
                                        className={`sl-table__tr${!phase.is_active ? ' ap-row--inactive' : ''}`}
                                    >
                                        <td className="sl-table__td ap-code">{phase.name}</td>
                                        <td className="sl-table__td">{phase.description ?? '—'}</td>
                                        <td className="sl-table__td">
                                            <span className={`ap-status-badge${phase.is_active ? ' ap-status-badge--active' : ' ap-status-badge--inactive'}`}>
                                                {phase.is_active ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </td>
                                        <td className="sl-table__td">
                                            <div className="ap-actions">
                                                <button
                                                    className="ap-btn ap-btn--edit"
                                                    onClick={() => startEdit(phase)}
                                                    title="Editar fase"
                                                >
                                                    <Edit2 size={15} />
                                                    Editar
                                                </button>
                                                <button
                                                    className={`ap-btn${phase.is_active ? ' ap-btn--deactivate' : ' ap-btn--activate'}`}
                                                    onClick={() => requestToggle(phase)}
                                                    disabled={togglingId === phase.id}
                                                    title={phase.is_active ? 'Desactivar fase' : 'Activar fase'}
                                                >
                                                    {phase.is_active
                                                        ? <PowerOff size={15} />
                                                        : <Power size={15} />}
                                                    {togglingId === phase.id
                                                        ? '…'
                                                        : phase.is_active ? 'Desactivar' : 'Activar'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

        </AppShell>

            {/* Modal de confirmación — portal a document.body para evitar stacking context de IonContent */}
            {confirmPhase && ReactDOM.createPortal(
                <div className="ap-modal-overlay" onClick={() => setConfirmPhase(null)}>
                    <div className="ap-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ap-modal-title">
                        <h3 id="ap-modal-title" className="ap-modal__title">¿Desactivar fase?</h3>
                        <p className="ap-modal__body">
                            ¿Estás seguro de que deseas desactivar <strong>{confirmPhase.name}</strong>?
                            Los estudiantes no podrán seleccionarla hasta que sea reactivada.
                        </p>
                        <div className="ap-modal__actions">
                            <button
                                className="ap-btn ap-btn--cancel"
                                onClick={() => setConfirmPhase(null)}
                            >
                                <X size={15} />
                                Cancelar
                            </button>
                            <button
                                className="ap-btn ap-btn--deactivate"
                                onClick={() => executeToggle(confirmPhase.id)}
                                disabled={togglingId === confirmPhase.id}
                            >
                                <PowerOff size={15} />
                                {togglingId === confirmPhase.id ? 'Desactivando…' : 'Desactivar'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default AcademicPhasesPage;
