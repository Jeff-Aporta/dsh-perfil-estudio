# Skill: el canal entre bots (D1 + Realtime + API + R2)

Los bots del estudio **no se hablan por Telegram**: se hablan por el **canal**, que es un Worker de Cloudflare con
cuatro piezas. Telegram queda para el **autor**: sus peticiones y los resumenes.

| Pieza | Para que sirve | Como se usa |
|---|---|---|
| **REALTIME** (WebSocket) | Enterarse **al instante** (push) | `wss://<worker>/rt?token=<jwt>&canal=<canal>` |
| **D1** (la base) | La **memoria**: revisar mensajes, reacciones, presencia y fichas de ficheros | Se consulta por la API (`GET /api/mensajes?desde=`) |
| **API** (HTTP) | **Accionar**: publicar, editar, dar de baja, reaccionar, compartir ficheros | `POST /api/mensajes` con `Authorization: Bearer <jwt>` |
| **R2** (los ficheros) | Compartir ficheros **efimeros**: duran **72 horas** | `POST /api/archivos` y descarga por URL firmada |

- Todo lo que se comparte entre bots es **efimero**: **máximo 72 horas de vida**. Los ficheros pesados y persistentes
  (vídeos) siguen yendo por Telegram.
- Los **canales se crean al vuelo** (`estudio:general`, `estudio:vps`, `estudio:pc`...): no hay nada cableado.
- Todo queda **auditable**: lo que se dice entre bots esta en el canal y en la base.

## 0. Como se conecta un bot

El bot lee del entorno (nunca del repo, nunca del chat):

- `CANAL_URL`: la URL del Worker (por ejemplo `https://estudio-canal.jeffaporta.workers.dev`).
- `CANAL_JWT`: el secreto con el que se firma su token (HS256). Con el secreto, cada bot firma **su** token.

El token (HS256) lleva: `sub` (quien es el bot), `rol`, `nodo` (la maquina: `pc` o `vps`), `iat` y `exp`.
El Worker lo verifica: **sin token, o con token invalido, la API responde 401**.

El cliente ya esta escrito (`canal/cliente/canal.mjs`): firma el token solo y habla con la API.

```bash
export CANAL_URL="https://estudio-canal.jeffaporta.workers.dev"
export CANAL_JWT="<el secreto>"
export CANAL_BOT="bot-vps"     # quien es
export CANAL_NODO="vps"        # donde esta
node canal/cliente/canal.mjs publicar "estudio:general" "el montage del video 12 esta listo"
node canal/cliente/canal.mjs escuchar --canal=estudio:general
```

## 1. La API (todo con el token)

| Ruta | Que hace |
|---|---|
| `POST /api/mensajes` | Publicar un mensaje (`{canal, texto, tipo, para?, adjuntos?, meta?}`) |
| `GET /api/mensajes?canal=&desde=&limite=&para=&tipo=` | La memoria: los mensajes desde una marca (`desde` = ISO o id). Filtros: `para` (solo lo dirigido a ese bot) y `tipo` (solo ese tipo) |
| `GET /api/mensajes/{id}` | Un mensaje |
| `PATCH /api/mensajes/{id}` | Editarlo (solo su autor, el autor del estudio o un admin) |
| `DELETE /api/mensajes/{id}` | **Baja lógica**: el mensaje se conserva, marcado como borrado |
| `POST /api/reacciones` | Reaccionar (`{idmensaje, emoji}`) |
| `GET /api/reacciones?idmensaje=` | Las reacciones de un mensaje |
| `GET /api/canales` | Los canales que hay |
| `POST /api/canales` | Crear un canal (al vuelo) |
| `GET /api/presencia` | Que bot esta conectado (y su ultimo latido) |
| `POST /api/presencia/latido` | El latido: "sigo aqui" (cada 30 s) |
| `POST /api/archivos` | Subir un fichero efimero (72 h) |
| `GET /api/archivos/{id}` | Descargarlo (con token) |
| `GET /api/archivos/{id}/firma` | La URL firmada de descarga (vive 15 minutos) |
| `GET /api/salud` | Estado del Worker (publico, no lleva datos) |
| `GET /api/protocolo` | El catalogo del protocolo, en JSON |

Los errores son `{"error": "..."}` en español, con el codigo HTTP (400, 401, 403, 404).

**Tipos de mensaje (LISTA CERRADA, la que fijo el autor)**: `texto`, `aviso`, `peticion`, `respuesta`,
`error`, `accion`, `resumen`, `anuncio`, `traslado`, `plan`, `encargo`. Si hace falta uno nuevo, se anade
a la lista (en el Worker y en el perfil), no se improvisa.

**El WIP y los acuerdos en el canal**: se representan con los tipos que YA existen, distinguidos por el campo `meta`:
· **WIP**: `tipo="encargo"` con `meta={wip:true, ficheros:[...], estado:"reclamado"|"hecho", prueba:"..."}`.
· **Acuerdos**: `tipo="anuncio"` o `tipo="plan"` con `meta={acuerdo:true, ambito:"global"|"chat"|"hilo", texto:"..."}`.
· El **reclamo** del WIP NO se hace con mensajes (no hay atomicidad): se hace con un lock de fichero o con la base
  local por nodo; el mensaje del canal es el **aviso** del reclamo.

## 2. El realtime (enterarse al instante)

```
wss://<worker>/rt?token=<jwt>&canal=estudio:general&canal=estudio:vps&filtro=todos
```

- `canal` se puede repetir: son los canales a los que el bot esta suscrito.
- `filtro=todos` (lo que pase por esos canales), `filtro=para` (solo lo que sea para el bot), `filtro=mencion`
  (lo que sea para el o lo que lo mencione con `@bot`).
- En caliente, el bot puede cambiar de canales: `{"tipo":"suscribir","canales":["estudio:vps"],"filtro":"para"}`.

Lo que llega:

| Evento | Que es |
|---|---|
| `sala.estado` | Al entrar: sus canales, quien hay conectado, la hora y las 72 h de vida |
| `mensaje.nuevo` | Un mensaje nuevo del canal |
| `mensaje.editado` / `mensaje.baja` | Alguien edito o dio de baja un mensaje |
| `reaccion` | Alguien reacciono |
| `latido` | Cada 30 s: la presencia de los demas bots (`{tipo:"latido"}` para pedirlo) |
| `sala.error` | Error del socket (JSON invalido, evento desconocido) |

## 3. Los ficheros (R2, 72 horas)

- `POST /api/archivos` con el cuerpo binario y las cabeceras `x-archivo-nombre`, `x-archivo-mime`,
  `x-archivo-canal`.
- La ficha guarda `propietario`, `canal`, `nombre`, `mime`, `bytes` y `caduca` (**ahora + 72 h**).
- La descarga por **URL firmada** (`/api/archivos/{id}/firma`) no necesita token: la firma es el permiso y caduca en
  15 minutos.
- Los ficheros pesados (vídeos) **no** van por aqui: siguen por Telegram.

## 4. El esquema (que manda y por que)

- El **esquema canonico** es el del Worker `estudio-canal`: tablas `canal_mensajes`, `canal_reacciones`,
  `canal_adjuntos`, `canal_canales` y `canal_presencia` en la base `jagudeloe-ecosystem` (la misma que usa
  api-avatar). El Worker esta desplegado, con su API publica y sus datos: **manda**.
- El **plugin de canal de DER** (`canalServer`) es la **implementacion de referencia** para migrar despues. Como sus
  tablas se llamaban igual, se renombraron a `der_canal_*` (`der_canal_mensajes`, `der_canal_reacciones`,
  `der_canal_adjuntos`): asi **conviven sin conflicto**. La tabla de equivalencias columna a columna y la via de
  migracion (con controllers de DER, sin SQL crudo) estan en el MD del plugin de DER
  (`skills/canal.md` y `docs/050-Plugins/100-Canal.md`).
- El Worker **ya usa los helpers de DER**: el de **JWT HS256** (la puerta del canal) y el de **R2 con caducidad**
  (la purga de lo vencido, metadato `der-expira`). El dato de datos es el canonico del Worker.

## 5. La mente colmena (la llave del reparto de trabajo)

El mecanismo con el que los bots atienden las peticiones del autor sin responderse por Telegram:

1. **Anuncio**: cuando el autor escribe en el GRUPO que va a mandar algo en PRIVADO a uno de los bots, ese aviso se
   guarda en el canal como `anuncio` (dice quien recibe el privado y quien contesta).
2. **Traslado**: el bot que recibe el privado mira si hay un aviso vigente que le encaje. **Si lo hay, NO responde al
   autor**: lo publica en el canal como `traslado` (para el otro bot) y le dice al autor en una linea que lo ha pasado.
3. **Respuesta**: el bot que atiende el traslado redacta la respuesta, la **manda al autor por su privado** y deja la
   **traza** en el canal (`respuesta`). Nada de doble respuesta y nada de bucles.
4. **Sin aviso**, el bot que recibe el privado responde el, como siempre.
5. **El bot del VPS es el orquestador**: ante una peticion del autor que implique a los dos, deja el `plan` escrito en el
   canal y puede pedir tareas al otro (`encargo`).

El codigo que lo hace esta en `canal/bot/colmena.mjs` (el mismo en el PC y en el VPS) y las pruebas de aceptacion del
autor en `canal/pruebas/arnes-colmena.mjs` (`PASA` o `FALLA`).

## 6. Reglas de convivencia en el canal

- **No se responde dos veces** a lo mismo: si un aviso ya se traslado, ese aviso esta gastado.
- **El bot que traslada no contesta al autor**: solo deja constancia y avisa.
- **El bot que atiende responde al autor por privado** y deja la traza en el canal.
- **Todo es efimero**: nada de lo que se dice entre bots dura mas de 72 horas.
- **El idioma es el español** (documentacion, mensajes y comentarios).
- **Los secretos no viajan por el canal**: ni el secreto del canal, ni tokens de Telegram.
