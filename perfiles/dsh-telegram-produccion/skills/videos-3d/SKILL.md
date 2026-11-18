---
name: videos-3d
description: >-
  Producir y mantener videos con personajes 3D que actúan (motor del kit growkaz-stickman-studio): clips con guion y
  subtítulos SIN narración, elencos (Xbot, Kenney, robot, Mixamo, anime), colisiones, manos, tela, partículas y sonidos
  Kenney. Usar cuando el autor pida "un video con personajes", "rehacer la inspiración", "otra versión con otros
  personajes", "ajustar tamaños/sillas/mesas", o una tarea de referencias/tareas-3d.md.
---

# Videos 3D con personajes (kit)

Todo es render LOCAL: no cuesta dinero. Nunca se encadena con MiniMax de video/imagen/voz.

## 0. Antes de tocar nada (obligatorio)
1. `D:/Videos/REGLAS-PRODUCCION.md` y `D:/Videos/common/REGLAS-GUION.md` (texto: reglas 1-7).
2. En el kit (`D:/Videos/growkaz-stickman-studio`, repo `Jeff-Aporta/growkaz-stickman-studio`):
   `referencias/actores-3d.md` (cómo se anima y la tabla §6 de ajustes por personaje) y `referencias/tareas-3d.md` (cola).
3. Una tarea a la vez. Verificar SIEMPRE con fotogramas: `node render.mjs --project projects/<p> --stills t1,t2,...`
   (en Windows con `KIT_NAVEGADOR="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"`). Si tu modelo no ve
   imágenes, dilo y entrega los fotogramas sin afirmar cómo se ven.

## 1. Proyectos modelo (copiar, no reinventar)
| Proyecto | Qué enseña |
|---|---|
| `projects/_dia-estudiante` | 8 planos, actores con `_actor.js` (poses por dirección, manos, agarre, IK, colisión) y `_tela.js` (cobija). |
| `projects/_dia-<elenco>` | El mismo relato con otro elenco: `config.json` → `"elenco"`. Reparto en `ROLES`/`persona()` de `dia.js`. |
| `projects/_torre-ia` | Short vertical 9:16 (56 s) adaptado de una inspiración: mundo único, `T = inicio + lt`, subtítulos con palabra clave, contador, polvo, confeti, emotes y sonidos Kenney (`story/shots.json` → `sfx` con rutas `assets/sfx/*.ogg`). |
| `projects/_experimento-anime` | Toon de 3 bandas + contorno (`scenes/_toon.js`). |

## 2. Contrato de un clip sin narración (para que luego se sincronice con voz)
- `story/shots.json`: cada toma con `start`, `end`, `line` (el subtítulo = la frase que algún día dirá la voz),
  `resalta` (palabra clave), `sfx` y `amb`. La duración de cada toma es la de su frase leída a ~2,6 palabras/s.
- `guion.md` en el proyecto: tabla tiempo | subtítulo | resalta.
- Cuando llegue la voz: `timeline/words.json` (palabra + segundos). Se reajustan `start/end` de cada toma al primer y último
  segundo de su frase; todo lo visual es función de `T`, así que basta con re-escalar el tiempo de cada toma
  (ver `referencias/actores-3d.md`, "Sincronía con voz").
- Shorts: máximo 180 s (límite de YouTube desde oct-2024).

## 3. Assets
`biblioteca3d/` (índice y licencias en `biblioteca3d/indice.json`; se regenera con `node tools/biblioteca3d.mjs`):
Kenney (CC0: personajes, muebles, ciudad, industrial, supervivencia, emotes, humo, partículas, sonidos), Polyfork
(CC BY 4.0, 3.391 modelos: crédito en la descripción, nunca en pantalla), Quaternius (CC0), Poly Haven, ambientCG,
mocap CMU (2.548 BVH). Copia al proyecto (`assets/`) solo lo que uses.

## 4. Entrega
Commit pequeño solo con tus archivos + push. Los videos y builds no se suben (`.gitignore`). Avisa al autor con
fotogramas o el mp4 (los del VPS se mandan por Telegram de inmediato).

## 5. Ahorro de tokens y relevo (leer siempre)
- Antes de nada lee `referencias/handoff-videos.md` del kit (estado, reglas, receta). Lee solo los archivos que vas a tocar.
- Edita con scripts Python en archivo; fotogramas a media resolución en el PC; videos solo en el VPS (`tools/lanzar-tanda.sh`).
- Sin parpadeo: calcomanías separadas ≥1 cm, nada aleatorio por cuadro; verifica con dos fotogramas seguidos de cámara quieta.
- Si Claude no tiene cuota, tú relevas: siguiente tarea de `referencias/tareas-3d.md`, y anota lo hecho en el handoff.
