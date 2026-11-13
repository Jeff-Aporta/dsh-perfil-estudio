#!/usr/bin/env node
/**
 * verificar-paridad.mjs - comprueba que los perfiles DSH son IDENTICOS en el
 * repo, en el PC y en el VPS (hash a hash).
 *
 *   node verificar-paridad.mjs
 *   node verificar-paridad.mjs --repo D:\VPS\dsh-perfil-estudio
 *   node verificar-paridad.mjs --remoto root@166.1.85.205 --clave C:\Users\jeffr\.ssh\granja_render
 *   node verificar-paridad.mjs --sin-remoto        (solo repo <-> esta maquina)
 *
 * Compara, para CADA perfil de perfiles/:
 *   · el repo (la fuente de la verdad)      -> repo/perfiles/<nombre>/...
 *   · el instalado en ESTA maquina          -> $DSH_HOME/profiles/<nombre>/...
 *   · el instalado en la maquina remota    -> /root/.dsh/profiles/<nombre>/...
 *
 * Excluye identidad.md (es POR NODO: usuario, bot id, rol y maquina).
 * Tambien comprueba que el plugin instalado es el de este repo.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const opc = {
  repo: RAIZ,
  local: process.env.DSH_HOME ? path.join(process.env.DSH_HOME, "profiles") : path.join(os.homedir(), ".dsh", "profiles"),
  remoto: "root@166.1.85.205",
  clave: path.join(os.homedir(), ".ssh", "granja_render"),
  remotoBase: "/root/.dsh/profiles",
  conRemoto: true,
};

for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a === "--repo") opc.repo = path.resolve(argv[++i] ?? opc.repo);
  else if (a === "--local") opc.local = path.resolve(argv[++i] ?? opc.local);
  else if (a === "--remoto") opc.remoto = argv[++i] ?? opc.remoto;
  else if (a === "--clave") opc.clave = argv[++i] ?? opc.clave;
  else if (a === "--remoto-base") opc.remotoBase = argv[++i] ?? opc.remotoBase;
  else if (a === "--sin-remoto") opc.conRemoto = false;
  else if (a === "-h" || a === "--ayuda") {
    console.log("Uso: node verificar-paridad.mjs [--repo dir] [--local dir] [--remoto host] [--clave llave] [--sin-remoto]");
    process.exit(0);
  } else {
    console.error("No entiendo el argumento: " + a);
    process.exit(1);
  }
}

/** El hash de un fichero local (o null si no esta). */
function hashLocal(abs) {
  try {
    return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
  } catch {
    return null;
  }
}

/** Los hashes de una lista de rutas en la maquina remota (por ssh). */
function hashRemoto(rutas) {
  if (!rutas.length) return {};
  const lista = rutas.map((r) => "'" + r.replace(/'/g, "'\\''") + "'").join(" ");
  const cmd = "for f in " + lista + "; do [ -f \"$f\" ] && sha256sum \"$f\"; done";
  const r = spawnSync("ssh", ["-i", opc.clave, "-o", "BatchMode=yes", "-o", "ConnectTimeout=25", opc.remoto, cmd], {
    encoding: "utf8",
    timeout: 120000,
  });
  const salida = String(r.stdout ?? "");
  if (r.status !== 0 && !salida.trim()) {
    console.error("No se pudo hablar con " + opc.remoto + ": " + String(r.stderr ?? "").trim().slice(0, 200));
    return null;
  }
  const out = {};
  for (const linea of salida.split(/\r?\n/)) {
    const m = /^([0-9a-f]{64})\s+(.+)$/.exec(linea.trim());
    if (m) out[m[2]] = m[1];
  }
  return out;
}

/** Los ficheros que forman un perfil (los mismos en los tres sitios). */
function ficherosDelPerfil(nombre) {
  const base = path.join(opc.repo, "perfiles", nombre);
  const salida = [
    "perfil.yml",
    "package.json",
    "cordis.yml",
    "cordis.patch.yml",
    "pnpm-workspace.yaml",
    "definiciones.md",
    "PERFIL-TG.md",
  ];
  const skills = path.join(base, "skills");
  if (fs.existsSync(skills)) {
    for (const skill of fs.readdirSync(skills).sort()) {
      const p = path.join(skills, skill, "SKILL.md");
      if (fs.existsSync(p)) salida.push("skills/" + skill + "/SKILL.md");
    }
  }
  return salida;
}

const nombres = fs.existsSync(path.join(opc.repo, "perfiles"))
  ? fs
      .readdirSync(path.join(opc.repo, "perfiles"), { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(path.join(opc.repo, "perfiles", d.name, "perfil.yml")))
      .map((d) => d.name)
      .sort()
  : [];

let fallos = 0;
const corto = (h) => (h ? h.slice(0, 8) : "------");
function fila(etiqueta, a, b, c) {
  const igual = a !== null && a === b && (opc.conRemoto ? b === c : true);
  if (!igual) fallos += 1;
  console.log("  " + etiqueta.padEnd(44) + corto(a) + "   " + corto(b) + "   " + (opc.conRemoto ? corto(c) : "  -   ") + "   " + (igual ? "OK" : "DISTINTO"));
}

console.log("PARIDAD DE LOS PERFILES DSH (repo <-> esta maquina" + (opc.conRemoto ? " <-> maquina remota" : "") + ")");
console.log("  repo:    " + path.join(opc.repo, "perfiles"));
console.log("  local:   " + opc.local);
if (opc.conRemoto) console.log("  remoto:  " + opc.remoto + ":" + opc.remotoBase);

// 1. Las rutas que se van a pedir por ssh (un solo viaje).
const rutasRemotas = [];
for (const nombre of nombres) {
  for (const f of ficherosDelPerfil(nombre)) rutasRemotas.push(opc.remotoBase + "/" + nombre + "/" + f);
  rutasRemotas.push(opc.remotoBase + "/" + nombre + "/node_modules/dsh-estudio-plugin/lib/index.js");
}
rutasRemotas.push(path.join(opc.repo, "plugin", "lib", "index.js").replace(/\\/g, "/"));
const remotos = opc.conRemoto ? hashRemoto(rutasRemotas) : null;
if (opc.conRemoto && remotos === null) {
  console.error("No se pudo verificar la maquina remota.");
  process.exit(2);
}

// 2. Los perfiles, fichero a fichero.
for (const nombre of nombres) {
  console.log("PERFIL " + nombre);
  for (const f of ficherosDelPerfil(nombre)) {
    const hRepo = hashLocal(path.join(opc.repo, "perfiles", nombre, f));
    const hLocal = hashLocal(path.join(opc.local, nombre, f));
    const hRemoto = opc.conRemoto ? remotos[opc.remotoBase + "/" + nombre + "/" + f] ?? null : null;
    fila(nombre + "/" + f, hRepo, hLocal, hRemoto);
  }
  console.log("");
}

// 3. El PERFIL-TG canonico: todas las copias deben ser el mismo fichero.
const canonico = hashLocal(path.join(opc.repo, "PERFIL-TG.md"));
for (const nombre of nombres) {
  const copia = hashLocal(path.join(opc.repo, "perfiles", nombre, "PERFIL-TG.md"));
  const igual = canonico !== null && canonico === copia;
  if (!igual) fallos += 1;
  console.log("  (" + nombre + "/PERFIL-TG.md = canonico)".padEnd(46) + (igual ? "OK" : "DISTINTO"));
}

// 4. El plugin: el codigo instalado tiene que ser el de este repo.
const hPluginRepo = hashLocal(path.join(opc.repo, "plugin", "lib", "index.js"));
for (const nombre of nombres) {
  const hLocal = hashLocal(path.join(opc.local, nombre, "node_modules", "dsh-estudio-plugin", "lib", "index.js"));
  const hRemoto = opc.conRemoto ? remotos[opc.remotoBase + "/" + nombre + "/node_modules/dsh-estudio-plugin/lib/index.js"] ?? null : null;
  fila(nombre + "/plugin", hPluginRepo, hLocal, hRemoto);
}

console.log("");
if (fallos === 0) {
  console.log("PARIDAD OK: " + nombres.length + " perfiles identicos" + (opc.conRemoto ? " en el repo, esta maquina y la remota." : " en el repo y esta maquina."));
  process.exit(0);
}
console.log("PARIDAD ROTA: " + fallos + " comprobacion(es) no coinciden.");
console.log("  PC : powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1");
console.log("  VPS: bash install.sh");
process.exit(1);
