# Lineamientos del perfil dsh-iswc (mantenimiento del kit iswc-base y de sus consumidores)

Este perfil mantiene el kit `iswc-base` (el repo `Jeff-Aporta/is-webcomponents`) y los fronts que lo
consumen. Los fronts consumen el kit por CDN con un pin de SHA: el kit se publica primero y los
consumidores se re-pinan despues. Ese orden no se negocia.

## Mapa de repos (PC)

- Kit: `D:\VPS\transversales\iswc-base` (rama `main`, remoto `https://github.com/Jeff-Aporta/is-webcomponents.git`).
  Aqui viven las skills canonicas del kit: `skills/iswc-base/`, `skills/iswc-foundation/`,
  `skills/build-component/`, `skills/document-component/`, `skills/is-cdn-install/`. **Lelas enteras**
  antes de tocar el kit o un consumidor: son la fuente de verdad del comportamiento.
- Sitio personal: `D:\Dev\Jeff-Aporta` (GitHub Pages, `Jeff-Aporta/Jeff-Aporta`).
- Front de CoContable: `D:\VPS\projs\cocontable\front-cocontable` (repo `Jeff-Aporta/front-cocontable`).
- Otros consumidores conocidos: `D:\VPS\erp-sqlite\app\erp-sqlite-front`, `D:\Dev\avatar\frontend-avatar`,
  `D:\VPS\transversales\android-wc`.
- Este repo de perfiles: `D:\VPS\dsh-perfil-estudio` (el plugin vive aqui).

## Skills de este perfil (elige segun la tarea)

- `iswc-kit`: trabajar DENTRO del kit (build, gate, dist, guardianes, trampas del repo).
- `iswc-consumidor`: trabajar en un FRONT que consume el kit (pin, vendor, arranque, tests).
- `iswc-carga`: estrategia de carga (lote ESM, precarga, presupuestos) y como medirla.
- `iswc-typecheck`: disciplina del typecheck y de la linea base.
- `iswc-a11y`: reglas de DOM y accesibilidad de los custom elements.
- `iswc-verificacion`: como medir y como probar (Edge headless, equivalencia, runner).

## Reglas que siempre

- Se trabaja en **espanol**: informes, commits y comentarios. **Prohibido el CJK** en cualquier texto
  que se escriba (comprobable: `/[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af\uff0c]/`).
- Cada commit de codigo lleva al final: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Se mide antes de afirmar**. Una cifra sin medir no se dice: se mide, se anota el guion y se repite
  en frio y en caliente cuando el dato sea de carga.
- **Nunca se dice que algo esta arreglado sin el gate en verde**. El gate del kit tarda ~45 min: se
  lanza en segundo plano y se sigue con otra cosa.
- **El MD que corresponda se actualiza en el mismo commit** que el codigo.
- Si una fase se queda a medias: se escribe `.tmp/handoff/PARO-<fase>.md` con el motivo, las cifras y las
  opciones, y se para. El autor decide el recorte; el agente no recorta alcance por su cuenta.
- Nunca se hace `git push --force` ni se reescribe historia publicada.
- **Nunca se edita un fichero con PowerShell** (`Get-Content`/`Set-Content`): corrompe el UTF-8. Se usa
  el editor de ficheros o un script de Node/Deno.
- Antes de tocar un repo ajeno al que se esta trabajando, se mira su `AGENTS.md`/`CLAUDE.md` y sus `specs/`.

## El orden que no se rompe

1. **Kit**: `deno task build` y `deno task bundle`; `dist/` en un commit **aparte** (nunca `git add -A`).
2. **Gate del kit**: `deno task test:all` y `deno task test:foundation` en verde.
3. **Push del kit** (`git push origin main`). Solo entonces existe el SHA en GitHub.
4. **Consumidores**: `deno task pin --nuevo=<sha40>` (y `deno task vendor:iswc` si el repo vendoriza el
   kit), build, gate propio, commit, push.
   jsDelivr da **404 a un SHA que no este publicado**: re-pinar antes del push rompe la web.

## El kit y los consumidores no se tocan a la vez

- En el kit, `dist/` se versiona aparte y el consumidor lo toma por SHA: un `dist/` a medias rompe el
  guardian `gobernanza/cabecera-contexto` (K4).
- En el consumidor, el `?v=` lo pone su build (`stampDirectory`): el `?v=` del HTML y el del fichero
  tienen que ser el mismo, o el navegador sirve un arranque viejo.
- Cuando varios agentes trabajan a la vez en el mismo repo: cada uno con su asignacion y **sin tocar
  ficheros fuera de ella**; los commits los hace el padre.

## Lo que NO se hace

- No se meten `any`, `@ts-ignore`, `@ts-nocheck` ni casts layos para callar al compilador.
- No se excluyen ficheros del typecheck ni se toca `tsconfig.json` para que pase.
- No se degradan los guardianes para que el gate pase: se arregla el codigo.
- No se sube `dist/` sin regenerarlo: el `dist/` que se sirve es el que usan los tests de navegador.
