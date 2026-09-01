import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'light',
    toggleTheme: () => {},
});

/** Margen sobre la duración declarada antes de retirar la clase. */
const HOLGURA_MS = 40;
/** Si el token no se puede leer (jsdom no aplica hojas), este es el respaldo. */
const CAMBIO_POR_DEFECTO_MS = 180;

/**
 * Cuánto dura el fundido, según el token que lo declara.
 *
 * Se lee del CSS en vez de repetir el número aquí: con dos copias, ajustar la
 * duración en la hoja dejaría la clase puesta de más (o de menos) sin que
 * nada avisara.
 */
function duracionDelCambio(raiz: Element): number {
    const declarado = getComputedStyle(raiz).getPropertyValue('--tema-cambio-ms').trim();
    const ms = declarado.endsWith('ms') ? parseFloat(declarado)
        : declarado.endsWith('s') ? parseFloat(declarado) * 1000
        : NaN;
    return (Number.isFinite(ms) ? ms : CAMBIO_POR_DEFECTO_MS) + HOLGURA_MS;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const stored = localStorage.getItem('theme') as Theme | null;
        if (stored === 'dark' || stored === 'light') return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    /*
     * ── EL FUNDIDO DE COLOR AL CAMBIAR DE TEMA ──────────────────────────
     *
     * Cambiar de tema reescribe todos los tokens de color a la vez. Sin nada
     * que lo suavice es un salto seco; con una transición PERMANENTE sobre las
     * superficies —como estaba antes— se paga ese coste en cada hover del
     * producto y además la lista de selectores envejece (ver la nota en
     * variables.css).
     *
     * La transición vive en una clase que solo existe durante el cambio: se
     * pone, el navegador funde, se quita. Fuera de esa ventana el CSS es
     * exactamente el de antes.
     *
     * La duración NO se escribe aquí: se lee del mismo token que la declara,
     * así que ajustar el fundido es tocar una línea de CSS y nada más. Es el
     * mismo principio que `useOverlayTransition` aplica a los diálogos.
     */
    const temporizador = useRef<number | null>(null);

    const toggleTheme = useCallback(() => {
        const raiz = document.documentElement;
        raiz.classList.add('tema-cambiando');

        if (temporizador.current !== null) window.clearTimeout(temporizador.current);
        temporizador.current = window.setTimeout(() => {
            raiz.classList.remove('tema-cambiando');
            temporizador.current = null;
        }, duracionDelCambio(raiz));

        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }, []);

    // Cambiar de tema y salir de la aplicación en la misma ventana dejaría la
    // clase puesta y un temporizador vivo sobre un árbol ya desmontado.
    useEffect(() => () => {
        if (temporizador.current !== null) window.clearTimeout(temporizador.current);
        document.documentElement.classList.remove('tema-cambiando');
    }, []);

    // Valor memoizado por consistencia y para no recrear el objeto en renders
    // ajenos al tema; `toggleTheme` ya es estable.
    const value = useMemo<ThemeContextValue>(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
