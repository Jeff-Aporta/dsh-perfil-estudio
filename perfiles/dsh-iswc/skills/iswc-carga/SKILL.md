---
name: iswc-carga
description: Estrategia de carga del kit y de los consumidores: lote ESM frente a fragmentos, bloque de precarga, presupuestos y como medir. Usar cuando una pagina tarda en cargar o hay que reducir peticiones.
---

## El diagnostico primero (peticiones, no pesar)

Una carga lenta casi nunca es de bytes: es de **peticiones x RTT / concurrencia**. Con 6 conexiones y
RTT de 300 ms, 600 peticiones son 30 s. En caliente el navegador las sirve de la cache HTTP y por eso el F5
va a 1,5-4 s: el sintoma clasico de la fragmentacion, no de un servidor lento.

Medir SIEMPRE antes de optimizar: peticiones (por tipo y por host), bytes, y el instante en que cada tag
queda definido. Ver la skill `iswc-verificacion`.

## Lote ESM (un solo fichero) frente a fragmentos

- Fragmentado: una peticion por entrada (`<cat>/<tag>.min.mjs`) y el cierre se descubre al parsear esa
  entrada (los chunks son otro nivel de cascada).
- Lote: **un** `.min.mjs` con el cierre entero (core incluido). Todos los modulos se evaluan de golpe.

Medido en Edge real (kit, 13 tags del arranque de un sitio):

| Variante | Peticiones | Bytes | 13 tags definidos |
|---|---|---|---|
| Fragmentado | 43 | 198 KB | 447 ms (el primero a 399, el ultimo a 447) |
| Lote | 2 | 174 KB | **7 ms (los 13 en el MISMO milisegundo)** |

Y en el propio kit (38 tags, 5 corridas en frio, `specs/plan-carga-modular.md` F7a): **520 ms frente a
1 290 ms** y **10 peticiones frente a 110**.

El lote es el camino rapido: el HTML lo precarga con `modulepreload`, el loader lo encuentra por
`registerApp`, y `load()`/`ensure()` y las `static deps` de los padres lo usan en vez de pedir modulo a modulo.

## Reglas del lote

- Debe incluir los **hijos de sus padres** (`static deps`). Si falta un hijo, se pide al kit y trae OTRA
  copia del core: dos nucleos en la misma pagina.
- Se compila desde el **pin publicado**, no desde un checkout local (proyectos hermeticos).
- El `deps` que se le pasa es el **fusionado** de `deps/<cat>.json` (el indice `deps.json` no trae cierres).
- `zod` puede quedar externo (lo resuelve el import map) o embebido: decide y medid.
- Con `splitting` de esbuild se puede dejar un chunk comun cacheado entre vistas + un delta por vista:
  2 peticiones por vista y el nucleo compartido.

## El bloque de precarga (lo que evita 2 RTT y el descobrimiento)

- import map con el alias del kit al pin.
- `<meta name="iswc-precargado" content="<sha40>">`: sin esto, el loader ignora la precarga del HTML y
  se pone a pedir `deps/<cat>.json` por su cuenta.
- Un `<link rel="modulepreload">` por cada modulo del cierre (o UNO solo si hay lote).
- Hojas base del kit **no bloqueantes**: un `<link rel="stylesheet">` en el `<head>` frena a los
  `<script type="module">` que le siguen hasta que llega.

## Lo que NO es la solucion

- **`async` en la etiqueta**: no quita ni una peticion ni un byte; solo cambia cuando se ejecuta. Y `defer`
  o `type="module"` dan ese no-bloqueo del parseo conservando el ORDEN. El salto de verdad es no fragmentar.
- **Un mega-bundle de todo el kit**: se paga el codigo que la pagina no usa. El lote es del CONJUNTO que la
  pagina usa; la galeria que carga 200 tags es un caso aparte (ahi el lote es de 3,8 MB: mejor 1 peticion
  que 527, pero lo ideal es cargar cada componente al abrir su demo).

## Presupuestos (para que no vuelva a degradarse)

El kit tiene un gate de carga en `tests/navegador/carga.test.ts`: tope del loader (8 KB brotli), media por tag,
tope del cierre de un boton, **rafagas** (el numero de niveles de cascada) y el `data-ready` de la galeria.
Anyadele un tope de **peticiones por pagina** del consumidor: es el numero que de verdad duele.
