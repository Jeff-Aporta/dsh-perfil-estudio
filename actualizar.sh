#!/usr/bin/env bash
# actualizar.sh - actualiza el perfil DSH del estudio: pull + reinstalacion + reinicio + anuncio.
#
#   bash actualizar.sh
#
# Es idempotente y SILENCIOSO si no hay cambios: si el repo del perfil no se ha
# movido, no reinstala, no reinicia el bot y no anuncia nada.
#
# Cuando hay cambios:
#   1. git pull del repo del perfil;
#   2. reinstala TODOS los perfiles (install.sh);
#   3. reinicia el bot de este nodo (systemd, si esta);
#   4. anuncia en el canal: "perfil actualizado a <sha>".
#
# El secreto del canal se lee del entorno (o de /opt/estudio-videos/canal.env):
# NUNCA se imprime ni se versiona.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${DSH_PERFIL_REPO_DIR:-$RAIZ}"
SERVICIO="${DSH_PERFIL_SERVICIO:-telegram-cadena.service}"
ENV_CANAL="${DSH_PERFIL_ENV_CANAL:-/opt/estudio-videos/canal.env}"
REPO_ESTUDIO="${ESTUDIO_REPO:-/opt/estudio-videos}"

if [ ! -d "$REPO/.git" ]; then
  echo "El repo del perfil no esta en $REPO (se instala con install.sh)" >&2
  exit 1
fi

ANTES="$(git -C "$REPO" rev-parse HEAD)"
git -C "$REPO" pull --ff-only >/dev/null 2>&1 || true
DESPUES="$(git -C "$REPO" rev-parse HEAD)"

if [ "$ANTES" = "$DESPUES" ]; then
  # Sin cambios: no se toca nada (esto es lo que comprueba el timer cada 15 min).
  exit 0
fi

echo "Perfil actualizado: $ANTES -> $DESPUES"
bash "$REPO/install.sh" --repo "$REPO" --sin-pull

# El bot de este nodo.
if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files "$SERVICIO" >/dev/null 2>&1; then
  systemctl restart "$SERVICIO" && echo "Bot reiniciado ($SERVICIO)"
fi

# El anuncio en el canal (si hay secreto configurado).
if [ -f "$ENV_CANAL" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_CANAL"
  set +a
fi
if command -v node >/dev/null 2>&1; then
  node "$REPO/anunciar.mjs" "$DESPUES"
fi

echo "Listo."
