#!/usr/bin/env node
/**
 * prueba-plugin.mjs - la prueba del plugin SIN gastar modelo ni cuota.
 *
 * Monta un contexto de DSH de mentira (registro de herramientas, prompt y log)
 * y comprueba que el plugin:
 *   1. mete el perfil canonico, las definiciones y la identidad en el prompt;
 *   2. registra las herramientas del protocolo;
 *   3. reclama el WIP de forma atomica (dos duenos no pueden tener lo mismo).
 *
 *   node plugin/pruebas/prueba-plugin.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { apply, name } from "../lib/index.js";
import { WipLocal } from "../lib/wip.js";
import { firmarToken } from "../lib/canal.js";

let comprobaciones = 0;
function ok(condicion, texto) {
  comprobaciones += 1;
  if (!condicion) {
    console.error("FALLA: " + texto);
    process.exit(1);
  }
  console.log("OK  " + texto);
}

// Un perfil de mentira, con sus tres ficheros.
const casa = fs.mkdtempSync(path.join(os.tmpdir(), "perfil-prueba-"));
const dirPerfil = path.join(casa, "perfil");
fs.mkdirSync(dirPerfil, { recursive: true });
fs.writeFileSync(path.join(dirPerfil, "PERFIL-TG.md"), "# PERFIL-TG\n\nReglas comunes del estudio.\n", "utf8");
fs.writeFileSync(path.join(dirPerfil, "definiciones.md"), "# Definiciones\n\nEste perfil solo lee.\n", "utf8");
fs.writeFileSync(path.join(dirPerfil, "identidad.md"), "# Identidad\n\n- Maquina: vps\n", "utf8");

// El contexto de DSH de mentira.
const secciones = [];
const herramientas = [];
const logs = [];
const ctx = {
  systemPrompt: {
    section(seccion) {
      secciones.push(seccion);
      return () => {};
    },
  },
  tools: {
    register(definicion) {
      herramientas.push(definicion);
      return () => {};
    },
  },
  logger: {
    info(mensaje) {
      logs.push(mensaje);
    },
    warn() {},
    error() {},
  },
};

await apply(ctx, { perfil: "prueba", dirPerfil, wipDir: path.join(casa, "wip") });

ok(secciones.length === 1, "el plugin registra una seccion de prompt");
ok(secciones[0].text.includes("Reglas comunes del estudio"), "el prompt lleva el PERFIL-TG canonico");
ok(secciones[0].text.includes("Este perfil solo lee"), "el prompt lleva las definiciones del perfil");
ok(secciones[0].text.includes("Maquina: vps"), "el prompt lleva la identidad del nodo");
ok(Number.isFinite(secciones[0].order), "la seccion de prompt tiene orden");

const nombres = herramientas.map((h) => h.name).sort();
const esperadas = [
  "acuerdo_registrar",
  "acuerdos_listar",
  "canal_listar",
  "canal_publicar",
  "wip_cerrar",
  "wip_listar",
  "wip_reclamar",
  "wip_soltar",
].sort();
ok(JSON.stringify(nombres) === JSON.stringify(esperadas), "el plugin registra las 8 herramientas del protocolo (" + nombres.length + ")");
ok(herramientas.every((h) => typeof h.execute === "function" && h.output && typeof h.output.render === "function"), "cada herramienta tiene execute y salida");
ok(logs.some((l) => l.includes("plugin cargado")), "el plugin deja su linea de carga en el log");

// El WIP: atomico (un fichero, un dueno).
const wipA = new WipLocal({ dir: path.join(casa, "wip"), dueno: "bot-pc", nodo: "pc" });
const wipB = new WipLocal({ dir: path.join(casa, "wip"), dueno: "bot-vps", nodo: "vps" });
const primero = wipA.reclamar(["server/agente.ts"], "tengo que tocarlo");
ok(primero.ok && primero.tomados.length === 1, "el primer nodo reclama el fichero");
const segundo = wipB.reclamar(["server/agente.ts"], "yo tambien quiero");
ok(!segundo.ok && segundo.conflictos.length === 1, "el segundo nodo NO puede reclamar el mismo fichero");
ok(wipB.listar().length === 1, "el reclamo abierto se ve en el listado");
const cerrado = wipA.cerrar(["server/agente.ts"], "hash abc123");
ok(cerrado.ok && cerrado.cerrados.length === 1, "el dueno cierra su reclamo con prueba");
ok(wipA.listar().length === 0, "tras cerrar no queda nada abierto");
const ahora = wipB.reclamar(["server/agente.ts"], "ahora si");
ok(ahora.ok, "tras el cierre el otro nodo puede reclamar");

// El token del canal: HS256 con el secreto (sin imprimir el secreto).
const token = firmarToken("secreto-de-prueba", { sub: "bot-pc", rol: "pc", nodo: "pc" });
ok(token.split(".").length === 3, "el token del canal tiene tres partes");
ok(!token.includes("secreto-de-prueba"), "el token no lleva el secreto en claro");

fs.rmSync(casa, { recursive: true, force: true });
console.log("\n" + comprobaciones + " comprobaciones OK (plugin " + name + ").");
