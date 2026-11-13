/**
 * canal.js - cliente del canal entre bots (el Worker del estudio).
 *
 * El canal tiene cuatro piezas: D1 (la memoria), Realtime (el push), la API (las
 * acciones) y R2 (los ficheros de 72 horas). Este cliente usa solo la API y la
 * memoria: no hay SSH, ni sockets, ni carpetas compartidas.
 *
 * El secreto NUNCA esta en el repo: se lee del entorno (por defecto CANAL_JWT).
 */

import { createHmac } from "node:crypto";

/** Tipos de mensaje que acepta el Worker (los valida: si no, responde 400). */
export const TIPOS_MENSAJE = [
  "texto",
  "aviso",
  "peticion",
  "respuesta",
  "error",
  "accion",
  "resumen",
  "anuncio",
  "traslado",
  "plan",
  "encargo",
];

/** Cuerpo de un mensaje al Worker (estricto: campos desconocidos = 400). */
function b64url(entrada) {
  return Buffer.from(entrada).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Firma un token HS256 con el secreto del canal (el bot firma el suyo). */
export function firmarToken(secreto, { sub, rol, nodo, vida = 3600 }) {
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const cuerpo = b64url(JSON.stringify({ sub, rol, nodo, iat: ahora, exp: ahora + vida }));
  const firma = b64url(createHmac("sha256", secreto).update(`${cabecera}.${cuerpo}`).digest());
  return `${cabecera}.${cuerpo}.${firma}`;
}

/** Cliente HTTP del canal. */
export class ClienteCanal {
  constructor({ url, secreto, bot, nodo, rol, timeoutMs = 20000 } = {}) {
    this.url = (url ?? "").replace(/\/+$/, "");
    this.secreto = secreto ?? "";
    this.bot = bot ?? "";
    this.nodo = nodo ?? "";
    this.rol = rol ?? "";
    this.timeoutMs = timeoutMs;
  }

  /** Si el canal esta configurado en este nodo (URL y secreto). */
  get disponible() {
    return this.url.length > 0 && this.secreto.length > 0;
  }

  /** Motivo por el que no se puede usar el canal (en espanol, sin secretos). */
  get falta() {
    if (!this.url) return "falta CANAL_URL (la URL del Worker del canal)";
    if (!this.secreto) return "falta el secreto del canal en el entorno (CANAL_JWT)";
    return "";
  }

  /** Una llamada a la API del Worker. */
  async peticion(metodo, ruta, cuerpo) {
    if (!this.disponible) throw new Error(`El canal no esta configurado en este nodo: ${this.falta}.`);
    const url = `${this.url}${ruta}`;
    const cabeceras = { authorization: `Bearer ${firmarToken(this.secreto, { sub: this.bot, rol: this.rol, nodo: this.nodo })}` };
    if (cuerpo !== undefined) cabeceras["content-type"] = "application/json";
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), this.timeoutMs);
    try {
      const respuesta = await fetch(url, {
        method: metodo,
        headers: cabeceras,
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        signal: control.signal,
      });
      const texto = await respuesta.text();
      let datos = null;
      try {
        datos = texto ? JSON.parse(texto) : null;
      } catch {
        datos = null;
      }
      if (!respuesta.ok) {
        const motivo = datos && datos.error ? String(datos.error) : `HTTP ${respuesta.status}`;
        throw new Error(`El canal rechazo la peticion (${motivo})`);
      }
      return datos;
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error(`El canal no respondio en ${this.timeoutMs} ms`);
      }
      throw error;
    } finally {
      clearTimeout(reloj);
    }
  }

  /** Publica un mensaje en un canal. */
  async publicar({ canal, texto, tipo = "texto", para = [], meta = undefined }) {
    if (!TIPOS_MENSAJE.includes(tipo)) {
      throw new Error(`El tipo de mensaje debe ser uno de: ${TIPOS_MENSAJE.join(", ")}`);
    }
    const cuerpo = { canal, texto };
    cuerpo.tipo = tipo;
    if (Array.isArray(para) && para.length > 0) cuerpo.para = para;
    if (meta !== undefined) cuerpo.meta = meta;
    return await this.peticion("POST", "/api/mensajes", cuerpo);
  }

  /** La memoria del canal: los mensajes desde una marca. */
  async listar({ canal, desde, limite = 100 } = {}) {
    const partes = [];
    if (canal) partes.push(`canal=${encodeURIComponent(canal)}`);
    if (desde) partes.push(`desde=${encodeURIComponent(desde)}`);
    partes.push(`limite=${encodeURIComponent(String(limite))}`);
    const datos = await this.peticion("GET", `/api/mensajes?${partes.join("&")}`);
    return Array.isArray(datos) ? datos : datos && Array.isArray(datos.mensajes) ? datos.mensajes : [];
  }
}
