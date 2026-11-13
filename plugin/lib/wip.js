/**
 * wip.js - el WIP compartido: reclamo atomico de ficheros, por nodo.
 *
 * El reclamo es LOCAL y ATOMICO (un fichero, un dueno): se hace con creacion
 * exclusiva de un fichero (crea con "wx": si ya existe, otro nodo lo tiene).
 * El canal (Worker) solo lleva el AVISO del reclamo: el aviso no es el mecanismo.
 *
 * Nada de esto se borra: los reclamos cerrados se guardan como historico.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** La carpeta del WIP local de este nodo. */
export function directorioWip(dirWip) {
  if (dirWip) return path.resolve(dirWip);
  const casa = process.env.DSH_HOME || path.join(os.homedir(), ".dsh");
  return path.join(casa, "estado", "wip");
}

/** La clave de un fichero (sufijo del nombre del reclamo). */
function clave(fichero) {
  return crypto.createHash("sha256").update(String(fichero).replace(/\\/g, "/")).digest("hex").slice(0, 32);
}

/** Normaliza un nombre de fichero para comparar (misma ruta = mismo fichero). */
function normaliza(fichero) {
  return String(fichero).replace(/\\/g, "/").replace(/^\.\//, "");
}

/** Escribe un fichero de forma atomica (temporal + rename). */
function escribirAtomico(destino, texto) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const temporal = `${destino}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporal, texto, { encoding: "utf8", flag: "wx" });
  fs.renameSync(temporal, destino);
}

/** El estado del WIP local de este nodo. */
export class WipLocal {
  constructor({ dir, dueno = "desconocido", nodo = "" } = {}) {
    this.dir = directorioWip(dir);
    this.reclamos = path.join(this.dir, "reclamos");
    this.cerrados = path.join(this.dir, "cerrados");
    this.dueno = dueno;
    this.nodo = nodo;
  }

  /** La ruta del fichero de reclamo de un fichero. */
  ruta(fichero) {
    return path.join(this.reclamos, `${clave(fichero)}.json`);
  }

  /** Los reclamos abiertos. */
  listar() {
    let nombres = [];
    try {
      nombres = fs.readdirSync(this.reclamos);
    } catch {
      return [];
    }
    const salida = [];
    for (const nombre of nombres) {
      try {
        const datos = JSON.parse(fs.readFileSync(path.join(this.reclamos, nombre), "utf8"));
        salida.push(datos);
      } catch {
        /* un reclamo ilegible no se inventa: se salta */
      }
    }
    return salida.sort((a, b) => String(a.desde).localeCompare(String(b.desde)));
  }

  /** El reclamo abierto de un fichero (o null). */
  de(fichero) {
    try {
      return JSON.parse(fs.readFileSync(this.ruta(fichero), "utf8"));
    } catch {
      return null;
    }
  }

  /**
   * Reclama uno o varios ficheros. Atomico: si alguno ya esta reclamado por
   * otro, no se reclama ninguno y se devuelve el conflicto.
   */
  reclamar(ficheros, motivo = "") {
    fs.mkdirSync(this.reclamos, { recursive: true });
    const tomados = [];
    const conflictos = [];
    for (const bruto of ficheros) {
      const fichero = normaliza(bruto);
      const destino = this.ruta(fichero);
      const existente = this.de(fichero);
      if (existente && existente.dueno !== this.dueno) {
        conflictos.push({ fichero, dueno: existente.dueno, nodo: existente.nodo, desde: existente.desde });
        continue;
      }
      const datos = {
        fichero,
        dueno: this.dueno,
        nodo: this.nodo,
        motivo,
        desde: new Date().toISOString(),
        id: crypto.randomUUID(),
      };
      try {
        // "wx" = creacion exclusiva: si el fichero existe, otro lo tiene.
        const descriptor = fs.openSync(destino, "wx");
        try {
          fs.writeFileSync(descriptor, JSON.stringify(datos, null, 2), "utf8");
        } finally {
          fs.closeSync(descriptor);
        }
        tomados.push(datos);
      } catch (error) {
        if (error && error.code === "EEXIST") {
          const otro = this.de(fichero);
          conflictos.push({
            fichero,
            dueno: otro ? otro.dueno : "otro nodo",
            nodo: otro ? otro.nodo : "",
            desde: otro ? otro.desde : "",
          });
          continue;
        }
        throw error;
      }
    }
    if (conflictos.length > 0) {
      // Se suelta lo tomado en este intento: o todos, o ninguno.
      for (const tomado of tomados) {
        try {
          fs.unlinkSync(this.ruta(tomado.fichero));
        } catch {
          /* nada */
        }
      }
      return { ok: false, conflictos, tomados: [] };
    }
    return { ok: true, conflictos: [], tomados };
  }

  /** Suelta los reclamos de estos ficheros (solo los que son de este dueno). */
  soltar(ficheros) {
    const soltados = [];
    const ajenos = [];
    for (const bruto of ficheros) {
      const fichero = normaliza(bruto);
      const actual = this.de(fichero);
      if (!actual) continue;
      if (actual.dueno !== this.dueno) {
        ajenos.push({ fichero, dueno: actual.dueno });
        continue;
      }
      try {
        fs.unlinkSync(this.ruta(fichero));
        soltados.push(fichero);
      } catch {
        /* ya no estaba */
      }
    }
    return { ok: ajenos.length === 0, soltados, ajenos };
  }

  /** Cierra los reclamos con su prueba (la prueba queda en el historico). */
  cerrar(ficheros, prueba = "") {
    const cerrados = [];
    const ajenos = [];
    for (const bruto of ficheros) {
      const fichero = normaliza(bruto);
      const actual = this.de(fichero);
      if (!actual) continue;
      if (actual.dueno !== this.dueno) {
        ajenos.push({ fichero, dueno: actual.dueno });
        continue;
      }
      const registro = { ...actual, estado: "cerrado", prueba, cerrado: new Date().toISOString() };
      escribirAtomico(path.join(this.cerrados, `${clave(fichero)}-${Date.now()}.json`), JSON.stringify(registro, null, 2));
      try {
        fs.unlinkSync(this.ruta(fichero));
      } catch {
        /* nada */
      }
      cerrados.push(registro);
    }
    return { ok: ajenos.length === 0, cerrados, ajenos };
  }
}
