---
name: adaptacion-entorno
description: >-
  Como adaptarse a la maquina en la que se esta trabajando (Windows, Ubuntu o cualquier otra) sin
  cambiar el objetivo: detectar el sistema, las rutas, el ejecutable de DSH, el gestor de servicios
  y el cron; que es igual en todas partes y que se ajusta; como dar de alta un equipo nuevo; y que
  no se debe hacer. Usar antes de actuar en una maquina, al preparar el alta de un PC nuevo o cuando
  un comando no funciona en el sistema actual.
---

# Adaptacion al entorno (transversal)

Este estudio corre en varios sitios (hoy: un PC con Windows 11 y un VPS con Ubuntu; manana: mas
equipos). El **objetivo no cambia**: cambia el metodo. Esta skill explica como.

## 1. COMO DETECTAR EL ENTORNO (determinista)

Ejecuta la herramienta del repo:

```
node tools/entorno.mjs          # texto legible
node tools/entorno.mjs --json   # JSON
```

Imprime: sistema operativo y version, arquitectura, equipo, rutas (repo, estudio, estado, perfil
DSH), el ejecutable de DSH y si existe, el wrapper, si el perfil esta instalado, el import map de
DER con su SHA, el gestor de servicios (systemd o tarea programada) con sus unidades, el rol y el
modo del bot, y los comandos de arranque de ESTA maquina.

Lo que hay que mirar:

- **Windows**: `process.platform === "win32"`; el ejecutable de DSH es
  `...\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd` (**con espacios**: hay que
  llamarlo entre comillas o mediante el wrapper `tools\dsh-telegram.cmd`). El servicio es la
  **tarea programada** `Estudio-Videos-Cadena` (`tools\iniciar-cadena.ps1`).
- **Ubuntu**: `process.platform === "linux"`; el ejecutable es `/usr/bin/dsh` (sin espacios).
  El servicio es **systemd** (`telegram-cadena.service`, `estudio-render.service`) y el watchdog
  es `vps/vigia.sh` (con **cron**).
- **DSH_HOME**: `~/.dsh` (Windows: `C:\Users\<usuario>\.dsh`; Linux: `/root/.dsh`). Los perfiles
  viven en `$DSH_HOME/profiles/<nombre>`.

## 2. QUE ES IGUAL Y QUE ES DISTINTO

**Igual en todas partes** (esto NO se bifurca):

- El PC es la fuente de los repos: se escribe en el PC, se commitea, se pushea; el VPS actualiza
  con `git pull` (o por el espejo `tools/sync-vps.mjs`).
- Todo lo que se aprende se escribe en un MD, en el mismo commit.
- DER por CDN con el **SHA fijado** en `import_map.json` (nunca `@main`).
- El WIP: se reclama antes de tocar y se cierra con la prueba.
- Las reglas por tema, los perfiles, el camino rapido, el estilo (espanol neutral, tono formal) y
  la BD del chat (DER).
- El bot: el mismo codigo, el mismo perfil (`dsh-telegram` y sus derivados), las mismas
  definiciones (`PERFIL-TG.md`).

**Distinto (y solo esto)**:

- El sistema operativo y sus rutas, el ejecutable de DSH, el gestor de servicios (systemd / tarea
  programada / cron), la carpeta de estado y la del repo, y el **ambito** del bot (VPS = la granja;
  PC = el workstation).

## 3. AJUSTES POR MAQUINA

| Si estas en Windows... | Si estas en Ubuntu... |
|---|---|---|
| Lanza DSH con `tools\dsh-telegram.cmd` (envuelve la ruta con espacios) o con `shell: true` | Lanza DSH con `dsh` directamente |
| Sin bash: el prompt va por **stdin** (`p.stdin.end(prompt)`) | El prompt va por fichero (`< pregunta.md`) |
| Arranque: `tools\iniciar-cadena.ps1` (tarea programada cada 15 min) | Arranque: `systemctl restart telegram-cadena` |
| Cerrojo de proceso: `datos\equipo\*.pid` | Cerrojo: `telegram.lock` + watchdog de cron |
| Instalar perfiles: `tools\instalar-perfil.ps1` | Instalar perfiles: `bash tools\instalar-perfil.sh` |
| Sin systemd: no uses `systemctl` | Con systemd: `systemctl status/list-unit-files` |

## 4. ALTA DE UN EQUIPO NUEVO (para que otro PC entre solo)

1. Clona el repo (`git clone`) y configura la identidad (`git config user.name` / `user.email`).
2. Copia las claves: el almacen de DSH (`~/.dsh/.credentials.yaml`) y las claves del estudio
   (`claves.env`, `fabrica/dsh.env`). **Nunca se commitean.**
3. Instala los perfiles: `tools\instalar-perfil.ps1` (Windows) o `bash tools\instalar-perfil.sh`
   (Linux). Comprueba con `node tools/check-paridad.mjs`.
4. Deja el bot autonomo: en Windows, la tarea programada `Estudio-Videos-Cadena` (que llama a
   `tools\iniciar-cadena.ps1` y `tools\iniciar-bot-local.ps1`); en Linux, una unidad de systemd
   con `Restart=always` y un watchdog en cron.
5. Si el equipo habla con el VPS: clave de despliegue de **solo lectura** en `~/.ssh` y el VPS
   pulls el repo; nunca se edita codigo a mano en el VPS.
6. Checklist: `node tools/entorno.mjs` dice lo que hay; el bot arranca y responde; la paridad
   sale OK; el perfil nuevo se ve en `perfiles/indice.yml`.

## 5. QUE NO SE HACE

- No se edita codigo a mano en el VPS (ni en ningun servidor): todo se cambia en el PC, se
  commitea y se pushea.
- No se aplica a mano el parche de un motor.
- No se borra trabajo (ni logs, ni historiales, ni proyectos).
- No se gasta cuota (voz, APIs de pago) sin el si escrito del autor.
- No se inventan rutas ni comandos: si no sabes como es esta maquina, ejecuta
  `tools/entorno.mjs` y ajustas el metodo, no el objetivo.