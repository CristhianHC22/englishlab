# English Lab — guía para el agente

PWA **vanilla JS** (sin bundler, sin framework). Sitio estático en GitHub Pages. Todo el progreso vive en `localStorage` (+ espejo IDB de un subconjunto). Chrome/Edge. Hispano A1→B2, meta B1.

Lee esto **antes** de tocar código. El mapa largo y el “por qué” está en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## No romper

- No añadir React/Vite/TypeScript “para partir `app.js`”. El split real es `loader.js` + packs diferidos.
- No monkey-patchear `paintTab`. Usar `onTabPaint` / `onHomePaint` (en `app.js`).
- Auditoría A–Z = **26 filas**. Tests (`smoke`, `ayuda`) fallan si cambia el recuento. Amplía un lote existente; no añadas la fila 27.
- i18n: toda cadena nueva en **ES y EN** (`i18n.js`). `t("clave")` o `t("quizModes.place.t")`.
- Visual: snapshots **win32 y linux**. Tras CSS/layout: `npm run test:visual:update` y Docker linux (comando en `tests/visual.spec.js`). El job CI visual usa esa misma imagen jammy.
- No commitear `vapid-private.json`, `push-sub.json`, `node_modules`, `test-results/`.
- Al cambiar assets cacheados, subir `CACHE` en `sw.js` **y** `SW_CACHE` en `features-sv.js` (hoy `enlab-v31`). También cachear `offline.html`.

## Arranque (orden)

Crítico (bloquea primer pintado), en `index.html`:

`data → guide → levels → extras → i18n → idb-backup → pack.js → vapid-public → app.js → pron-audio → loader.js`

Diferido (`loader.js` tras `requestAnimationFrame` × 2):

1. Features: `features-nr.js` → `features-sv.js` → `features-plus.js`
2. Packs en paralelo: `pack-m/n/o/q/s/u/v`, `pack-bulk`, podcasts, roleplays-bulk, emails-extra, podcast-series, `pack-plus`
3. `NR.bootstrap()` → `SV.bootstrap()` → `PLUS.bootstrap()` → `refreshAfterPacks` → evento `enlab-packs-ready`

Nuevo contenido masivo → pack diferido. Nueva lógica de UI que puede esperar → `features-*.js`. Núcleo camino/quiz/TTS/SRS → `app.js`.

## Dónde va cada cosa

| Superficie | Archivo |
|---|---|
| Camino Hoy, quiz, verbos, TTS, grabación, SRS, transfer | `app.js` |
| Bancos base (verbos, pares, quizzes) | `data.js`, `pack.js` |
| Niveles CEFR / plan 21 | `levels.js`, `guide.js` |
| UI ES/EN | `i18n.js` |
| Podcasts, cert, viaje, duo, auditoría | `features-nr.js` + packs N–R |
| Pronunciación, historias, writing, aula pro, a11y | `features-sv.js` + packs S–V |
| Colocación, diario, 90d, Anki, onda, ramas, print | `features-plus.js` + `pack-plus.js` |
| Tests | `tests/*.spec.js` + `tests/helpers/boot.js` |

Globals: `ENLAB` (datos), `NR`, `SV`, `PLUS`, `PRON`, `ENLAB_LOADER`, `ENLAB_IDB`, `t()`.

## Tests

```
npm run check          # syntax
npm test               # funcional (sin visual)
npm run test:visual    # temas; CI linux
```

`boot()` espera packs (`podcasts>=40`, `roleplays>=50`, NR, SV, PLUS, `placementItems>=20`). Visual estabiliza reloj, week-strip, gráfica 90d, diario y perf para no romper baselines.

## Patches diferidos (frágil)

`startQuiz` despacha `cert`/`place` con `if` nativos. Siguen wrappers en `applySpeakVerdict` (SV + Plus: formantes + diario) y `toggleRecording` (onda). El orden de bootstrap importa (NR → SV → PLUS). Prefiere un `if` nativo en `app.js` antes que otra envoltura.

## Producto (por qué existe)

Lab **local-first** para hispanohablantes: oír, hablar, 15 min/día. No hay backend. Transfer/QR/aula son códigos en el aparato, no cuentas.
