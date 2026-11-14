/**
 * respaldo.js - la DECISION (pura) de que hacer cuando el modelo se queda sin cupo.
 *
 * Esto es lo que le pasa al GUI (este chat): el DSH no trae un proveedor de reserva
 * incorporado, asi que el plugin decide, cuando un turno falla por cuota, que la sesion
 * pase a la ruta de reserva (DeepSeek) para que un bajon de cupo no corte la conversacion.
 *
 * IMPORTANTE (por que no se reintenta el MISMO turno con otro proveedor):
 * el bucle del agente captura la ruta (proveedor + modelo) al abrir el PASO y la conserva
 * en sus reintentos; ademas, cambiar de proveedor o modelo en la peticion RECHAZA el paso.
 * Por eso el paso que falla no se puede repetir en otro proveedor desde un plugin: lo que
 * si se puede es dejar la sesion apuntando a la reserva, y asi el siguiente turno sigue.
 *
 * Esta decision es pura (sin DSH) para poder probarla sin gastar cuota.
 */

/** La ruta de reserva por defecto: DeepSeek (la que ya montan los perfiles del estudio). */
export const RUTA_RESPALDO = Object.freeze({ provider: "deepseek-official", model: "deepseek-flash" });

/**
 * ¿Este fallo es "no hay cupo"?
 * El harness tiene un codigo canonico (QUOTA / ACCOUNT_QUOTA) y los proveedores dicen
 * cosas como "QUOTA: 429" o "insufficient quota".
 */
export function esFalloDeCupo(failure) {
  if (!failure) return false;
  const codigo = String(failure.code ?? "").toUpperCase();
  if (codigo === "QUOTA" || codigo === "ACCOUNT_QUOTA") return true;
  const texto = String(failure.message ?? failure.reason ?? "");
  return /QUOTA\s*[:\-]?\s*(429|402)?/i.test(texto)
    || /insufficient[\s_-]+quota/i.test(texto)
    || /quota[\s_-]+(exceeded|exhausted|reached)/i.test(texto)
    || /(balance|credits?)[\s_-]+(exhausted|depleted)/i.test(texto);
}

/**
 * La decision: ¿se pasa la sesion a la ruta de reserva?
 *   · si el fallo no es de cuota, no: se deja el fallo como estaba;
 *   · si la sesion ya va a la reserva, no: no se cambia nada (tampoco se cicla);
 *   · si no, si: la sesion pasa a la reserva y el siguiente turno sigue ahi.
 */
export function decisionRespaldo({ failure, actual = null, ruta = RUTA_RESPALDO } = {}) {
  if (!esFalloDeCupo(failure)) return { cambiar: false, motivo: "el fallo no es de cuota", ruta: actual };
  const destino = { provider: ruta.provider, model: ruta.model };
  if (actual && actual.provider === destino.provider && actual.model === destino.model) {
    return { cambiar: false, motivo: "la sesion ya va a la reserva", ruta: actual };
  }
  return {
    cambiar: true,
    motivo: "el modelo se quedo sin cupo",
    ruta: destino,
    desde: actual ? `${actual.provider}/${actual.model}` : "(sin ruta)",
  };
}

/** La bandera que lo enciende: RESPALDO_DEEPSEEK=1 (apagada por defecto). */
export function respaldoActivo(env = process.env, config = {}) {
  if (config.respaldoDeepseek === true) return true;
  return String(env.RESPALDO_DEEPSEEK ?? "").trim() === "1";
}
