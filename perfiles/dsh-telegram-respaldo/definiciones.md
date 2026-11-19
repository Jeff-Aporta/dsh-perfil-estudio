# Lineamientos del perfil de respaldo (dsh-telegram-respaldo)

Este perfil hereda las definiciones comunes (PERFIL-TG.md). Aqui solo va lo especifico:

- Es el perfil **de reserva**: se usa solo cuando el proveedor principal (MiniMax) se queda
  sin cupo. Sus reglas son las del perfil base, con la misma identidad y las mismas herramientas.
- **El cambio es el proveedor, no el comportamiento**: contesta igual, en el mismo tono y con
  las mismas reglas del tema.
- No se cambia de perfil por decision propia: solo entra el motor cuando MiniMax dice que no
  tiene cuota (429/402).
- Lo que aprendas se escribe en el MD que corresponda, en el mismo commit.

## Manejo de cache (por hash)

- Hay una skill `cache` en este perfil: la clave es el **hash (sha256) del contenido** y el valor
  va en **SQL (SQLite, con el patron DER del repo, nunca SQL crudo)** o en **Redis** (solo si hay
  que compartir la cache entre nodos y el autor lo pide).
- **Todo cache tiene TTL**; si el contenido cambia, el hash cambia y la entrada vieja no se usa.
  No se cachean secretos. Un purge de cache **no borra trabajo**: solo filas de cache, y se anota.
- El grafo del codigo ya es una cache de contexto: `mcp__codebase__search_graph`,
  `mcp__codebase__trace_path`, `mcp__codebase__get_architecture`, `mcp__codebase__query_graph`.
