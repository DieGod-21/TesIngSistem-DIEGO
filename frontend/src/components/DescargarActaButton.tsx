/**
 * DescargarActaButton.tsx
 *
 * Descarga el acta de evaluación de una terna en PDF
 * (GET /api/reportes/ternas/{id}/acta.pdf). El servidor decide quién puede:
 * admin, cualquier terna; evaluador, solo las suyas. El contrato declara el
 * formato como provisional, pendiente del oficial de la facultad.
 */

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from './ui';
import { descargarActaTerna } from '../services/reportesService';
import { userMessageFor } from '../services/errorMessages';
import { useToast } from '../context/ToastContext';

interface Props {
    ternaId: number;
    numero?: number;
}

const DescargarActaButton: React.FC<Props> = ({ ternaId, numero }) => {
    const { toast } = useToast();
    const [descargando, setDescargando] = useState(false);

    const descargar = async () => {
        setDescargando(true);
        try {
            await descargarActaTerna(ternaId, numero);
        } catch (e) {
            toast.error(userMessageFor(e) || 'No se pudo descargar el acta.');
        } finally {
            setDescargando(false);
        }
    };

    return (
        <Button
            variant="secondary"
            onClick={descargar}
            loading={descargando}
            title="Formato provisional, sujeto al formato oficial de la facultad."
        >
            <Download size={16} aria-hidden="true" />
            Descargar acta (PDF)
        </Button>
    );
};

export default DescargarActaButton;
