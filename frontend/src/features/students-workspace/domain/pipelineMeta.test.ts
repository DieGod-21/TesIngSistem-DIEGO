import { describe, it, expect } from 'vitest';
import { STAGE_ORDER, WORK_ITEM_KINDS } from './pipelineMeta';

describe('pipelineMeta — enumeraciones canónicas', () => {
    it('STAGE_ORDER cubre las 8 etapas en orden de journey', () => {
        expect(STAGE_ORDER).toEqual([
            'sin_datos',
            'pg1_pendiente',
            'pg2_pendiente',
            'no_elegible',
            'elegible_sin_caso',
            'en_terna',
            'terna_estancada',
            'resuelto',
        ]);
    });

    it('WORK_ITEM_KINDS cubre los 6 tipos de trabajo', () => {
        expect([...WORK_ITEM_KINDS].sort()).toEqual([
            'cerrar_resolucion',
            'crear_caso',
            'registrar_nota_pg1',
            'registrar_nota_pg2',
            'revisar_no_elegible',
            'terna_estancada',
        ]);
    });
});
