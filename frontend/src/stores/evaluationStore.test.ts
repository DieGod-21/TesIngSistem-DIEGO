import { describe, it, expect, beforeEach } from 'vitest';
import { useEvaluationStore, hayCambiosSinGuardar } from './evaluationStore';

const store = () => useEvaluationStore.getState();

describe('evaluationStore — lo tecleado sobrevive a la navegación', () => {
    beforeEach(() => store().limpiar());

    it('empieza sin nada', () => {
        expect(store().leer(1)).toBeUndefined();
    });

    it('conserva lo escrito para cada terna por separado', () => {
        store().escribir(1, { calificacion: '85' });
        store().escribir(2, { comentarios: 'Falta el análisis de riesgos.' });

        expect(store().leer(1)).toEqual({ calificacion: '85', comentarios: '' });
        expect(store().leer(2)).toEqual({ calificacion: '', comentarios: 'Falta el análisis de riesgos.' });
    });

    it('mezcla cambios parciales sin borrar el otro campo', () => {
        store().escribir(1, { calificacion: '90' });
        store().escribir(1, { comentarios: 'Buen trabajo.' });
        expect(store().leer(1)).toEqual({ calificacion: '90', comentarios: 'Buen trabajo.' });
    });

    it('descarta una terna sin tocar las demás', () => {
        store().escribir(1, { calificacion: '70' });
        store().escribir(2, { calificacion: '80' });
        store().descartar(1);
        expect(store().leer(1)).toBeUndefined();
        expect(store().leer(2)?.calificacion).toBe('80');
    });

    it('descartar algo que no existe no cambia la referencia del estado', () => {
        const antes = useEvaluationStore.getState().borradores;
        store().descartar(999);
        expect(useEvaluationStore.getState().borradores).toBe(antes);
    });

    it('limpiar vacía todo (cierre de sesión)', () => {
        store().escribir(1, { calificacion: '70' });
        store().escribir(2, { calificacion: '80' });
        store().limpiar();
        expect(store().leer(1)).toBeUndefined();
        expect(store().leer(2)).toBeUndefined();
    });
});

describe('hayCambiosSinGuardar', () => {
    it('sin nada tecleado no hay cambios', () => {
        expect(hayCambiosSinGuardar(undefined, { calificacion: 80, comentarios: 'x' })).toBe(false);
    });

    it('detecta una calificación distinta de la del servidor', () => {
        expect(hayCambiosSinGuardar(
            { calificacion: '85', comentarios: '' },
            { calificacion: 80, comentarios: null },
        )).toBe(true);
    });

    it('no marca cambios cuando lo tecleado coincide con el servidor', () => {
        expect(hayCambiosSinGuardar(
            { calificacion: '80', comentarios: 'Buen trabajo.' },
            { calificacion: 80, comentarios: 'Buen trabajo.' },
        )).toBe(false);
    });

    it('ignora los espacios de más', () => {
        expect(hayCambiosSinGuardar(
            { calificacion: ' 80 ', comentarios: ' Buen trabajo. ' },
            { calificacion: 80, comentarios: 'Buen trabajo.' },
        )).toBe(false);
    });

    it('detecta observaciones nuevas sobre una terna sin comentarios', () => {
        expect(hayCambiosSinGuardar(
            { calificacion: '', comentarios: 'Nueva observación' },
            { calificacion: null, comentarios: null },
        )).toBe(true);
    });
});
