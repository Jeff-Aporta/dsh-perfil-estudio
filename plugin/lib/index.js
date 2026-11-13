/**
 * index.js - el plugin DSH del estudio de videos.
 *
 * Que hace, en una linea: mete el perfil canonico (PERFIL-TG + definiciones del
 * perfil + identidad del nodo) en el prompt de CADA sesion del agente y
 * registra las herramientas del protocolo (canal, WIP compartido y acuerdos).
 *
 * Como se carga (mecanismo real de DSH 0.2.2-rc.1):
 *   1. el perfil lo declara como dependencia en su package.json
 *      ("dsh-estudio-plugin": "github:Jeff-Aporta/dsh-perfil-estudio"), y
 *   2. el patch del perfil lo monta con una fila:
 *        - id: estudio
 *          name: "dsh-estudio-plugin"
 *          config: { perfil: dsh-telegram }
 *   El loader de DSH importa la fila por nombre desde la carpeta del perfil, asi
 *   que el paquete tiene que estar instalado en <perfil>/node_modules.
 */

import z from "@deepseek-ai/schemastery";
import { ClienteCanal } from "./canal.js";
import { contenidoDelPerfil, directorioPerfil } from "./perfil.js";
import { registrarHerramientas } from "./herramientas.js";
import { WipLocal } from "./wip.js";

export const name = "estudio";

/** Los servicios que el plugin necesita: el registro de herramientas y el prompt. */
export const inject = ["tools", "systemPrompt"];

/** La configuracion del plugin (la escribe el patch del perfil). */
export const Config = z.object({
  /** El nombre del perfil (para saber de que carpeta leer definiciones e identidad). */
  perfil: z.string().default("dsh-telegram"),
  /** La carpeta del perfil, si no se quiere deducir. */
  dirPerfil: z.string(),
  /** El nombre de la seccion de prompt que registra el plugin. */
  promptSeccion: z.string().default("estudio:perfil"),
  /** Donde se coloca esa seccion en el prompt (antes de las politicas del harness). */
  promptOrden: z.number().default(200),
  /** La URL del Worker del canal (si no, se lee CANAL_URL del entorno). */
  canalUrl: z.string(),
  /** La variable de entorno con el secreto del canal (nunca en el repo). */
  canalSecretoEnv: z.string().default("CANAL_JWT"),
  /** Quien es este bot en el canal (si no, CANAL_BOT del entorno). */
  canalBot: z.string(),
  /** Que maquina es este nodo (si no, CANAL_NODO del entorno). */
  canalNodo: z.string(),
  /** El papel de este bot (si no, CANAL_ROL del entorno). */
  canalRol: z.string(),
  /** El canal donde se guardan los acuerdos globales. */
  acuerdosCanal: z.string().default("estudio:acuerdos"),
  /** El canal donde se avisa de los reclamos del WIP (vacio = no avisar). */
  wipCanal: z.string(),
  /** La carpeta del WIP local de este nodo. */
  wipDir: z.string(),
  /** Si se avisa al canal cuando se reclama o se cierra trabajo. */
  wipAvisar: z.boolean().default(true),
});

/** Rellena los valores que el loader no puso (por si se llama a mano). */
function conDefectos(valores, defecto) {
  const salida = { ...defecto };
  for (const [clave, valor] of Object.entries(valores ?? {})) {
    if (valor !== undefined && valor !== null) salida[clave] = valor;
  }
  return salida;
}

/** El plugin. */
export async function apply(ctx, config = {}) {
  const cfg = conDefectos(config, {
    perfil: "dsh-telegram",
    promptSeccion: "estudio:perfil",
    promptOrden: 200,
    canalSecretoEnv: "CANAL_JWT",
    acuerdosCanal: "estudio:acuerdos",
    wipAvisar: true,
  });

  const dir = directorioPerfil({ dirPerfil: cfg.dirPerfil, perfil: cfg.perfil });
  const contenido = contenidoDelPerfil(dir);

  // 1) El prompt de cada sesion: el perfil canonico + las definiciones + la identidad.
  const secciones = [];
  if (contenido.perfilTelegram.trim()) secciones.push(contenido.perfilTelegram.trim());
  if (contenido.definiciones.trim()) secciones.push(contenido.definiciones.trim());
  if (contenido.identidad.trim()) secciones.push(contenido.identidad.trim());
  else if (contenido.identidadFalta) {
    secciones.push(
      "# Identidad de este nodo\n\n- No hay identidad.md en la carpeta del perfil: no supongas quien eres. " +
        "La escribe tools/instalar-identidad.mjs (una vez por nodo).",
    );
  }
  ctx.systemPrompt.section({
    name: cfg.promptSeccion,
    order: cfg.promptOrden,
    text: secciones.join("\n\n---\n\n"),
  });

  // 2) Las herramientas del protocolo.
  const bot = cfg.canalBot ?? process.env.CANAL_BOT ?? "";
  const nodo = cfg.canalNodo ?? process.env.CANAL_NODO ?? "";
  const canal = new ClienteCanal({
    url: cfg.canalUrl ?? process.env.CANAL_URL ?? "",
    secreto: process.env[cfg.canalSecretoEnv] ?? "",
    bot,
    nodo,
    rol: cfg.canalRol ?? process.env.CANAL_ROL ?? "",
  });
  const wip = new WipLocal({
    dir: cfg.wipDir,
    dueno: bot || `${nodo || "este-nodo"}`,
    nodo,
  });
  registrarHerramientas(ctx, {
    canal,
    wip,
    bot,
    nodo,
    acordCanal: cfg.acuerdosCanal,
    wipCanal: cfg.wipAvisar ? cfg.wipCanal ?? cfg.acuerdosCanal : undefined,
  });

  // 3) La prueba de que el plugin esta vivo (sale en el log al arrancar).
  const identidad = (contenido.identidad.match(/Maquina:\s*(.+)/) ?? [])[1] ?? "sin identidad.md";
  ctx.logger.info(
    `[estudio] plugin cargado: perfil ${cfg.perfil}, maquina ${identidad.trim()}, canal ${canal.disponible ? "configurado" : "sin configurar"} (${canal.falta || "ok"})`,
  );
}