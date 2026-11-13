#!/usr/bin/env node
/**
 * anunciar.mjs - anuncia en el canal que el perfil se ha actualizado.
 *
 *   CANAL_URL=... CANAL_JWT=... CANAL_BOT=bot-pc node anunciar.mjs "<sha>"
 *
 * El secreto se lee del entorno (nunca del repo). Si no hay canal, no es un fallo:
 * se avisa por la salida estandar y se sale con 0.
 */
import { ClienteCanal } from "./plugin/lib/canal.js";

const sha = process.argv[2] ?? "";
const canal = process.env.CANAL_URL ?? "";
const secreto = process.env.CANAL_JWT ?? "";
if (!canal || !secreto) {
  console.log("sin canal configurado: no se anuncia nada");
  process.exit(0);
}
const cliente = new ClienteCanal({
  url: canal,
  secreto,
  bot: process.env.CANAL_BOT ?? "",
  nodo: process.env.CANAL_NODO ?? "",
  rol: process.env.CANAL_ROL ?? "",
});
try {
  const mensaje = await cliente.publicar({
    canal: process.env.CANAL_PERFIL ?? "estudio:general",
    texto: `perfil actualizado a ${sha}`,
    tipo: "aviso",
    meta: { perfil: true, sha },
  });
  console.log("anunciado en el canal: " + (mensaje?.idmensaje ?? "?"));
} catch (error) {
  console.log("no se pudo anunciar en el canal: " + error.message);
}
