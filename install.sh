#!/usr/bin/env bash
# install.sh - instala (o reinstala) TODOS los perfiles DSH del estudio desde este repo.
#
#   bash install.sh                      # clona si hace falta, instala todo
#   bash install.sh --repo /opt/x       # usa otro sitio para el repo
#   bash install.sh --sin-pull          # no hace git pull (solo reinstala)
#   bash install.sh --solo-verificar    # no toca nada: solo comprueba los hashes
#
# Que hace:
#   · clona (o actualiza con git pull) el repo del perfil;
#   · copia en $DSH_HOME/profiles/<nombre>/ los ficheros de cada perfil (incluidas las skills);
#   · NO toca NUNCA identidad.md (es por nodo: lo escribe instalar-identidad.mjs);
#   · instala el plugin del perfil con pnpm (dependencia git de este repo);
#   · imprime el hash de cada fichero instalado.
#
# Idempotente: se puede ejecutar tantas veces como haga falta.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL="${DSH_PERFIL_REPO_URL:-https://github.com/Jeff-Aporta/dsh-perfil-estudio.git}"
REPO="${DSH_PERFIL_REPO_DIR:-$RAIZ}"
BASE="${DSH_HOME:-$HOME/.dsh}/profiles"
PULL=1
SOLO_VERIFICAR=0

while [ $# -gt 0 ]; do
  case "$1" in
    --repo) REPO="$2"; shift 2 ;;
    --url) URL="$2"; shift 2 ;;
    --sin-pull) PULL=0; shift ;;
    --solo-verificar) SOLO_VERIFICAR=1; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "No entiendo el argumento: $1" >&2; exit 1 ;;
  esac
done

FICHEROS="perfil.yml package.json cordis.yml cordis.patch.yml pnpm-workspace.yaml definiciones.md PERFIL-TG.md"

echo "== Perfiles DSH del estudio =="
echo "repo:   $REPO"
echo "destino: $BASE"
echo ""

# 1. El repo del perfil (clone si no existe).
if [ ! -d "$REPO/perfiles" ]; then
  echo "-- clono el repo del perfil en $REPO"
  mkdir -p "$(dirname "$REPO")"
  git clone "$URL" "$REPO"
  PULL=0
elif [ "$PULL" = "1" ]; then
  echo "-- git pull (repo del perfil)"
  git -C "$REPO" pull --ff-only || echo "AVISO: el pull no ha ido bien (se sigue con lo que hay)"
fi

if [ ! -d "$REPO/perfiles" ]; then
  echo "FALTA $REPO/perfiles: no puedo instalar" >&2
  exit 1
fi

# 2. pnpm (lo necesita DSH para instalar el plugin).
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    echo "-- activo pnpm con corepack"
    export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
    corepack enable pnpm >/dev/null 2>&1 || true
    corepack install -g pnpm >/dev/null 2>&1 || corepack prepare pnpm@10 --activate >/dev/null 2>&1 || true
  fi
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "FALTA pnpm (lo necesita DSH para instalar el plugin del perfil)" >&2
  echo "  en el VPS: corepack enable pnpm && corepack install -g pnpm" >&2
  exit 1
fi

ERRORES=0
for dir in "$REPO"/perfiles/*/; do
  [ -f "$dir/perfil.yml" ] || continue
  nombre="$(basename "$dir")"
  dest="$BASE/$nombre"
  echo "-- $nombre -> $dest"

  if [ "$SOLO_VERIFICAR" = "1" ]; then
    for f in $FICHEROS; do
      if [ ! -f "$dest/$f" ]; then echo "   x $f: no esta instalado"; ERRORES=1; continue; fi
      a="$(sha256sum "$dir$f" | cut -d' ' -f1)"
      b="$(sha256sum "$dest/$f" | cut -d' ' -f1)"
      if [ "$a" != "$b" ]; then echo "   x $f: repo=$a instalado=$b"; ERRORES=1; fi
    done
    continue
  fi

  mkdir -p "$dest"
  for f in $FICHEROS; do
    [ -f "$dir$f" ] && cp -f "$dir$f" "$dest/$f"
  done
  # Las skills, tal cual (mismos bytes en PC y VPS).
  if [ -d "$dir/skills" ]; then
    rm -rf "$dest/skills"
    cp -r "$dir/skills" "$dest/skills"
  fi
  # identidad.md NO se toca: es por nodo.

  # El plugin: se instala desde el repo (dependencia git).
  ( cd "$dest" && pnpm install --no-frozen-lockfile --prefer-offline >/dev/null 2>&1 ) || {
    ( cd "$dest" && pnpm install --no-frozen-lockfile ) || { echo "   x pnpm install fallo"; ERRORES=1; continue; }
  }
  ( cd "$dest" && pnpm update dsh-estudio-plugin --latest >/dev/null 2>&1 ) || true

  if [ -f "$dest/node_modules/dsh-estudio-plugin/lib/index.js" ]; then
    echo "   OK  plugin instalado ($(sha256sum "$dest/node_modules/dsh-estudio-plugin/lib/index.js" | cut -c1-8))"
  else
    echo "   x  el plugin NO esta instalado en node_modules"
    ERRORES=1
  fi
  for f in $FICHEROS; do
    [ -f "$dest/$f" ] && printf "   %s  %s
" "$(sha256sum "$dest/$f" | cut -c1-8)" "$f"
  done
done

echo ""
if [ "$SOLO_VERIFICAR" = "1" ]; then
  if [ "$ERRORES" = "0" ]; then echo "PERFILES OK: identicos al repo."; exit 0; fi
  echo "PERFILES DISTINTOS"; exit 1
fi
if [ "$ERRORES" = "0" ]; then
  echo "Listo. Se usan con: dsh --profile <nombre>"
else
  echo "Ha habido fallos (mira arriba)." >&2
  exit 1
fi
