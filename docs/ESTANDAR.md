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

- Cert resume chip en `#you-are-chips` si cert a medias (hecho v62).
- Weekly stale en sala Examenes con boton Empezar semanal nuevo (hecho v62).
- Cierre a medias chip en `#you-are-chips` desde cualquier pestana (hecho v62).
- Historia a medias chip en `#you-are-chips` desde cualquier pestana (hecho v62).
- Podcast: `#you-are` menciona titulo + chip en `#you-are-chips` (hecho v62).
- Repaso badge en tab Hoy mientras dure (hecho v62).
- `#hoy-done-mid` amplia cert, podcast, duo (hecho v62).
- `aria-live` en `#you-are-chips` (hecho v62).

- i18n completa de `renderHoyReview` (hecho v66).
- Total weak count badge en kicker de Repasar (hecho v66).
- Link quiz debiles desde hoy-review que lanza quiz (hecho v66).
- `reviewSeeAll` fold con total cuando hay mas de 8 items (hecho v66).
- Podcast cards con badge ✓ completado y ▶ en progreso (hecho v66).
- `savePodcastNow` marca `enlab-podcast-done` al terminar (hecho v66).
- Shortcut teclado R en Hoy para toggle repaso mode (hecho v67).
- SRS due badge (dot verde) en tab Juego via `syncPrefsBadge` (hecho v67).
- `fillYouAreDebounced` para evitar re-renders en rafaga (hecho v67).
- Journal search input con debounce 200ms (hecho v68).
- Cert progress ring SVG en cert resume banner (hecho v68).
- Podcast progress bar con % animado en el player (hecho v68).
- Cache bump v63 en sw.js y features-sv.js (hecho v68).

- `renderHoyReview` por secciones con boton Quiz por tipo (hecho v69).
- Story pct % en chip de retomar (hecho v69).
- SRS due count en you-are como fallback (hecho v69).
- Atajos de teclado en Guia con `fillGuideKeyboardHints` (hecho v69).
- Weekly history ultimas 4 semanas con barras coloreadas (hecho v70).
- `markWeeklyExamDone` acumula historial en `enlab-weekly-history` (hecho v70).
- Podcast boton Repetir frase en frase activa del transcript (hecho v70).
- Journal chips de filtro por modo con conteo (hecho v70).
- Transfer QR clickable copia codigo + feedback visual (hecho v71).
- fillGuideMap muestra "Estas aqui" con titulo y blurb (hecho v71).
- Debounce de `renderHoyReview` con key hash (hecho v72).
- Badge de racha en boton you-are al terminar el dia (hecho v72).
- Cache bump v64 en sw.js y features-sv.js (hecho v72).

- Modo quiz "srs" — solo los due de hoy en sala Examenes (hecho v73).
- `#hoy-review` `reviewSection` con `<details>` expandible por categoria (hecho v73).
- Journal `<select>` ordenacion: fecha, modo, A-Z (hecho v73).
- Alt+1–6 shortcuts para cambiar de tab (hecho v73).
- Podcast series progress bar verde con ratio eps escuchados (hecho v74).
- Transfer date "Generado: dd mmm aaaa hh:mm" junto al QR (hecho v74).
- Racha badge CSS keyframe `streakPop` en `#you-are::after` (hecho v74).
- `statsTotals()` helper que suma totales historicos de stats.days (hecho v74).
- `renderHomeStats` muestra totals en `#home-stats-totals` si days>1 (hecho v75).
- Audit stats row con dias/pares/respuestas/grabaciones totales (hecho v75).
- 5 nuevos tests: SRS mode, Alt+1, weekly history, statsTotals, journal sort (hecho v76).
- Cache bump v65 en sw.js y features-sv.js (hecho v76).

- Rediseño UX filtros verbos: scope + patron separados, counts, summary (hecho v77).
- `#hoy-review` Oido expandible con `<details>` (hecho v77).
- Podcast palabras practicadas al terminar (hecho v77).
- SRS quiz bump con `bumpSrsQuizItem` en respuestas (hecho v77).
- Journal CSV columna modo (hecho v77).
- Escape cierra sala lab (hecho v77).
- Grafica 90d resalta dias SRS vencido (hecho v77).
- Transfer tail mismatch mensaje especifico (hecho v77).
- Home stats totales incluyen dias activos en el ano (hecho v77).
- Cache bump v66 en sw.js y features-sv.js (hecho v77).

Proximo (v78):

- Verbos: atajo teclado W/D/F para marcar debil/fuerte en tarjeta seleccionada.
- Podcast: contador de palabras acumuladas en serie completa.
- SRS quiz: banner "Repaso SRS" durante el quiz srs mode.
- Journal: export CSV incluye fecha ISO en columna `at`.
- Guide: mostrar contadores debiles/fuertes en resumen Verbos.
- 90d chart: click en barra abre repaso de ese dia.
- Transfer: validar checksum numerico al pegar.
- Verbos: vista compacta toggle para listas largas.

Avance v78 (en curso):

- Verbos: atajo teclado W/D/F implementado (debil/fuerte/desmarcar) sobre tarjeta activa.
- Verbos: toggle "Vista compacta" para listas largas.
- Quiz SRS: badge visible "Repaso SRS" durante el round.
- Transfer: checksum en payload (`cs`) y validacion al importar (`transferChecksumFail`).
- Journal CSV: nueva columna `at` (ISO) y `mode` mantenida.
- Guia: atajo W/D/F documentado en panel de teclado.
- Podcast series: acumulado de palabras practicadas en episodios completados.
- 90d chart: click en dia con SRS vencido abre quiz modo SRS.

Avance v79 (en curso):

- Verbos: flechas ↑/↓ mueven tarjeta activa para atajos teclado.
- Verbos: filtros persisten en `enlab-verb-filters` (scope, patron, query).
- Verbos: micro-hint inline desmontable para explicar flujo de filtros.
- Verbos: botón "Entrenar 10" arranca round inmediato desde filtro actual.
- Verbos: compact view mejorada en densidad para listas largas.

Avance v80 (en curso):

- Verbos: "Entrenar inteligente" (prioriza debiles + no marcados + contexto del dia).
- Verbos: heatmap por familia (ratio debil/total) para detectar patrones flojos.
- Verbos: filtros persisten entre sesiones (`enlab-verb-filters`).
- Verbos: navegación de tarjeta activa con flechas ↑/↓.

Avance v81 (en curso):

- Quiz SRS: explainability visible en cada pregunta (vence hoy/atraso, caja actual, salto esperado).
- UX local telemetry: sesiones por modo, abandono, acierto y duración media en `enlab-quiz-ux`.
- Quiz end-card: hint adaptativo por modo cuando hay suficiente historial (>=2 sesiones).

Avance v82 (en curso):

- Juego: modo "Sesión rápida" (`quickmix`) con 8 preguntas mixtas.
- Adaptación: prioriza modos con mayor abandono según `enlab-quiz-ux`.
- Cubre verbos + uso + oído + SRS en un solo round corto.

Avance v83 (en curso):

- Quickmix: plan visible por bloques 2+2+2+2 durante la ronda.
- Quiz coach post-ronda: sugiere repetir, subir dificultad o foco de quickmix.
- Recomendación se apoya en abandono local (`enlab-quiz-ux`) sin backend.

Avance v84 (en curso):

- Quiz end-card: CTA "Siguiente recomendado" con un clic (`data-quiz-coach`).
- Ayuda > Rendimiento: panel de fricción local con top abandono por modo.
- Mantiene enfoque local-first: sin backend, todo desde `enlab-quiz-ux`.

Avance v85 (en curso):

- Auto-dificultad por modo: 3 opciones + hints si abandono >= 45% (`quizEasyOn`).
- Historial diario `enlab-quiz-ux-daily` con tendencia 7 días en Rendimiento.
- Coach multi-paso: dos CTAs (recomendado + también) al terminar ronda.

Avance v86 (en curso):

- Recuperación auto-dificultad: `easyStreak` restaura 4 opciones tras 2 rondas completadas seguidas.
- Plan coach 8 min (3 pasos): oído → uso → verbos con barra de progreso diaria.
- Heatmap semanal de abandono en Ayuda > Rendimiento (7 barras por modo).

Avance v87:

- Plan 8 min: auto-continúa al siguiente paso tras completar ronda (`enlab-coach-plan-flow`).
- Badge en tab Juego cuando plan va 1/3 o 2/3 (`coach-plan-on`).
- Export CSV de fricción local en Ayuda > Rendimiento (`perf-friction-csv`).
- Hub Juego: chip "Seguir plan 8 min" cuando hay progreso a medias.

Avance v88:

- Hub Juego: CTA "Empezar plan 8 min" cuando aún no hay progreso hoy.
- Hoy > Más para hoy: tarjeta del plan 8 min con un clic (`#coach-plan-today`).
- Auto-continuar: botón "Quedarme aquí" cancela el salto al siguiente paso.
- Plan completado: mensaje de cierre al terminar los 3 pasos.
- Rendimiento: `topQuizFriction()` + memo en `loadQuizUx` / `quizCoachPlan8`.
- Transfer/IDB: `enlab-quiz-ux` y `enlab-quiz-ux-daily` en `PROG_KEYS`.
- Aula pro: columna Fricción en roster (desde transfer) + CSV ampliado.
- Cache SW: `enlab-v67`.

Avance v89:

- Tab Hoy: badge 1/3 · 2/3 del plan 8 min (`coach-plan-on`); repaso usa `::before`.
- Hoy extras: chip quickmix cuando fricción ≥ 40% y ≥ 2 sesiones.
- Guía / you-are: hint post-cierre enlazado al plan coach; chips en todas las pestañas.
- Verbos: filtro "Plan hoy" (débiles + mazo del día) en paso verbos del plan.
- Avisos: push/SW menciona pasos pendientes del plan (`coachPlanLeft`).
- Aula: imprimir hoja de fricción del roster + fricción local en hoja de clase.
- Cache SW: `enlab-v68`.

Avance v90:

- Verbos: auto-filtro "Plan hoy" al entrar en paso verbos del plan (`enlab-verb-coach-auto`).
- Plan coach: inyecta 1 SRS vencido por ronda si hay due (`injectCoachPlanSrs`).
- Gráfica 90d: días con fricción alta (borde naranja) · clic abre quickmix.
- Diario errores: botón "Plan 8 min desde errores" (`#journal-coach-plan`).
- Rendimiento: comparativa abandono 7d vs semana anterior.
- Aula: tarea "Plan 8 min" en selector de tarea del profe.
- Cert time-up: hint enlazado al plan pendiente en Guía.
- Cache SW: `enlab-v69`.

Avance v91:

- Hoy camino: chip plan 8 min en `#hoy-path-plan` ({done}/{total}).
- Repaso: prioriza plan coach (chip + quiz débiles arranca plan si pendiente).
- Quickmix hot: badge ⚡ en tab Juego tras 3 días seguidos con fricción alta.
- Cert time-up + plan pendiente: botón "Plan 8 min (cert)" enlaza al paso del cierre.
- Anki export: metadatos de fricción por modo en cabecera y tarjetas.
- Aula print fricción: incluye comparativa semanal local.
- Helper unificado `startCoachPlanQuiz()` para journal/aula/repaso.
- Cache SW: `enlab-v70`.

Avance v92:

- Fin de ronda quiz: plan 8 min completo solo si `coachPlanStarted()`; si no, coach adaptativo + peers del grupo.
- Hoy camino hecho: copy inline "Plan 8 min: paso {done}/{total}" cuando el plan está en marcha.
- Repaso + plan en marcha: repaso filtra débiles al paso pendiente (`repasoCoachFilterOn`).
- Quickmix hot: hint en `#quiz-now`, title en modo quickmix, auto-selección al abrir sala Exámenes.
- Transfer import: bloqueo por cola usa `prefsTransferTailBlocked` (mensaje claro ES/EN).
- Cache SW: `enlab-v71`.

Avance v93:

- Cert time-up: chip "Calentar {mode}" (`data-cert-warmup`) si falló oído/uso en el cierre.
- Repaso + plan en marcha: banner "solo paso del plan", sin preview de mañana.
- Diario: plan 8 min elige modo según errores recientes (`journalCoachPlanMode`).
- Aula: mapa de fricción semanal por alumno/modo (`class-friction-heat`).
- Push/SW: mensajes diferenciados plan no iniciado / en marcha / quickmix hot.
- Performance: `invalidateYouAreChipsCache()` al cambiar estado del plan.
- Cache SW: `enlab-v72`.

Avance v94:

- Cert warm-up → plan: tras calentar oído/uso, CTA al plan 8 min (`certWarmupPlanHtml`).
- Heatmap aula: Δ vs semana pasada + export CSV (`#class-friction-csv`).
- Repaso inteligente: timer 6–10 min según pasos pendientes del plan.
- Guía: hint cert warm-up cuando time-up + fallo de cierre.
- Anki: cabecera `# coach-pending` y tags en tarjetas del paso pendiente.
- Cache SW: `enlab-v73`.

Avance v95:

- IDB: espejo `enlab-coach-plan-mirror`, `enlab-class-friction-week`, `enlab-weekly-fails`.
- Cert warm-up ×2 → CTA plan 8 min completo (`certWarmupPlanFull`).
- Placement: CTA plan según score (`placementCoachPlanHtml`).
- Semanal: fallos pesan ×2 en `journalCoachPlanMode`.
- Aula: alertas fricción ≥15% semana a semana.
- Repaso: reparto min/paso (`repasoStepBudget`).
- Guía Exámenes: copy según quickmix hot / cert / plan pendiente.
- Cache SW: `enlab-v74`.

Avance v96:

- Cert warm-up streak se reinicia cada día (`pruneCertWarmupStreak`).
- Guía en repaso + plan: reparto min/paso (`repasoStepBudget` en `guideFillEntry`).

Avance v97:

- Espejo IDB incluye `flow` del plan 8 min (auto-continúa tras recarga).
- Cert warm-up streak persistente (`enlab-cert-warmup` en localStorage + IDB).
- Placement score &lt;65% → chip plan en Hoy + hint en Guía.
- Aula: CSV de alertas fricción (`#class-friction-alerts-csv`).
- Performance: cache diaria de `quickmixFrictionStreak(3)`.
- Cache SW: `enlab-v75`.

Avance v98:

- Placement &lt;50% → auto-flow plan 8 min (con skip).
- Repaso + plan: timer visible junto al reloj (`#hoy-repaso-plan-timer`).
- `enlab-place-result`: prune a 7 días o al completar plan.
- Push/SW: `placePlanNudge` cuando test &lt;65%.
- Anki: cabecera `# placement-low` y tag en tarjetas del paso.
- Playwright: `fullyParallel: false`, workers reducidos (menos EMFILE).
- Cache SW: `enlab-v76`.

Avance v99:

- Placement chip: dismiss × (`enlab-place-nudge-hide` diario).
- Auto-flow plan: 200 ms si ya pulsaste Plan en Hoy (`enlab-coach-plan-armed`).
- `enlab-weekly-fails`: prune 7 días (`pruneWeeklyFails`).
- Guía Hoy: hint repaso + plan (`guideRepasoPlanTimer`).
- Aula: CSV placement (`#class-placement-csv`).
- Cache chips incluye estado placement/dismiss.
- Cache SW: `enlab-v77`.

Avance v100:

- `guideFillEntryCached()` + `paintYouAreLine()` — menos repaints en Hoy.
- Badge Hoy: `repaso-plan-on` con minutos del timer (`data-repaso-plan-min`).
- Cert warm-up arma auto-delay (`setCoachPlanArmed`).
- Import transfer → roster guarda placement (`placePct`, `placeCefr`).
- Columna Placement en aula pro + CSV enriquecido.
- Guía Exámenes prioriza hint placement si nudge activo.
- Cache SW: `enlab-v78`.

Avance v101:

- Badge Hoy/Quiz `coach-plan-pending-on` (0/3) cuando el plan no ha empezado.
- Cert warm-up ×2 activa auto-flow del plan (`setCoachPlanFlow`) + mensaje `certWarmupPlanAuto`.
- `paintYouAreLine()` en ramas restantes de fillYouAre (repaso, viaje, podcast, sala, SRS).
- Guía Exámenes: hint × para ocultar nudge placement en Hoy.
- QR alumno: hint indica que el import trae placement.
- Cache SW: `enlab-v79`.

Avance v102:

- Auto-flow cert/placement arma `setCoachPlanArmed` (200 ms).
- Hoy path done: inline «plan pendiente» + chip 0/3; Guía hint `guideCoachPlanPending`.
- Badges tab: `aria-label` accesible (progreso / pendiente).
- Push/SW: rama `certWarmupNudge` tras calentamiento cert.
- Import transfer → roster muestra progreso plan (`1/3` en columna Sync).
- Cache SW: `enlab-v80`.

Avance v103:

- Aula pro: columna **Plan 8 min**, resumen `{pending}/{mid}/{done}`, CSV plan.
- Repaso: `#repaso-quiz-btn` cambia a Plan 8 min cuando hay pasos pendientes.
- Anki: tag `# plan-pending: 0/3` si el plan no ha empezado.
- Performance: memo `renderCoachPlanToday()` / `renderQuizNow()` + `invalidateCoachUiCache()`.
- Kids: badge tab plan simplificado (●).
- Cache SW: `enlab-v81`.

Avance v104:

- Aula pro: **mapa visual plan 8 min** (tabla verde/naranja/rojo por alumno).
- Repaso: banner «empieza Plan 8 min» cuando 0/3 pendiente.
- Chips Hoy: chip **semanal → plan** si hay fallos del weekly en paso pendiente.
- Transfer/QR: hint incluye progreso plan (`transferPlanHintSuffix`).
- Auditoría A–Z: stat plan 8 min + lote B enriquecido (sin 27.ª fila).
- Guía: `fillGuide()` memo evita repaints si el entry no cambió.
- Push: test prioridad placement > cert warm-up > quickmix.
- Cache SW: `enlab-v82`.

Avance v105:

- **Hoy done**: copy inline plan pendiente/progreso; `#hoy-done-mid` con cert warm-up + weekly/placement chips.
- **Aula pro**: filas resaltadas si tarea = Plan 8 min; banner cuenta alumnos 0/3; kids heatmap ○/◐/✓.
- **Perf panel**: fila plan 8 min + memo render.
- **Guía**: memo `fillGuideMap` / `fillGuideLab`.
- **`syncRemindPayload()`** exportable para tests/contrato.
- Docs: sección Plan 8 min en `ARQUITECTURA.md`.
- Cache SW: `enlab-v83`.

Avance v106:

- **`syncRemindToSw` debounced** (400 ms) — menos postMessage al SW en ráfagas de estado.
- **`autoClassTask` en paint Hoy** — resalta banner tarea aula (`.class-task-must`) una vez/día.
- **Guía**: memo atajos teclado (`fillGuideKeyboardHints`).
- **`SV.renderClassTaskBanner`** exportado para tests.
- Cache SW: `enlab-v84`.

Avance v107:

- **Hoy**: auto-scroll al chip plan (1×/día) tras path done; deep-link `#coach-plan`.
- **Repaso**: atajo **P** → Plan 8 min cuando el botón lo ofrece.
- **Guía**: hint tarea aula (`.class-task-must`); atajo P en teclado.
- **Aula pro**: heatmap filtra roster (click fila o chips); QR con enlace plan.
- **Diario**: telemetría abandono/fallo por paso plan (`journalPlanTag`).
- **Performance**: memo `renderHoyDoneMid()`.
- **Scripts**: `npm run audit:i18n`.
- Cache SW: `enlab-v85`.

Avance v108:

- **Hoy**: chip plan con `.next-act` la 1.ª vez del día; auto-scroll refinado.
- **You-are**: chip **Retomar plan** tras abandono mid-flow.
- **Aula pro**: imprimir hoja plan por alumno; filtro heatmap solo repinta tbody.
- **PDF alumno**: incluye progreso plan 8 min.
- Cache SW: `enlab-v86`.
