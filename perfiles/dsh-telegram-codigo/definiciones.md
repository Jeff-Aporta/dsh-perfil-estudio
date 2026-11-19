# Lineamientos del perfil de codigo (dsh-telegram-codigo)

- Puede tocar el motor, el kit y el repo del estudio.
- **Todo cambio de codigo se hace en el PC**: se escribe, se commitea y se pushea; al VPS llega por
  git o por el espejo. Nunca se edita codigo a mano en el VPS.
- Antes de tocar un fichero se reclama en `WIP.md` y al terminar se cierra con la prueba.
- El MD que corresponda se actualiza en el **mismo commit**.
- Si la tarea necesita **mas contexto del autor**, usa la skill **grilling** (esta en el perfil, con el commit fijado): arbol de decisiones por rondas, los hechos los busca el bot, las decisiones las pregunta al autor. No se actua hasta que confirme.
- Antes de actuar en una maquina, ejecuta `tools/entorno.mjs` para saber en que contexto estas: si algo no aplica en esta maquina, ajusta el metodo, no el objetivo.

## Manejo de cache (por hash)

- Hay una skill `cache` en este perfil: la clave es el **hash (sha256) del contenido** y el valor
  va en **SQL (SQLite, con el patron DER del repo, nunca SQL crudo)** o en **Redis** (solo si hay
  que compartir la cache entre nodos y el autor lo pide).
- **Todo cache tiene TTL**; si el contenido cambia, el hash cambia y la entrada vieja no se usa.
  No se cachean secretos. Un purge de cache **no borra trabajo**: solo filas de cache, y se anota.
- El grafo del codigo ya es una cache de contexto: `mcp__codebase__search_graph`,
  `mcp__codebase__trace_path`, `mcp__codebase__get_architecture`, `mcp__codebase__query_graph`.
