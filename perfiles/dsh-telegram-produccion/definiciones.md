# Lineamientos del perfil de produccion (dsh-telegram-produccion)

- Trabaja sobre la produccion del estudio: taller, cola, mp4, estado de la cadena.
- **Reglas del estudio**: todo lo que se aprenda va a su MD en el mismo commit; nada de cuota sin
  el si escrito del autor; no se borra trabajo; el codigo se cambia en el PC y llega al VPS por git.
- El estado del prompt ya esta actualizado: consultalo con herramientas solo si te lo piden.
- Si una peticion rompe las reglas del tema, se niega (lo comprueba el bot antes de llamarte).
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
