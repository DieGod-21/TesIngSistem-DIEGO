/**
 * ApprovalToggle.tsx
 *
 * Toggle de aprobación estilo iOS / "Liquid Glass".
 * - Role: switch (aria-checked)
 * - Teclado: Space / Enter para activar
 * - Foco: anillo visible solo con teclado (focus-visible)
 * - Sin librerías de animación — CSS puro (approval-toggle.css)
 */

import React, { useCallback, useId } from 'react';
import '../../styles/approval-toggle.css';

export interface ApprovalToggleProps {
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
    label?: string;
}

const ApprovalToggle: React.FC<ApprovalToggleProps> = ({
    checked,
    onChange,
    disabled = false,
    label,
}) => {
    const id = useId();

    const toggle = useCallback(() => {
        if (!disabled) onChange(!checked);
    }, [checked, disabled, onChange]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                toggle();
            }
        },
        [toggle],
    );

    return (
        <div
            id={id}
            role="switch"
            aria-checked={checked}
            aria-disabled={disabled}
            aria-label={label ?? (checked ? 'Aprobado' : 'Pendiente')}
            tabIndex={disabled ? -1 : 0}
            data-checked={String(checked)}
            className="at-root"
            onClick={toggle}
            onKeyDown={handleKeyDown}
        >
            <div className="at-track" aria-hidden="true">
                <div className="at-thumb" />
            </div>
            {label && <span className="at-label">{label}</span>}
        </div>
    );
};

export default ApprovalToggle;
