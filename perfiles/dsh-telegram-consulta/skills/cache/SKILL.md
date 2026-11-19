---
name: cache
description: >-
  Como cachear en el estudio (el motor, el kit, los scripts y el chat) con claves de hash, en SQL
  (SQLite/DER) o en Redis: que se cachea, cuando se invalida y como se comprueba. Usar cuando una
  tarea repita trabajo caro (descargas, icono, renders, consultas, indexados) o cuando el autor
  pida "cachear", "no volver a pedir lo mismo" o "ponerlo en cache".
---

# Cache por hash (SQL o Redis)

## 1. La regla

La clave de un cache es el **hash del contenido que lo produce**, no un nombre inventado. Asi el
cache se invalida solo: si el contenido cambia, el hash cambia, y la entrada vieja ya no se usa.

```
clave = sha256(<lo que entra> + "|" + <version del formato>)
```

- Se guarda **el hash en la clave y, si hace falta, tambien dentro del valor**, para poder
  comprobar sin recalcular.
- **El TTL no es opcional**: todo cache tiene caducidad. Si el contenido no caduca nunca, es un
  fichero, no un cache.
- **Nunca se cachea un secreto** (tokens, claves, cabeceras con credenciales) ni el resultado de
  una peticion autenticada: el valor cacheado no lleva credenciales.

## 2. Cuando cachear

Cachea solo lo que cumple una de estas:

1. Es **caro**: descarga de red, render, llamada a una API, parseo pesado, indexado.
2. Es **estable**: el origen cambia poco (por ejemplo, la lista de alias de un icono).
3. Se **vuelve a pedir**: hay varios llamadores o el hilo repite la pregunta.

No cachees lo que cambia cada segundo (el estado de la cola, el progreso de un render) ni lo que
es barato de recalcular.

## 3. SQL (SQLite) — el cache por defecto del estudio

- El cache del estudio es **SQLite local** y se escribe **con el patron DER del repo** (CDN con el
  SHA fijado en `import_map.json`), **nunca SQL crudo a mano**.
- Tabla minima:

```sql
CREATE TABLE cache (
  clave     TEXT PRIMARY KEY,   -- sha256 de la entrada
  valor     TEXT NOT NULL,      -- JSON
  creado    INTEGER NOT NULL,   -- epoch ms
  ttl_seg   INTEGER NOT NULL,   -- caducidad en segundos
  origen    TEXT                -- de donde sale (para auditar)
);
```

- Lectura: `SELECT valor FROM cache WHERE clave = ? AND creado + ttl_seg > ?`.
- Escritura: `INSERT OR REPLACE INTO cache (clave, valor, creado, ttl_seg, origen) VALUES (...)`.
- Barrido: borrar las filas caducadas (`creado + ttl_seg < ?`). **No se borra trabajo**: un purge
  de cache no toca logs, historiales ni ficheros de trabajo; solo filas de cache, y se anota en el
  log.
- En el VPS la BD del cache va junto al estado del estudio (`$ESTUDIO_DIR`), con su fichero en
  `.gitignore` y su **backup** en el ciclo de backups.

## 4. Redis — cuando la cache es compartida entre nodos

Redis se usa solo si la cache tiene que **compartirla mas de un nodo** o necesita TTL nativo y
mucha concurrencia. En el estudio hoy no hay Redis desplegado: si se usa, se documenta en el MD
del proyecto y el secreto va en el entorno (nunca en el repo ni en el chat).

- Redis guarda **el valor completo**, no un puntero a un fichero.
- La clave lleva el prefijo del proyecto: `estudio:<proyecto>:<hash>`.
- `SETEX clave <ttl> valor` (TTL en el mismo comando, para que no queden entradas sin caducidad).
- En el PC (Windows) Redis es un servicio extra: **no se instala sin peticion del autor**. En su
  lugar se usa SQLite.
- El **VPS es el nodo 24/7**: si la cache tiene que vivir siempre, se monta aqui.

## 5. Como se decide (regla rapida)

| Situacion | Choice |
|---|---|
| Cache de un solo nodo, con ficheros o estado del estudio | **SQLite (DER)** |
| Cache compartida entre el PC y el VPS, o TTL masivo | **Redis** (si el autor lo pide) |
| Cache de una sola vez (un render, un calculo) | **No hay cache**: se guarda el fichero y ya |
| Un fichero ya esta en disco y es pequeno | **No hay cache**: se lee el fichero |

## 6. Invalidacion

- El hash manda: si cambia el contenido, la clave cambia y la entrada vieja no se usa.
- **Invalidacion explicita** cuando se sabe que algo quedo obsoleto: se borra la fila (cache) o se
  cambia la version en el prefijo de la clave. Se **anota en el MD** del proyecto por que.
- **TTL corto** para lo que depende del mundo (10-60 min) y **TTL largo** para lo que es casi
  fijo (1-7 dias). Ante la duda, TTL corto.
- Nunca se sirve un valor cacheado **sin** comprobar que su hash sigue siendo el del contenido
  actual (para los ficheros, comparar `sha256` del fichero con el de la clave).

## 7. Lo que ya esta cacheado en el estudio (no inventar otro)

- **Iconify (alias)**: `kit/iconify-local/mdi.json` con la variable `ICONIFY_LOCAL`, porque
  `kit/tools/iconos.mjs` no resuelve los alias (p. ej. `mdi:tape` es alias de `mdi:cassette`).
  El arreglo de codigo va en el PC.
- **Grafo del codigo**: `codebase-memory-mcp` guarda su indice en
  `~/.cache/codebase-memory-mcp` (`CBM_CACHE_DIR`), indexado por hash de cada fichero. Es la cache
  de contexto de los agentes: `mcp__codebase__search_graph`, `mcp__codebase__trace_path`,
  `mcp__codebase__get_architecture`, `mcp__codebase__query_graph`.
- Si algo ya esta cacheado, se usa y se documenta; no se crea una segunda cache para lo mismo.

## 8. Reglas del estudio que aplican

- Lo que se aprende de la cache (un fallo, un TTL que no funciono, un formato de clave) se escribe
  en el MD del proyecto, **en el mismo commit**.
- Nada de cuota sin permiso: una cache no es una API de pago, pero tampoco se mete una API de pago
  detras de una cache para "no gastar".
- No se borra trabajo: un purge de cache solo toca filas de cache, y se avisa en el log.
- Los secretos van en el entorno, nunca en la clave ni en el valor cacheado.
