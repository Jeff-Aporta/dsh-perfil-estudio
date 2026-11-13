/**
 * herramientas.js - las herramientas del protocolo que registra el plugin.
 *
 * - canal_publicar / canal_listar: la memoria (D1) y las acciones (API) del Worker.
 * - wip_reclamar / wip_soltar / wip_cerrar / wip_listar: el WIP compartido
 *   (reclamo atomico local; en el canal queda el AVISO del reclamo).
 * - acuerdos_listar / acuerdo_registrar: los acuerdos globales (meta.acuerdo).
 *
 * Todo en espanol, sin secretos y sin SSH ni sockets.
 */

import { TIPOS_MENSAJE } from "./canal.js";

/** El esquema de salida de todas las herramientas: texto plano. */
const SALIDA = {
  type: "object",
  additionalProperties: false,
  required: ["mensaje"],
  properties: {
    mensaje: { type: "string" },
    datos: { type: "object", additionalProperties: true },
  },
};

/** Envuelve un texto como resultado de herramienta. */
function texto(mensaje, datos) {
  return { mensaje, datos: datos ?? {} };
}

/** La vista que se le enseña al modelo. */
function vista(mensaje, datos) {
  const lineas = [mensaje];
  if (datos && Array.isArray(datos.lista) && datos.lista.length > 0) {
    for (const item of datos.lista) lineas.push("- " + (typeof item === "string" ? item : JSON.stringify(item)));
  }
  return [{ type: "text", text: lineas.join("\n") }];
}

/** Registra todas las herramientas del protocolo en el registro de DSH. */
export function registrarHerramientas(ctx, { canal, wip, bot, nodo, acordCanal, wipCanal }) {
  const registro = (definicion) => ctx.tools.register(definicion);

  registro({
    name: "canal_publicar",
    description:
      "Publicar un mensaje en el canal entre bots (la memoria D1 y el push Realtime del Worker). " +
      "Es el UNICO canal entre bots: Telegram queda para el autor. " +
      "Tipos validos: " + TIPOS_MENSAJE.join(", ") + ".",
    parameters: {
      type: "object",
      required: ["canal", "texto"],
      additionalProperties: false,
      properties: {
        canal: { type: "string", description: "El canal (por ejemplo estudio:general, estudio:vps, estudio:pc). Se crea al vuelo." },
        texto: { type: "string", description: "El texto del mensaje, en espanol." },
        tipo: { type: "string", enum: TIPOS_MENSAJE, description: "El tipo de mensaje (anuncio, plan, traslado, encargo, respuesta...)." },
        para: { type: "array", items: { type: "string" }, description: "A quien va dirigido (ids de bot)." },
      },
    },
    output: { schema: SALIDA, render: (args, value) => vista(value.mensaje, value.datos) },
    execute: async (args) => {
      const mensaje = await canal.publicar({
        canal: args.canal,
        texto: args.texto,
        tipo: args.tipo ?? "texto",
        para: args.para ?? [],
      });
      return texto(`Mensaje publicado en ${args.canal} (id ${mensaje?.idmensaje ?? "?"}).`, { idmensaje: mensaje?.idmensaje ?? null });
    },
  });

  registro({
    name: "canal_listar",
    description:
      "Revisar la memoria del canal (D1): los mensajes de un canal desde una marca (ISO o id de mensaje). " +
      "Sirve para enterarse de lo que dijo el otro bot sin esperar al push.",
    parameters: {
      type: "object",
      required: ["canal"],
      additionalProperties: false,
      properties: {
        canal: { type: "string", description: "El canal que se quiere revisar." },
        desde: { type: "string", description: "Marca: una fecha ISO o el id del ultimo mensaje visto." },
        limite: { type: "integer", minimum: 1, maximum: 500, description: "Cuantos mensajes traer (por defecto 100)." },
      },
    },
    output: { schema: SALIDA, render: (args, value) => vista(value.mensaje, value.datos) },
    execute: async (args) => {
      const lista = await canal.listar({ canal: args.canal, desde: args.desde, limite: args.limite ?? 100 });
      const resumen = lista.map((m) => `[${m.fhcre ?? ""}] ${m.autor ?? "?"} (${m.tipo ?? "texto"}): ${m.texto ?? ""}`);
      return texto(`${lista.length} mensaje(s) en ${args.canal}.`, { lista: resumen });
    },
  });

  registro({
    name: "wip_reclamar",
    description:
      "Reclamar trabajo en el WIP compartido antes de tocar ficheros (reclamo atomico: si otro lo tiene, falla). " +
      "Se avisa al canal. Un fichero, un dueno.",
    parameters: {
      type: "object",
      required: ["ficheros"],
      additionalProperties: false,
      properties: {
        ficheros: { type: "array", items: { type: "string" }, description: "Los ficheros que se van a tocar." },
        motivo: { type: "string", description: "Por que se reclama (una linea)." },
      },
    },
    output: { schema: SALIDA, render: (args, value) => vista(value.mensaje, value.datos) },
    execute: async (args) => {
      const resultado = wip.reclamar(args.ficheros, args.motivo ?? "");
      if (!resultado.ok) {
        const detalle = resultado.conflictos.map((c) => `${c.fichero} (lo tiene ${c.dueno})`).join(", ");
        return texto(`No se ha reclamado: ${detalle}. Elige otra cosa o coordinate en el canal.`, { conflictos: resultado.conflictos });
      }
      let aviso = "";
      if (canal.disponible && wipCanal) {
        try {
          const publicado = await canal.publicar({
            canal: wipCanal,
            texto: `Reclamo del WIP: ${args.ficheros.join(", ")}${args.motivo ? " (" + args.motivo + ")" : ""}`,
            tipo: "encargo",
            meta: { wip: true, estado: "reclamado", ficheros: args.ficheros, dueno: bot, nodo },
          });
          aviso = ` Aviso en el canal: ${publicado?.idmensaje ?? "?"}.`;
        } catch (error) {
          aviso = ` (el aviso en el canal fallo: ${error.message})`;
        }
      }
      return texto(`Reclamados ${resultado.tomados.length} fichero(s).${aviso}`, { tomados: resultado.tomados });
    },
  });

  registro({
    name: "wip_soltar",
    description: "Soltar un reclamo del WIP (el trabajo ya no se sigue con esos ficheros).",
    parameters: {
      type: "object",
      required: ["ficheros"],
      additionalProperties: false,
      properties: { ficheros: { type: "array", items: { type: "string" }, description: "Los ficheros que se sueltan." } },
    },
    output: { schema: SALIDA, render: (args, value) => vista(value.mensaje, value.datos) },
    execute: async (args) => {
      const resultado = wip.soltar(args.ficheros);
      if (!resultado.ok) {
        const detalle = resultado.ajenos.map((c) => `${c.fichero} (lo tiene ${c.dueno})`).join(", ");
        return texto(`No se ha soltado: ${detalle}.`, { ajenos: resultado.ajenos });
      }
      return texto(`Soltados ${resultado.soltados.length} fichero(s).`, { soltados: resultado.soltados });
    },
  });

  registro({
    name: "wip_cerrar",
    description: "Cerrar el reclamo del WIP con su PRUEBA (hash, id de mensaje, url...). Queda en el historico.",
    parameters: {
      type: "object",
      required: ["ficheros", "prueba"],
      additionalProperties: false,
      properties: {
        ficheros: { type: "array", items: { type: "string" }, description: "Los ficheros del reclamo." },
        prueba: { type: "string", description: "La prueba de que se ha terminado (hash, id, url...)." },
      },
    },
    output: { schema: SALIDA, render: (args, value) => vista(value.mensaje, value.datos) },
    execute: async (args) => {
      const resultado = wip.cerrar(args.ficheros, args.prueba);
      if (!resultado.ok) {
        const detalle = resultado.ajenos.map((c) => `${c.fichero} (lo tiene ${c.dueno})`).join(", ");
        return texto(`No se ha cerrado: ${detalle}.`, { ajenos: resultado.ajenos });
      }
      let aviso = "";
      if (canal.disponible && wipCanal) {
        try {
          const publicado = await canal.publicar({
            canal: wipCanal,
            texto: `WIP cerrado: ${args.ficheros.join(", ")} - prueba: ${args.prueba}`,
            tipo: "respuesta",
            meta: { wip: true, estado: "cerrado", ficheros: args.ficheros, prueba: args.prueba, dueno: bot, nodo },
          });
          aviso = ` Aviso en el canal: ${publicado?.idmensaje ?? "?"}.`;
        } catch (error) {
          aviso = ` (el aviso en el canal fallo: ${error.message})`;
        }
      }
      return texto(`Cerrados ${resultado.cerrados.length} reclamo(s).${aviso}`, { cerrados: resultado.cerrados });
    },
  });

  registro({
    name: "wip_listar",
    description: "Listar los reclamos abiertos del WIP en este nodo (quien tiene cada fichero).",
    parameters: { type: "object", additionalProperties: false, properties: {} },
    output: { schema: SALIDA, render: (args, value) => vista(value.mensaje, value.datos) },
    execute: async () => {
      const lista = wip.listar();
      const resumen = lista.map((c) => `${c.fichero} - ${c.dueno}${c.nodo ? " (" + c.nodo + ")" : ""}`);
      return texto(`${lista.length} reclamo(s) abierto(s).`, { lista: resumen });
    },
  });

  registro({
    name: "acuerdo_registrar",
    description:
      "Registrar un ACUERDO GLOBAL (una decision que vale para los dos nodos). Queda en el canal con meta.acuerdo.",
    parameters: {
      type: "object",
      required: ["texto"],
      additionalProperties: false,
      properties: {
        texto: { type: "string", description: "El acuerdo, en una linea." },
        ambito: { type: "string", description: "El ambito del acuerdo (global por defecto)." },
        canal: { type: "string", description: "El canal donde se deja (por defecto el de acuerdos)." },
      },
    },
    output: { schema: SALIDA, render: (args, value) => vista(value.mensaje, value.datos) },
    execute: async (args) => {
      const publicado = await canal.publicar({
        canal: args.canal ?? acordCanal,
        texto: args.texto,
        tipo: "anuncio",
        meta: { acuerdo: true, ambito: args.ambito ?? "global", texto: args.texto, dueno: bot, nodo },
      });
      return texto(`Acuerdo registrado en ${args.canal ?? acordCanal} (id ${publicado?.idmensaje ?? "?"}).`, { idmensaje: publicado?.idmensaje ?? null });
    },
  });

  registro({
    name: "acuerdos_listar",
    description: "Listar los acuerdos globales registrados en el canal (los mensajes con meta.acuerdo).",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        canal: { type: "string", description: "El canal donde se buscan (por defecto el de acuerdos)." },
        limite: { type: "integer", minimum: 1, maximum: 500, description: "Cuantos mensajes revisar (por defecto 100)." },
      },
    },
    output: { schema: SALIDA, render: (args, value) => vista(value.mensaje, value.datos) },
    execute: async (args) => {
      const lista = await canal.listar({ canal: args.canal ?? acordCanal, limite: args.limite ?? 100 });
      const acuerdos = lista.filter((m) => m.jmeta && m.jmeta.acuerdo === true);
      const resumen = acuerdos.map((m) => `${m.fhcre ?? ""} ${m.autor ?? "?"}: ${m.texto ?? ""}`);
      return texto(`${acuerdos.length} acuerdo(s) en ${args.canal ?? acordCanal}.`, { lista: resumen });
    },
  });
}
