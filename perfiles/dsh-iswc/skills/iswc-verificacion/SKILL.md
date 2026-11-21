---
name: iswc-verificacion
description: Como medir y como probar en el kit y en los consumidores: Edge headless, frio contra caliente, volcados de equivalencia, el runner de pruebas y los gates largos. Usar antes de afirmar que algo funciona.
---

## El runner de pruebas

- `deno task test -- --solo=<id-prefijo>` para una familia; `deno run -A --no-check tests/.audit/run.ts` para
  todo. **`deno test` sobre `coleccionPruebas` da `0 tests`**: no es el runner.
- `--sin-cooldown` para repetir una prueba verde (el cooldown es de ~1440 min).
- Los tests de navegador usan **Edge headless** (regla del repo: nunca el Chrome del usuario). El harness
  esta en `tests/_shared/navegador.ts` (`lanzarChromium`, `rutaEdge`, `cerrarChromium`) y `pagina.ts`
  (`correrCasos`). En el PC, Edge esta en `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
- Si Playwright dice `Chromium distribution 'msedge' is not found at undefinedProgram Files...`, es que
  falta la variable de entorno `PROGRAMFILES`: exportala o pasa `executablePath: rutaEdge()`.

## Los gates largos van en segundo plano

`deno task test:all` tardo 43-45 min. En primer plano se corta (y el corte se confunde con un fallo).
Hay que lanzarlo como job en segundo plano y seguir con otra cosa; el log se lee mientras tanto.

## Medir la carga (el guion que se usa)

Con Playwright o CDP, en un perfil NUEVO (cache vacio = frio), registrando:

- cada peticion (URL, tipo, `content-length`) y el instante en que se pidio;
- el instante en que cada tag queda definido (`customElements.get(tag)` !== null, sondeado cada 5 ms);
- el primer pintado (`requestAnimationFrame`);
- la profundidad de la cascada (peticiones que no pudieron empezar hasta que respondio el nivel anterior).

Se mide **frio y caliente** con el mismo guion: la diferencia explains los symptoms (40 s en frio, 1,5-4 s
al recargar). Para el dato de jsDelivr hay que medir contra el CDN de verdad, no contra `localhost`.

## Equivalencia: el volcado byte a byte

Cuando un cambio mueve logica, la prueba fuerte es: la MISMA pagina contra HEAD y contra el parche, con un
volcado de **host + shadow + atributos + eventos**, comparado byte a byte. Si los volcados son identicos, el
comportamiento no cambio. Ese guion salio en 68 555 bytes identicos en once componentes de formularios, y
despidio un `iswc-mention` que estaba roto de verdad.

## Probar en el navegador real, no solo con el runner

`dist/cdn` es lo que los guardianes de navegador **sirven de verdad**: si se cambia `src/` y no se regenera
`dist/`, el test pasa en el runner y falla en el navegador (o al reves).

## Antes de dar algo por bueno

1. El gate en verde (no "parece que funciona").
2. La cifra medida antes y despues, con el guion dicho.
3. El diff revisado (`git diff --ignore-cr-at-eol`): nada de ficheros generados por sorpresa.
4. El `dist/` regenerado si cambio `src/`.
