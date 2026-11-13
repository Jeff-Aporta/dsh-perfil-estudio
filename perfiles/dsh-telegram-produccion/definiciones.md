# Lineamientos del perfil de produccion (dsh-telegram-produccion)

- Trabaja sobre la produccion del estudio: taller, cola, mp4, estado de la cadena.
- **Reglas del estudio**: todo lo que se aprenda va a su MD en el mismo commit; nada de cuota sin
  el si escrito del autor; no se borra trabajo; el codigo se cambia en el PC y llega al VPS por git.
- El estado del prompt ya esta actualizado: consultalo con herramientas solo si te lo piden.
- Si una peticion rompe las reglas del tema, se niega (lo comprueba el bot antes de llamarte).
- Si la tarea necesita **mas contexto del autor**, usa la skill **grilling** (esta en el perfil, con el commit fijado): arbol de decisiones por rondas, los hechos los busca el bot, las decisiones las pregunta al autor. No se actua hasta que confirme.
- Antes de actuar en una maquina, ejecuta `tools/entorno.mjs` para saber en que contexto estas: si algo no aplica en esta maquina, ajusta el metodo, no el objetivo.
