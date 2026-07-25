import { describe, it, expect } from 'vitest';
import { STAGE_ORDER } from './pipelineMeta';

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
});
