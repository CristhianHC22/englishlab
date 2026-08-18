# English Lab

PWA **gratis**, sin servidor: oído, verbos y habla para hispanohablantes. A1 → B2. Meta: B1. 15 minutos al día. Chrome o Edge.

Sitio: [https://cristhianhc22.github.io/englishlab/](https://cristhianhc22.github.io/englishlab/) (GitHub Pages, raíz del repo).

Progreso: `localStorage` en este aparato. Nada se sube a un backend. Puedes exportar un código de transfer / QR para otro dispositivo o el aula.

## Cómo se usa

1. Elige nivel (A1 fácil … B2 reto).
2. **Hoy**: camino del día (pares → verbos → diálogo → 3 preguntas).
3. **Oír / Verbos / Juego / Hablar** para profundizar.
4. Instala la app si quieres avisos más fiables (HTTPS).

## Desarrollo

```bash
npx --yes serve -l 4173
# o: npm test  (levanta serve solo)
```

| Comando | Qué hace |
|---|---|
| `npm run check` | `node --check` de los JS del Lab |
| `npm test` | Playwright funcional (sin capturas) |
| `npm run test:visual` | Regresión visual claro/oscuro/contraste |
| `npm run test:visual:update` | Reescribe snapshots de **esta** plataforma |
| `npm run icons` | Regenera PNG de iconos |
| `npm run vapid` | Genera claves Web Push (privado **no** se commitea) |

Snapshots visuales van por SO (`*-win32.png`, `*-linux.png`). Desde Windows, Linux:

```bash
docker run --rm -v ${PWD}:/work -v /work/node_modules -w /work mcr.microsoft.com/playwright:v1.62.1-jammy bash -c "npm ci && npm run test:visual:update"
```

## Publicar

1. **Settings → Pages → Source: GitHub Actions**.
2. Cada `push` a `main` publica (`/.github/workflows/pages.yml`).
3. CI: `/.github/workflows/ci.yml` (syntax + tests + visual en Ubuntu).

Al cambiar JS/CSS/HTML cacheados, hay que subir la versión de cache del service worker (`enlab-vNN` en `sw.js` y `features-sv.js`) o los alumnos instalados se quedan con el bundle viejo.

## Documentación para quien toca el código

- [AGENTS.md](./AGENTS.md) — reglas cortas (agentes y humanos).
- [docs/ARQUITECTURA.md](./docs/ARQUITECTURA.md) — qué hay, de dónde salió, por qué está así, qué falta.

## Privacidad / secretos

- `vapid-private.json` y `push-sub.json` están en `.gitignore`.
- La clave **pública** sí va en `vapid-public.js` (necesario para suscribir Push en el cliente).
