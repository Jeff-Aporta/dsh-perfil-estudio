---
name: iswc-consumidor
description: Mantenimiento de un front que consume el kit iswc-base por pin SHA: anatomia, pin, vendor, arranque en serie, build y gate propio. Usar con Jeff-Aporta, CoContable, erp-sqlite, Avatar y android-wc.
---

## Anatomia de un consumidor

- `deno.json` es el nucleo: ahi viven el **pin** (en `imports`, con URLs a `raw.githubusercontent.com` del SHA)
  y las tareas. `imports` apunta a las herramientas del kit por URL: `@iswc/build/` -> `src/cdn/build/`,
  `@iswc/tools/` -> `src/vendor-distributions/shared/tools/`. Re-pinar actualiza tambien esas herramientas.
- `src/js/kit-tags.ts` (o equivalente) es el **registro unico**: que tags del kit pide la app, que
  componentes son de la app y de cada vista. Todo lo demas se deriva de ahi.
- El **registrador** (`<prefijo>Loader.min.js`) llama a `iswcLoader.registerApp({ tag: url })` y es lo que
  hace que `load()`/`ensure()` encuentren el componente.
- `src/utils/build.ts` es el build: en el sitio de Jeff-Aporta compila **por fichero, sin bundle**
  (`bundle: barril || f === ZOD`), por eso la app son decenas de ficheros y decenas de peticiones.
- `dist/cdn/**` es lo publicado; el `?v=` lo pone `stampDirectory` y `sellarHtml` lo replica en el HTML.

## El pin (el orden no se negocia)

1. El kit se publica (`git push origin main`).
2. `deno task pin --nuevo=<sha40>` re-pina TODOS los pines del repo (HTML, `src/`, `deno.json`, `view/`).
   En un repo que vendoriza el kit, ademas `deno task vendor:iswc`: baja las herramientas del MISMO SHA
   y hay un guardian que exige `vendor == pin`.
3. `deno task build`, `deno task check`, `deno task test:all`.
4. Commit y push.

Ojo: `deps.json` del pin nuevo es un indice de 6 KB (`sha` + `categorias`); el cierre por tag esta en
`deps/<cat>.json`. Un `deps.json` vendorizado de un pin viejo (102 KB con los tags) cambia de forma al
re-pinar: no te apoyes en el formato viejo.

## El arranque en serie (el defecto que mas cuesta)

El arranque tipico es: `await L.load(...KIT_TAGS, ...tagsArranque())` -> `await customElements.whenDefined('ja-app')`
-> `await <ja-app>.vistaLista`. Eso son FASES EN SERIE: el navegador no pide nada de la vista hasta que
el shell esta, y la vista no aparece hasta que sus componentes estan. En frio (jsDelivr sin cache) eso son
decenas de segundos.

Como romperlo:

- **El lote ESM**: un solo fichero con el cierre de los tags que la pagina usa. Todos los `customElements.define`
  ocurren en una sola evaluacion sincrona -> los tags quedan definidos en el MISMO milisegundo y nadie espera
  a nadie. Se registra con `iswcLoader.registerApp({ 'iswc-button': <url del lote> })`.
- **El bloque de precarga en el HTML**: import map, `<meta name="iswc-precargado" content="<sha>">`,
  un `<link rel="modulepreload">` por modulo del cierre, y las hojas base del kit NO bloqueantes
  (`<link rel="preload" as="style" onload="this.onload=null;this.rel='stylesheet'">` + `<noscript>`).
  Sin `<meta name="iswc-precargado">`, el loader ignora la precarga y pide `deps/<cat>.json` por su cuenta.
- El HTML y el `?v=` van de la mano: si el HTML pide una URL vieja, el navegador sirve un arranque viejo.

## Que trae el kit para esto

- `deno task build:lote -- tag1,tag2,... [--out=<fichero>]` (en el kit): un `.min.mjs` autosuficiente.
- `construirLoteKit({ cdn, deps, tags, salida, cache })` en `src/cdn/build/lote-kit.ts`: baja del pin los
  modulos del cierre y los empaqueta con esbuild. El `deps` que espera es el FUSIONADO de las partes.
- La plantilla del kit `skills/iswc-foundation/templates/` trae el `index.html` con el bloque de precarga
  y el `src/utils/build.ts` que lo escribe entre `<!-- iswc:precarga:inicio -->` y `<!-- iswc:precarga:fin -->`.
- El kit tiene skills enteras para esto: `skills/iswc-foundation/` (en especial `03-registro-y-carga.md` y
  `06-pines-y-vendor.md`). Lelas antes de tocar el arranque.

## El gate de un consumidor

- `deno task check` (lint + tipos), `deno task test:health`, `deno task test:e2e` (navegador real: necesita
  `CHROME_PATH` o la ruta de Edge: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`),
  `deno task test:all` (todo).
- El e2e se lanza con `CHROME_PATH=...`; sin esa variable falla porque no encuentra el navegador.
- El consumidor NO copia el kit: lo toma del pin. Si el consumidor tiene `src/vendor/iswc-base/`, es solo
  para las herramientas y el `deps.json`: el codigo que se ejecuta es el del pin.
