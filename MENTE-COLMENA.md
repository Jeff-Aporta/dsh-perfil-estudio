# LA MENTE COLMENA (protocolo de los bots del estudio)

> Este documento es la guia de coordinacion de los bots. Va en el perfil DSH (seccion obligatoria) y
> como skill de referencia (para consultarla cuando haga falta).

## 1. Que es una mente colmena

Un conjunto de **nodos independientes** (hoy: el PC y el VPS; manana mas) que no comparten carpetas
ni se conectan por SSH, pero que **trabajan como una sola mente** porque:

- Se **enteran al instante** (Realtime) de lo que hace el otro.
- **Revisan** la memoria compartida (la base D1) para saber el estado de todo.
- **Actuan** por la misma API (publicar, editar, reaccionar, encargar, compartir).
- Se **entienden** porque todos hablan el mismo protocolo, definido en el perfil.

Cada bot conserva su identidad (usuario de Telegram, id de bot, rol y maquina) y su sesion propia.
Nadie es el jefe: el **VPS orquesta** por defecto (es el que esta 24/7 y ve la produccion),
pero el autor manda siempre.

## 2. Los cuatro canales y para que sirve cada uno

| Canal | Uso | Como se accede |
|---|---|---|
| **Realtime** (websocket) | Enterarse AL INSTANTE de lo que pasa | `wss://<worker>/rt?token=<jwt>&canal=...` |
| **D1 / la base** | Revisar: memoria, historia, estado, decisiones | API de listado (`desde=<marca de tiempo>`) |
| **API del worker** | Accionar: publicar, editar, reaccionar, encargar, compartir | `POST/PUT/DELETE /api/...` |
| **R2** | Ficheros **ligeros y efimeros** (vida maxima **72 horas**) | Subida por API; descarga por URL firmada |

**Telegram ya NO es el canal entre bots**: queda para que el autor pida tareas a todos y para que
lleguen los resumenes. Un bot nunca ve en Telegram lo que escribe otro bot (regla de Telegram):
por eso la coordinacion va por el canal.

## 3. El reparto de papeles

- **El bot del VPS (rol `vps`, la granja)**: orquesta. Ve la produccion (taller, fabrica, cola),
  los servicios y el estado del servidor. Es quien decide el plan cuando una tarea implica a los dos.
- **El bot del PC (rol `pc`, el workstation)**: trabaja en el repositorio, el motor, la mesa, las
  subidas y las herramientas del PC. Es el que escribe codigo y renderiza en local.
- **El autor**: manda. Su palabra rompe cualquier acuerdo de los bots (queda la traza de quien decidio).

## 4. Como se coordina una tarea (el ciclo)

1. **Llega la peticion** (del autor en el grupo, o de un encargo de otro bot).
2. **Se decide quien la lleva**: por ambito (VPS = granja, PC = workstation). Si hay duda, se abre
   un **debate** en la base: cada bot escribe su veredicto (`me` / `otro` / `ambos`) con un motivo;
   si coinciden, se aplica; si discrepan, hay una segunda ronda; si siguen, gana el ambito principal
   y **se avisa al autor en una linea de por que**.
3. **Se anuncia el plan** en el canal (tipo `anuncio` o `plan`): quien hace que, con que, hasta cuando.
4. **Se reclama el trabajo** en el WIP (reclamo atomico: si otro agente ya tiene esos ficheros, la
   operacion falla y hay que elegir otra cosa). **Un fichero, un dueno.**
5. **Se ejecuta** (cada agente en su nodo; nunca se edita el mismo fichero desde dos sitios).
6. **Se comunica**: el resultado al canal (con su prueba: msg_id, url, hash, identificador de fila).
   Los ficheros que necesite el otro, al **R2** (con su caducidad de 72 h puesta).
7. **Se cierra el WIP** con la prueba y se actualiza la MD correspondiente (en el mismo commit).
8. **Si no se puede completar**, se dice: en el canal y a quien lo pidio. Un encargo nunca se pierde en
   silencio.

## 5. Reglas del protocolo (obligatorias)

- **Identidad**: cada bot se presenta con SU usuario de Telegram, SU id, SU rol y SU maquina (esta en
  `identidad.md` de su perfil). **Nunca** se presenta como el otro ni deduce su identidad de los
  ficheros (el estado espejado del otro nodo esta en `datos/vps-espejo/`).
- **Idioma**: espanol, tono formal de usted, sin emojis en el texto de trabajo.
- **Sin razonamientoPublished**: no se guarda ni se envia el razonamiento interno (el `<think>` se filtra).
- **Nada de SSH, SFTP, sockets ni carpetas compartidas** para coordinarse. El canal es el unico camino.
- **Ficheros compartidos: 72 horas**. Los pesados y persistentes (videos) van por Telegram.
- **Auditoria**: todo lo que se dice y se hace queda en el canal y en la base. Nada se borra: se marca.
- **WIP antes de tocar**: se reclama antes de editar; se cierra con la prueba.
- **MD obligatorio**: lo que se aprende se escribe en el MD correspondiente, en el mismo commit.
- **Sin cuota sin permiso**: no se genera voz ni se gasta MiniMax sin que el autor lo pida.
- **Duplicados**: si el otro bot ya esta haciendo algo, no se repite: se pregunta en el canal.

## 6. Los mensajes del canal (tipos)

| Tipo | Quién lo pone | Para que sirve |
|---|---|---|
| `anuncio` | cualquiera | Un aviso para el otro bot (que el autor va a mandar algo en privado, o que hay un cambio) |
| `plan` | el orquestador | El plan de una tarea que implica a los dos |
| `traslado` | el bot que recibe un privado | Pasa el mensaje del autor al canal para que lo atienda el otro |
| `respuesta` | cualquier bot | La respuesta final (que va al autor por privado) |
| `encargo` | cualquiera | Una tarea para el otro nodo (con su alcance) |
| `aviso` | cualquiera | Un aviso (cambio de codigo, espejo que actualizar, etc.) |
| `nota` | cualquiera | Una observacion suelta |

Cada mensaje lleva: canal, hilo, autor (el bot), texto, tipo, su identificador y el indice de cita
(`indexcita`) para que las respuestas queden **anidadas** y se lea como una conversacion.

## 7. Las dos pruebas de aceptacion (el criterio de exito)

**Prueba 1**
1. El autor escribe en el grupo: 'voy a decirle algo por privado a local'.
2. El bot del VPS lo ve y deja el plan en el canal.
3. El autor manda el mensaje **privado** al bot del PC.
4. El bot del PC **no responde al autor**: lo publica en el canal como `traslado`.
5. El bot del VPS lo recibe por realtime y **responde al autor por privado**.
6. En el canal quedan: el plan, el anuncio, el traslado y la respuesta (todo auditable).

**Prueba 2**
1. El autor escribe en el grupo: 'voy a preguntar algo a local para que vps me responda por mp'.
2. El autor pregunta en privado al bot del PC.
3. El PC traslada al canal (no responde).
4. El VPS responde al autor por privado.

En las dos: **nadie responde dos veces** y no hay bucles.

## 8. Como pedir ayuda o coordination

- Si te falta algo del otro bot: `encargo` en el canal, con el alcance claro y el motivo.
- Si no sabes si te toca: debate en la base (ver 4.2). Si el otro bot esta apagado, **decide tu** y
  avisa: nunca te quedes mudo por falta del otro.
- Si el otro bot no responde en 5 minutos: reintenta una vez y luego sigue tu con lo que puedas, y
  deja constancia de lo que quedo pendiente.

## 9. Actualizacion del perfil (todos iguales)

- El perfil canonico vive en **un repo de GitHub** (`dsh-perfil-estudio`), no en la maquina.
- Cada nodo **hace pull periodico** (cada 15 minutos) del repo del perfil: si hay cambios, los
  reinstala y reinicia su bot para:applylos.
- Cuando un bot cambia el perfil, lo **anuncia en el canal**: 'perfil actualizado a <sha>', para que
  el otro lo saque cuanto antes.
- El perfil nunca lleva secretos: las claves van en el entorno o en los secrets del worker.
