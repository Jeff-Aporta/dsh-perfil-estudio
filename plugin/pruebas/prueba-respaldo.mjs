#!/usr/bin/env node
/**
 * prueba-respaldo.mjs - la prueba del RESPALDO por falta de cuota del plugin (SIN modelo).
 *
 * Qué prueba:
 *   1. se reconoce el fallo de cuota (el codigo canonico del harness y el texto del proveedor);
 *   2. la decision: si el fallo es de cuota y la sesion no va ya al respaldo, se cambia la ruta;
 *      si no es de cuota, o si la sesion ya va al respaldo, no se toca nada;
 *   3. la bandera RESPALDO_DEEPSEEK=1: apagada por defecto (no se registra nada);
 *   4. con la bandera puesta, el listener del plugin pasa la sesion a la ruta de reserva cuando
 *      el turno falla por cuota, y delega el fallo (el turno se cierra, el siguiente sigue).
 *
 *   node plugin/pruebas/prueba-respaldo.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { apply } from "../lib/index.js";
import { esFalloDeCupo, decisionRespaldo, respaldoActivo, RUTA_RESPALDO } from "../lib/respaldo.js";

let comprobaciones = 0;
function ok(condicion, texto) {
  comprobaciones += 1;
  if (!condicion) {
    console.error("FALLA: " + texto);
    process.exit(1);
  }
  console.log("OK  " + texto);
}

// 1) el fallo de cuota se reconoce
ok(esFalloDeCupo({ code: "QUOTA", message: "sin saldo" }), "el codigo QUOTA es un fallo de cuota");
ok(esFalloDeCupo({ code: "ACCOUNT_QUOTA", message: "cuota de la cuenta agotada" }), "ACCOUNT_QUOTA tambien");
ok(esFalloDeCupo({ code: "OTHER", message: "dsh: QUOTA: 429 (limite de uso)" }), "el texto QUOTA: 429 tambien");
ok(!esFalloDeCupo({ code: "RATE_LIMIT", message: "demasiadas peticiones por segundo" }), "un rate limit NO es un fallo de cuota");
ok(!esFalloDeCupo(null), "sin fallo no hay fallo de cuota");

// 2) la decision
const conCupo = decisionRespaldo({ failure: { code: "QUOTA", message: "x" }, actual: { provider: "minimax", model: "MiniMax-M3" } });
ok(conCupo.cambiar === true, "con cuota agotada se cambia la ruta");
ok(conCupo.ruta.provider === RUTA_RESPALDO.provider && conCupo.ruta.model === RUTA_RESPALDO.model,
  "la ruta de reserva es " + RUTA_RESPALDO.provider + "/" + RUTA_RESPALDO.model);
const sinFallo = decisionRespaldo({ failure: { code: "RATE_LIMIT", message: "x" }, actual: { provider: "minimax", model: "MiniMax-M3" } });
ok(sinFallo.cambiar === false, "sin fallo de cuota no se cambia la ruta");
const yaEsta = decisionRespaldo({ failure: { code: "QUOTA", message: "x" }, actual: { provider: RUTA_RESPALDO.provider, model: RUTA_RESPALDO.model } });
ok(yaEsta.cambiar === false, "si la sesion ya va al respaldo no se cambia (no se cicla)");

// 3) la bandera
ok(respaldoActivo({}, {}) === false, "por defecto el respaldo esta apagado");
ok(respaldoActivo({ RESPALDO_DEEPSEEK: "1" }, {}) === true, "RESPALDO_DEEPSEEK=1 lo enciende");
ok(respaldoActivo({ RESPALDO_DEEPSEEK: "0" }, {}) === false, "RESPALDO_DEEPSEEK=0 lo deja apagado");
ok(respaldoActivo({}, { respaldoDeepseek: true }) === true, "la configuracion tambien lo puede encender");

// 4) el listener del plugin
const casa = fs.mkdtempSync(path.join(os.tmpdir(), "respaldo-prueba-"));
const dirPerfil = path.join(casa, "perfil");
fs.mkdirSync(dirPerfil, { recursive: true });
fs.writeFileSync(path.join(dirPerfil, "PERFIL-TG.md"), "# PERFIL-TG\n", "utf8");
fs.writeFileSync(path.join(dirPerfil, "identidad.md"), "# Identidad\n\n- Maquina: pc\n", "utf8");

function contextoDePrueba() {
  const escuchas = [];
  return {
    escuchas,
    ctx: {
      systemPrompt: { section: () => () => {} },
      tools: { register: () => () => {} },
      logger: { info() {}, warn() {}, error() {} },
      on(evento, manejador) { escuchas.push({ evento, manejador }); return () => {}; },
    },
  };
}

// 4a) con la bandera apagada no se registra el listener.
const apagado = contextoDePrueba();
await apply(apagado.ctx, { perfil: "prueba", dirPerfil, wipDir: path.join(casa, "wip") });
ok(apagado.escuchas.every((e) => e.evento !== "agent/request-error"),
  "sin la bandera no se registra el listener del respaldo");

// 4b) con la bandera puesta, el listener cambia la ruta y delega el fallo.
const encendido = contextoDePrueba();
const envOriginal = process.env.RESPALDO_DEEPSEEK;
process.env.RESPALDO_DEEPSEEK = "1";
await apply(encendido.ctx, { perfil: "prueba", dirPerfil, wipDir: path.join(casa, "wip") });
if (envOriginal === undefined) delete process.env.RESPALDO_DEEPSEEK; else process.env.RESPALDO_DEEPSEEK = envOriginal;
const listener = encendido.escuchas.find((e) => e.evento === "agent/request-error");
ok(!!listener, "con la bandera se registra el listener del respaldo");

let seleccion = null;
let delegado = false;
const agente = { model: { current: () => ({ provider: "minimax", model: "MiniMax-M3" }), select: (s) => { seleccion = s; } } };
await listener.manejador(
  { agent: agente, failure: { code: "QUOTA", message: "dsh: QUOTA: 429" } },
  async () => { delegado = true; return undefined; },
);
ok(!!seleccion, "el listener pasa la sesion a la ruta de reserva");
ok(seleccion?.provider === RUTA_RESPALDO.provider && seleccion?.model === RUTA_RESPALDO.model,
  "la ruta de reserva es la de DeepSeek");
ok(delegado === true, "el listener delega el fallo (el turno se cierra; el siguiente sigue)");

console.log("\n" + comprobaciones + "/" + comprobaciones + " comprobaciones correctas");
