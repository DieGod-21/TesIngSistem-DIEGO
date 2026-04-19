import React from 'react';
import PanelCard from './PanelCard';
import type { Panel } from '../types/evaluation';

interface PanelListProps {
    panels: Panel[];
    onSelectPanel: (panelId: string) => void;
}

const PanelList: React.FC<PanelListProps> = ({ panels, onSelectPanel }) => {
    if (panels.length === 0) {
        return (
            <div className="ev-panel-list">
                <p className="ev-panel-list__empty">No hay ternas disponibles en este momento.</p>
            </div>
        );
    }

    return (
        <div className="ev-panel-list" role="list" aria-label="Ternas de evaluación">
            {panels.map((panel) => (
                <div key={panel.id} role="listitem">
                    <PanelCard panel={panel} onEnter={onSelectPanel} />
                </div>
            ))}
        </div>
    );
};

export default PanelList;
