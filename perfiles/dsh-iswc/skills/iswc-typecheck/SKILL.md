---
name: iswc-typecheck
description: Disciplina del typecheck del kit: la linea base que se reescribe sola, como medir un subarbol sin romperla y los patrones para que el tipo viva en el schema. Usar al bajar o subir errores de typecheck.
---

## La linea base (el guardapollos)

`deno.json#iswc.typecheckBaseline` es el numero de errores que el repo tolera. El script
`scripts/typecheck.mjs` **la reescribe sola** cuando mide menos de la que hay (asi el gate no se rompe por
un improvement). Consecuencia: si mides mal, dejas la linea base en un numero falso y el gate deja de
protegerte.

Reglas:

- **No corras `deno task typecheck` para medir**: copia `scripts/typecheck.mjs` a `.tmp/`, neutraliza SOLO la
  escritura de `deno.json` y mide con esa copia.
- **El script imprime los primeros 40 errores** (`errores.slice(0, 40)`): un run que dice `40` puede tener 40,
  400 o 4000. El total sale del resumen, no de la lista.
- Si un error de sintaxis (TS1xxx) se cuela, tsc **no informa nada** y el contador cae a un numero falso
  (se vio el repo en `2 errores`). Si el numero baja de golpe, busca TS1xxx primero.
- Cuando el typecheck queda bien de verdad, **baja la linea base a mano** al numero real y commitea
  `deno.json` con ese cambio: si no, el gate sigue tolerando los errores que ya no existen.

## Medir por subarbol (el truco que funciono)

1. Copia el script a `.tmp/medir.mjs` con la escritura neutralizada.
2. Mide el global (para saber de donde sale el numero) y luego por carpeta.
3. Reparte el trabajo por directorios entre subagentes, **cada uno con su asignacion** y sin tocar
   ficheros fuera de ella: el typecheck es global, pero el trabajo es por subarbol.
4. Cada subagente mide con SU copia del script. Si aun asi toca `deno.json`, que lo restaure.

## Donde vive el tipo: el SCHEMA

El patron del repo (W54) es que **el tipo vive en el schema** y el consumidor lo hereda. Los errores
tipicos son TS18046 (`x` es `unknown`), TS2339 (propiedad que no existe) y TS2322 (no asignable): casi
siempre porque el schema declara un adorno en vez del tipo real.

- `z.custom<T>()`: mismo runtime que `z.unknown()`, tipo correcto. Para el elemento del DOM:
  `z.intersection(z.custom<HTMLElement>(), z.object({...}))` -> el consumidor hereda `addEventListener`,
  `style`, `focus`, `toggleAttribute` sin tocar una linea suya.
- Tipos TS genericos (`CachedRow<T>`, `ActionResult<T>`) declarados en el `*.schemas.ts`: zod no expresa
  genericos.
- Cuando el tipo se **autorreferencia** (una columna que lleva columnas, un arbol): declaralo como
  `interface` que extiende el `z.infer` del esquema. Con `z.infer` a secas sale TS2456/TS7022.
- Callbacks con firmas distintas entre implementaciones: `test(...)` en **sintaxis de metodo** (es bivariante
  y evita `any` y casts).
- Vocabularios cerrados: derivarlos de la constante viva del core (`(typeof BUTTON_SHAPE)[number]`), no
  copiarlos a mano.
- **Cuidado con el orden de las claves**: si el schema se valida en runtime (`.parse`), un `.extend()` puede
  cambiar el ORDEN del JSON parseado y romper una validacion que compara claves. Se conserva el objeto plano
  original y el tipo se deriva aparte.

## Prohibido

`any`, `@ts-ignore`, `@ts-nocheck`, `as unknown as`, `as never`, excluir ficheros del typecheck o tocar
`tsconfig.json`. Si un error no se puede resolver sin trampas: se deja y se reporta con su codigo y fichero.
Cero trampas anadidas es el criterio de aprobado.
