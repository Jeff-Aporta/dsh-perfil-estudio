/**
 * perfil.js - donde esta el perfil de este nodo y que ficheros tiene.
 *
 * El perfil instalado vive en $DSH_HOME/profiles/<nombre> (por defecto
 * ~/.dsh/profiles/<nombre>). El plugin lee de ahi las definiciones del perfil y
 * la identidad del nodo (identidad.md), que es POR NODO y no se replica.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** La carpeta del perfil: la dice la configuracion, o el entorno, o el propio modulo. */
export function directorioPerfil({ dirPerfil, perfil } = {}) {
  if (dirPerfil) return path.resolve(dirPerfil);
  const casa = process.env.DSH_HOME || path.join(os.homedir(), ".dsh");
  const nombre = perfil || process.env.DSH_PROFILE || "";
  if (nombre) return path.join(casa, "profiles", nombre);
  // Sin nombre: se busca subiendo desde el modulo hasta encontrar un perfil.
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, "perfil.yml")) || fs.existsSync(path.join(dir, "cordis.patch.yml"))) return dir;
    const padre = path.dirname(dir);
    if (padre === dir) break;
    dir = padre;
  }
  return path.join(casa, "profiles");
}

/** Lee un fichero de texto del perfil (si no esta, devuelve cadena vacia). */
export function leerTexto(dir, nombre) {
  try {
    return fs.readFileSync(path.join(dir, nombre), "utf8");
  } catch {
    return "";
  }
}

/**
 * La identidad del NODO (no del perfil).
 *
 * La identidad.md es POR NODO (la escribe instalar-identidad.mjs): es la misma para todos
 * los perfiles de esta maquina. Por eso, si un perfil no la tiene (el perfil de respaldo es
 * una copia del base y el instalador nunca copia la identidad), se busca la de los perfiles
 * hermanos: primero el base (dsh-telegram) y luego cualquier otro que la tenga.
 */
export function identidadDelNodo(dir) {
  const propia = leerTexto(dir, "identidad.md");
  if (propia.trim()) return { texto: propia, fuente: "el propio perfil" };
  const hermanos = path.dirname(dir);
  const candidatos = ["dsh-telegram"];
  try {
    for (const e of fs.readdirSync(hermanos, { withFileTypes: true })) {
      if (e.isDirectory() && !candidatos.includes(e.name)) candidatos.push(e.name);
    }
  } catch {}
  for (const c of candidatos) {
    const t = leerTexto(path.join(hermanos, c), "identidad.md");
    if (t.trim()) return { texto: t, fuente: "perfil " + c };
  }
  return { texto: "", fuente: null };
}

/** Todo lo que el plugin mete en el prompt de cada sesion. */
export function contenidoDelPerfil(dir) {
  const identidad = identidadDelNodo(dir);
  return {
    perfilTelegram: leerTexto(dir, "PERFIL-TG.md"),
    definiciones: leerTexto(dir, "definiciones.md"),
    identidad: identidad.texto,
    identidadFuente: identidad.fuente,
    identidadFalta: !identidad.texto.trim(),
  };
}
