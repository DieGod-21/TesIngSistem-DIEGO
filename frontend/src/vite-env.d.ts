/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** URL base de la API (obligatoria en producción; en dev se usa el proxy). */
    readonly VITE_API_URL?: string;
    /** Versión de la app para telemetría (opcional). */
    readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
