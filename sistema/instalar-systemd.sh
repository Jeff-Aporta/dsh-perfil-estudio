#!/usr/bin/env bash
# instalar-systemd.sh - deja el timer de actualizacion del perfil en el VPS.
#
#   bash sistema/instalar-systemd.sh
#
# Instala las units (que estan versionadas en este repo) y activa el timer de
# 15 minutos. No imprime ningun secreto.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO="/etc/systemd/system"

echo "== Timer de actualizacion del perfil DSH =="
install -m 644 "$RAIZ/sistema/dsh-perfil-actualizar.service" "$DESTINO/dsh-perfil-actualizar.service"
install -m 644 "$RAIZ/sistema/dsh-perfil-actualizar.timer" "$DESTINO/dsh-perfil-actualizar.timer"
systemctl daemon-reload
systemctl enable --now dsh-perfil-actualizar.timer
systemctl list-timers --no-pager dsh-perfil-actualizar.timer || true
echo "OK  timer activo (cada 15 minutos)."
