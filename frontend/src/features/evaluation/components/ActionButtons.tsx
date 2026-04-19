import React from 'react';
import { Send, Save, RefreshCw, CheckCircle } from 'lucide-react';

interface ActionButtonsProps {
    onSubmit:    () => void;
    onSaveDraft: () => void;
    submitting:  boolean;
    saving:      boolean;
    submitted?:  boolean;
    draftSaved?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
    onSubmit,
    onSaveDraft,
    submitting,
    saving,
    submitted  = false,
    draftSaved = false,
}) => (
    <div className="ev-section ev-actions">
        <h3 className="ev-section__title">Acciones</h3>
        <div className="ev-actions__row">
            <button
                type="button"
                className={`ev-actions__submit${submitted ? ' ev-actions__submit--success' : ''}`}
                onClick={onSubmit}
                disabled={submitting || saving}
                aria-label="Enviar terna"
            >
                {submitting ? (
                    <><RefreshCw size={15} className="ev-actions__spinner" aria-hidden="true" /> Enviando…</>
                ) : submitted ? (
                    <><CheckCircle size={15} aria-hidden="true" /> Terna Enviada</>
                ) : (
                    <><Send size={15} aria-hidden="true" /> Enviar Terna</>
                )}
            </button>

            <button
                type="button"
                className={`ev-actions__draft${draftSaved ? ' ev-actions__draft--saved' : ''}`}
                onClick={onSaveDraft}
                disabled={submitting || saving}
                aria-label="Guardar borrador"
            >
                {saving ? (
                    <><RefreshCw size={15} className="ev-actions__spinner" aria-hidden="true" /> Guardando…</>
                ) : draftSaved ? (
                    <><CheckCircle size={15} aria-hidden="true" /> Guardado</>
                ) : (
                    <><Save size={15} aria-hidden="true" /> Guardar Borrador</>
                )}
            </button>
        </div>
        <p className="ev-actions__note">Los cambios se guardan automáticamente</p>
    </div>
);

export default ActionButtons;
