# Tesis Ingeniería en Sistemas - Diego Saavedra

Proyecto de aplicación desarrollado como parte del trabajo de graduación de Ingeniería en Sistemas.

## 🚀 Tecnologías utilizadas
- React
- Ionic
- Node.js
- Git & GitHub

## ▶️ Arranque

```bash
cd frontend
npm install
npm run dev        # contra el servidor real
npm run dev:demo   # con el conjunto de datos de demostración
```

**`npm run dev`** reenvía `/api` al servidor real (`vite.config.ts`), así que hacen
falta credenciales reales para entrar.

**`npm run dev:demo`** intercepta `/api` y responde desde `src/dev/`: 27
expedientes, 11 proyectos y 5 ternas coherentes entre sí, pensados para ver el
sistema lleno (nombres largos, notas justo en el límite, expedientes sin correo,
proyectos sin descripción, ternas a medio evaluar). Entra cualquier correo y
cualquier contraseña, y mientras dura lo anuncia una banda que no se puede
cerrar.

El conjunto de demostración **no viaja al build de producción**: todo cuelga de
un `import()` dinámico dentro de `if (import.meta.env.DEV)`. Comprobable con
`npm run build && grep -r "demoDataActivo" dist/`.

También puedes activarlo sobre un servidor ya arrancado añadiendo `?demo=1` a la
URL; se recuerda durante la pestaña y se apaga con `?demo=0`.

## 📂 Descripción
Este proyecto consiste en el desarrollo de una aplicación web enfocada en [aquí puedes poner la descripción breve de tu sistema].

Actualmente se encuentra en fase de desarrollo, implementando vistas y estructura base del sistema.

## 👨‍💻 Autor
Diego Vásquez