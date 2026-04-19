import React from 'react';

interface ObservationBoxProps {
    value: string;
    onChange: (value: string) => void;
}

const ObservationBox: React.FC<ObservationBoxProps> = ({ value, onChange }) => (
    <div className="ev-section">
        <h3 className="ev-section__title">Observaciones</h3>
        <label htmlFor="ev-observations" className="ev-obs__label">
            Comentarios adicionales para el estudiante
        </label>
        <textarea
            id="ev-observations"
            className="ev-obs__textarea"
            value={value}
            placeholder="Escribe tus observaciones aquí…"
            rows={5}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

export default ObservationBox;
