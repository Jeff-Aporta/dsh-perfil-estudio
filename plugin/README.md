# El plugin del perfil (`dsh-estudio-plugin`)

Un plugin de Cordis/DSH de verdad: paquete ESM (`"type": "module"`, `"main": "lib/index.js"`),
`apply(ctx, config)`, `Config` (schemastery) e `inject` (los servicios que usa).

## Que hace

1. **Prompt**: registra una seccion de prompt (`estudio:perfil`) con el contenido de
   `PERFIL-TG.md` + `definiciones.md` + `identidad.md` de la carpeta del perfil. Como el
   prompt se arma en cada paso del modelo, esto entra en **TODAS** las sesiones.
2. **Herramientas**: `canal_publicar`, `canal_listar`, `wip_reclamar`, `wip_soltar`,
   `wip_cerrar`, `wip_listar`, `acuerdo_registrar`, `acuerdos_listar`.
3. **Log**: al arrancar deja `[estudio] plugin cargado: ...` (la prueba de que carga).

## Como se carga

El perfil lo declara como dependencia (`github:Jeff-Aporta/dsh-perfil-estudio`) y lo
monta en `cordis.patch.yml`:

```yaml
- id: estudio
  name: "dsh-estudio-plugin"
  config:
    perfil: dsh-telegram
```

El loader de DSH importa la fila por nombre desde la carpeta del perfil, asi que el
paquete tiene que estar en `<perfil>/node_modules` (`pnpm install`).

## Configuracion

| Clave | Que hace | Por defecto |
|---|---|---|
| `perfil` | El nombre del perfil (de donde se leen las definiciones y la identidad). | `dsh-telegram` |
| `dirPerfil` | La carpeta del perfil, si no se quiere deducir. | (se deduce) |
| `promptSeccion` / `promptOrden` | La seccion de prompt y su lugar. | `estudio:perfil` / `200` |
| `canalUrl` | La URL del Worker del canal (si no, `CANAL_URL` del entorno). | (del entorno) |
| `canalSecretoEnv` | La variable de entorno con el secreto. | `CANAL_JWT` |
| `canalBot` / `canalNodo` / `canalRol` | Quien es este bot en el canal. | (del entorno) |
| `acuerdosCanal` | El canal de los acuerdos globales. | `estudio:acuerdos` |
| `wipCanal` | El canal donde se avisa de los reclamos del WIP. | (el de acuerdos) |
| `wipDir` | La carpeta del WIP local (reclamos atomicos). | `$DSH_HOME/estado/wip` |
| `wipAvisar` | Si se avisa al canal al reclamar/cerrar. | `true` |

## Pruebas

```bash
node plugin/pruebas/prueba-plugin.mjs
```

16 comprobaciones: el prompt lleva las tres partes, las 8 herramientas se registran, el
reclamo del WIP es atomico (dos duenos no pueden tener el mismo fichero) y el token del
canal no lleva el secreto en claro.
