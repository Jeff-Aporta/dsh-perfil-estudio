---
name: iswc-kit
description: Mantenimiento del kit iswc-base (Jeff-Aporta/is-webcomponents): anatomia, build, gate, dist, guardianes y trampas del repo. Usar al tocar D:\VPS\transversales\iswc-base.
---

## Que es el kit

`iswc-base` publica mas de 200 web components vanilla como modulos ES por CDN. El consumidor los pide
por SHA (`https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/...`).

- `src/components/<categoria>/<tag>.ts` -> el componente. `src/core/**` -> el nucleo (molde reactivo,
  attrs, posicion, tema). `src/cdn/**` -> el loader y su build. `src/previews/**` -> las fichas y la
  galeria. `tests/**` -> guardianes de gobernanza y pruebas de navegador. `specs/**` -> las decisiones.
- `dist/cdn/**` es lo que se sirve: `dist/cdn/<cat>/<tag>.min.mjs` (entradas), `dist/cdn/_chunks/**`
  (chunks por contenido), `dist/cdn/core/loader.min.mjs` (el nucleo del loader) y `dist/cdn/deps/`.
- `dist/cdn/deps.json` es el INDICE (sha + categorias). El cierre por tag vive en
  `dist/cdn/deps/<cat>.json`. El loader fusiona las partes en tiempo de ejecucion (`depsDe`).

## Orden de trabajo en el kit

1. Edita `src/` (nunca `dist/` a mano).
2. `deno task build` (icons -> build:scss -> build) y `deno task bundle`.
3. `deno task test:all` (= typecheck + test + audit) y `deno task test:foundation`, **en segundo plano**
   (el gate completo tardo 43-45 min: en primer plano se corta).
4. `dist/` en un commit APARTE, con `git -c core.safecrlf=false add -- <rutas>` listando las rutas
   explicitamente. **Nunca `git add -A` ni `git add .`**.
5. `git push origin main` solo con el gate en verde.

## Las trampas del repo (las que ya mordieron)

- **La linea base del typecheck se reescribe sola.** `scripts/typecheck.mjs` baja `deno.json#iswc.typecheckBaseline`
  cuando mide MENOS errores. Para medir sin tocarlo: copia el script a `.tmp/` y neutraliza SOLO la escritura
  de `deno.json`. Si aun asi se toca, `deno.json` vuelve a su valor a mano. Ademas el script imprime
  `errores.slice(0, 40)`: un run que muestra 40 puede tener 40, 400 o 4000.
- **Un error de sintaxis hace que tsc no informe NADA**: el contador miente (se vio el repo en `2 errores`
  falsos). Si el numero baja de golpe, busca TS1xxx antes de creerte el improvement.
- **`core.autocrlf=true`**: usa `git diff --ignore-cr-at-eol` para revisar y `git -c core.safecrlf=false add`
  para escribir en el indice.
- **El build necesita red** (las colecciones de iconos). Si el paso de iconos falla, dilo: no inventes
  ficheros ni los borres.
- **Un `dist/` a medias rompe `gobernanza/cabecera-contexto` (K4)**: el guardian compara `git ls-files dist`
  con el arbol de trabajo y ve chunks que no existen. Se arregla regenerando y commiteando `dist/`.
- **`deno test` sobre `coleccionPruebas` da `0 tests`**: el runner de verdad es
  `deno task test -- --solo=<id-prefijo>` (o `deno run -A --no-check tests/.audit/run.ts`).
- **El cooldown**: una prueba verde entra en cooldown de ~1440 min. Para repetirla: `--sin-cooldown`.

## Guardianes que muerden (no se canean: se arregla el codigo)

- **W54**: en `src/` no hay `type`/`interface` top-level. Los tipos viven en el `*.schemas.ts` que acompaña
  al modulo (`import type { X } from './x.schemas.js'`).
- **No hay barriles ni re-exports** en `src/` (`sin-reexports`).
- **Alias imports**: en `src/` los relativos no suben de carpeta; se usa el alias `@jeff-aporta/iswc-base/...`.
- **`cabecera-contexto`**: los `.ts` llevan la cabecera `// @contexto INDICE.md · <ruta del README>`.
- **`indice-md`**: todo `.md` versionado (fuera de `dist/`) aparece en `INDICE.md`, y los `.md` se enlazan
  con la URL cruda de GitHub (sin `blob/main`).
- **`atributos-constructor`**: ningun constructor de `src/components` escribe atributos (ver skill `iswc-a11y`).
- **`hermeticidad`**: nada de rutas absolutas de la carpeta local de trabajo en el codigo ni en los docs.

## Cuando el typecheck sube (no lo bajes a base)

El tipo se arregla en el SCHEMA (W54), no en el consumidor: `z.custom<T>()`, `z.intersection(z.custom<HTMLElement>(),
z.object({...}))`, tipos TS genericos en el `*.schemas.ts`, `interface` cuando el tipo se autorreferencia
(un `type` alias no puede). Si un schema se valida en runtime con `.parse`, NO uses `.extend()` ni reordenes
claves: el JSON parseado debe conservar el ORDEN actual (un `.extend()` lo cambio y rompio una validacion).

## Push y pin

- El SHA del kit se publica antes de re-pinar a nadie: jsDelivr da 404 a un SHA no publicado.
- Tras publicar, el consumidor re-pina (`deno task pin --nuevo=<sha40>`), vendoriza si toca
  (`deno task vendor:iswc`), construye y prueba. Ver la skill `iswc-consumidor`.
