---
name: trazabilidad-chat
description: >-
  Cómo consultar la BASE DE DATOS del chat de Telegram (DER por CDN, SHA fijado) para saber qué se ha
  dicho, quién lo ha dicho, qué quedó sin responder, qué turnos están en curso, qué reglas tiene cada
  tema y cómo va la cola. Usar cuando el autor (o una auditoría) pregunte por el historial, por
  mensajes perdidos, por turnos colgados o por las reglas de un hilo. La herramienta es
  tools/chat-consulta.mjs y NUNCA se escribe SQL a mano.
---

# Trazabilidad del chat (DER, sin SQL crudo)

La conversación vive en `telegram/chat.sqlite` (SQLite, WAL). Se consulta **por DER**, que se
consume por CDN con el SHA fijado en `import_map.json`. **Nunca escribas SQL a mano**: usa la
herramienta del repo.

## La herramienta

```
deno run -A --config "$ESTUDIO_REPO/import_map.json" "$ESTUDIO_REPO/tools/chat-consulta.mjs" <consulta> [opciones]
```

- `$ESTUDIO_REPO` es la raíz del repo del estudio: en el PC y en el VPS apunta al mismo sitio de
  código (el bot se lo pasa al agente en el entorno), así que el comando es **idéntico** en los dos.
- Si `deno` no está en el PATH, se llama con su ruta completa (en el PC:
  `C:\Users\jeffr\AppData\Local\Microsoft\WinGet\Packages\Denoland.Deno_Microsoft.Winget.Source_8wekyb3d8bbwe\deno.exe`).

## Consultas

| Consulta | Qué da |
|---|---|
| `estado` | cursor de getUpdates, nº de hilos, turnos en curso, mensajes sin respuesta, cola y salidas sin entregar |
| `hilos` | todos los hilos (clave `chat_id:thread_id`, nombre del tema, último mensaje) |
| `historial <clave> [n]` | los mensajes de un hilo (n por defecto 40) |
| `quien <clave>` | quién escribió en el hilo y cuántos mensajes |
| `sin-respuesta [n]` | entradas que aún no tienen respuesta |
| `turnos-en-curso` | turnos en marcha (o colgados) |
| `reglas <clave>` | las reglas que el autor fijó en ese hilo |
| `cola` | pendientes por hilo y salidas sin entregar |
| `eventos [n]` | eventos recientes (errores, reintentos, arranque) |

Opciones: `--db <ruta>` (otra BD) y `--json` (salida en JSON; por defecto es texto legible,
**igual en el PC y en el VPS**).

## Lo que significa cada cosa

- **clave del hilo**: `chat_id:message_thread_id` (`8707019767:0` es el chat privado del autor).
- `turnos` con estado `en_curso` = un turno que se quedó a medias (se recuperan al arrancar).
- `mensajes sin respuesta` = lo que el autor escribió y el bot aún no contestó: hay que retomarlo.
- `reglas` = las que fijó el autor con `/reglas` (o `fijarReglas`): el bot NIEGA lo que no las cumple.

## El resto de herramientas del estudio (las mismas en PC y VPS)

Todo vive en el repo (`$ESTUDIO_REPO`): `MAPA.md`, `AGENTS.md`, `INDICE.md`, `WIP.md`,
`PERFIL-TG.md`, `HANDOFF-ANIMACION.md`, `telegram/LEEME.md`, `telegram/GRUPOS-TEMAS.md`.
Herramientas: `tools/mesa.mjs` (mesa), `tools/vps.mjs` (VPS), `tools/vigia-cola.mjs` (vigía),
`tools/serie.mjs` (serie), `tools/chat-consulta.mjs` (este chat), `tools/check-paridad.mjs`
(paridad del perfil), `tools/instalar-perfil.sh|.ps1` (instalar el perfil DSH).

## Reglas

- Nada de SQL crudo: todo pasa por DER.
- Nada de cuota sin el sí escrito del autor (la voz y las APIs de pago).
- No se borra ni se reescribe el historial.
- Lo que se aprenda se escribe en el MD que corresponda (mismo commit).
