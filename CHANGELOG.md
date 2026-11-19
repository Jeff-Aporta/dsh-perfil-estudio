utf8

## 19-nov-2026 - el grafo del codigo (codebase-memory-mcp) y la skill `cache`

- **Grafo del codigo**: los 7 perfiles (`perfiles/*/cordis.patch.yml`) montan ahora el servidor
  MCP local `codebase-memory-mcp` con el plugin `@deepseek-ai/dsh-mcp-client` (id `mcp-codebase`,
  `serverName: codebase`). El agente dispone de las 17 herramientas `mcp__codebase__*`
  (`search_graph`, `trace_path`, `get_architecture`, `query_graph`, `get_code_snippet`,
  `search_code`, `index_status`...) para tener contexto estructural del repo sin leer fichero a
  fichero. Es local, sin red y sin cuota; si el binario no esta, el perfil **arranca igual**
  (`failOnStartupError: false`).
- El indice vive en `~/.cache/codebase-memory-mcp` (`CBM_CACHE_DIR`, resuelto por la config del
  perfil para que sea el mismo camino en PC y VPS). En el VPS queda indexado
  `/opt/estudio-videos-repo` (94.061 nodos / 286.865 aristas), `/opt/dsh-perfil-estudio`,
  `/opt/datos/jeff-aporta-repo` y `/opt/datos/portafolio`.
- Para indexar: `CBM_CACHE_DIR=~/.cache/codebase-memory-mcp codebase-memory-mcp cli index_repository
  --repo-path <ruta>` (el modo `moderate`/`fast` es mas rapido; `--async` deja el index en
  segundo plano).
- **Skill `cache`** (nueva, en `skills/cache/SKILL.md` y copiada a `perfiles/*/skills/cache/`): la
  clave de un cache es el **hash sha256 del contenido** que lo produce, el valor se guarda en
  **SQL (SQLite, con el patron DER del repo, nunca SQL crudo)** o en **Redis** (solo si hay que
  compartir la cache entre nodos y el autor lo pide). Todo cache tiene TTL, no se cachean
  secretos y un purge de cache no borra trabajo.
- Nuevo apartado "Manejo de cache (por hash)" en `perfiles/*/definiciones.md` y en `PERFIL-TG.md`
  (raiz y copias), que van en el prompt de cada sesion.
- Peticion del autor en el tema general (19-nov-2026).

## 19-nov-2026 - confirmar antes de cualquier accion destructiva

- `PERFIL-TG.md` (raiz y copias de `perfiles/*/`): nueva regla del autor. Antes de borrar o
  archivar cualquier cosa (descartar un video, borrar ficheros o mensajes, archivar o deprecar
  un repo) se pregunta al autor y se espera su "si". Ninguna accion destructiva sin pregunta
  previa.
- La regla es posterior y sustituye a la anterior ("no debes preguntar confirmacion, solo los
  borras apenas lo avise"): si vuelve a contradecirse, manda la mas reciente y se pregunta.
- Regla general anadida tambien en el apartado 2 (reglas del estudio), como punto 8.

## 19-nov-2026 - skill `humor-negro` en todos los perfiles

- Nueva skill `humor-negro` (skills/humor-negro/SKILL.md, copiada a `perfiles/*/skills/humor-negro/`):
  ocho estructuras que funcionan, banco con contexto de programacion, banco suave de produccion,
  lineas rojas (nada de personas reales, nada de mayusculas, nada de remates suicidas) y la
  prueba de la linea antes de mandarla.
- Nuevo apartado "Humor negro" en `PERFIL-TG.md` (raiz y copias de `perfiles/*/`): se usa solo
  cuando el autor lo pide o cuando el tono del hilo lo admite.
- Peticion del autor por el canal (traslado del bot del PC, 19-nov-2026).

## 19-nov-2026 - skill `jerga-colombiana` en el perfil `dsh-telegram`

- Nueva skill `jerga-colombiana` (perfiles/dsh-telegram/skills/jerga-colombiana/SKILL.md):
  ~110 expresiones colombianas verificadas (saludos, vocativos, calle, taller, barrio y las
  palabras que en Colombia significan otra cosa), con su region y sus reglas de uso.
- Nuevo apartado "Jerga colombiana" en `perfiles/dsh-telegram/definiciones.md` (va en el prompt
  de cada sesion del perfil base): top de expresiones y las reglas (una marca por mensaje,
  usted y no vos, nada de insultos, no inventar).
- Origenes: Wikipedia (espanol colombiano, bogotano, paisa, Parlache) y Wikcionario
  (Glosario del parlache, Colombianismos; Diccionario de Parlache y Diccionario comentado
  del espanol hablado en Colombia).
- Peticion del autor en el tema 140 del grupo de Telegram (19-nov-2026).
