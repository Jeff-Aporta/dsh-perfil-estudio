# Changelog

Todas las versiones de este repo (el formato es el de Keep a Changelog).

## [1.0.0] - 2026-11-13

### Añadido

- **El repo canonico del perfil DSH del estudio**: los seis perfiles (dsh-telegram,
  dsh-telegram-consulta, dsh-telegram-produccion, dsh-telegram-codigo,
  dsh-telegram-privado y dsh-canal), con `perfil.yml`, `definiciones.md`,
  `PERFIL-TG.md`, `cordis.yml`, `cordis.patch.yml`, `package.json`,
  `pnpm-workspace.yaml` y las skills (`grilling`, `trazabilidad-chat`,
  `adaptacion-entorno`, `canal`, `mente-colmena`).
- **El plugin `dsh-estudio-plugin`**: inyecta el PERFIL-TG canonico, las definiciones del
  perfil y la identidad del nodo en el prompt de cada sesion; registra las herramientas
  del canal (`canal_publicar`, `canal_listar`), del WIP compartido (`wip_reclamar`,
  `wip_soltar`, `wip_cerrar`, `wip_listar`) y de los acuerdos globales
  (`acuerdo_registrar`, `acuerdos_listar`).
- `PERFIL-TG.md` canonico con la **mente colmena** (el protocolo de coordinacion) y la
  guia completa en `MENTE-COLMENA.md` (tambien como skill).
- Instaladores **idempotentes** (`install.sh`, `install.ps1`) que no tocan
  `identidad.md`, e instaladores del plugin con pnpm.
- `actualizar.sh` / `actualizar.ps1`: pull + reinstalacion + reinicio del bot + aviso
  en el canal (`perfil actualizado a <sha>`). Silenciosos si no hay cambios.
- Actualizacion periodica: timer de systemd (cada 15 min) en el VPS y tarea programada de
  Windows (cada 15 min) en el PC, las dos versionadas aqui.
- `verificar-paridad.mjs`: comparacion hash a hash de repo, PC y VPS.

## [1.0.1] - 2026-11-13

### Arreglado

- El plugin se monta en el patch con `insert:` (con `id:` DSH lo tomaba como parche de una fila
  que no existia y avisaba `patch: entry "estudio" not found`).
- `.gitattributes`: todos los ficheros se guardan en LF, para que los hashes sean iguales en el PC
  (que los checkout en CRLF) y en el VPS.
- El timer de systemd usa `OnCalendar=*:0/15` (no dependia del arranque para programar la siguiente
  ejecucion) y el verificador compara **todos** los ficheros del plugin, no solo su indice.

### Comprobado

- `node verificar-paridad.mjs` = PARIDAD OK (6 perfiles, hash a hash, en repo, PC y VPS).
- `dsh --profile dsh-telegram --help` = `[estudio] plugin cargado: ... maquina pc / maquina vps`.
- `node plugin/pruebas/prueba-plugin.mjs` = 16/16.
- El timer del VPS y la tarea del PC, probados sin cambios: no reinstalan ni reinician nada.
