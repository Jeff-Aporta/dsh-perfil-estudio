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

/** Todo lo que el plugin mete en el prompt de cada sesion. */
export function contenidoDelPerfil(dir) {
  return {
    perfilTelegram: leerTexto(dir, "PERFIL-TG.md"),
    definiciones: leerTexto(dir, "definiciones.md"),
    identidad: leerTexto(dir, "identidad.md"),
    identidadFalta: !fs.existsSync(path.join(dir, "identidad.md")),
  };
}
