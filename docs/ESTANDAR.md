# Estándar de organización (UX + código)

Léelo **antes** de añadir una pestaña, un panel o un menú. Complementa [AGENTS.md](../AGENTS.md) y [ARQUITECTURA.md](ARQUITECTURA.md).

English Lab se usa 15 min/día en el móvil. La pantalla tiene que caber en la cabeza: **dónde estoy, qué hago, cómo salgo**.

## Constitución (no negociar)

1. **Seis pestañas, ni una más.** Hoy · Oír · Verbos · Juego · Hablar · Ayuda. No hamburguesa, no sidebar, no 7.ª pestaña.
2. **Meta-UI arriba a la derecha:** `Guía` (explica esta pantalla) y `Ajustes` (voz, tema, niño, idioma). No son pestañas.
3. **Una superficie = un patrón.** Si una pestaña tiene más de ~6 bloques apilados, no se listan todos: **catálogo → una sala**.
4. **Ayuda ≠ Guía.** La pestaña Ayuda son *herramientas* (prompts, aula, auditoría). Guía es *para qué sirve lo que estás viendo*.
5. **Vanilla.** El marco es HTML + CSS `.lab-*` + `openLabRoom` / `renderLabHub` en `app.js`. No un componente React.

## Los tres patrones de pantalla

| Patrón | Cuándo | Ejemplo |
|---|---|---|
| **Misión + pliegue** | Hay un camino del día. Lo extra va en `<details>`. | Hoy (`#hoy-extras`) |
| **Herramienta** | Una lista o buscador. Un clic extra estorba. | Verbos |
| **Catálogo → sala** | Varios temas/prácticas/modos. | Oír, Juego, Hablar, Ayuda |

Hablar mezcla **herramienta + catálogo**: `Di esto` (`.lab-keep`, siempre visible) y el resto en hub.

Oír deja el título + atajos de juego como `.lab-keep`; los temas son salas.

## Catálogo → sala (el marco reutilizado)

### Piezas (siempre las mismas clases)

| Clase / API | Rol |
|---|---|
| `.lab-hub` | Índice de tarjetas. Hijo directo del `.panel`. |
| `.lab-card` + `data-lab-jump="id"` | Entra a la sala `id`. También `data-jump` (alias). |
| `.lab-hub-head` | Título del índice. Se oculta dentro de la sala. |
| `.lab-keep` | Lo que **no** se oculta al entrar (grabar, intro de Oír). |
| `.lab-topic[data-lab="id"]` | La sala. Hija directa del panel. Solo una tiene `.on`. |
| `.lab-room-bar` + `.lab-back` | “Todas las…” + título. Sticky. |
| `.lab-in` en el panel | Estado: hay una sala abierta. |
| `openLabRoom(id)` | Abre. No llama `showTab` si ya estás en ese panel. |
| `closeLabRoom(panel)` | Vuelve al índice. |
| `renderLabHub(navId, items)` | Pinta el índice. `items`: `{ jump, key, blurb, group? }`. |

Pulsar **la pestaña actual** otra vez cierra la sala (vuelve al índice).

Atajos (Hoy, cert, chat, podcast) deben llamar `openLabRoom` / `openQuizRoom`, no hacer scroll a un bloque oculto.

### Receta: nueva sala

1. `<article class="lab-topic" data-lab="mi-id">` con un `h3` (el título de la barra). Si el `h3` interno lo pinta JS, añade `<h3 class="lab-topic-name" data-i18n="…">`.
2. Ítem en el hub: `{ jump: "mi-id", key: "…", blurb: "…" }` y cadenas **ES+EN** en `i18n.js`.
3. Copia de Guía: `ENLAB.ui.es.guide["mi-id"]` y la misma clave en `en` — `{ t, w, s: ["…"] }`. Si no hay entrada, cae a la pestaña o a `oidoRoom`.
4. Tests: `openLabRoom(page, "mi-id", "tabId")`. Playwright no pulsa nodos `hidden`.
5. Kids: filtra el ítem en `*HubItems()` y/o CSS `body.kids-mode`.
6. Cache: bump `enlab-vNN` en `sw.js` **y** `features-sv.js`.
7. Visual: si cambia el primer viewport, snapshots **win32 y linux**.

No inventes `.oido-card`, `.foo-toc` ni un segundo `openFooTopic`. Oír ya usa este marco (`#oido-toc` es un `.lab-hub`).

### Mapa actual de salas

| Pestaña | Hub | Salas (`data-lab`) |
|---|---|---|
| Hoy | — | Misión. Extra en `#hoy-extras`. |
| Oír | `#oido-toc` | `oido-decidir`, `oido-reglas`, `oido-mapa`, `oido-contrastes`, `oido-roles`, `oido-mudas`, `oido-ritmo`, `oido-chunks`, `oido-tips`, `oido-podcasts`, `pron-panel`, `stories-panel` |
| Verbos | — | Busca + lista. |
| Juego | `#quiz-hub` | `quiz-verbs`, `quiz-ear`, `quiz-uso`, `quiz-exams` → luego `[data-quiz-mode]`. `#quiz-go` / `#quiz-box` solo con `.lab-in`. |
| Hablar | `#hablar-hub` | `roleplay-card`, `interview-sim-card`, `email-card`, `chat-work-card`, `writing-panel`, `phrasals-work-card`, `duo-card`. `.lab-keep` = Di esto. |
| Ayuda | `#ia-hub` | `ai-prompts`, `plan-list`, `a11y-bar`, `error-journal`, `class-pro-panel`, `lab-audit`, `perf-panel` |

Juego: `openQuizRoom(mode)` traduce el modo a la sala. `startQuiz` / cert / place / weekly / story lo llaman.

## Guía (el cuadro)

- Botón `#guide-toggle` → panel `#guide-panel` (no modal). Cierra Ajustes y viceversa.
- Contenido según `guidePlace()`: `data-lab` de la sala `.on`, o el id de la pestaña.
- Primera visita a cada pestaña: se abre solo. `enlab-guide-seen` (JSON de pestañas). Tests y visual: `enlab-guide-quiet=1`.
- En un hub de 2–8 tarjetas lista “Qué es cada tarjeta”. Oír tiene más de 8: no lista, las tarjetas ya traen blurb.
- No es un tour de 12 pasos. No se auto-lanza si `#welcome` está visible.

## Qué no construir

- Menú extra “porque hay muchas cosas”. Primero: ¿cabe en un hub de esa pestaña? ¿es extra de Hoy (`<details>`)? ¿es Ajustes?
- Envolver `paintTab`, `applySpeakVerdict`, `toggleRecording`.
- 27.ª fila en la auditoría A–Z.
- React/Vite/TS “para organizar”. El split es packs diferidos + `features-*.js`.

## Tests

| Quieres… | Helper (`tests/helpers/boot.js`) |
|---|---|
| Entrar a una sala | `openLabRoom(page, jump, tab)` |
| Tema de Oír | `openOidoRoom(page, jump)` → lo mismo, tab `vocales` |
| Modo de Juego | `openQuizMode(page, "dict")` |
| Extras de Hoy | `openHoyExtras(page)` / `revealInFolds` |
| Ajustes | `openPrefs(page)` |

Visual: `bootVisual` pone `enlab-guide-quiet`. `gotoTab` espera `.lab-card` en Oír/Juego/Hablar/Ayuda, no el contenido de una sala.

## Chrome de producto (localStorage)

No son progreso del alumno (no van en `PROG_KEYS` salvo que se indique):

| Clave | Rol |
|---|---|
| `enlab-guide-quiet` | Tests: no auto-abrir Guía |
| `enlab-guide-seen` | Pestañas cuya Guía ya se ofreció |
| `enlab-welcome-v2` / `enlab-onboard-v3` | Onboarding hecho |
| `enlab-tab` | Última pestaña |

## Próximo trabajo alineado (no improvisar menús)

Si una sala se llena otra vez (p. ej. 12 modos dentro de Uso), **otro hub interno**, no una pestaña nueva. Si Guía no tiene copia para un `data-lab` nuevo, añádela en el mismo PR: la caja vacía o el fallback genérico es un bug de producto.
