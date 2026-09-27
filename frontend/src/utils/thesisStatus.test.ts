import { describe, it, expect } from 'vitest';
import { veredictoTesis } from './thesisStatus';
import type { EstadoTesis } from '../types/api';

const curso = (nota: number, codigo: '043' | '049') => ({
    nota_final: nota,
    estado: nota >= 70 ? 'APROBADO' as const : 'REPROBADO' as const,
    curso: codigo,
    ciclo: 'Ciclo 1-2025',
});

function servidor(pg1: number | null, pg2: number | null, aprueba: boolean, razon = 'Razón del servidor'): EstadoTesis {
    return {
        carnet: '1890-00-1',
        nombre: 'X',
        aprueba_tesis: aprueba,
        razon,
        nota_minima: 70,
        promedio: null,
        graduacion_1: pg1 == null ? null : curso(pg1, '043'),
        graduacion_2: pg2 == null ? null : curso(pg2, '049'),
    };
}

describe('veredictoTesis: el servidor es la autoridad', () => {
    it('falta una nota → PENDIENTE, diga lo que diga el servidor', () => {
        const v = veredictoTesis(servidor(90, null, false), { pg1: 90, pg2: null });
        expect(v.estado).toBe('PENDIENTE');
        expect(v.aprobado).toBe(false);
        expect(v.divergente).toBe(false);
    });

    it('con ambas notas usa aprueba_tesis, razón y mínimo del servidor', () => {
        const s = { ...servidor(0, 90, false, 'No aprueba por: Proyecto de Graduación I: 0 pts (NSP)'), nota_minima: 75 };
        const v = veredictoTesis(s, { pg1: 0, pg2: 90 });
        expect(v.estado).toBe('REPROBADO');
        expect(v.razon).toBe('No aprueba por: Proyecto de Graduación I: 0 pts (NSP)');
        expect(v.notaMinima).toBe(75);
        expect(v.divergente).toBe(false);
    });

    it('si el servidor discrepa de la regla local, manda el servidor y se marca', () => {
        const v = veredictoTesis(servidor(72, 71, false), { pg1: 72, pg2: 71 });
        expect(v.estado).toBe('REPROBADO');
        expect(v.divergente).toBe(true);
    });

    it('sin respuesta del servidor → regla local como respaldo', () => {
        const v = veredictoTesis(null, { pg1: 80, pg2: 69 });
        expect(v.estado).toBe('REPROBADO');
        expect(v.notaMinima).toBe(70);
        expect(v.razon).toContain('No alcanza la nota mínima');
    });

    it('si el servidor no tenía una nota que llegó por /notas, no se usa su veredicto', () => {
        const v = veredictoTesis(servidor(85, null, false), { pg1: 85, pg2: 90 });
        expect(v.estado).toBe('APROBADO');
        expect(v.divergente).toBe(false);
    });

    it('sin razón del servidor se usa el texto local', () => {
        const v = veredictoTesis(servidor(90, 95, true, ''), { pg1: 90, pg2: 95 });
        expect(v.estado).toBe('APROBADO');
        expect(v.razon).toContain('Cumple con la nota mínima');
    });
});
