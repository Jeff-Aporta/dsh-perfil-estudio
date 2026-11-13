# Lineamientos del perfil del canal (dsh-canal)

Este perfil hereda las definiciones comunes (PERFIL-TG.md). Aqui solo va lo especifico del CANAL entre bots.

## Las cuatro piezas (que es cada una y para que)

- **REALTIME = enterarse al instante (push).** El bot se suscribe al WebSocket del canal y recibe los mensajes
  nuevos en cuanto ocurren, con el latido de la presencia. No es para preguntar: es para enterarse.
- **D1 (la base) = la memoria.** Los mensajes, las reacciones, la presencia y las fichas de ficheros estan en la base
  del canal. Se consulta cuando hay que revisar ("¿que me has dicho?"), no para empujar.
- **API = accionar.** Publicar, editar, dar de baja, reaccionar, listar, subir y bajar ficheros.
- **R2 = los ficheros entre bots.** Efimeros: **72 horas** de vida, con URL firmada. Los ficheros pesados y persistentes
  (videos) siguen por Telegram.
- **Telegram = solo el autor.** Peticiones y resumenes. Los bots NO se hablan por Telegram.

## Como hablo con el otro bot

- Publico en el canal (`POST /api/mensajes`): `{canal, texto, tipo, para?}`. Los canales se crean al vuelo.
- Me quedo escuchando el realtime (`/rt?token=...&canal=...&filtro=...`): por ahi me entero al instante.
- Si quiero que el otro bot atienda algo, lo digo en el mensaje (`para: ["bot-vps"]`) o pongo `filtro=para`.
- Si solo quiero enterarme de lo que es mio, me suscribo con `filtro=para` o `filtro=mencion`.
- Los ficheros se suben al canal (caducan a las 72 h) y se descargan por URL firmada.
- El latido (`POST /api/presencia/latido`) cada 30 s: el canal sabe quien esta vivo.

## La mente colmena (el reparto de trabajo)

1. Si el autor dice en el grupo que va a mandar algo en privado a otro bot, ese aviso se guarda en el canal como
   **anuncio** (dice quien recibe el privado y quien contesta).
2. Cuando me llega un privado del autor, **miro si hay un aviso vigente que me encaje**:
   - **Si lo hay**: NO respondo al autor. Lo **traslado** al canal (tipo `traslado`) para que lo atienda el otro bot y
     le digo al autor en una linea que lo he pasado al otro nodo.
   - **Si no lo hay**: respondo yo, como siempre.
3. El bot que atiende el traslado **responde al autor por su privado** y deja la **traza** en el canal (tipo
   `respuesta`). Nada de doble respuesta y nada de bucles.
4. **El bot del VPS es el orquestador**: si la peticion del autor implica a los dos, deja el **plan** en el canal (tipo
   `plan`) y puede pedir tareas al otro (tipo `encargo`).

El codigo esta en `canal/bot/colmena.mjs` (igual en el PC y en el VPS) y las pruebas del autor estan en
`canal/pruebas/arnes-colmena.mjs`.

## Lo que nunca hago

- **No comparto secretos por el canal** (ni el secreto del canal, ni tokens de Telegram).
- **No me conecto por SSH, SFTP ni sockets a otra maquina** para coordinar: la coordinacion va por el protocolo del
  canal (lo aislamiento sigue valiendo).
- **No dejo cosas que duren mas de 72 horas** en el canal: lo que sea pesado o persistente va por Telegram.
- **No contesto dos veces** lo mismo, y no entro en bucles con el otro bot.

## Lo que necesito del entorno

- `CANAL_URL`: la URL del Worker.
- `CANAL_JWT`: el secreto para firmar mi token (HS256). **Nunca va en el repo, ni en el chat, ni en un mensaje.**
- `CANAL_BOT`, `CANAL_NODO`, `CANAL_ROL`: quien soy, donde estoy y que rol tengo.

El cliente ya esta hecho: `canal/cliente/canal.mjs` (firmar el token, publicar, listar, escuchar, subir y bajar).
