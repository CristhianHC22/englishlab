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
3. Copia de Guía: `ENLAB.ui.es.guide["mi-id"]` y la misma clave en `en` — `{ t, w, s: ["…"], d: "…" }`. Si no hay entrada, cae a la pestaña o a `oidoRoom`. El test de contrato falla si falta la clave.
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
- Copia: `ENLAB.ui.*.guide[place] = { t, w, s[], d? }`. `d` es “ya está cuando…”. Si no hay entrada, cae a la pestaña o a `oidoRoom`.
- `#guide-lab`: las 6 pestañas. Un chip navega y **deja Guía abierta** (mapa del lab, no un tour de 12 pasos).
- `#you-are` (bajo las pestañas): chip **¿Qué es esto?** + título + **Ya está cuando…**. Pulsarla abre Guía. Se oculta mientras Guía está abierta. Durante el camino muestra el paso; en el cierre, la pregunta actual (1 de 3). Al saltar de Oír a Juego dice que vienes de Oír.
- Modo niño: `guideKids` (2 pasos). Ajustes abre con `prefsHint` (Ajustes ≠ Guía).
- `#hoy-done` al cerrar el camino (racha + atajos Oír / Hablar / Juego del día). En niño, esos atajos se ocultan: queda el miss + Repetir. `#you-are` y Guía usan `guide.hoyDone`. El timer de 15 min se pausa. `#voice-warn` si TTS/mic fallan (Ocultar). `#net-warn` si no hay red, **antes** de pulsar oír/YouGlish. `.lab-hub:empty` es esqueleto hasta que pintan las tarjetas.
- Juego: `#quiz-now` / `Juega ahora` usa `todayGame()` (no `travel`/`chat`). El hub sigue para cambiar de grupo.
- Verbos: `#verb-today` (el del camino o el más débil) encima de la lista. En el **camino de Hoy** solo se ve ese verbo (`#daily-verbs`); el resto va plegado. Al oírlo, `.hoy-path-foot .hoy-next` lleva `.next-act`. Igual al oír un par (`#daily-pairs`).
- Hablar: frase → **Oír modelo** / **Grabarme** (`.next-act` marca el siguiente). Opciones plegadas. En Hoy, **Oír A** marca **Grabar B**; **Oír B** no. Al soltar la grabación, el pie parpadea (`onRecording("stop")`, no un wrap de `toggleRecording`). Si el micrófono se niega, `onRecording("deny")`: `#voice-warn` y el pie **no** parpadea. Shadowing de pares: el par actual se oye en bucle; **Siguiente par** avanza; al terminar las 4, **Otra vez**. Al cambiar de paso se corta.
- Oír: `#oido-resume` recuerda la última sala (`enlab-oido-last`: hoy / ayer / hace N días). En niño: solo “Seguir aquí”. Si esa sala no está en el hub: “Elige una sala” destaca el **primer grupo** del hub (`.lab-hub-now`). Al entrar a cualquier sala (o al volver con `lab-back`) el grupo se apaga.
- Juego: el primer fallo muestra `.quiz-fail-note`. `.quiz-miss-live` clicable → Verbos o el diario. En el diario, `.journal-card-now` marca el último fallo (`enlab-journal-focus`); el resto va en `<details class="journal-rest">`. **Practicar este** abre el modo del fallo (oído / uso / verbos / Hablar), sin “Volver a Hoy”. Tras Día marcado, `#quiz-now` ofrece el modo que fallaste (`data-quiz-miss`). Tras ese round, chip **Volver a Hoy**. Cert/place arrancados desde el camino también lo muestran.
- Cierre de Hoy: 3 una a una; al fallar nombra el siguiente tipo; al terminar, **Día marcado** sin reabrir pasos. Chips: verbo → Verbos (`#verb-today` es ese), oído/uso → ese modo de Juego. Si pausaste el reloj a medias, `#hoy-done-timer` sigue/pausa. Si llegó a 0, **Otro 15 min** (no reinicia el camino). Guía en Día marcado no lista extras; el chip del reloj basta.
- Camino diálogo: **Oír A / Oír B** no marcan la sesión (el `.dialog-card` no llama `markSession`). Solo **Grabar B** lo hace; si no, el auto-avance saltaba el micrófono.
- Bienvenida: 3 frases. Ajustes: PIN; copiar/pegar código. Importar en Ajustes usa la línea de estado (sin `alert()` ni `prompt()`): si hay PIN, `classPinImport`. Código **corto** / **cortado** / inválido se distinguen. Al copiar, la línea enseña los últimos 4 caracteres; al pegar un código largo, ofrece **Importar** ahí mismo. Hoy pide el PIN con `prompt`.
- Camino: al completar un paso el pie nombra el siguiente ~900 ms, parpadea y un buzz corto **antes** de auto-avanzar. `cueHoyNext` no llama `focus()`. El pie lleva `aria-live="polite"`.
- Ritmo (paso flap): vive en `#hoy-step-flap` / `#hoy-rhythm-list`. El primer ▶ nace con `.next-act`; al oírlo, el pie parpadea. **No** abre la pestaña Oír.
- Podcast del día: si lo dejaste a medias (`enlab-podcast-now`), el botón de extras dice Seguir y abre Oír → podcasts en esa frase. Cert a medias (`enlab-cert-now`): `#cert-today` en extras, misma receta.
- El mapa de tarjetas es **clicable** (`data-guide-jump`): entra a la sala y Guía pasa a explicar esa sala. Dentro de una sala lista las hermanas del grupo (“También en este grupo”).
- Primera visita a cada pestaña: se abre solo. `enlab-guide-seen` (JSON de pestañas). Tests y visual: `enlab-guide-quiet=1`.
- En un hub de 2–8 tarjetas lista “Qué es cada tarjeta”. Si el hub tiene **grupos con kicker** (Oír, Ayuda), Guía lista los grupos, no cada tarjeta.
- No es un tour de 12 pasos. No se auto-lanza si `#welcome` está visible.

## Hoy durante el camino

`body.session-focus` mientras `#hoy.path-on` y no `.path-done` **y** estás en la pestaña Hoy. Oculta nivel, extras, racha y repaso. El paso actual es lo único que ocupa. Al cambiar de pestaña, el chrome vuelve. Al marcar el día (`finishHoyPath`), los `.step-card` y el pie se ocultan; queda `#hoy-done` (racha, resultado de las 3, atajos, **Repetir camino**).

## Juego al terminar un round

No echa al hub. `#quiz-again` = otro round del mismo modo. `[data-quiz-start]` = otro modo del **mismo grupo**. `lab-back` sigue siendo “Todas las…”.

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
| `enlab-oido-last` | Última sala de Oír (`id`, `at`, `day`) |
| `enlab-journal-focus` | (session) Fallo a marcar en el diario |
| `enlab-cierre-result` | (session) Score + `verbFail` / `earFail` / `useFail` del día |
| `enlab-quiz-from-hoy` | (session) El round de Juego vino del miss de Hoy |
| `enlab-podcast-now` | Podcast a medias (`id`, `seg`, `day`) |
| `enlab-cert-now` | Cert a medias (`day`, `i`, `score`, `fails`, `items`, `left`) o `timeUp` |
| `enlab-hoy-extra-timer` | (session) Otro 15 min tras Día marcado |

| `enlab-cierre-now` | (session) Cierre a medias (`day`, `i`, `score`, `fails`, `items`) |
| `enlab-weekly-now` | (session) Examen semanal a medias (`week`, `i`, `score`, `fails`, `items`) |
| `enlab-place-now` | Test de nivel a medias (`day`, `i`, `score`, `fails`, `items`) |
| `enlab-duo-now` | (session) Duo a medias (`day`, `player`, `turn`, `scene`, scores) |
| `enlab-weekly-stale` | (session) Examen semanal abandonado semana anterior (`week`, `i`, `total`) |

## Próximo trabajo alineado (no improvisar menús)

Si una sala se llena otra vez (p. ej. 12 modos dentro de Uso), **otro hub interno**, no una pestaña nueva. Si Guía no tiene copia para un `data-lab` nuevo, añádela en el mismo PR: la caja vacía o el fallback genérico es un bug de producto.

Ideas que caben en el marco (no son menús nuevos):

- Cierre resume en `#you-are` al volver al paso (hecho v57).
- Weekly / placement / duo a medias en extras (hecho v58).
- Repaso kicker en `#you-are` (hecho v58).
- Transfer QR en Ajustes (hecho v58).
- Diario agrupar también tarjeta “ahora” (hecho v58).
- Cert retry + memoria time-up del día en `enlab-cert-score` (hecho v58).
- Podcast scroll al reproductor al seguir desde Hoy (hecho v58).
- Historia en Día marcado + Guía kids (hecho v57–v58).

Próximo (v59):

- Placement resume también desde el hub de Juego (hecho v59).
- Duo chip en Hablar cuando hay partida guardada (hecho v59).
- Weekly stale si abandonas a medias la semana pasada (hecho v59).
- Cert time-up del día en `#you-are` tras Día marcado (hecho v59).
- Diario: agrupar “ahora” por modo con foco por nombre de modo (hecho v59).
- Podcast resume banner en Oír (hecho v59).
- Transfer QR en auditoría Ayuda, solo lectura (hecho v59).
- Repaso: kicker también en Guía mientras dura (hecho v59).

Próximo (v60):

- Weekly resume también en `#week-report` (hecho v60).
- Cert time-up chip en `#cert-today` aunque no quede `enlab-cert-now` (hecho v60).
- Placement: aviso en Guía si el test de 20 está a medias (hecho v60).
- Duo: marcador A/B guardado en chips resume (hecho v60).
- Podcast banner: oculto si ya estás en ese reproductor (hecho v60).
- Diario: export Anki solo del grupo “ahora” (hecho v60).
- Transfer audit QR: checksum como Hoy (hecho v60).
- Repaso: oculta `#hoy-extras` mientras dura (hecho v60).
- Cierre/weekly/place: `#you-are` resume fuera del camino (hecho v60).

Próximo (v61):

- Weekly resume también junto al botón del hub Juego (sala Exámenes) (hecho v61).
- Cert: you-are retry abre Juego → cert directo (chip clicable) (hecho v61).
- Placement Guía kids: una línea si test a medias (hecho v61).
- Duo: chip en `#you-are` si partida guardada y estás en Hablar (hecho v61).
- Podcast: banner también en `#podcast-today` de Hoy si no es el del día (hecho v61).
- Diario: CSV débiles solo del grupo “ahora” (hecho v61).
- Transfer audit: copiar código (solo lectura) además del QR (hecho v61).
- Repaso: pausar timer del camino si estaba corriendo (hecho v61).
- Mid-session: chips en `#hoy-done` para cierre/weekly/place a medias (Día marcado) (hecho v61).
- Visual: repaso + extras ocultos en snapshots si aplica (hecho v61).

Próximo (v62):

- Cert resume chip en `#you-are-chips` si cert a medias (no solo time-up).
- Weekly stale también en sala Exámenes (como extras).
- Cierre a medias: chip en `#you-are-chips` fuera de Hoy (cualquier pestaña).
- Podcast: `#you-are` menciona título si hay `enlab-podcast-now`.
- Diario: imprimir hoja solo del grupo “ahora”.
- Duo: marcador A/B también en chip `#you-are`.
- Placement: chip en `#hoy-done-mid` aunque no haya cierre/weekly.
- Transfer audit: pegar bloqueado (solo copiar) con aviso si intentan importar desde audit.
- Repaso: al salir, restaurar foco en `#hoy-review` si aún quedan ítems.
- Guía: línea kids para weekly a medias en sala Exámenes.
