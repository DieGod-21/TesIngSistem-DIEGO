import { describe, it, expect, afterEach } from 'vitest';
import { shouldFireHotkey, isEditableTarget, isModalOpen, type HotkeyEventLike } from './useGlobalHotkey';

/**
 * Lo que hace peligroso un atajo global es cuándo NO debe dispararse. Un "/"
 * que se cuela mientras el coordinador escribe el nombre de un estudiante
 * destruye lo que estaba tecleando: es peor que no tener atajo.
 */

const ev = (over: Partial<HotkeyEventLike> = {}): HotkeyEventLike => ({
    key: '/',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    defaultPrevented: false,
    target: null,
    ...over,
});

const input = { tagName: 'INPUT', isContentEditable: false } as unknown as EventTarget;
const textarea = { tagName: 'TEXTAREA', isContentEditable: false } as unknown as EventTarget;
const editableDiv = { tagName: 'DIV', isContentEditable: true } as unknown as EventTarget;
const plainDiv = { tagName: 'DIV', isContentEditable: false } as unknown as EventTarget;

describe('isEditableTarget', () => {
    it('reconoce los controles donde el usuario escribe', () => {
        expect(isEditableTarget(input)).toBe(true);
        expect(isEditableTarget(textarea)).toBe(true);
        expect(isEditableTarget({ tagName: 'SELECT' } as unknown as EventTarget)).toBe(true);
        expect(isEditableTarget(editableDiv)).toBe(true);
    });

    it('no confunde elementos normales ni valores ausentes', () => {
        expect(isEditableTarget(plainDiv)).toBe(false);
        expect(isEditableTarget(null)).toBe(false);
        expect(isEditableTarget(undefined)).toBe(false);
    });
});

describe('shouldFireHotkey — atajo sin modificador ("/")', () => {
    const slash = { key: '/' };

    it('dispara con el foco fuera de un campo', () => {
        expect(shouldFireHotkey(ev({ target: plainDiv }), slash)).toBe(true);
    });

    it('NO dispara mientras se escribe: destruiría el texto', () => {
        expect(shouldFireHotkey(ev({ target: input }), slash)).toBe(false);
        expect(shouldFireHotkey(ev({ target: textarea }), slash)).toBe(false);
        expect(shouldFireHotkey(ev({ target: editableDiv }), slash)).toBe(false);
    });

    it('NO roba combinaciones del navegador con modificador', () => {
        expect(shouldFireHotkey(ev({ ctrlKey: true }), slash)).toBe(false);
        expect(shouldFireHotkey(ev({ metaKey: true }), slash)).toBe(false);
    });

    it('ignora otras teclas', () => {
        expect(shouldFireHotkey(ev({ key: 'k' }), slash)).toBe(false);
        expect(shouldFireHotkey(ev({ key: '?' }), slash)).toBe(false);
    });
});

describe('shouldFireHotkey — atajo con modificador (⌘K / Ctrl+K)', () => {
    const modK = { key: 'k', mod: true };

    it('dispara con Ctrl o con Cmd, indistintamente', () => {
        expect(shouldFireHotkey(ev({ key: 'k', ctrlKey: true }), modK)).toBe(true);
        expect(shouldFireHotkey(ev({ key: 'k', metaKey: true }), modK)).toBe(true);
    });

    it('SÍ dispara escribiendo: es la convención de ⌘K', () => {
        expect(shouldFireHotkey(ev({ key: 'k', metaKey: true, target: input }), modK)).toBe(true);
    });

    it('no dispara sin el modificador: "k" es una letra que se teclea', () => {
        expect(shouldFireHotkey(ev({ key: 'k' }), modK)).toBe(false);
    });
});

describe('isModalOpen — el diálogo es dueño del teclado', () => {
    afterEach(() => { document.body.innerHTML = ''; });

    it('sin diálogos abiertos, el atajo puede actuar', () => {
        expect(isModalOpen()).toBe(false);
    });

    it('detecta cualquier diálogo modal del producto', () => {
        // Quick View, importación, confirmación, edición de nota y las altas
        // declaran todos aria-modal="true".
        document.body.innerHTML = '<div role="dialog" aria-modal="true"></div>';
        expect(isModalOpen()).toBe(true);
    });

    it('no confunde un contenedor no modal', () => {
        document.body.innerHTML = '<div role="dialog"></div>';
        expect(isModalOpen()).toBe(false);
    });
});

describe('shouldFireHotkey — reglas transversales', () => {
    it('Alt nunca participa: se reserva al sistema operativo', () => {
        expect(shouldFireHotkey(ev({ altKey: true }), { key: '/' })).toBe(false);
        expect(shouldFireHotkey(ev({ key: 'k', ctrlKey: true, altKey: true }), { key: 'k', mod: true }))
            .toBe(false);
    });

    it('respeta a quien ya canceló el evento', () => {
        expect(shouldFireHotkey(ev({ defaultPrevented: true, target: plainDiv }), { key: '/' }))
            .toBe(false);
    });
});
