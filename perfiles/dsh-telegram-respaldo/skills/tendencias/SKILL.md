---
name: tendencias
description: >-
  Detectar tendencias de un canal de YouTube (videos normales, Shorts y directos) con su
  transcripcion y convertirlas en temas para el pipeline de ideas del estudio. Usar cuando el
  autor pida "tendencias", "que se esta viendo ahora", "ideas de un canal", "vigilar a midudev"
  o "la inteligencia artificial", y antes de encargar una tanda de ideas nuevas.
---

# Tendencias: de YouTube a ideas producibles

Este es el camino UNICO para sacar ideas de un canal de YouTube. No hay otra ruta: el scraping
da TEMAS y el pipeline que ya existe (ideas-temas.mjs) da las IDEAS.

## 1. Raspar el canal (un comando)

La herramienta vive en el repo del estudio: en el PC `D:/VPS/estudio-videos` y en el VPS `/opt/estudio-videos`.
Todo se usa con rutas relativas al repo, asi que el mismo comando vale en los dos nodos.

Desde la raiz del repo del estudio:

```bash
node tools/tendencias.mjs midudev
node tools/tendencias.mjs la_inteligencia_artificial
```

En PowerShell el arroba se come (es splatting): usa el alias sin arroba (`midudev`) o entrecomilla
(`"@midudev"`).

Opciones utiles:

| Opcion | Que hace |
|---|---|
| `--n 1..15` | videos totales por pasada (por defecto 10; tope 15, nunca scrape masivo) |
| `--tipos normal,short,live` | que contenido barrer (por defecto los tres) |
| `--via auto\|innertube\|ytdlp\|api` | forzar la via de listado |
| `--desde-bruto` | redestila con lo ya descargado, sin volver a pegarle a YouTube |
| `--salida <dir>` | otra carpeta de salida (por defecto `datos/tendencias`) |
| `--fecha <AAAA-MM-DD>` | nombre del fichero (por defecto hoy) |

Que hace por dentro, y que conviene explicar si el autor pregunta:

- **Lista** los ultimos videos por las tres pestanas del canal (`/videos`, `/shorts`, `/streams`) leyendo el
  `JSON` que YouTube ya trae en la pagina (`ytInitialData`). Sin claves y sin OAuth, asi que aguanta
  aunque caduque el refresh token. Si esa pagina cambia, cae solo en `yt-dlp`; si hay una
  `apiKey` (`YOUTUBE_API_KEY` o `--secretos`), usa antes la YouTube Data API.
- **Transcribe**: pagina `watch?v=<id>` -> `JSON` `ytInitialPlayerResponse` -> `captionTracks` -> descarga
  la pista en `json3` (y si no, `srv3`/`vtt`). **Ojo (13-nov-2026)**: YouTube ya devuelve vacias las URLs
  `timedtext` de la pagina watch, asi que la herramienta cae sola a la via alternativa (`yt-dlp`, el mismo
  que ya usa `tools/referencia.mjs`), que si baja los subtitulos. Si un video no tiene subtitulos, se marca
  y se sigue: no es un fallo.
- **Es educado**: User-Agent de navegador, 1,2 s entre peticiones, 3 reintentos con espera y 15 videos
  como tope por pasada. No se hacen rafagas ni bucles.

## 2. Donde queda el resultado (dentro del repo: lo ve el otro nodo)

| Fichero | Que es |
|---|---|
| `datos/tendencias/<canal>-<fecha>.json` | `articulos` con los temas (7 campos del pipeline + fragmento de origen), el `retrato` de tendencia y los videos con su transcripcion |
| `datos/tendencias/<canal>-<fecha>.md` | el retrato de tendencia legible: que se ve, con que se engancha, ritmo, preguntas del publico, que se puede imitar |
| `datos/tendencias/bruto/<canal>/<id>.txt` | la transcripcion cruda con marcas de tiempo |
| `datos/tendencias/bruto/<canal>/<id>.json` | la ficha del video (para redestilar sin volver a raspar) |

Cada tema sale con los 7 campos que ya usa el pipeline: `titulo`, `tema`, `tipo`, `resumen`, `gancho`,
`area` y `visitas30` (las vistas del video de origen). Ademas lleva su fragmento literal
(`fragmento`, `canal`, `video`, `enlace`, `marcaTiempo`) para poder verificarlo.

## 3. De temas a ideas (el pipeline que YA existe)

```bash
node tools/ideas-temas.mjs preparar 120 datos/tendencias/midudev-2026-11-13.json
node tools/ideas-temas.mjs correr 4
node tools/ideas-temas.mjs juntar
```

- `preparar` parte la fuente en lotes (`datos/investigacion/ideas/lote-NNN.json`; si la fuente no es la de
  Wikipedia, el lote lleva su nombre: `lote-<fuente>-NNN.json`, para no pisar los de otra fuente) y escribe la tarea.
- `correr` lanza un agente DSH por lote: **gasta cuota de MiniMax**, solo con el sí escrito del autor.
- `juntar` une las notas en `datos/investigacion/ideas-5estrellas.json` (ahi estan las ideas con su
  `formato`, `titulo_video`, `gancho`, `puntos`, `cierre`, `visual`, `datos_a_verificar` y `atractivo`).

Para probar la cadena sin gastar cuota: `node tools/ideas-temas.mjs mock <lote> --lotes <dir>` (notas de ejemplo).

## 4. De ideas a historia del estudio

```bash
node tools/tendencias-historia.mjs ideas --origen datos/investigacion/ideas-5estrellas.json --limite 20
node tools/tendencias-historia.mjs historia datos/serie/epica/<slug>.idea.json
```

- El primer comando deja una idea por tema en `datos/serie/epica/<slug>.idea.json`, el formato que ya
  come la granja (`node tools/producir-epicos.mjs`).
- El segundo convierte una idea en la ficha del motor `historia`: `datos/serie/historia-<slug>.json` y su
  modulo `.mjs` (que se carga sin errores). El guion son frases literales de la idea: queda marcado
  como borrador y un agente lo reescribe al formato del estudio (9 capitulos, 87-92 s) antes de producir.

## 5. Reglas de la casa

1. **En español**, siempre. La idea se deja en MD para que el autor la lea de un vistazo
   (`datos/tendencias/<canal>-<fecha>.md`) y el JSON es para las maquinas.
2. **No se inventa nada**: un tema sale de la transcripcion y lleva su fragmento. Si no hay
   transcripcion, no hay tema: se marca el video como `sin subtitulos` y se sigue.
3. **Se imita el tema y el angulo, nunca el contenido**: de otro canal se copia la estructura, no las frases.
4. **Nada de pago sin el sí del autor**: el scraping y el pipeline son gratis; la voz y el DSH de `correr` no.
5. **Educado con YouTube**: una pasada corta (max. 15 videos), con pausas. Nada de bucles ni de descarga masiva.
6. **Los dos nodos escriben en el repo** (`datos/tendencias/`), que se replica: nada de rutas fijas a una
   maquina y nada de editar el VPS a mano.
7. Si YouTube cambia la pagina o bloquea: se deja constancia en el `.md`, se prueba `--via ytdlp` o
   `--via api` y se sigue con el material ya descargado (`--desde-bruto`).

## 6. Pruebas (no pegan a YouTube)

```bash
node --test datos/tendencias/_muestra/tendencias.test.mjs
```

Las muestras estan en `datos/tendencias/_muestra/` (pagina `watch` con `captionTracks`, subtitulos
`json3`, pagina de canal y una fuente de tendencias de ejemplo).