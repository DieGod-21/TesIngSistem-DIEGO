# Guía de Hosting — Control de Notas (Frontend SPA)

Documentación de despliegue del bundle estático (`npm run build` → `dist/`).
**Solo documentación**: el frontend no implementa estas cabeceras; se configuran
en la capa de hosting (CDN, reverse proxy o servidor estático). Ajusta los
orígenes a tu entorno real (la API por defecto es `https://notas.digicom.com.gt`,
definida en `VITE_API_URL`).

---

## 1. SPA rewrites (history fallback)

La app usa enrutado del lado del cliente (react-router). Cualquier ruta profunda
(p. ej. `/students/123`) debe servir `index.html` para que el router resuelva;
de lo contrario el servidor devolvería 404 en recargas o enlaces directos.
Los assets con hash (`/assets/*`) deben servirse tal cual.

**Nginx**
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
# Assets con hash: cache larga e inmutable
location /assets/ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

**Netlify** (`_redirects` o `netlify.toml`)
```
/*  /index.html  200
```

**Vercel** (`vercel.json`)
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

**Apache** (`.htaccess`)
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

> No cachear `index.html` (o cachear con revalidación) para que los nuevos
> hashes de assets se recojan en cada despliegue.

---

## 2. HTTPS

- Servir exclusivamente por **HTTPS**; redirigir 80 → 443.
- La API se consume por HTTPS (evita contenido mixto).

```nginx
server {
  listen 80;
  server_name tu-dominio;
  return 301 https://$host$request_uri;
}
```

---

## 3. Cabeceras de seguridad recomendadas

Aplicar en el host/CDN para **todas** las respuestas HTML.

### 3.1 Content-Security-Policy (CSP)

Punto de partida a validar contra la app (Ionic y React usan estilos en línea,
por eso `style-src` incluye `'unsafe-inline'`; las fuentes son self-hosted).
Sustituye `https://notas.digicom.com.gt` por el origen real de tu API.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self' https://notas.digicom.com.gt;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none'
```

Notas:
- `connect-src` debe incluir el origen de la API (fetch) y, si se usa,
  el endpoint de `VITE_TELEMETRY_URL`.
- `frame-ancestors 'none'` sustituye funcionalmente a X-Frame-Options en
  navegadores modernos (se recomienda mantener ambos).
- No se requiere `'unsafe-eval'` (el frontend no usa `eval`/`Function`).
- Endurecer `style-src` eliminando `'unsafe-inline'` requiere nonces/hashes y
  revisar los estilos en línea de Ionic; validar antes de aplicar.

### 3.2 HTTP Strict Transport Security (HSTS)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
Aplicar solo cuando todo el dominio y subdominios sirvan HTTPS de forma estable.

### 3.3 X-Frame-Options

```
X-Frame-Options: DENY
```
Evita clickjacking incrustando la app en iframes.

### 3.4 X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```
Impide el MIME-sniffing del navegador.

### 3.5 Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```
No filtra rutas/parámetros a orígenes externos; conserva el origen para métricas.

### 3.6 Permissions-Policy

Desactiva capacidades del navegador que la app no usa.

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
```

---

## 4. Ejemplo consolidado (Nginx)

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://notas.digicom.com.gt; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" always;
```

---

## 5. Variables de entorno del build

| Variable | Requerida | Descripción |
|---|---|---|
| `VITE_API_URL` | Sí (producción) | Origen de la API. El build **falla** si falta. |
| `VITE_TELEMETRY_URL` | No | Endpoint de telemetría; si falta, la telemetría es no-op. |
| `VITE_APP_VERSION` | No | Versión para telemetría; por defecto la de `package.json`. |

Ver `.env.example`. Definir estas variables en el entorno de CI/CD del build,
no en el host de archivos estáticos (se hornean en el bundle en tiempo de build).

---

## 6. Checklist de despliegue

- [ ] `VITE_API_URL` definida en el entorno de build (HTTPS).
- [ ] `npm run build` genera `dist/` sin errores.
- [ ] SPA rewrite configurado (fallback a `index.html`).
- [ ] HTTPS forzado; sin contenido mixto.
- [ ] Cabeceras de seguridad aplicadas y verificadas.
- [ ] `index.html` sin cache agresiva; `/assets/*` inmutables.
