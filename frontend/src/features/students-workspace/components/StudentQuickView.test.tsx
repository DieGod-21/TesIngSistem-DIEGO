/**
 * StudentQuickView.test.tsx
 *
 * Protege el CONTRATO DE RELEVO del panel de inspección: al pasar de un
 * expediente al siguiente, lo único que puede cambiar es el contenido. El
 * marco del panel, el velo y la barra de recorrido siguen ahí, y en ningún
 * momento aparece el esqueleto de carga inicial.
 *
 * Es una regresión con historia: la vista dependía de `loading` a secas, así
 * que cada pulsación de flecha desmontaba identidad, cuerpo y pie, los
 * sustituía por cuatro barras grises y los volvía a montar. Recorrer veinte
 * expedientes se sentía como abrir veinte paneles.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import StudentQuickView from './StudentQuickView';

// El dossier se sustituye entero: este test mide la VISTA, no la cadena de
// servicios (que tiene sus propias pruebas).
vi.mock('../../../hooks/useStudentDossier', () => ({
    useStudentDossier: vi.fn(),
}));

import { useStudentDossier } from '../../../hooks/useStudentDossier';

const ESTUDIANTE = {
    id: 7, carnet: '1890-20-12293', nombre: 'José Antonio Chávez Rodas',
    email: 'jchavez@miumg.edu.gt', carrera: null, telefono: null,
};

const OTRO = { ...ESTUDIANTE, id: 8, carnet: '1890-21-12724', nombre: 'Diana Sofía Tzoc Batz' };

/** Estado del dossier con lo mínimo que la vista consume. */
function dossier(over: Record<string, unknown> = {}) {
    return {
        student: ESTUDIANTE, reporte: null, notas: null, proyectos: [],
        loading: false, error: null,
        grades: [], tesis: { estado: 'PENDIENTE', aprobado: false },
        tesisInput: null, terna: null, promedio: null, proyecto: null,
        reload: () => {},
        ...over,
    };
}

const props = {
    onClose: () => {},
    onOpenFull: () => {},
    onPrev: () => {},
    onNext: () => {},
};

describe('StudentQuickView — recorrer no reconstruye el panel', () => {
    // Cuerpo con llaves: devolver el mock haría que vitest lo tomara por una
    // función de limpieza.
    beforeEach(() => { vi.mocked(useStudentDossier).mockReset(); });

    it('primera apertura sin datos: enseña el esqueleto', () => {
        vi.mocked(useStudentDossier).mockReturnValue(
            dossier({ student: null, loading: true }) as never,
        );
        render(<StudentQuickView studentId="7" {...props} />);

        expect(screen.getByLabelText('Cargando expediente…')).toBeInTheDocument();
    });

    it('cambiando de expediente: conserva al anterior en pantalla, sin esqueleto', () => {
        // El hook mantiene los datos previos y solo levanta `loading`: es
        // exactamente lo que ocurre al pulsar la flecha.
        vi.mocked(useStudentDossier).mockReturnValue(dossier({ loading: true }) as never);
        render(<StudentQuickView studentId="8" {...props} />);

        // Lo que se ve sigue siendo el expediente anterior…
        expect(screen.getByText('José Antonio Chávez Rodas')).toBeInTheDocument();
        // …y NO el esqueleto de la primera apertura.
        expect(screen.queryByLabelText('Cargando expediente…')).toBeNull();
        // La espera se anuncia sin vaciar la pantalla.
        expect(document.querySelector('.qv-content')).toHaveAttribute('data-cambiando', 'true');
        expect(document.querySelector('.qv-content')).toHaveAttribute('aria-busy', 'true');
    });

    it('al llegar el nuevo expediente se suelta la marca de espera', () => {
        vi.mocked(useStudentDossier).mockReturnValue(dossier({ loading: true }) as never);
        const { rerender } = render(<StudentQuickView studentId="7" {...props} />);

        vi.mocked(useStudentDossier).mockReturnValue(dossier({ student: OTRO }) as never);
        rerender(<StudentQuickView studentId="8" {...props} />);

        expect(screen.getByText('Diana Sofía Tzoc Batz')).toBeInTheDocument();
        expect(document.querySelector('.qv-content')).not.toHaveAttribute('data-cambiando');
    });

    it('el marco del panel y la barra de recorrido sobreviven al relevo', () => {
        vi.mocked(useStudentDossier).mockReturnValue(dossier() as never);
        const { rerender } = render(
            <StudentQuickView studentId="7" {...props} position={{ index: 1, total: 20 }} />,
        );
        const panelAntes = document.querySelector('.qv-panel');
        const pagerAntes = document.querySelector('.qv-pager');

        vi.mocked(useStudentDossier).mockReturnValue(dossier({ student: OTRO }) as never);
        rerender(
            <StudentQuickView studentId="8" {...props} position={{ index: 2, total: 20 }} />,
        );

        // MISMO nodo, no uno equivalente: si el panel se remontara, la
        // animación de entrada volvería a correr y el recorrido se vería como
        // una sucesión de paneles nuevos.
        expect(document.querySelector('.qv-panel')).toBe(panelAntes);
        expect(document.querySelector('.qv-pager')).toBe(pagerAntes);
    });
});

describe('StudentQuickView — contador de posición', () => {
    beforeEach(() => {
        vi.mocked(useStudentDossier).mockReset();
        vi.mocked(useStudentDossier).mockReturnValue(dossier() as never);
    });

    it('separa la posición actual del total y se enuncia entero en voz alta', () => {
        render(<StudentQuickView studentId="7" {...props} position={{ index: 19, total: 20 }} />);

        // La barra oblicua se lee bien con los ojos y fatal en voz alta.
        const pos = screen.getByLabelText('Expediente 19 de 20');
        expect(pos).toBeInTheDocument();
        expect(pos.querySelector('.qv-pager__now')).toHaveTextContent('19');
        expect(pos.querySelector('.qv-pager__total')).toHaveTextContent('20');
    });

    it('sin posición conocida, el recorrido sigue disponible', () => {
        // Ocurre cuando el identificador de la URL no está en la página actual.
        render(<StudentQuickView studentId="7" {...props} />);
        expect(screen.queryByLabelText(/^Expediente \d+ de/)).toBeNull();
        expect(screen.getByRole('button', { name: /Estudiante siguiente/ })).toBeEnabled();
    });

    it('en los extremos, el control que no lleva a ninguna parte queda inerte', () => {
        render(
            <StudentQuickView
                studentId="7"
                {...props}
                onNext={undefined}
                position={{ index: 20, total: 20 }}
            />,
        );
        expect(screen.getByRole('button', { name: /Estudiante siguiente/ })).toBeDisabled();
        expect(screen.getByRole('button', { name: /Estudiante anterior/ })).toBeEnabled();
    });
});
