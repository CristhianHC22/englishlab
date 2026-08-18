# Arquitectura y memoria del Lab

Este archivo es la memoria del proyecto: **qué se construyó, por qué, y qué no hay que deshacer**. Complementa [AGENTS.md](../AGENTS.md).

English Lab es una PWA de una sola página. No hay build: el navegador carga scripts en orden. El “framework” es `app.js` + módulos que cuelgan de `window`.

## Por qué vanilla y estático

- Tiene que abrir en GitHub Pages, en un móvil, **sin cuenta ni servidor**.
- El alumno hispano practica 15 min: TTS, micrófono y `localStorage` bastan.
- Un bundler partiría el flujo de “editas un JS y recargas”. El split real es **carga diferida** (`loader.js`), no webpack.

Por eso **no** se reescribe `app.js` a módulos ES6/React. Cuando creció, se sacó contenido a `pack-*.js` y lógica tardía a `features-*.js`.

## Capas

```
index.html + styles.css + sw.js
        │
        ▼
  scripts críticos (primer pintado: Hoy)
        │
        ▼
  loader.js  ──features-nr/sv/plus──►  packs m…plus
        │
        ▼
  NR / SV / PLUS bootstrap + repintado
```

**Crítico** (en `index.html`): `data`, `guide`, `levels`, `extras`, `i18n`, `idb-backup`, `pack.js` (banco mínimo), `vapid-public`, `app.js`, `pron-audio`, `loader`.

**Diferido**: el resto de packs y los tres `features-*`. Primer frame sin 50 role-plays ni 40 podcasts.

| Peso aprox. | Rol |
|---|---|
| `app.js` ~163 KB | Núcleo: camino, quiz, verbos, TTS, rec, SRS, transfer |
| `data.js` ~61 KB | Verbos / pares / bancos originales |
| `pack-u.js` ~60 KB | Historias ramificadas (lote U) |
| `features-sv.js` ~43 KB | Pron, stories UI, writing, aula, a11y, onboarding |
| `features-nr.js` ~41 KB | Podcast, cert, viaje, duo, chat, auditoría A–Z |
| `i18n.js` ~45 KB | UI ES + EN |
| `features-plus.js` ~18 KB | Colocación, diario, print, onda, ramas, shadow frases |
| `pack-plus.js` ~7 KB | 20 ítems CEFR, pares duros, 3 role-plays con `bOpts` |

## Lotes A–Z (auditoría en Ayuda)

La tabla de Ayuda tiene **26 filas** (A…Z). Es un checklist de producto, no un examen del alumno. Los tests exigen exactamente 26. Historia resumida:

| Lotes | Qué aportaron | Dónde vive |
|---|---|---|
| A–F | Situaciones, camino Hoy, niño, shadow, racha, transfer, entrevista | `app.js` + extras |
| G–L | SRS, dictado, gramática, role-play, PIN aula, tests | `app.js` + `pack.js` |
| M | Emails, examen semanal 12, tono formal/informal | `pack-m` / emails |
| N–R | 40 podcasts, 50 chats, cert 30 min, viaje, duo | `features-nr` + packs N–R |
| S–Z | IPA/formantes, aula pro, 20 historias, writing, 500 frases, 100 dictados, onboarding/a11y, i18n EN + split | `features-sv`, packs S–V, `loader`, `i18n` |
| **Plus** (post-Z) | Test nivel 20, diario errores, Anki/CSV, hoja 5×15, informe alumno, gráfica **90** días, onda, pares /θ ð v-b ʃ-tʃ/, TTS US/UK, role-play ramificado, shadow por frase, tarea de clase resaltada | `features-plus` + `pack-plus` — **no** suma fila 27 |

Plus se metió como módulo diferido para no inflar más el crítico ni romper la auditoría.

## Datos del alumno

Claves `enlab-*` en `localStorage`. `PROG_KEYS` en `app.js` es lo que viaja en el **código de transfer**. IndexedDB (`idb-backup.js`) solo espeja un **subconjunto** (SRS, débiles, stats, diario, colocación…). Si añades progreso importante: súbelo a `PROG_KEYS` y, si debe sobrevivir borrados raros de LS, a `KEYS` de IDB.

No hay usuario en la nube. Aula pro = PIN local + roster + QR de transfer.

## Extensión a propósito (y su coste)

`features-nr` y `features-plus` **envuelven** `startQuiz`, `makeQuizItems`, `renderQuiz`, `applySpeakVerdict`. Funciona porque el loader llama `NR.bootstrap` y después `PLUS.bootstrap`. Cada envoltura nueva es un riesgo de orden.

Patrón bueno ya usado: `onTabPaint(fn)` / `onHomePaint(fn)` en vez de reemplazar `paintTab`.

## Tests y CI

- Funcional: `tests/*.spec.js` con `boot()` que espera packs y `PLUS`.
- Visual: 6 pestañas × 3 temas (claro, oscuro, contraste). `tests/helpers/visual.js` **congela** reloj, week-strip, gráfica, diario y panel perf para que la fecha o el 90d no tumben baselines.
- `npm test` **excluye** visual; el job `visual` de GitHub Actions lo corre en Ubuntu (snapshots `*-linux.png`).
- Playwright 1.62.x. Imagen Docker: `mcr.microsoft.com/playwright:v1.62.1-jammy`.

## PWA

- `sw.js` precachea HTML/JS/CSS/iconos. Versión `enlab-vNN`: **subirla en los dos sitios** (`sw.js`, `features-sv.js`) o el SW viejo sirve JS viejo.
- Push: VAPID público en repo; privado gitignored. Recordatorios vía `scripts/push-remind.js` + workflow opcional.
- Iconos PNG 180/192/512 + maskable (iOS / install).

## Deuda conocida (no es olvido al azar)

1. **`app.js` enorme** — partirlo a ESM rompería el modelo sin-build. Cert y place ya se despachan con `if` nativo en `startQuiz` (sin envolver la función). Siguen wrappers en `applySpeakVerdict` / `todayGame`.
2. **i18n dinámico** — TOC de Oír y `todayGame` ya pasan por `t()`. STAR y varios `innerHTML` de NR/SV pueden seguir en español.
3. **IDB = transfer** — `PROG_KEYS` vive en `idb-backup.js`. `localStorage.setItem` de esas claves se espeja solo.
4. **Pages más flaco** — el workflow copia a `site/` sin tests, `.github`, scripts ni lockfile.
5. **Panel “Rendimiento”** — cuenta packs diferidos; no es Lighthouse real.
6. **Tarea de clase** — se **resalta** al abrir Hoy, no se auto-lanza (evita romper tests y secuestrar la sesión).
7. **Google Fonts** — se piden en `index.html`; visual tests las bloquean. Offline total = fallback del sistema (ok).

## Cómo añadir algo nuevo

1. ¿Es **contenido** (frases, podcasts, role-plays)? → `pack-*.js` diferido, empujar a `ENLAB.*`.
2. ¿Es **UI que puede esperar** al primer frame? → `features-*.js` + `bootstrap`.
3. ¿Es **camino / quiz / rec / SRS**? → `app.js` nativo + i18n ES/EN + test.
4. ¿Cambia el layout de una pestaña? → snapshots visuales win + linux.
5. ¿Cambia un JS cacheado? → bump `enlab-vNN`.
6. Mantén la auditoría en 26 filas o actualiza **también** los tests de recuento (solo si el producto gana una fila de verdad).
