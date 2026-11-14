# FUENTE

Este skill viene de fuera: es el **humanizer** de `https://github.com/blader/humanizer` (blader), descargado tal cual
(15 ficheros: `SKILL.md`, `agents/`, `scripts/`, `README.md`, `CHANGELOG.md`, `LICENSE`…). No se ha modificado:
si el autor quiere cambiarlo, se cambia aqui y se vuelve a subir el repo de origen.

**Por que se instalo** (autor, 13-nov-2026): «https://github.com/blader/humanizer instalalo para que se revisen los errores»
y «el texto pasa por el humanizer antes de la voz».

**Como se usa en el estudio**:

- La herramienta que lo aplica al guion es `tools/humanizar.mjs` (en el repo del estudio). **No reescribe solo**: lista
  los trozos que suenan a IA (muletillas, «en el mundo actual», «es importante destacar», «en conclusión», «además»,
  repeticiones, frases de más de 30 palabras, palabras de relleno, tres sustantivos en serie) para que los revise el
  autor o el editor.
- Se ejecuta **al generar la historia** (`tools/serie.mjs crear`) y lo que encuentra queda en la ficha
  (`ficha.humanizer.trozos`).
- Ver la regla 4 de `REGLAS-DE-PRODUCCION.md`.

**Instalado en los dos sitios**: el repo del estudio (`skills/humanizer/`) y el perfil canonico
(`D:/VPS/dsh-perfil-estudio/skills/humanizer/`), como el resto de skills.
