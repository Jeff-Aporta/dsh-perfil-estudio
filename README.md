# dsh-perfil-estudio

El **perfil canonico de los bots del estudio**: los perfiles DSH, el plugin que los
carga, los instaladores y el verificador de paridad. Vive en **un solo repo de
GitHub**, asi que todos los bots (el del PC, el del VPS y los que vengan) se
comportan **exactamente igual** y las actualizaciones se hacen con **pull + push**.

- Repo: https://github.com/Jeff-Aporta/dsh-perfil-estudio (publico, **sin secretos**)
- Se instala en: `~/.dsh/profiles/<nombre>/` (PC: `C:/Users/<usuario>/.dsh/profiles/`, VPS: `/root/.dsh/profiles/`)
- La identidad de cada nodo (`identidad.md`) **no** esta aqui: es por nodo y no se replica.

## Estructura

| Ruta | Que es |
|---|---|
| `indice.yml` | El registro de los perfiles (los 5 de Telegram + el del canal). |
| `PERFIL-TG.md` | El **canonico**: el comportamiento comun (idioma, reglas del estudio, la mente colmena). Se copia dentro de cada perfil. |
| `MENTE-COLMENA.md` | La guia completa del protocolo de coordinacion entre bots. |
| `perfiles/<nombre>/` | Un perfil: `perfil.yml`, `definiciones.md`, `PERFIL-TG.md`, `cordis.yml`, `cordis.patch.yml`, `package.json`, `pnpm-workspace.yaml`, `skills/<skill>/SKILL.md`. |
| `skills/` | Las skills canonicas (grilling, trazabilidad-chat, adaptacion-entorno, canal, mente-colmena). |
| `plugin/` | **El plugin de DSH** (`dsh-estudio-plugin`): inyecta el perfil en cada sesion y registra las herramientas del protocolo. |
| `install.sh` / `install.ps1` | Instalan (o reinstalan) todos los perfiles en esta maquina. |
| `actualizar.sh` / `actualizar.ps1` | Pull + reinstalacion + reinicio del bot + aviso en el canal. |
| `verificar-paridad.mjs` | Comprueba hash a hash que repo, PC y VPS tienen lo mismo. |
| `sistema/` | Las units de systemd (timer de 15 minutos) y su instalador. |
| `windows/` | La tarea programada de Windows (cada 15 minutos) y su instalador. |

## Los perfiles

| Perfil | Para que sirve |
|---|---|
| `dsh-telegram` | Base del chat de Telegram (por defecto). |
| `dsh-telegram-consulta` | Solo consulta y explica (no escribe ni ejecuta). |
| `dsh-telegram-produccion` | Produccion (taller, cola, mp4). |
| `dsh-telegram-codigo` | Motor y kit (siempre desde el PC, con commit + push). |
| `dsh-telegram-privado` | Solo conversa (chat privado del autor). |
| `dsh-telegram-respaldo` | **Reserva** del chat: el perfil base con DeepSeek. Entra solo si MiniMax se queda sin cupo. |
| `dsh-canal` | El canal entre bots (D1 + Realtime + API + R2). |

## El perfil de respaldo (`dsh-telegram-respaldo`)

Es una **copia de `dsh-telegram` con otro proveedor**: las mismas reglas, las mismas
herramientas, los mismos permisos y el mismo plugin, pero el modelo es **DeepSeek**
(`deepseek-official` / `deepseek-flash`) en vez de MiniMax.

**Para que sirve**: cuando MiniMax responde que se acabo el cupo (429/402) en las dos
claves, el bot reintenta ese mismo turno con este perfil, de modo que un bajon de cuota
**no corta la conversacion**. Si el respaldo tambien falla, el bot contesta con los datos
directos y guarda el mensaje para responder luego (el comportamiento de siempre).

- No es el perfil por defecto de ningun hilo: no aparece en `/perfil` ni en el registro
  de perfiles del estudio. Es una reserva tecnica.
- La clave que necesita es `DEEPSEEK_API_KEY` (`~/.dsh/claves.env` en el PC;
  en el VPS viaja por `tools/sync-keys.mjs` hasta `fabrica/dsh.env`).
- En el GUI (este chat) el equivalente lo hace el **plugin**, detras de la bandera
  `RESPALDO_DEEPSEEK=1` (apagada por defecto).

## El plugin (`dsh-estudio-plugin`)

**Que hace**:

1. **Inyecta en el prompt de CADA sesion** (nueva y de seguimiento) el `PERFIL-TG.md`
   canonico, las `definiciones.md` del perfil y la **identidad del nodo** (`identidad.md`).
   Asi el bot sabe quien es sin deducirlo de los ficheros.
2. **Registra las herramientas del protocolo**:
   - `canal_publicar` / `canal_listar`: publicar y revisar en el canal (D1 + API del Worker).
   - `wip_reclamar` / `wip_soltar` / `wip_cerrar` / `wip_listar`: el WIP compartido
     (el reclamo es **atomico**: creacion exclusiva de un fichero; el canal solo lleva el aviso).
   - `acuerdo_registrar` / `acuerdos_listar`: los acuerdos globales (mensajes con `meta.acuerdo`).
3. Respeta las reglas del estudio: **nada de SSH ni sockets**, ficheros compartidos de **72 h**,
   **espanol** y **MD obligatorio**.

**Como se carga (mecanismo real de DSH 0.2.2-rc.1)**:

1. El perfil lo declara como **dependencia** en su `package.json`:
   ```json
   "dependencies": { "dsh-estudio-plugin": "github:Jeff-Aporta/dsh-perfil-estudio" }
   ```
2. El patch del perfil (`cordis.patch.yml`) lo **monta** con una fila:
   ```yaml
   - id: estudio
     name: "dsh-estudio-plugin"
     config:
       perfil: dsh-telegram
   ```
3. El loader de DSH importa la fila **por nombre** desde la carpeta del perfil
   (`loader.import(row.name, baseUrl)`), asi que el paquete tiene que estar instalado en
   `<perfil>/node_modules` (lo hace `pnpm install`).

**Comprobar que carga** (sin gastar cuota de modelo):

```bash
dsh --profile dsh-telegram --dump-config   # sale la fila del plugin
dsh --profile dsh-telegram --help          # arranca el perfil: el plugin se aplica
node plugin/pruebas/prueba-plugin.mjs      # la prueba del plugin (16 comprobaciones)
```

Al arrancar, el plugin deja una linea en el log:
`[estudio] plugin cargado: perfil dsh-telegram, maquina vps, canal configurado (ok)`.

## Instalar

En el **PC** (Windows):

```powershell
git clone https://github.com/Jeff-Aporta/dsh-perfil-estudio.git D:\VPS\dsh-perfil-estudio
powershell -NoProfile -ExecutionPolicy Bypass -File D:\VPS\dsh-perfil-estudio\install.ps1
```

En el **VPS** (Linux):

```bash
git clone https://github.com/Jeff-Aporta/dsh-perfil-estudio.git /opt/dsh-perfil-estudio
bash /opt/dsh-perfil-estudio/install.sh
```

Los dos scripts son **idempotentes**: instalan los seis perfiles, las skills y el plugin,
y **no tocan `identidad.md`** (es por nodo).

## Actualizar (pull + push)

El flujo es siempre el mismo:

```
cambias en el repo -> git commit + git push -> en cada maquina: pull -> reinstalar -> verificar
```

En cada maquina:

```bash
bash /opt/dsh-perfil-estudio/actualizar.sh          # VPS
powershell -NoProfile -ExecutionPolicy Bypass -File D:\VPS\dsh-perfil-estudio\actualizar.ps1   # PC
```

Si no hay cambios, **no hacen nada** (son silenciosos). Si hay cambios: reinstalan los
perfiles, reinician el bot y anuncian en el canal `perfil actualizado a <sha>`.

Ademas, cada maquina lo hace **solo cada 15 minutos**:

- **VPS**: `bash sistema/instalar-systemd.sh` (timer `dsh-perfil-actualizar.timer`).
- **PC**: `powershell -NoProfile -ExecutionPolicy Bypass -File windows\instalar-tarea.ps1`
  (tarea programada `DSH-Perfil-Actualizar`).

## Verificar (hash a hash)

```bash
node verificar-paridad.mjs                 # repo <-> PC <-> VPS (por ssh)
node verificar-paridad.mjs --sin-remoto    # repo <-> esta maquina
```

Compara todos los ficheros de todos los perfiles (y el codigo del plugin instalado)
entre el repo, esta maquina y la remota. Excluye `identidad.md` (es por nodo).
Sale con codigo 0 si todo coincide y con 1 si hay diferencias.

## Anadir un perfil nuevo

1. Copia `perfiles/dsh-telegram/` a `perfiles/<nombre>/`.
2. Cambia `perfil.yml` (nombre, descripcion, permisos), `definiciones.md` y el
   `package.json` (`"name"` y el `config.perfil` del patch).
3. Anade el perfil a `indice.yml`.
4. `git commit` + `git push`, y en cada maquina `actualizar.sh` / `actualizar.ps1`.
5. Comprueba con `verificar-paridad.mjs` (debe salir PARIDAD OK).

## Reglas

- **Aqui no hay secretos jamas**: ni claves, ni tokens, ni el JWT. El secreto del canal
  (`CANAL_JWT`) vive en el entorno del bot y en el secreto del Worker; el token de
  Telegram, en su fichero de entorno local.
- Todo en **espanol**.
- El **perfil canonico vive aqui**: el repo del estudio (`Jeff-Aporta/estudio-videos`)
  apunta a este repo, no al reves.
